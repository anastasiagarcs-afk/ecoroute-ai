import { getSupabaseClient } from "@/lib/supabaseClient";
import type { RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";

type SolicitudConUsuario = SolicitudAcceso & { Usuarios: Usuario };

export async function listarSolicitudesPendientes(): Promise<
  { exito: boolean; datos?: SolicitudConUsuario[]; error?: string }
> {
  const supabase = getSupabaseClient();

  // 1. Obtener solicitudes pendientes (sin JOIN para evitar problemas de RLS)
  const { data: solicitudes, error } = await supabase
    .from("SolicitudesAcceso")
    .select("*")
    .eq("estado", "pendiente")
    .order("fecha_solicitud", { ascending: true });

  if (error) return { exito: false, error: error.message };
  if (!solicitudes?.length) return { exito: true, datos: [] };

  // 2. Obtener datos de usuarios por separado
  const usuarioIds = [...new Set(solicitudes.map((s) => s.usuario_id))];
  const { data: usuarios } = await supabase
    .from("Usuarios")
    .select("*")
    .in("id", usuarioIds);

  // 3. Mapear datos
  const mapaUsuarios = new Map((usuarios ?? []).map((u) => [u.id, u]));
  const resultado: SolicitudConUsuario[] = solicitudes.map((s) => ({
    ...s,
    Usuarios: mapaUsuarios.get(s.usuario_id) ?? null,
  })) as SolicitudConUsuario[];

  return { exito: true, datos: resultado };
}

export async function aprobarSolicitud(
  solicitudId: string,
  aprobar: boolean,
  rolAsignado?: RolUsuario
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("aprobar_solicitud_acceso", {
    p_solicitud_id: solicitudId,
    p_aprobar: aprobar,
    p_rol_asignado: rolAsignado ?? null,
  });
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function rechazarSolicitud(
  solicitudId: string,
  motivo?: string
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("aprobar_solicitud_acceso", {
    p_solicitud_id: solicitudId,
    p_aprobar: false,
    p_motivo_rechazo: motivo ?? null,
  });
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function listarUsuarios(): Promise<
  { exito: boolean; datos?: Usuario[]; error?: string }
> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("Usuarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { exito: false, error: error.message };
  return { exito: true, datos: data ?? [] };
}

export async function actualizarRolUsuario(
  usuarioId: string,
  nuevoRol: RolUsuario
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Usuarios")
    .update({ rol: nuevoRol })
    .eq("id", usuarioId);

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function actualizarZonaUsuario(
  usuarioId: string,
  nuevaZona: string | null
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Usuarios")
    .update({ zona_asignada: nuevaZona })
    .eq("id", usuarioId);

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function toggleActivoUsuario(
  usuarioId: string,
  activo: boolean
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Usuarios")
    .update({ activo })
    .eq("id", usuarioId);

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function eliminarUsuario(
  usuarioId: string
): Promise<{ exito: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Usuarios")
    .delete()
    .eq("id", usuarioId);

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}
