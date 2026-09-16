import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type { Database, Ruta, Usuario } from "@/types/schema";

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
  contenedoresCount: number
): Promise<void> {
  if (!estaSupabaseConfigurado()) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("Notificaciones").insert({
    usuario_id: operadorId,
    tipo: "sistema",
    mensaje: `Se te ha asignado la ruta "${nombreRuta}" con ${contenedoresCount} contenedor(es) para recolección.`,
    leida: false,
    fecha_envio: new Date().toISOString(),
    enlace: null,
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
    .is("ultima_ejecucion", null)
    .order("fecha_creacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener ruta activa:", JSON.stringify(error, null, 2));
    return null;
  }

  return data as Ruta | null;
}
