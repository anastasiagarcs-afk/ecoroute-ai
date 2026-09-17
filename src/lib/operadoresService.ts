import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type { Database, EstadoRuta, Ruta, Usuario } from "@/types/schema";

type InsertRuta = Database["public"]["Tables"]["Rutas"]["Insert"];
type UpdateRuta = Database["public"]["Tables"]["Rutas"]["Update"];

export async function listarOperadores(): Promise<Usuario[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Usuarios")
    .select("*")
    .eq("rol", "Operador")
    .order("nombre");

  if (error) {
    console.error("Error al listar operadores:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data ?? []) as Usuario[];
}

export async function asignarRutaAOperador(
  rutaId: string,
  operadorId: string
): Promise<void> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Rutas")
    .update({ operador_asignado: operadorId } as UpdateRuta)
    .eq("id", rutaId);

  if (error) {
    console.error("Error al asignar ruta:", JSON.stringify(error, null, 2));
    throw new Error("No se pudo asignar la ruta al operador");
  }
}

export async function crearRutaConAsignacion(
  datos: Omit<InsertRuta, "id" | "created_at"> & { operador_asignado?: string | null }
): Promise<Ruta> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Rutas")
    .insert(datos as InsertRuta)
    .select()
    .single();

  if (error) {
    console.error("Error al crear ruta:", JSON.stringify(error, null, 2));
    throw new Error("No se pudo crear la ruta");
  }

  return data as Ruta;
}

export async function notificarAsignacionRuta(
  operadorId: string,
  nombreRuta: string,
  contenedoresCount: number,
  rutaId: string
): Promise<void> {
  if (!estaSupabaseConfigurado()) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("Notificaciones").insert({
    usuario_id: operadorId,
    tipo: "asignacion_ruta",
    mensaje: `Se te ha asignado la ruta "${nombreRuta}" con ${contenedoresCount} contenedor(es) para recolección.`,
    leida: false,
    fecha_envio: new Date().toISOString(),
    enlace: rutaId,
  } as Database["public"]["Tables"]["Notificaciones"]["Insert"]);

  if (error) {
    console.error("Error al crear notificación:", JSON.stringify(error, null, 2));
  }
}

export async function obtenerRutaActivaOperador(
  operadorId: string
): Promise<Ruta | null> {
  if (!estaSupabaseConfigurado()) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Rutas")
    .select("*")
    .eq("operador_asignado", operadorId)
    .in("estado", ["aceptada", "en_progreso"])
    .order("fecha_creacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener ruta activa:", JSON.stringify(error, null, 2));
    return null;
  }

  return data as Ruta | null;
}

export async function cancelarRuta(rutaId: string): Promise<void> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Rutas")
    .update({ estado: "cancelada" as EstadoRuta } as UpdateRuta)
    .eq("id", rutaId);

  if (error) {
    console.error("Error al cancelar ruta:", JSON.stringify(error, null, 2));
    if (error?.code && error?.code === 42501) {
      console.error("⚠️ Error RLS detectado: Políticas de seguridad denegaron la cancelación de la ruta");
      console.error("   Detalle: El usuario actual ('auth.uid()') no tiene permiso para actualizar rutas");
    }
    throw new Error("No se pudo cancelar la ruta");
  }
}

export async function listarRutasGuardadas(): Promise<Ruta[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Rutas")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error al listar rutas guardadas:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data ?? []) as Ruta[];
}

export async function obtenerHistorialOperador(
  operadorId: string
): Promise<Ruta[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Rutas")
    .select("*")
    .eq("operador_asignado", operadorId)
    .in("estado", ["completada", "finalizada_incompleta", "cancelada", "rechazada"])
    .order("ultima_ejecucion", { ascending: false });

  if (error) {
    console.error("Error al obtener historial del operador:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data ?? []) as Ruta[];
}

export async function obtenerRutasActivasOperador(
  operadorId: string
): Promise<Ruta[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Rutas")
    .select("*")
    .eq("operador_asignado", operadorId)
    .in("estado", ["aceptada", "en_progreso"])
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error al obtener rutas activas del operador:", JSON.stringify(error, null, 2));
    return [];
  }

  return (data ?? []) as Ruta[];
}

export async function marcarRutaEnProgreso(rutaId: string): Promise<void> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Rutas")
    .update({ estado: "en_progreso" as EstadoRuta } as UpdateRuta)
    .eq("id", rutaId);

  if (error) {
    console.error("Error al marcar ruta en progreso:", JSON.stringify(error, null, 2));
    throw new Error("No se pudo marcar la ruta como en progreso");
  }
}

export async function marcarRutaCompletada(rutaId: string): Promise<boolean> {
  if (!estaSupabaseConfigurado()) {
    console.warn("[EcoRoute] Supabase no está configurado");
    return false;
  }

  const supabase = getSupabaseClient();

  // Verificar sesión activa
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("[EcoRoute] Error al obtener sesión:", sessionError.message);
    return false;
  }
  if (!session) {
    console.warn("[EcoRoute] No hay sesión activa para completar la ruta");
    return false;
  }

  console.log("[EcoRoute] Intentando completar ruta vía RPC:", rutaId);

  // Llamar a la función RPC que bypassa RLS de forma segura
  const { data, error } = await supabase.rpc("completar_ruta", {
    p_ruta_id: rutaId,
  });

  if (error) {
    console.error("[EcoRoute] Error en RPC completar_ruta:", error.message);
    return false;
  }

  if (!data || !data.exito) {
    console.error("[EcoRoute] RPC retornó éxito=false:", data);
    return false;
  }

  console.log("[EcoRoute] Ruta completada exitosamente:", data);
  return true;
}

export async function marcarRutaFinalizadaIncompleta(rutaId: string): Promise<void> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Rutas")
    .update({
      estado: "finalizada_incompleta" as EstadoRuta,
      ultima_ejecucion: new Date().toISOString(),
    } as UpdateRuta)
    .eq("id", rutaId);

  if (error) {
    console.error("Error al marcar ruta como finalizada incompleta:", JSON.stringify(error, null, 2));
    throw new Error("No se pudo marcar la ruta como finalizada incompleta");
  }
}
