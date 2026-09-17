import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  Contenedor,
  EstadoContenedor,
  TipoResiduo,
  UbicacionPunto,
} from "@/types/schema";

const CLAVE_LOCAL_STORAGE = "ecoroute:contenedores:v2";
const EVENTO_ACTUALIZADO = "ecoroute:contenedores:actualizado";
const INTERVALO_REFRESCO_CONTENEDORES_MS = 300000;

export const CONTENEDORES_FALLBACK: Contenedor[] = [
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000001",
    numero_identificacion: "CNT-001",
    ubicacion: { lat: 8.2772, lng: -62.7174 },
    capacidad: 1000,
    nivel_llenado: 95,
    tipo_residuo: "organico",
    estado: "repleto",
    ultima_lectura: "2026-09-08T08:30:00.000Z",
    zona: "Alta Vista",
    created_at: "2026-07-15T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000002",
    numero_identificacion: "CNT-002",
    ubicacion: { lat: 8.3215, lng: -62.7114 },
    capacidad: 800,
    nivel_llenado: 90,
    tipo_residuo: "organico",
    estado: "repleto",
    ultima_lectura: "2026-09-08T08:15:00.000Z",
    zona: "Puerto Ordaz",
    created_at: "2026-07-20T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000003",
    numero_identificacion: "CNT-003",
    ubicacion: { lat: 8.347, lng: -62.6535 },
    capacidad: 900,
    nivel_llenado: 88,
    tipo_residuo: "plastico",
    estado: "activo",
    ultima_lectura: "2026-09-08T09:00:00.000Z",
    zona: "San Félix",
    created_at: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000004",
    numero_identificacion: "CNT-004",
    ubicacion: { lat: 8.3152, lng: -62.7245 },
    capacidad: 600,
    nivel_llenado: 74,
    tipo_residuo: "plastico",
    estado: "activo",
    ultima_lectura: "2026-09-08T07:45:00.000Z",
    zona: "Puerto Ordaz",
    created_at: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000005",
    numero_identificacion: "CNT-005",
    ubicacion: { lat: 8.3426, lng: -62.6478 },
    capacidad: 500,
    nivel_llenado: 85,
    tipo_residuo: "vidrio",
    estado: "activo",
    ultima_lectura: "2026-09-08T08:05:00.000Z",
    zona: "San Félix",
    created_at: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000006",
    numero_identificacion: "CNT-006",
    ubicacion: { lat: 8.362, lng: -62.632 },
    capacidad: 700,
    nivel_llenado: 55,
    tipo_residuo: "vidrio",
    estado: "activo",
    ultima_lectura: "2026-09-08T07:20:00.000Z",
    zona: "Unare",
    created_at: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000007",
    numero_identificacion: "CNT-007",
    ubicacion: { lat: 8.3098, lng: -62.703 },
    capacidad: 800,
    nivel_llenado: 62,
    tipo_residuo: "papel_carton",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:55:00.000Z",
    zona: "Puerto Ordaz",
    created_at: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000008",
    numero_identificacion: "CNT-008",
    ubicacion: { lat: 8.3525, lng: -62.674 },
    capacidad: 1100,
    nivel_llenado: 25,
    tipo_residuo: "papel_carton",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:40:00.000Z",
    zona: "San Félix",
    created_at: "2026-08-12T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000009",
    numero_identificacion: "CNT-009",
    ubicacion: { lat: 8.2705, lng: -62.724 },
    capacidad: 900,
    nivel_llenado: 30,
    tipo_residuo: "metal",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:30:00.000Z",
    zona: "Alta Vista",
    created_at: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000010",
    numero_identificacion: "CNT-010",
    ubicacion: { lat: 8.368, lng: -62.6415 },
    capacidad: 700,
    nivel_llenado: 12,
    tipo_residuo: "metal",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:20:00.000Z",
    zona: "Unare",
    created_at: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000011",
    numero_identificacion: "CNT-011",
    ubicacion: { lat: 8.356, lng: -62.6465 },
    capacidad: 600,
    nivel_llenado: 45,
    tipo_residuo: "organico",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:10:00.000Z",
    zona: "Unare",
    created_at: "2026-08-20T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000012",
    numero_identificacion: "CNT-012",
    ubicacion: { lat: 8.349, lng: -62.6715 },
    capacidad: 1000,
    nivel_llenado: 68,
    tipo_residuo: "plastico",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:00:00.000Z",
    zona: "San Félix",
    created_at: "2026-08-22T10:00:00.000Z",
  },
];

export type EstadoCargaContenedores = "cargando" | "listo" | "error";

export interface EstadoContenedores {
  estadoCarga: EstadoCargaContenedores;
  mensajeError: string | null;
}

export interface DatosNuevoContenedor {
  numeroIdentificacion: string;
  tipoResiduo: TipoResiduo;
  nivelLlenado: number;
  lat: number;
  lng: number;
  capacidad: number;
  zona: string | null;
  estado: EstadoContenedor;
}

let cache: Contenedor[] | null = null;
let cargaIniciada = false;
let modoLocal = false;
let temporizadorRefresco: ReturnType<typeof setInterval> | null = null;

const ESTADO_SERVIDOR: EstadoContenedores = {
  estadoCarga: "cargando",
  mensajeError: null,
};

let snapshotEstado: EstadoContenedores = ESTADO_SERVIDOR;

function actualizarSnapshotEstado(
  nuevoEstado: EstadoCargaContenedores,
  nuevoMensajeError: string | null
): void {
  if (
    snapshotEstado.estadoCarga === nuevoEstado &&
    snapshotEstado.mensajeError === nuevoMensajeError
  ) {
    return;
  }
  snapshotEstado = { estadoCarga: nuevoEstado, mensajeError: nuevoMensajeError };
}

function notificar(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ACTUALIZADO));
}

function localStorageDisponible(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function generarId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parsearCoordenada(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = parseFloat(String(valor));
  return Number.isNaN(numero) || !Number.isFinite(numero) ? null : numero;
}

function extraerPuntoDeWkb(hex: string): UbicacionPunto | null {
  if (hex.length % 2 !== 0 || hex.length < 42) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const valor = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(valor)) return null;
    bytes[i] = valor;
  }

  if (bytes[0] !== 1 && bytes[0] !== 0) return null;

  const datos = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const littleEndian = bytes[0] === 1;
  const tipo = datos.getUint32(1, littleEndian);
  const esPunto = (tipo & 0x1fffffff) === 1;
  const incluyeSrid = (tipo & 0x20000000) !== 0;
  const bytesMinimos = incluyeSrid ? 25 : 21;
  if (!esPunto || bytes.length < bytesMinimos) return null;

  const inicioX = incluyeSrid ? 9 : 5;
  const lng = datos.getFloat64(inicioX, littleEndian);
  const lat = datos.getFloat64(inicioX + 8, littleEndian);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function normalizarUbicacion(ubicacion: unknown): UbicacionPunto | null {
  if (!ubicacion) return null;

  if (typeof ubicacion === "object") {
    const objeto = ubicacion as Record<string, unknown>;
    if (objeto.lat !== undefined && objeto.lng !== undefined) {
      const lat = parsearCoordenada(objeto.lat);
      const lng = parsearCoordenada(objeto.lng);
      if (lat !== null && lng !== null) {
        return { lat, lng };
      }
    }
    if (
      objeto.type === "Point" &&
      Array.isArray(objeto.coordinates) &&
      objeto.coordinates.length >= 2
    ) {
      const lng = parsearCoordenada(objeto.coordinates[0]);
      const lat = parsearCoordenada(objeto.coordinates[1]);
      if (lat !== null && lng !== null) {
        return { lat, lng };
      }
    }
  }

  if (typeof ubicacion === "string") {
    const coincidencia = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(
      ubicacion
    );
    if (coincidencia) {
      const lng = parsearCoordenada(coincidencia[1]);
      const lat = parsearCoordenada(coincidencia[2]);
      if (lat !== null && lng !== null) {
        return { lat, lng };
      }
    }

    if (/^[0-9a-fA-F]+$/.test(ubicacion)) {
      const latLng = extraerPuntoDeWkb(ubicacion);
      if (latLng) return latLng;
    }
  }

  return null;
}

function mapearContenedor(fila: Contenedor): Contenedor {
  const ubicacion = normalizarUbicacion(
    (fila as unknown as { ubicacion?: unknown }).ubicacion
  );
  return {
    ...fila,
    ubicacion,
    nivel_llenado: Number(fila.nivel_llenado) || 0,
    capacidad: Number(fila.capacidad) || 0,
  };
}

function normalizarContenedorLocal(
  contenedor: Partial<Contenedor>
): Contenedor | null {
  if (
    !contenedor ||
    typeof contenedor.id !== "string" ||
    typeof contenedor.numero_identificacion !== "string"
  ) {
    return null;
  }
  const base: Contenedor = {
    id: contenedor.id,
    numero_identificacion: contenedor.numero_identificacion,
    ubicacion: null,
    capacidad: 0,
    nivel_llenado: 0,
    tipo_residuo: "mixto",
    estado: "activo",
    ultima_lectura: null,
    zona: null,
    created_at: new Date().toISOString(),
  };
  return mapearContenedor({ ...base, ...contenedor });
}

function leerLocal(): Contenedor[] | null {
  if (!localStorageDisponible()) return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_LOCAL_STORAGE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Partial<Contenedor>[];
    if (!Array.isArray(datos)) return null;
    return datos
      .map(normalizarContenedorLocal)
      .filter((entrada): entrada is Contenedor => entrada !== null);
  } catch {
    return null;
  }
}

function escribirLocal(contenedores: Contenedor[]): void {
  if (!localStorageDisponible()) return;
  try {
    window.localStorage.setItem(CLAVE_LOCAL_STORAGE, JSON.stringify(contenedores));
  } catch {
    return;
  }
}

function asegurarCache(): Contenedor[] {
  if (cache === null) cache = CONTENEDORES_FALLBACK;
  return cache;
}

async function cargarDesdeSupabase(): Promise<Contenedor[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("Contenedores").select("*").limit(500);

  if (error) throw error;
  return (data ?? []).map(mapearContenedor);
}

async function sembrarContenedoresEnSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("sembrar_contenedores_demo");
  if (error) throw error;
}

async function cargarContenedores(): Promise<void> {
  if (modoLocal || !estaSupabaseConfigurado()) {
    cache = leerLocal() ?? CONTENEDORES_FALLBACK;
    actualizarSnapshotEstado("listo", null);
  } else {
    try {
      let desdeSupabase = await cargarDesdeSupabase();
      if (desdeSupabase.length === 0) {
        await sembrarContenedoresEnSupabase();
        desdeSupabase = await cargarDesdeSupabase();
      }
      cache = desdeSupabase;
      escribirLocal(cache);
      actualizarSnapshotEstado("listo", null);
    } catch (error) {
      console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
      modoLocal = true;
      cache = leerLocal() ?? CONTENEDORES_FALLBACK;
      actualizarSnapshotEstado(
        "error",
        "No se pudieron cargar los contenedores desde Supabase. Mostrando datos de respaldo."
      );
    }
  }
  notificar();
}

function mismoContenidoLista(
  previa: Contenedor[] | null,
  nueva: Contenedor[]
): boolean {
  if (!previa || previa.length !== nueva.length) return false;
  const porId = new Map(nueva.map((contenedor) => [contenedor.id, contenedor]));
  for (const previo of previa) {
    const actual = porId.get(previo.id);
    if (!actual) return false;
    if (previo.nivel_llenado !== actual.nivel_llenado) return false;
    if (previo.estado !== actual.estado) return false;
    if (previo.tipo_residuo !== actual.tipo_residuo) return false;
    if ((previo.ubicacion?.lat ?? 0) !== (actual.ubicacion?.lat ?? 0)) return false;
    if ((previo.ubicacion?.lng ?? 0) !== (actual.ubicacion?.lng ?? 0)) return false;
    if (previo.ultima_lectura !== actual.ultima_lectura) return false;
  }
  return true;
}

async function refrescarContenedoresDesdeSupabase(): Promise<void> {
  if (modoLocal || !estaSupabaseConfigurado()) return;
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("Contenedores")
      .select("*")
      .limit(500);

    if (error) throw error;

    const nuevos = (data ?? []).map(mapearContenedor);
    if (mismoContenidoLista(cache, nuevos)) return;

    cache = nuevos;
    escribirLocal(cache);
    actualizarSnapshotEstado("listo", null);
    notificar();
  } catch (error) {
    console.warn(
      "[EcoRoute] No se pudo refrescar el inventario de contenedores. Se conserva la última carga válida.",
      error
    );
  }
}

function iniciarRefrescoAutomatico(): void {
  if (typeof window === "undefined") return;
  if (temporizadorRefresco) return;
  temporizadorRefresco = setInterval(() => {
    void refrescarContenedoresDesdeSupabase();
  }, INTERVALO_REFRESCO_CONTENEDORES_MS);
}

function iniciarCargaUnaVez(): void {
  if (cargaIniciada) return;
  cargaIniciada = true;
  void cargarContenedores();
  iniciarRefrescoAutomatico();
}

function crearContenedorLocal(datos: DatosNuevoContenedor): Contenedor {
  const ahora = new Date().toISOString();
  return {
    id: generarId(),
    numero_identificacion: datos.numeroIdentificacion,
    ubicacion: { lat: datos.lat, lng: datos.lng },
    capacidad: datos.capacidad,
    nivel_llenado: datos.nivelLlenado,
    tipo_residuo: datos.tipoResiduo,
    estado: datos.estado,
    ultima_lectura: ahora,
    zona: datos.zona,
    created_at: ahora,
  };
}

async function registrarEnSupabase(
  datos: DatosNuevoContenedor
): Promise<Contenedor> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("registrar_contenedor", {
    p_numero_identificacion: datos.numeroIdentificacion,
    p_tipo_residuo: datos.tipoResiduo,
    p_nivel_llenado: datos.nivelLlenado,
    p_lat: datos.lat,
    p_lng: datos.lng,
    p_capacidad: datos.capacidad,
    p_zona: datos.zona ?? null,
    p_estado: datos.estado,
  });

  if (error) throw error;
  if (!data) {
    throw new Error("Supabase no devolvió el contenedor creado.");
  }
  return mapearContenedor(data as Contenedor);
}

export async function registrarContenedor(
  datos: DatosNuevoContenedor
): Promise<Contenedor> {
  asegurarCache();

  let contenedor: Contenedor;
  if (!estaSupabaseConfigurado()) {
    contenedor = crearContenedorLocal(datos);
  } else {
    try {
      contenedor = await registrarEnSupabase(datos);
      modoLocal = false;
    } catch (error) {
      console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
      modoLocal = true;
      contenedor = crearContenedorLocal(datos);
    }
  }

  cache = [contenedor, ...(cache ?? [])];
  escribirLocal(cache ?? []);
  actualizarSnapshotEstado("listo", null);
  notificar();

  return contenedor;
}

export interface DatosActualizacionContenedor {
  nivelLlenado: number;
  tipoResiduo: TipoResiduo;
  estado: EstadoContenedor;
}

export async function vaciarContenedor(idContenedor: string): Promise<void> {
  asegurarCache();

  if (estaSupabaseConfigurado()) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("Contenedores")
        .update({
          nivel_llenado: 0,
          estado: "vacio",
          ultima_lectura: new Date().toISOString(),
        })
        .eq("id", idContenedor);
      if (error) throw error;
      modoLocal = false;
    } catch (error) {
      console.error("Error al vaciar el contenedor:", JSON.stringify(error, null, 2));
      modoLocal = true;
    }
  }

  cache = (cache ?? []).map((contenedor) =>
    contenedor.id === idContenedor
      ? {
          ...contenedor,
          nivel_llenado: 0,
          estado: "vacio",
          ultima_lectura: new Date().toISOString(),
        }
      : contenedor
  );
  escribirLocal(cache ?? []);
  notificar();
}

export async function vaciarContenedoresLote(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  asegurarCache();

  if (estaSupabaseConfigurado()) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("Contenedores")
        .update({
          nivel_llenado: 0,
          estado: "vacio",
          ultima_lectura: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
      modoLocal = false;
    } catch (error) {
      console.error("Error al vaciar contenedores en lote:", JSON.stringify(error, null, 2));
      modoLocal = true;
    }
  }

  const ahora = new Date().toISOString();
  cache = (cache ?? []).map((contenedor) =>
    ids.includes(contenedor.id)
      ? {
          ...contenedor,
          nivel_llenado: 0,
          estado: "vacio" as EstadoContenedor,
          ultima_lectura: ahora,
        }
      : contenedor
  );
  escribirLocal(cache ?? []);
  notificar();
}

export async function actualizarContenedor(
  idContenedor: string,
  datos: DatosActualizacionContenedor
): Promise<void> {
  asegurarCache();

  if (estaSupabaseConfigurado()) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("Contenedores")
        .update({
          nivel_llenado: datos.nivelLlenado,
          tipo_residuo: datos.tipoResiduo,
          estado: datos.estado,
          ultima_lectura: new Date().toISOString(),
        })
        .eq("id", idContenedor);
      if (error) throw error;
      modoLocal = false;
    } catch (error) {
      console.error(
        "Error al actualizar el contenedor:",
        JSON.stringify(error, null, 2)
      );
      modoLocal = true;
    }
  }

  cache = (cache ?? []).map((contenedor) =>
    contenedor.id === idContenedor
      ? {
          ...contenedor,
          nivel_llenado: datos.nivelLlenado,
          tipo_residuo: datos.tipoResiduo,
          estado: datos.estado,
          ultima_lectura: new Date().toISOString(),
        }
      : contenedor
  );
  escribirLocal(cache ?? []);
  notificar();
}

export async function eliminarContenedor(idContenedor: string): Promise<void> {
  asegurarCache();

  if (estaSupabaseConfigurado()) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("Contenedores")
        .delete()
        .eq("id", idContenedor);
      if (error) throw error;
      modoLocal = false;
    } catch (error) {
      console.error(
        "Error al eliminar el contenedor:",
        JSON.stringify(error, null, 2)
      );
      modoLocal = true;
    }
  }

  cache = (cache ?? []).filter((contenedor) => contenedor.id !== idContenedor);
  escribirLocal(cache ?? []);
  notificar();
}

export function suscribirseAContenedores(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(EVENTO_ACTUALIZADO, listener);
  iniciarCargaUnaVez();

  return () => window.removeEventListener(EVENTO_ACTUALIZADO, listener);
}

export function obtenerSnapshotContenedores(): Contenedor[] {
  return asegurarCache();
}

export function obtenerSnapshotServidorContenedores(): Contenedor[] {
  return CONTENEDORES_FALLBACK;
}

export function obtenerSnapshotEstadoContenedores(): EstadoContenedores {
  return snapshotEstado;
}

export function obtenerSnapshotServidorEstadoContenedores(): EstadoContenedores {
  return ESTADO_SERVIDOR;
}

let realtimeChannel: RealtimeChannel | null = null;
let realtimeRefCount = 0;

export function suscribirseRealtimeContenedores(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!estaSupabaseConfigurado()) return () => {};

  // Primer suscriptor: crear canal
  if (!realtimeChannel) {
    const supabase = getSupabaseClient();
    realtimeChannel = supabase
      .channel("contenedores-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Contenedores" },
        (payload) => {
          if (!cache) return;

          if (payload.eventType === "INSERT") {
            const nuevo = mapearContenedor(payload.new as Contenedor);
            if (nuevo) {
              const existe = cache.some((c) => c.id === nuevo.id);
              if (!existe) cache = [...cache, nuevo];
            }
          } else if (payload.eventType === "UPDATE") {
            const actualizado = mapearContenedor(payload.new as Contenedor);
            if (actualizado) {
              cache = cache.map((c) =>
                c.id === actualizado.id ? actualizado : c
              );
            }
          } else if (payload.eventType === "DELETE") {
            const idEliminado = (payload.old as { id?: string })?.id;
            if (idEliminado) {
              cache = cache.filter((c) => c.id !== idEliminado);
            }
          }

          escribirLocal(cache ?? []);
          notificar();
        }
      )
      .subscribe();
  }

  realtimeRefCount++;

  // Cleanup: decrementar, solo eliminar canal si nadie lo usa
  return () => {
    realtimeRefCount--;
    if (realtimeRefCount <= 0 && realtimeChannel) {
      const supabase = getSupabaseClient();
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
      realtimeRefCount = 0;
    }
  };
}