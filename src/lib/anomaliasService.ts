import { estaSupabaseConfigurado, getSupabaseClient } from "./supabaseClient";

export type TipoAnomalia = "bateria_baja" | "alta_temperatura" | "sin_senal";

export interface LecturaAnomala {
  contenedorId: string;
  numeroIdentificacion: string;
  zona: string;
  tipos: TipoAnomalia[];
  bateria: number | null;
  temperatura: number | null;
  nivelLlenado: number;
  ultimaLectura: string;
}

const UMBRAL_BATERIA = 20;
const UMBRAL_TEMPERATURA = 50;
const MS_24H = 24 * 60 * 60 * 1000;

type LecturaConContenedor = {
  contenedor_id: string;
  nivel_llenado: number;
  temperatura: number | null;
  fecha_hora: string;
  bateria: number | null;
  Contenedores: {
    id: string;
    numero_identificacion: string;
    zona: string | null;
  } | null;
};

function clasificarAnomalias(
  lectura: LecturaConContenedor,
  ahora: number
): TipoAnomalia[] {
  const tipos: TipoAnomalia[] = [];
  const fechaLectura = new Date(lectura.fecha_hora).getTime();
  if (ahora - fechaLectura > MS_24H) tipos.push("sin_senal");
  if (lectura.bateria !== null && lectura.bateria < UMBRAL_BATERIA)
    tipos.push("bateria_baja");
  if (lectura.temperatura !== null && lectura.temperatura > UMBRAL_TEMPERATURA)
    tipos.push("alta_temperatura");
  return tipos;
}

export async function detectarAnomalias(): Promise<LecturaAnomala[]> {
  if (!estaSupabaseConfigurado()) return [];
  const supabase = getSupabaseClient();

  const { data: lecturas, error } = await supabase
    .from("LecturasSensores")
    .select(
      "contenedor_id, nivel_llenado, temperatura, fecha_hora, bateria, Contenedores(id, numero_identificacion, zona)"
    )
    .order("fecha_hora", { ascending: false });

  if (error || !lecturas) return [];

  const raw = lecturas as unknown as LecturaConContenedor[];
  const ultimasPorContenedor = new Map<string, LecturaConContenedor>();
  for (const lectura of raw) {
    if (!ultimasPorContenedor.has(lectura.contenedor_id)) {
      ultimasPorContenedor.set(lectura.contenedor_id, lectura);
    }
  }

  const resultado: LecturaAnomala[] = [];
  const ahora = Date.now();

  for (const [, lectura] of ultimasPorContenedor) {
    const contenedor = lectura.Contenedores;
    if (!contenedor) continue;

    const tipos = clasificarAnomalias(lectura, ahora);
    if (tipos.length === 0) continue;

    resultado.push({
      contenedorId: contenedor.id,
      numeroIdentificacion: contenedor.numero_identificacion,
      zona: contenedor.zona ?? "Sin zona",
      tipos,
      bateria: lectura.bateria,
      temperatura: lectura.temperatura,
      nivelLlenado: lectura.nivel_llenado,
      ultimaLectura: lectura.fecha_hora,
    });
  }

  return resultado;
}

export async function obtenerTodasLasLecturasAnomalas(): Promise<LecturaAnomala[]> {
  if (!estaSupabaseConfigurado()) return [];
  const supabase = getSupabaseClient();

  const { data: lecturas, error } = await supabase
    .from("LecturasSensores")
    .select(
      "contenedor_id, nivel_llenado, temperatura, fecha_hora, bateria, Contenedores(id, numero_identificacion, zona)"
    )
    .order("fecha_hora", { ascending: false });

  if (error || !lecturas) return [];

  const raw = lecturas as unknown as LecturaConContenedor[];
  const resultado: LecturaAnomala[] = [];
  const ahora = Date.now();

  for (const lectura of raw) {
    const contenedor = lectura.Contenedores;
    if (!contenedor) continue;

    const tipos = clasificarAnomalias(lectura, ahora);
    if (tipos.length === 0) continue;

    resultado.push({
      contenedorId: contenedor.id,
      numeroIdentificacion: contenedor.numero_identificacion,
      zona: contenedor.zona ?? "Sin zona",
      tipos,
      bateria: lectura.bateria,
      temperatura: lectura.temperatura,
      nivelLlenado: lectura.nivel_llenado,
      ultimaLectura: lectura.fecha_hora,
    });
  }

  return resultado;
}
