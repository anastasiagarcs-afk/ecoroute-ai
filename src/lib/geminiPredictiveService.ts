import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type { Contenedor } from "@/types/schema";

export const NIVEL_UMBRAL_PREDICCION = 85;
export const VENTANA_PREDICCION_HORAS = 4;
export const PROBABILIDAD_MINIMA = 0.85;

const HORAS_ATRAS_SINTESIS = 36;
const LECTURAS_SINTESIS = 9;
const MODELO_GEMINI = "gemini-2.0-flash";

export interface LecturaHistorial {
  fechaHora: string;
  nivel: number;
}

export type FuentePrediccion = "gemini" | "heuristica" | "sintetizada";

export interface PrediccionContenedor {
  contenedorId: string;
  codigo: string;
  zona: string | null;
  nivelActual: number;
  horasParaCritico: number;
  probabilidad: number;
  nivelProyectadoEn4h: number;
  fuente: FuentePrediccion;
  mensaje: string;
}

export interface TendenciaEstimada {
  pendientePorHora: number;
  rCuadrado: number;
  horasParaCritico: number | null;
  nivelProyectadoEn4h: number;
}

interface PuntosRegresion {
  pendiente: number;
  intercepto: number;
  rCuadrado: number;
}

function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

function formatoHoras(horas: number): string {
  if (horas < 1) return "menos de 1 hora";
  const horasEnteras = Math.floor(horas);
  const minutos = Math.round((horas - horasEnteras) * 60);
  return minutos > 0 ? `${horasEnteras} h ${minutos} min` : `${horasEnteras} h`;
}

async function obtenerLecturasDesdeSupabase(
  contenedorId: string
): Promise<LecturaHistorial[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("LecturasSensores")
    .select("nivel_llenado, fecha_hora")
    .eq("contenedor_id", contenedorId)
    .order("fecha_hora", { ascending: true })
    .limit(50);

  if (error || !data) return [];

  return data
    .map((fila) => ({
      fechaHora: fila.fecha_hora ?? new Date().toISOString(),
      nivel: clamp(Number(fila.nivel_llenado), 0, 100),
    }))
    .filter((lectura) => Number.isFinite(lectura.nivel));
}

function sintetizarLecturas(contenedor: Contenedor): LecturaHistorial[] {
  const ahora = Date.now();
  const velocidadPorHora = Math.max(1, contenedor.nivel_llenado / 24);
  const intervaloMs = (HORAS_ATRAS_SINTESIS * 3600_000) / (LECTURAS_SINTESIS - 1);
  const lecturas: LecturaHistorial[] = [];

  for (let indice = 0; indice < LECTURAS_SINTESIS; indice += 1) {
    const horasDesdeAhora = (LECTURAS_SINTESIS - 1 - indice) * (HORAS_ATRAS_SINTESIS / (LECTURAS_SINTESIS - 1));
    const nivelBase = contenedor.nivel_llenado - horasDesdeAhora * velocidadPorHora;
    const ruido = (indice % 3) * 0.6;
    const lecturasBase = String(contenedor.ultima_lectura ?? contenedor.created_at);
    const fechaBase = lecturasBase && Number.isNaN(Date.parse(lecturasBase)) === false ? Date.parse(lecturasBase) : ahora;
    lecturas.push({
      fechaHora: new Date(fechaBase - (LECTURAS_SINTESIS - 1 - indice) * intervaloMs).toISOString(),
      nivel: clamp(Math.round(nivelBase + ruido), 0, 100),
    });
  }

  return lecturas;
}

function ajustarRegresionLineal(lecturas: LecturaHistorial[]): PuntosRegresion {
  const n = lecturas.length;
  const primera = Date.parse(lecturas[0].fechaHora);
  const puntos = lecturas.map((lectura) => ({
    x: (Date.parse(lectura.fechaHora) - primera) / 3600_000,
    y: lectura.nivel,
  }));

  const mediaX = puntos.reduce((suma, punto) => suma + punto.x, 0) / n;
  const mediaY = puntos.reduce((suma, punto) => suma + punto.y, 0) / n;

  let numerador = 0;
  let denominadorX = 0;
  let denominadorY = 0;

  for (const punto of puntos) {
    const desvioX = punto.x - mediaX;
    const desvioY = punto.y - mediaY;
    numerador += desvioX * desvioY;
    denominadorX += desvioX * desvioX;
    denominadorY += desvioY * desvioY;
  }

  const pendiente = denominadorX > 0 ? numerador / denominadorX : 0;
  const intercepto = mediaY - pendiente * mediaX;
  const rCuadrado =
    denominadorX > 0 && denominadorY > 0
      ? (numerador * numerador) / (denominadorX * denominadorY)
      : 0;

  return { pendiente, intercepto, rCuadrado };
}

function estimarTendencia(lecturas: LecturaHistorial[]): TendenciaEstimada | null {
  if (lecturas.length < 2) return null;

  const { pendiente, rCuadrado } = ajustarRegresionLineal(lecturas);
  if (pendiente <= 0) {
    return {
      pendientePorHora: 0,
      rCuadrado,
      horasParaCritico: null,
      nivelProyectadoEn4h: lecturas[lecturas.length - 1].nivel,
    };
  }

  const nivelActual = lecturas[lecturas.length - 1].nivel;
  const horasParaCritico =
    nivelActual >= NIVEL_UMBRAL_PREDICCION
      ? 0
      : (NIVEL_UMBRAL_PREDICCION - nivelActual) / pendiente;

  return {
    pendientePorHora: pendiente,
    rCuadrado,
    horasParaCritico,
    nivelProyectadoEn4h: clamp(nivelActual + pendiente * VENTANA_PREDICCION_HORAS, 0, 100),
  };
}

function probabilidadDesdeTendencia(tendencia: TendenciaEstimada): number {
  const confianzaAjuste = clamp(tendencia.rCuadrado, 0, 1);
  const base = 0.45 + confianzaAjuste * 0.4;
  const impulso = tendencia.pendientePorHora >= 4 ? 0.1 : 0.05;
  return clamp(base + impulso, 0, 0.99);
}

async function consumirGemini(
  contenedor: Contenedor,
  lecturas: LecturaHistorial[]
): Promise<PrediccionContenedor | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;

  const serie = lecturas
    .map((lectura) => `{fecha: "${lectura.fechaHora}", nivel: ${lectura.nivel}}`)
    .join(", ");

  const instruccion = [
    `Eres un analista predictivo de contenedores de residuos.`,
    `Analiza la siguiente serie histórica de lecturas de nivel de llenado (%) del contenedor:`,
    `Contenedor: ${contenedor.numero_identificacion}.`,
    `Serie: [${serie}].`,
    `Responde únicamente JSON válido con el siguiente esquema:`,
    `{"horasParaCritico": <número en horas hasta superar ${NIVEL_UMBRAL_PREDICCION}%>, "probabilidad": <número de 0 a 1>, "mensaje": "<explicación breve en español>"}`,
  ].join(" ");

  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruccion }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      }
    );

    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const texto = datos.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const coincidencia = texto.match(/\{[\s\S]*\}/);
    if (!coincidencia) return null;

    const interpretado = JSON.parse(coincidencia[0]) as {
      horasParaCritico?: number;
      probabilidad?: number;
      mensaje?: string;
    };

    const horas = Number(interpretado.horasParaCritico);
    const probabilidad = Number(interpretado.probabilidad);
    if (!Number.isFinite(horas) || !Number.isFinite(probabilidad)) return null;

    return {
      contenedorId: contenedor.id,
      codigo: contenedor.numero_identificacion,
      zona: contenedor.zona,
      nivelActual: contenedor.nivel_llenado,
      horasParaCritico: Math.max(horas, 0),
      probabilidad: clamp(probabilidad, 0, 1),
      nivelProyectadoEn4h: clamp(
        contenedor.nivel_llenado +
          (horas > 0 ? (NIVEL_UMBRAL_PREDICCION - contenedor.nivel_llenado) / horas : 0) *
            VENTANA_PREDICCION_HORAS,
        0,
        100
      ),
      fuente: "gemini",
      mensaje: interpretado.mensaje ?? "Gemini anticipa desbordamiento pronto.",
    };
  } catch {
    return null;
  }
}

export async function analizarContenedor(
  contenedor: Contenedor
): Promise<PrediccionContenedor | null> {
  let lecturas = await obtenerLecturasDesdeSupabase(contenedor.id);
  if (lecturas.length < 2) {
    lecturas = sintetizarLecturas(contenedor);
  }

  const desdeGemini = await consumirGemini(contenedor, lecturas);
  const tendencia = estimarTendencia(lecturas);

  if (desdeGemini) return desdeGemini;
  if (!tendencia || tendencia.horasParaCritico === null) return null;

  const esRiesgo =
    tendencia.horasParaCritico < VENTANA_PREDICCION_HORAS &&
    probabilidadDesdeTendencia(tendencia) >= PROBABILIDAD_MINIMA;

  if (!esRiesgo) return null;

  const horasParaCritico = tendencia.horasParaCritico;
  const mensaje =
    contenedor.nivel_llenado >= NIVEL_UMBRAL_PREDICCION
      ? `${contenedor.numero_identificacion} ya supera el umbral; se recomienda atención inmediata.`
      : `Se proyecta que superará ${NIVEL_UMBRAL_PREDICCION}% de capacidad en ${formatoHoras(horasParaCritico)}.`;

  return {
    contenedorId: contenedor.id,
    codigo: contenedor.numero_identificacion,
    zona: contenedor.zona,
    nivelActual: contenedor.nivel_llenado,
    horasParaCritico,
    probabilidad: probabilidadDesdeTendencia(tendencia),
    nivelProyectadoEn4h: tendencia.nivelProyectadoEn4h,
    fuente: "sintetizada" as const,
    mensaje,
  };
}

export async function analizarContenedores(
  contenedores: Contenedor[]
): Promise<PrediccionContenedor[]> {
  const predicciones: PrediccionContenedor[] = [];
  for (const contenedor of contenedores) {
    const prediccion = await analizarContenedor(contenedor);
    if (prediccion) predicciones.push(prediccion);
  }
  return predicciones.sort(
    (a, b) =>
      b.probabilidad - a.probabilidad || a.horasParaCritico - b.horasParaCritico
  );
}

const alertasNotificadas = new Set<string>();

export async function guardarAlertaPredictiva(
  prediccion: PrediccionContenedor
): Promise<void> {
  if (alertasNotificadas.has(prediccion.contenedorId)) return;
  if (!estaSupabaseConfigurado()) {
    alertasNotificadas.add(prediccion.contenedorId);
    return;
  }

  try {
    const supabase = getSupabaseClient();

    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("Usuarios")
      .select("id")
      .in("rol", ["Admin", "Gerente"]);

    if (errorUsuarios || !usuarios || usuarios.length === 0) return;

    const notificaciones = usuarios.map((u) => ({
      usuario_id: u.id,
      tipo: "alerta_predictiva" as const,
      mensaje: `${prediccion.codigo}: ${prediccion.mensaje}`,
      leida: false,
      fecha_envio: new Date().toISOString(),
      enlace: "/#dashboard",
      atendida: false,
      fecha_atencion: null,
      contenedor_id: prediccion.contenedorId,
    }));

    const { error } = await supabase
      .from("Notificaciones")
      .insert(notificaciones);

    if (error) return;
    alertasNotificadas.add(prediccion.contenedorId);
  } catch {
    return;
  }
}

export function prediccionEstaEnRiesgo(
  prediccion: PrediccionContenedor
): boolean {
  return (
    prediccion.horasParaCritico < VENTANA_PREDICCION_HORAS &&
    prediccion.probabilidad >= PROBABILIDAD_MINIMA
  );
}