import {
  calcularPuntosGamificacion,
  obtenerReglaMaterialGamificacion,
  redondearKg,
} from "@/lib/gamificacion";
import { enviarRegistroAN8N } from "@/lib/n8nWebhook";
import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type {
  InsertPuntosReciclaje,
  InsertUsuario,
  MaterialReciclaje,
  PuntosReciclaje,
  Usuario,
} from "@/types/schema";

const EMAIL_USUARIO_DEMO = "ciudadano.demo@ecoroute.test";

export interface ResultadoRegistroEntrega {
  usuarioId: string;
  transaccionId: string;
  contenedorId: string;
  material: MaterialReciclaje;
  cantidadKg: number;
  puntosGanados: number;
  totalPuntos: number;
}

export interface ResultadoRegistroConWebhook {
  fuente: "webhook" | "supabase";
  resultado: ResultadoRegistroEntrega;
}

let usuarioCache: Usuario | null = null;
let promesaCargaUsuario: Promise<Usuario> | null = null;

function errorSupabase(contexto: string, error: unknown): Error {
  console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
  const detalle =
    error instanceof Error && error.message ? error.message : String(error);
  return new Error(`${contexto}: ${detalle}`);
}

function errorSinSupabase(): Error {
  return new Error(
    "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local."
  );
}

async function cargarOCrearUsuario(): Promise<Usuario> {
  if (!estaSupabaseConfigurado()) throw errorSinSupabase();
  const supabase = getSupabaseClient();

  const consulta = await supabase
    .from("Usuarios")
    .select("*")
    .eq("rol", "Ciudadano")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!consulta.error && consulta.data) return consulta.data;
  if (consulta.error) {
    throw errorSupabase(
      "No se pudo consultar el usuario ciudadano",
      consulta.error
    );
  }

  const datosNuevo: InsertUsuario = {
    nombre: "Ciudadano Demo",
    email: EMAIL_USUARIO_DEMO,
    rol: "Ciudadano",
    telefono: null,
    zona_asignada: "Zona Centro",
    puntos_reciclaje: 0,
  };

  const creacion = await supabase
    .from("Usuarios")
    .insert(datosNuevo)
    .select()
    .single();

  if (creacion.error || !creacion.data) {
    throw errorSupabase(
      "No se pudo crear el usuario de demostración",
      creacion.error ?? "La consulta no devolvió datos."
    );
  }
  return creacion.data;
}

export async function obtenerUsuarioActual(): Promise<Usuario> {
  if (usuarioCache) return usuarioCache;
  if (!promesaCargaUsuario) {
    promesaCargaUsuario = cargarOCrearUsuario()
      .then((usuario) => {
        usuarioCache = usuario;
        return usuario;
      })
      .catch((error) => {
        promesaCargaUsuario = null;
        throw error;
      });
  }
  return promesaCargaUsuario;
}

export async function recargarUsuarioActual(): Promise<Usuario> {
  usuarioCache = null;
  return obtenerUsuarioActual();
}

export async function registrarEntrega(
  material: MaterialReciclaje,
  cantidadKg: number,
  contenedorId: string
): Promise<ResultadoRegistroEntrega> {
  const kg = redondearKg(cantidadKg);
  if (kg <= 0) {
    throw new Error("El peso registrado debe ser mayor a 0 kg.");
  }
  const regla = obtenerReglaMaterialGamificacion(material);
  if (!regla) {
    throw new Error("El material seleccionado no es válido.");
  }
  if (!contenedorId) {
    throw new Error(
      "Debes seleccionar el contenedor o punto de acopio donde entregaste el material."
    );
  }

  const puntos = calcularPuntosGamificacion(material, kg);
  const usuario = await obtenerUsuarioActual();
  const supabase = getSupabaseClient();

  const registro: InsertPuntosReciclaje = {
    usuario_id: usuario.id,
    contenedor_id: contenedorId,
    fecha: new Date().toISOString(),
    material,
    cantidad: kg,
    puntos_ganados: puntos,
    validado_por: null,
  };

  const transaccion = await supabase
    .from("PuntosReciclaje")
    .insert(registro)
    .select()
    .single();

  if (transaccion.error || !transaccion.data) {
    throw errorSupabase(
      "No se pudo registrar la entrega de reciclaje",
      transaccion.error ?? "La consulta no devolvió datos."
    );
  }

  const totalPuntos = usuario.puntos_reciclaje + puntos;
  const actualizacion = await supabase
    .from("Usuarios")
    .update({ puntos_reciclaje: totalPuntos })
    .eq("id", usuario.id);

  if (actualizacion.error) {
    throw errorSupabase(
      "No se pudieron actualizar los puntos del usuario",
      actualizacion.error
    );
  }

  usuarioCache = { ...usuario, puntos_reciclaje: totalPuntos };

  return {
    usuarioId: usuario.id,
    transaccionId: transaccion.data.id,
    contenedorId,
    material,
    cantidadKg: kg,
    puntosGanados: puntos,
    totalPuntos,
  };
}

export async function registrarEntregaConWebhook(
  material: MaterialReciclaje,
  cantidadKg: number,
  contenedorId: string
): Promise<ResultadoRegistroConWebhook> {
  const kg = redondearKg(cantidadKg);
  if (kg <= 0) {
    throw new Error("El peso registrado debe ser mayor a 0 kg.");
  }
  const regla = obtenerReglaMaterialGamificacion(material);
  if (!regla) {
    throw new Error("El material seleccionado no es válido.");
  }
  if (!contenedorId) {
    throw new Error(
      "Debes seleccionar el contenedor o punto de acopio donde entregaste el material."
    );
  }

  const usuario = await obtenerUsuarioActual();

  const respuestaN8N = await enviarRegistroAN8N({
    usuario_id: usuario.id,
    contenedor_id: contenedorId,
    material,
    peso_kg: kg,
    timestamp: new Date().toISOString(),
  });

  if (respuestaN8N && respuestaN8N.exito) {
    const puntosGanados =
      typeof respuestaN8N.puntosGanados === "number"
        ? respuestaN8N.puntosGanados
        : calcularPuntosGamificacion(material, kg);
    const totalPuntos =
      typeof respuestaN8N.totalPuntos === "number"
        ? respuestaN8N.totalPuntos
        : usuario.puntos_reciclaje + puntosGanados;

    return {
      fuente: "webhook",
      resultado: {
        usuarioId: usuario.id,
        transaccionId: respuestaN8N.transaccionId ?? "",
        contenedorId,
        material,
        cantidadKg: kg,
        puntosGanados,
        totalPuntos,
      },
    };
  }

  const resultado = await registrarEntrega(material, kg, contenedorId);
  return { fuente: "supabase", resultado };
}

export async function obtenerEntregasRecientes(
  usuarioId: string,
  limite = 5
): Promise<PuntosReciclaje[]> {
  if (!estaSupabaseConfigurado()) throw errorSinSupabase();
  const supabase = getSupabaseClient();

  const consulta = await supabase
    .from("PuntosReciclaje")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("fecha", { ascending: false })
    .limit(limite);

  if (consulta.error) {
    throw errorSupabase("No se pudieron consultar las entregas", consulta.error);
  }
  return consulta.data ?? [];
}