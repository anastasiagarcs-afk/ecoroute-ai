import { createBrowserClient } from "@supabase/ssr";
import type { Database, RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";

type SolicitudConUsuario = SolicitudAcceso & { Usuarios: Usuario };

function crearCliente() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function listarSolicitudesPendientes(): Promise<
  { exito: boolean; datos?: SolicitudConUsuario[]; error?: string }
> {
  const supabase = crearCliente();
  const { data, error } = await supabase
    .from("SolicitudesAcceso")
    .select("*, Usuarios(*)")
    .eq("estado", "pendiente")
    .order("fecha_solicitud", { ascending: true });

  if (error) return { exito: false, error: error.message };
  return { exito: true, datos: (data ?? []) as unknown as SolicitudConUsuario[] };
}

export async function aprobarSolicitud(
  solicitudId: string,
  aprobar: boolean,
  rolAsignado?: RolUsuario
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearCliente();
  const { error } = await supabase.rpc("aprobar_solicitud_acceso", {
    p_solicitud_id: solicitudId,
    p_aprobar: aprobar,
    p_rol_asignado: rolAsignado ?? null,
  });
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}
