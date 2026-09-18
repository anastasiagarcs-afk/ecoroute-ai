import { createBrowserClient } from "@supabase/ssr";
import type { Database, Usuario, RolUsuario } from "@/types/schema";

export type SesionUsuario = {
  usuario: Usuario;
  rol: RolUsuario;
} | null;

let clienteGlobal: ReturnType<typeof crearClienteInterno> | null = null;
let sesionCache: SesionUsuario = null;
const sesionListeners: Set<() => void> = new Set();

function crearClienteInterno() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function obtenerCliente() {
  if (!clienteGlobal) clienteGlobal = crearClienteInterno();
  return clienteGlobal;
}

function notificarListeners() {
  for (const listener of sesionListeners) listener();
}

export function suscribirseASesion(callback: () => void): () => void {
  sesionListeners.add(callback);
  return () => { sesionListeners.delete(callback); };
}

export function obtenerSesionActual(): SesionUsuario {
  return sesionCache;
}

export function obtenerSnapshotSesion(): SesionUsuario {
  return sesionCache;
}

async function refrescarSesion(): Promise<SesionUsuario> {
  const supabase = obtenerCliente();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    sesionCache = null;
    notificarListeners();
    return null;
  }

  const { data: usuario } = await supabase
    .from("Usuarios")
    .select("*")
    .eq("email", session.user.email!)
    .single();

  if (!usuario) {
    sesionCache = null;
    notificarListeners();
    return null;
  }

  sesionCache = { usuario, rol: usuario.rol };
  notificarListeners();
  return sesionCache;
}

export async function initSesion(): Promise<SesionUsuario> {
  return refrescarSesion();
}

export async function registrarCuenta(
  email: string,
  password: string,
  datos: { nombre: string }
): Promise<{ exito: boolean; error?: string }> {
  const supabase = obtenerCliente();

  const { data: signUpData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre: datos.nombre },
    },
  });
  if (authError) return { exito: false, error: authError.message };

  // Usar la sesión directamente del response de signUp()
  const session = signUpData.session ?? (await supabase.auth.getSession()).data.session;
  if (!session) return { exito: false, error: "No se pudo establecer la sesion" };

  const { data: existente } = await supabase
    .from("Usuarios")
    .select("id")
    .eq("email", email)
    .single();

  if (!existente) {
    const { error: insertError } = await supabase.from("Usuarios").insert({
      id: session.user.id,
      nombre: datos.nombre,
      email,
      rol: "Ciudadano",
      telefono: null,
      zona_asignada: null,
      puntos_reciclaje: 0,
    });
    if (insertError) return { exito: false, error: insertError.message };
  }

  await refrescarSesion();
  return { exito: true };
}

export async function registrarCuentaConSolicitud(
  email: string,
  password: string,
  datos: { nombre: string },
  rolSolicitado: RolUsuario | null
): Promise<{ exito: boolean; error?: string; rolSolicitado?: RolUsuario }> {
  const supabase = obtenerCliente();

  const { data: signUpData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre: datos.nombre },
    },
  });
  if (authError) return { exito: false, error: authError.message };

  // Usar la sesión directamente del response de signUp()
  const session = signUpData.session ?? (await supabase.auth.getSession()).data.session;
  if (!session) return { exito: false, error: "No se pudo establecer la sesion" };

  const userId = session.user.id;

  // Insertar en Usuarios usando el auth.uid() como id (clave para RLS)
  const { data: existente } = await supabase
    .from("Usuarios")
    .select("id")
    .eq("email", email)
    .single();

  if (!existente) {
    const { error: insertError } = await supabase.from("Usuarios").insert({
      id: userId,
      nombre: datos.nombre,
      email,
      rol: "Ciudadano",
      telefono: null,
      zona_asignada: null,
      puntos_reciclaje: 0,
    });
    if (insertError) return { exito: false, error: insertError.message };
  }

  // Si solicitó Operador o Gerente, crear solicitud en la misma transacción
  if (rolSolicitado) {
    const { error: solicitudError } = await supabase.from("SolicitudesAcceso").insert({
      usuario_id: userId,
      rol_solicitado: rolSolicitado,
      estado: "pendiente",
    });
    if (solicitudError) return { exito: false, error: solicitudError.message };
  }

  await refrescarSesion();
  return { exito: true, rolSolicitado: rolSolicitado ?? undefined };
}

export async function iniciarSesion(
  email: string,
  password: string
): Promise<{ exito: boolean; error?: string }> {
  const supabase = obtenerCliente();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { exito: false, error: error.message };

  // Verificar si la cuenta está activa
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: usuario, error: queryError } = await supabase
      .from("Usuarios")
      .select("activo")
      .eq("id", session.user.id)
      .single();

    // Si la consulta falla (columna no existe, RLS, etc.), permitir login
    if (queryError) {
      console.warn("[Auth] No se pudo verificar estado activo:", queryError.message);
    } else if (usuario && !usuario.activo) {
      // Cerrar sesión si la cuenta está desactivada
      await supabase.auth.signOut();
      return {
        exito: false,
        error: "Tu cuenta ha sido desactivada por un administrador. Contacta a soporte para reactivar tu acceso."
      };
    }
  }

  await refrescarSesion();
  return { exito: true };
}

export async function cerrarSesion(): Promise<void> {
  const supabase = obtenerCliente();
  await supabase.auth.signOut();
  sesionCache = null;
  notificarListeners();
}

export async function enviarSolicitudAcceso(
  rolSolicitado: RolUsuario
): Promise<{ exito: boolean; error?: string }> {
  const supabase = obtenerCliente();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { exito: false, error: "No hay sesion activa" };

  const { data: usuario } = await supabase
    .from("Usuarios")
    .select("id")
    .eq("email", session.user.email!)
    .single();

  if (!usuario) return { exito: false, error: "Usuario no encontrado" };

  const { error } = await supabase.from("SolicitudesAcceso").insert({
    usuario_id: usuario.id,
    rol_solicitado: rolSolicitado,
    estado: "pendiente",
  });

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

export async function aprobarSolicitud(
  solicitudId: string,
  aprobar: boolean
): Promise<{ exito: boolean; error?: string }> {
  const supabase = obtenerCliente();
  const { error } = await supabase.rpc("aprobar_solicitud_acceso", {
    p_solicitud_id: solicitudId,
    p_aprobar: aprobar,
  });
  if (error) return { exito: false, error: error.message };
  await refrescarSesion();
  return { exito: true };
}