import type { FuenteRuta } from "@/lib/routeOptimizer";
import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import type { Contenedor, InsertHistorialRuta, UbicacionPunto } from "@/types/schema";

export type EstadoCargaHistorial = "cargando" | "listo" | "error";

export interface EstadoHistorial {
  estadoCarga: EstadoCargaHistorial;
  mensajeError: string | null;
}

export interface RegistroHistorialRuta {
  id: string;
  nombre: string;
  fecha_ejecucion: string;
  distanciaKm: number;
  tiempoMin: number;
  contenedoresAtendidos: string[];
  fuenteRuta: FuenteRuta;
  geometria: UbicacionPunto[];
}

export interface DatosRegistroRuta {
  distanciaKm: number;
  tiempoMin: number;
  contenedores: Contenedor[];
  fuenteRuta: FuenteRuta;
  geometria: UbicacionPunto[];
}

const EVENTO_ACTUALIZADO = "ecoroute:historial-rutas:actualizado";
const CLAVE_LOCAL_STORAGE = "ecoroute:historial-rutas";

const VACIO: RegistroHistorialRuta[] = [];
const UUID_VACIO = "00000000-0000-0000-0000-000000000000";

const MAX_REINTENTOS_SUPABASE = 1;
const ESPERA_REINTENTO_MS = 600;

let cache: RegistroHistorialRuta[] | null = null;
let cargaIniciada = false;
let modoBackendLocal = false;

const ESTADO_SERVIDOR: EstadoHistorial = {
  estadoCarga: "cargando",
  mensajeError: null,
};

let snapshotEstado: EstadoHistorial = ESTADO_SERVIDOR;

function actualizarSnapshotEstado(
  nuevoEstado: EstadoCargaHistorial,
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

export function aIntervalo(minutos: number): string {
  const totalSegundos = Math.max(0, Math.round(minutos * 60));
  const horas = Math.floor(totalSegundos / 3600);
  const minutosRestantes = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  let iso = "PT";
  if (horas > 0) iso += `${horas}H`;
  if (minutosRestantes > 0) iso += `${minutosRestantes}M`;
  iso += `${segundos}S`;
  return iso;
}

export function aMinutos(valor: string | null | undefined): number {
  if (!valor) return 0;

  const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(valor);
  if (iso) {
    const horas = Number(iso[1] ?? 0);
    const minutos = Number(iso[2] ?? 0);
    const segundos = Number(iso[3] ?? 0);
    return horas * 60 + minutos + segundos / 60;
  }

  const partes = valor.split(":").map(Number);
  if (partes.length === 3 && partes.every((parte) => Number.isFinite(parte))) {
    return partes[0] * 60 + partes[1] + partes[2] / 60;
  }

  return 0;
}

function fuenteDesdeObservaciones(observaciones: string | null): FuenteRuta {
  if (!observaciones) return "osrm";
  try {
    const datos = JSON.parse(observaciones) as { fuente?: string };
    return datos.fuente === "linea_recta" ? "linea_recta" : "osrm";
  } catch {
    return "osrm";
  }
}

function mapearRegistro(fila: {
  id: string;
  fecha_ejecucion: string;
  contenedores_recogidos: string[] | null;
  tiempo_real: string | null;
  distancia_total: number | null;
  geometria: unknown;
  observaciones: string | null;
}): RegistroHistorialRuta {
  const geometria = Array.isArray(fila.geometria)
    ? (fila.geometria as UbicacionPunto[])
    : [];

  return {
    id: fila.id,
    nombre: `Ruta-${new Date(fila.fecha_ejecucion).getTime()}`,
    fecha_ejecucion: fila.fecha_ejecucion,
    distanciaKm: fila.distancia_total ?? 0,
    tiempoMin: aMinutos(fila.tiempo_real),
    contenedoresAtendidos: fila.contenedores_recogidos ?? [],
    fuenteRuta: fuenteDesdeObservaciones(fila.observaciones),
    geometria,
  };
}

function generarId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `reg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function localStorageDisponible(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizarRegistroLocal(
  registro: RegistroHistorialRuta
): RegistroHistorialRuta {
  return {
    ...registro,
    geometria: Array.isArray(registro.geometria) ? registro.geometria : [],
    contenedoresAtendidos: Array.isArray(registro.contenedoresAtendidos)
      ? registro.contenedoresAtendidos
      : [],
  };
}

function leerLocal(): RegistroHistorialRuta[] {
  if (!localStorageDisponible()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE_LOCAL_STORAGE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as RegistroHistorialRuta[];
    return Array.isArray(datos)
      ? datos.map(normalizarRegistroLocal)
      : [];
  } catch {
    return [];
  }
}

function escribirLocal(registros: RegistroHistorialRuta[]): void {
  if (!localStorageDisponible()) return;
  try {
    window.localStorage.setItem(CLAVE_LOCAL_STORAGE, JSON.stringify(registros));
  } catch {
    return;
  }
}

function activarModoLocal(): void {
  if (modoBackendLocal) return;
  modoBackendLocal = true;
  const registros = localStorageDisponible() ? leerLocal() : [];
  cache = registros;
  actualizarSnapshotEstado("listo", null);
}

type ResultadoPeticion<T> =
  | { exito: true; datos: T }
  | { exito: false; error: unknown; datos: null };

async function peticionConReintento<T>(
  ejecutar: () => Promise<ResultadoPeticion<T>>
): Promise<T> {
  let ultimoError: unknown = null;

  for (let intento = 0; intento <= MAX_REINTENTOS_SUPABASE; intento++) {
    if (intento > 0) {
      await new Promise((resolver) => setTimeout(resolver, ESPERA_REINTENTO_MS));
    }
    const resultado = await ejecutar();
    if (resultado.exito) return resultado.datos;
    ultimoError = resultado.error;
  }

  throw ultimoError;
}

async function obtenerHistorialDesdeSupabase(): Promise<RegistroHistorialRuta[]> {
  return peticionConReintento(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("HistorialRutas")
      .select("*")
      .order("fecha_ejecucion", { ascending: false });

    if (error) return { exito: false, error, datos: null };
    return { exito: true, datos: (data ?? []).map(mapearRegistro) };
  });
}

async function cargarHistorial(): Promise<void> {
  if (modoBackendLocal || !estaSupabaseConfigurado()) {
    cache = leerLocal();
    actualizarSnapshotEstado("listo", null);
    notificar();
    return;
  }

  try {
    cache = await obtenerHistorialDesdeSupabase();
    actualizarSnapshotEstado("listo", null);
  } catch (error) {
    console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
    activarModoLocal();
    actualizarSnapshotEstado("listo", null);
  }
  notificar();
}

function iniciarCargaUnaVez(): void {
  if (cargaIniciada) return;
  cargaIniciada = true;
  void cargarHistorial();
}

function registrarEnLocal(registro: RegistroHistorialRuta): void {
  const actual = cache ?? leerLocal();
  cache = [registro, ...actual];
  escribirLocal(cache);
  actualizarSnapshotEstado("listo", null);
  notificar();
}

async function guardarHistorialEnSupabase(
  valores: InsertHistorialRuta
): Promise<RegistroHistorialRuta> {
  return peticionConReintento(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("HistorialRutas")
      .insert(valores)
      .select()
      .single();

    if (error) return { exito: false, error, datos: null };
    if (!data) {
      return {
        exito: false,
        error: "No se pudo guardar la ruta en el historial.",
        datos: null,
      };
    }
    return { exito: true, datos: mapearRegistro(data) };
  });
}

export async function registrarRutaEjecutada(
  datos: DatosRegistroRuta
): Promise<RegistroHistorialRuta> {
  const ahora = new Date();

  const registro: RegistroHistorialRuta = {
    id: generarId(),
    nombre: `Ruta-${ahora.getTime()}`,
    fecha_ejecucion: ahora.toISOString(),
    distanciaKm: datos.distanciaKm,
    tiempoMin: datos.tiempoMin,
    contenedoresAtendidos: datos.contenedores.map((contenedor) => contenedor.id),
    fuenteRuta: datos.fuenteRuta,
    geometria: Array.isArray(datos.geometria) ? datos.geometria : [],
  };

  if (modoBackendLocal || !estaSupabaseConfigurado()) {
    registrarEnLocal(registro);
    return registro;
  }

  const valores: InsertHistorialRuta = {
    ruta_id: null,
    fecha_ejecucion: ahora.toISOString(),
    contenedores_recogidos: datos.contenedores.map(
      (contenedor) => contenedor.id
    ),
    tiempo_real: aIntervalo(datos.tiempoMin),
    combustible_consumido: null,
    distancia_total: Math.round(datos.distanciaKm * 100) / 100,
    geometria: datos.geometria,
    observaciones: JSON.stringify({ fuente: datos.fuenteRuta }),
  };

  try {
    const guardado = await guardarHistorialEnSupabase(valores);
    cache = [guardado, ...(cache ?? VACIO)];
    actualizarSnapshotEstado("listo", null);
    notificar();

    return guardado;
  } catch (error) {
    console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
    activarModoLocal();
    registrarEnLocal(registro);
    return registro;
  }
}

async function vaciarHistorialEnSupabase(): Promise<void> {
  await peticionConReintento<null>(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("HistorialRutas")
      .delete()
      .neq("id", UUID_VACIO);

    if (error) return { exito: false, error, datos: null };
    return { exito: true, datos: null };
  });
}

export async function vaciarHistorial(): Promise<void> {
  if (!modoBackendLocal && estaSupabaseConfigurado()) {
    try {
      await vaciarHistorialEnSupabase();
    } catch (error) {
      console.error("Error al conectar con Supabase:", JSON.stringify(error, null, 2));
      activarModoLocal();
    }
  }

  cache = VACIO;
  escribirLocal(VACIO);
  actualizarSnapshotEstado("listo", null);
  notificar();
}

export function suscribirseAlHistorial(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(EVENTO_ACTUALIZADO, listener);
  iniciarCargaUnaVez();

  return () => window.removeEventListener(EVENTO_ACTUALIZADO, listener);
}

export function obtenerSnapshotHistorial(): RegistroHistorialRuta[] {
  if (cache === null) return VACIO;
  return cache;
}

export function obtenerSnapshotServidorHistorial(): RegistroHistorialRuta[] {
  return VACIO;
}

export function obtenerSnapshotEstadoHistorial(): EstadoHistorial {
  return snapshotEstado;
}

export function obtenerSnapshotServidorEstadoHistorial(): EstadoHistorial {
  return ESTADO_SERVIDOR;
}