import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import { aIntervalo } from "@/lib/historialRutas";
import type { Contenedor, HistorialRuta, InsertHistorialRuta, Ruta } from "@/types/schema";

export interface ResumenJornada {
  fecha: string;
  rutasEjecutadas: number;
  kmTotales: number;
  contenedoresVaciados: number;
  tiempoTotalMinutos: number;
  combustibleEstimadoLitros: number;
  rutas: {
    nombre: string;
    distanciaKm: number;
    contenedoresCount: number;
    fecha: string;
  }[];
}

const CONSUMO_COMBUSTIBLE_POR_KM = 0.12;

function esMismaFecha(fechaIso: string, fechaRef: Date): boolean {
  const d = new Date(fechaIso);
  return (
    d.getFullYear() === fechaRef.getFullYear() &&
    d.getMonth() === fechaRef.getMonth() &&
    d.getDate() === fechaRef.getDate()
  );
}

function parsearTiempoEstimado(tiempo: string | null): number {
  if (!tiempo) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(tiempo);
  if (!match) return 0;
  const horas = Number(match[1] ?? 0);
  const mins = Number(match[2] ?? 0);
  return horas * 60 + mins;
}

export function calcularResumenJornada(
  rutas: Ruta[],
  _contenedores: Contenedor[]
): ResumenJornada {
  const hoy = new Date();

  const rutasDelDia = rutas.filter(
    (r) =>
      (r.estado === "completada" || r.estado === "cancelada") &&
      r.ultima_ejecucion &&
      esMismaFecha(r.ultima_ejecucion, hoy)
  );

  let kmTotales = 0;
  let tiempoTotalMinutos = 0;
  const contenedoresSet = new Set<string>();

  const detalleRutas: ResumenJornada["rutas"] = [];

  for (const ruta of rutasDelDia) {
    const km = ruta.distancia_total ?? 0;
    const tiempo = parsearTiempoEstimado(ruta.tiempo_estimado);

    kmTotales += km;
    tiempoTotalMinutos += tiempo;

    for (const cid of ruta.contenedores_asignados ?? []) {
      contenedoresSet.add(cid);
    }

    detalleRutas.push({
      nombre: ruta.nombre,
      distanciaKm: Math.round(km * 100) / 100,
      contenedoresCount: (ruta.contenedores_asignados ?? []).length,
      fecha: ruta.ultima_ejecucion ?? ruta.fecha_creacion,
    });
  }

  const combustibleEstimadoLitros =
    Math.round(kmTotales * CONSUMO_COMBUSTIBLE_POR_KM * 100) / 100;

  return {
    fecha: hoy.toISOString(),
    rutasEjecutadas: rutasDelDia.length,
    kmTotales: Math.round(kmTotales * 100) / 100,
    contenedoresVaciados: contenedoresSet.size,
    tiempoTotalMinutos: Math.round(tiempoTotalMinutos),
    combustibleEstimadoLitros,
    rutas: detalleRutas,
  };
}

export async function cerrarJornada(datos: {
  operador_id: string;
  resumen: ResumenJornada;
}): Promise<void> {
  const { operador_id, resumen } = datos;

  if (!estaSupabaseConfigurado()) {
    console.warn(
      "[EcoRoute] Supabase no configurado. Cierre de jornada guardado localmente."
    );
    return;
  }

  const observaciones = JSON.stringify({
    tipo: "cierre_jornada",
    rutasEjecutadas: resumen.rutasEjecutadas,
    combustibleEstimado: resumen.combustibleEstimadoLitros,
  });

  const valores: InsertHistorialRuta = {
    ruta_id: null,
    operador_id,
    fecha_ejecucion: resumen.fecha,
    contenedores_recogidos: resumen.rutas.flatMap((r) => {
      return [];
    }),
    tiempo_real: aIntervalo(resumen.tiempoTotalMinutos),
    combustible_consumido: resumen.combustibleEstimadoLitros,
    distancia_total: resumen.kmTotales,
    geometria: null,
    observaciones,
  };

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("HistorialRutas").insert(valores);

    if (error) {
      const esRLS =
        error.code === "42501" || error.message.includes("permission denied");
      if (esRLS) {
        console.warn(
          "[EcoRoute] Error RLS al cerrar jornada. Verifica las políticas de HistorialRutas."
        );
      } else {
        console.error("[EcoRoute] Error al cerrar jornada:", error.message);
      }
    }
  } catch (error) {
    console.error(
      "[EcoRoute] Excepción al cerrar jornada:",
      error instanceof Error ? error.message : error
    );
  }
}

export interface ResumenJornadaGuardado {
  id: string;
  fecha_ejecucion: string;
  kmTotales: number;
  tiempoReal: string | null;
  combustibleConsumido: number | null;
  rutasEjecutadas: number;
}

export async function obtenerResumenesJornada(
  operadorId: string
): Promise<ResumenJornadaGuardado[]> {
  if (!estaSupabaseConfigurado()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("HistorialRutas")
      .select("*")
      .eq("operador_id", operadorId)
      .not("observaciones", "is", null)
      .order("fecha_ejecucion", { ascending: false });

    if (error || !data) return [];

    return data
      .filter((row: HistorialRuta) => {
        try {
          const obs = JSON.parse(row.observaciones ?? "{}");
          return obs.tipo === "cierre_jornada";
        } catch {
          return false;
        }
      })
      .map((row: HistorialRuta) => {
        let rutasEjecutadas = 0;
        try {
          const obs = JSON.parse(row.observaciones ?? "{}");
          rutasEjecutadas = obs.rutasEjecutadas ?? 0;
        } catch {
          /* ignore */
        }
        return {
          id: row.id,
          fecha_ejecucion: row.fecha_ejecucion,
          kmTotales: row.distancia_total ?? 0,
          tiempoReal: row.tiempo_real,
          combustibleConsumido: row.combustible_consumido,
          rutasEjecutadas,
        };
      });
  } catch {
    return [];
  }
}
