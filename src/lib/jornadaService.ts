import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import { aIntervalo } from "@/lib/historialRutas";
import { marcarRutaFinalizadaIncompleta } from "@/lib/operadoresService";
import type { Contenedor, EstadoRuta, HistorialRuta, InsertHistorialRuta, Ruta, UpdateRuta } from "@/types/schema";

export interface DetalleRutaJornada {
  nombre: string;
  rutaId: string;
  distanciaKm: number;
  contenedoresCount: number;
  fecha: string;
  estado: string;
}

export interface ResumenJornada {
  fecha: string;
  rutasEjecutadas: number;
  rutasEnProceso: number;
  kmTotales: number;
  contenedoresVaciados: number;
  tiempoTotalMinutos: number;
  combustibleEstimadoLitros: number;
  rutas: DetalleRutaJornada[];
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

const ESTADOS_FINALES = new Set(["completada", "cancelada", "finalizada_incompleta"]);

export function calcularResumenJornada(
  rutas: Ruta[],
  _contenedores: Contenedor[]
): ResumenJornada {
  const hoy = new Date();

  const rutasDelDia = (() => {
    const hoyRutas = rutas.filter(
      (r) => r.fecha_creacion && esMismaFecha(r.fecha_creacion, hoy)
    );
    if (hoyRutas.length > 0) return hoyRutas;
    return rutas.filter((r) => r.estado !== "rechazada");
  })();

  let kmTotales = 0;
  let tiempoTotalMinutos = 0;
  const contenedoresSet = new Set<string>();

  let rutasEjecutadas = 0;
  let rutasEnProceso = 0;

  const detalleRutas: DetalleRutaJornada[] = [];

  for (const ruta of rutasDelDia) {
    const km = ruta.distancia_total ?? 0;
    const tiempo = parsearTiempoEstimado(ruta.tiempo_estimado);

    kmTotales += km;
    tiempoTotalMinutos += tiempo;

    for (const cid of ruta.contenedores_asignados ?? []) {
      contenedoresSet.add(cid);
    }

    if (ESTADOS_FINALES.has(ruta.estado)) {
      rutasEjecutadas++;
    } else {
      rutasEnProceso++;
    }

    detalleRutas.push({
      nombre: ruta.nombre,
      rutaId: ruta.id,
      distanciaKm: Math.round(km * 100) / 100,
      contenedoresCount: (ruta.contenedores_asignados ?? []).length,
      fecha: ruta.ultima_ejecucion ?? ruta.fecha_creacion,
      estado: ruta.estado,
    });
  }

  const combustibleEstimadoLitros =
    Math.round(kmTotales * CONSUMO_COMBUSTIBLE_POR_KM * 100) / 100;

  return {
    fecha: hoy.toISOString(),
    rutasEjecutadas,
    rutasEnProceso,
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
    rutasEnProceso: resumen.rutasEnProceso,
    combustibleEstimado: resumen.combustibleEstimadoLitros,
  });

  const contenedoresRecogidos = resumen.rutas
    .filter((r) => r.estado === "completada")
    .flatMap((r) => Array(r.contenedoresCount).fill(""));

  const valores: InsertHistorialRuta = {
    ruta_id: null,
    operador_id,
    fecha_ejecucion: resumen.fecha,
    contenedores_recogidos: contenedoresRecogidos,
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

  for (const ruta of resumen.rutas) {
    if (!ESTADOS_FINALES.has(ruta.estado)) {
      try {
        await marcarRutaFinalizadaIncompleta(ruta.rutaId);
      } catch (err) {
        console.warn(
          `[EcoRoute] No se pudo marcar ruta ${ruta.rutaId} como finalizada incompleta:`,
          err instanceof Error ? err.message : err
        );
      }
    }
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

export async function limpiarRutasDuplicadas(operadorId: string): Promise<number> {
  if (!estaSupabaseConfigurado()) return 0;

  try {
    const supabase = getSupabaseClient();
    const { data: rutas, error } = await supabase
      .from("Rutas")
      .select("id, contenedores_asignados")
      .eq("operador_asignado", operadorId)
      .in("estado", ["pendiente", "aceptada", "en_progreso"]);

    if (error || !rutas || rutas.length === 0) return 0;

    const idsALimpiar: string[] = [];

    for (const ruta of rutas) {
      const ids = (ruta.contenedores_asignados ?? []) as string[];
      if (ids.length === 0) {
        idsALimpiar.push(ruta.id);
        continue;
      }

      const { data: cts } = await supabase
        .from("Contenedores")
        .select("nivel_llenado")
        .in("id", ids);

      if (cts && cts.every((c) => c.nivel_llenado === 0)) {
        idsALimpiar.push(ruta.id);
      }
    }

    if (idsALimpiar.length === 0) return 0;

    const { error: updateError } = await supabase
      .from("Rutas")
      .update({
        estado: "cancelada" as EstadoRuta,
        ultima_ejecucion: new Date().toISOString(),
      } as UpdateRuta)
      .in("id", idsALimpiar);

    if (updateError) {
      console.error("[EcoRoute] Error al limpiar rutas duplicadas:", updateError.message);
      return 0;
    }

    return idsALimpiar.length;
  } catch (err) {
    console.error(
      "[EcoRoute] Excepción al limpiar rutas duplicadas:",
      err instanceof Error ? err.message : err
    );
    return 0;
  }
}
