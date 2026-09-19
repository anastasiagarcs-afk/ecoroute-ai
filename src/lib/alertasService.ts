import { getSupabaseClient } from "./supabaseClient";
import type { Notificacion } from "@/types/schema";

export type FiltroAlertas = "todas" | "pendientes" | "resueltas";

export type AlertaConContenedor = Notificacion & {
  contenedor_nivel_llenado: number | null;
  contenedor_codigo: string | null;
};

const REGEX_LLENADO = /El contenedor\s+([A-Za-z0-9_-]+)\s/;
const REGEX_PREDICTIVO = /^([A-Za-z0-9_-]+):/;

/**
 * Obtains global alerts for Admin role with current container fill levels.
 * For alerts without contenedor_id, parses the container code from the
 * message and does a batch lookup to get the current fill level.
 */
export async function obtenerAlertasGlobales(): Promise<AlertaConContenedor[]> {
  const supabase = getSupabaseClient();

  // Phase 1: fetch alerts with FK join
  const { data, error } = await supabase
    .from("Notificaciones")
    .select("*, Contenedores(id, nivel_llenado, numero_identificacion)")
    .in("tipo", ["alerta_llenado", "alerta_predictiva"])
    .order("fecha_envio", { ascending: false });

  if (error) {
    console.error("[alertasService] Error obteniendo alertas:", error.message);
    return [];
  }

  if (!data) return [];

  // Phase 2: map results, extract container code for alerts without contenedor_id
  const alertas: AlertaConContenedor[] = data.map((row: Record<string, unknown>) => {
    const c = row.Contenedores as { id: string; nivel_llenado: number; numero_identificacion: string } | null;
    const { Contenedores: _removed, ...rest } = row;
    const notif = rest as Notificacion;

    return {
      ...notif,
      contenedor_nivel_llenado: c?.nivel_llenado ?? null,
      contenedor_codigo: c?.numero_identificacion ?? null,
    };
  });

  // Phase 3: find alerts without contenedor_id and try to parse code from message
  const sinContenedor = alertas.filter((a) => !a.contenedor_id && !a.contenedor_codigo);
  if (sinContenedor.length === 0) return alertas;

  const codigos = new Set<string>();
  const mapaAlertaCodigo = new Map<string, string>();

  for (const a of sinContenedor) {
    const match = a.tipo === "alerta_llenado"
      ? a.mensaje.match(REGEX_LLENADO)
      : a.mensaje.match(REGEX_PREDICTIVO);
    if (match?.[1]) {
      codigos.add(match[1]);
      mapaAlertaCodigo.set(a.id, match[1]);
    }
  }

  if (codigos.size === 0) return alertas;

  // Phase 4: batch query Contenedores by numero_identificacion
  const { data: contenedores } = await supabase
    .from("Contenedores")
    .select("id, numero_identificacion, nivel_llenado")
    .in("numero_identificacion", [...codigos]);

  const mapaContenedores = new Map(
    (contenedores ?? []).map((c: Record<string, unknown>) => [
      c.numero_identificacion as string,
      { id: c.id as string, nivel_llenado: c.nivel_llenado as number },
    ])
  );

  // Phase 5: populate nivel_llenado and contenedor_id for resolved alerts
  for (const a of alertas) {
    const codigo = mapaAlertaCodigo.get(a.id);
    if (codigo) {
      const c = mapaContenedores.get(codigo);
      if (c) {
        a.contenedor_nivel_llenado = c.nivel_llenado;
        a.contenedor_codigo = codigo;
        a.contenedor_id = a.contenedor_id ?? c.id;
      }
    }
  }

  return alertas;
}

/**
 * Marks alert(s) as resolved with consolidation.
 * Supports both contenedor_id (UUID) and codigoContenedor (text code from message).
 * When contenedorId is provided, also uses codigoContenedor as fallback for
 * historical alerts where contenedor_id is NULL in the database.
 */
export async function marcarAlertaResuelta(
  id: string,
  contenedorId?: string | null,
  codigoContenedor?: string | null
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (contenedorId || codigoContenedor) {
    // Build OR filter: match by contenedor_id OR by message pattern
    const orParts: string[] = [];
    if (contenedorId) {
      orParts.push(`contenedor_id.eq.${contenedorId}`);
    }
    if (codigoContenedor) {
      orParts.push(`mensaje.ilike.%${codigoContenedor}%`);
    }
    const orFilter = orParts.join(",");

    // 1. Find the most recent pending alert for this container
    let queryRecientes = supabase
      .from("Notificaciones")
      .select("id")
      .eq("atendida", false)
      .order("fecha_envio", { ascending: false })
      .limit(1);

    if (orParts.length > 0) {
      queryRecientes = queryRecientes.or(orFilter);
    }

    const { data: recientes, error: fetchError } = await queryRecientes;

    if (fetchError) {
      console.error("[alertasService] Error buscando alerta mas reciente:", fetchError.message);
      return false;
    }

    const masReciente = recientes?.[0];
    if (!masReciente) {
      return true;
    }

    // 2. Mark only the most recent as resolved
    const { error: updateError } = await supabase
      .from("Notificaciones")
      .update({
        atendida: true,
        fecha_atencion: now,
      } as Notificacion)
      .eq("id", masReciente.id);

    if (updateError) {
      console.error("[alertasService] Error marcando alerta reciente:", updateError.message);
      return false;
    }

    // 3. Delete all other pending alerts for this container
    let queryDelete = supabase
      .from("Notificaciones")
      .delete()
      .eq("atendida", false)
      .neq("id", masReciente.id);

    if (orParts.length > 0) {
      queryDelete = queryDelete.or(orFilter);
    }

    const { error: deleteError } = await queryDelete;

    if (deleteError) {
      console.error("[alertasService] Error eliminando alertas antiguas:", deleteError.message);
    }

    return true;
  }

  // No container: resolve only the single alert
  const { error } = await supabase
    .from("Notificaciones")
    .update({
      atendida: true,
      fecha_atencion: now,
    } as Notificacion)
    .eq("id", id);

  if (error) {
    console.error("[alertasService] Error marcando alerta resuelta:", error.message);
    return false;
  }

  return true;
}

/**
 * Deletes an alert from the Notificaciones table.
 */
export async function eliminarAlerta(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Notificaciones")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[alertasService] Error eliminando alerta:", error.message);
    return false;
  }

  return true;
}

/**
 * Filters a list of alerts by their resolved status.
 */
export function filtrarAlertas(alertas: AlertaConContenedor[], filtro: FiltroAlertas): AlertaConContenedor[] {
  if (filtro === "pendientes") return alertas.filter((a) => !a.atendida);
  if (filtro === "resueltas") return alertas.filter((a) => a.atendida);
  return alertas;
}
