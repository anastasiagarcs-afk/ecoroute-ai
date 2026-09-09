import type { Contenedor, UbicacionPunto } from "@/types/schema";

export const UMBRAL_CRITICO = 80;
export const VELOCIDAD_DEFAULT_KMH = 30;
export const URL_OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

const RADIO_TIERRA_KM = 6371;
const TIEMPO_ESPERA_OSRM_MS = 12000;

export interface PuntoRuta {
  contenedor: Contenedor;
  distanciaDesdeAnteriorKm: number;
  distanciaAcumuladaKm: number;
}

export interface CoordenadaRuta {
  lat: number;
  lng: number;
}

export type FuenteRuta = "osrm" | "linea_recta";

export interface RutaOptimizada {
  puntos: PuntoRuta[];
  geometria: CoordenadaRuta[];
  contenedoresCriticos: number;
  contenedoresAtendidos: number;
  distanciaTotalKm: number;
  tiempoEstimadoMin: number;
  fuenteRuta: FuenteRuta;
}

export interface OpcionesOptimizacion {
  inicio?: UbicacionPunto | null;
  velocidadKmh?: number;
  minimoContenedores?: number;
  usarRedVial?: boolean;
}

export function distanciaHaversineKm(a: UbicacionPunto, b: UbicacionPunto): number {
  const aRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = aRad(b.lat - a.lat);
  const dLng = aRad(b.lng - a.lng);
  const latA = aRad(a.lat);
  const latB = aRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;

  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

export function esContenedorCritico(contenedor: Contenedor): boolean {
  return contenedor.nivel_llenado >= UMBRAL_CRITICO;
}

type ContenedorConUbicacion = Contenedor & { ubicacion: UbicacionPunto };

function conUbicacion(contenedores: Contenedor[]): ContenedorConUbicacion[] {
  return contenedores.filter(
    (contenedor): contenedor is ContenedorConUbicacion =>
      contenedor.ubicacion !== null
  );
}

interface SegmentoRuta {
  distanciaKm: number;
  duracionMin: number;
}

interface ResultadoOSRM {
  geometria: CoordenadaRuta[];
  segmentos: SegmentoRuta[];
  distanciaTotalKm: number;
  duracionTotalMin: number;
}

interface RespuestaOSRM {
  code: string;
  routes?: Array<{
    geometry?: { coordinates?: Array<[number, number]> };
    distance?: number;
    duration?: number;
    legs?: Array<{ distance?: number; duration?: number }>;
  }>;
}

function crearUrlOSRM(coordenadas: UbicacionPunto[]): string {
  const puntos = coordenadas.map((punto) => `${punto.lng},${punto.lat}`).join(";");
  return `${URL_OSRM_BASE}/${puntos}?overview=full&geometries=geojson&steps=false`;
}

async function consultarOSRM(coordenadas: UbicacionPunto[]): Promise<ResultadoOSRM> {
  const respuesta = await fetch(crearUrlOSRM(coordenadas), {
    signal: AbortSignal.timeout(TIEMPO_ESPERA_OSRM_MS),
  });

  if (!respuesta.ok) {
    throw new Error(`OSRM respondió con estado ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaOSRM;

  if (datos.code !== "Ok" || !datos.routes || datos.routes.length === 0) {
    throw new Error(`OSRM no encontró ruta (código: ${datos.code})`);
  }

  const ruta = datos.routes[0];
  const geometria: CoordenadaRuta[] = (ruta.geometry?.coordinates ?? []).map(
    ([lng, lat]) => ({ lat, lng })
  );
  const segmentos: SegmentoRuta[] = (ruta.legs ?? []).map((segmento) => ({
    distanciaKm: (segmento.distance ?? 0) / 1000,
    duracionMin: (segmento.duration ?? 0) / 60,
  }));

  return {
    geometria,
    segmentos,
    distanciaTotalKm: (ruta.distance ?? 0) / 1000,
    duracionTotalMin: (ruta.duration ?? 0) / 60,
  };
}

function seleccionarYOrdenar(
  contenedores: Contenedor[],
  minimoContenedores: number,
  inicio: UbicacionPunto | null
): { criticosCuenta: number; orden: ContenedorConUbicacion[] } {
  const conU = conUbicacion(contenedores);

  const criticos = conU
    .filter(esContenedorCritico)
    .sort((a, b) => b.nivel_llenado - a.nivel_llenado);

  const noCriticos = conU
    .filter((contenedor) => !esContenedorCritico(contenedor))
    .sort((a, b) => b.nivel_llenado - a.nivel_llenado);

  const seleccion = [...criticos];
  if (seleccion.length < minimoContenedores) {
    seleccion.push(...noCriticos.slice(0, minimoContenedores - seleccion.length));
  }

  const orden: ContenedorConUbicacion[] = [];
  const disponibles = [...seleccion];
  let actual = inicio ?? (seleccion[0]?.ubicacion ?? null);

  while (disponibles.length > 0 && actual !== null) {
    let mejorPunto = disponibles[0];
    let mejorDistancia = Infinity;

    for (const candidato of disponibles) {
      const distancia = distanciaHaversineKm(actual, candidato.ubicacion);
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        mejorPunto = candidato;
      }
    }

    orden.push(mejorPunto);
    actual = mejorPunto.ubicacion;
    disponibles.splice(disponibles.indexOf(mejorPunto), 1);
  }

  return { criticosCuenta: criticos.length, orden };
}

export async function optimizarRuta(
  contenedores: Contenedor[],
  opciones: OpcionesOptimizacion = {}
): Promise<RutaOptimizada> {
  const {
    inicio = null,
    velocidadKmh = VELOCIDAD_DEFAULT_KMH,
    minimoContenedores = 3,
    usarRedVial = true,
  } = opciones;

  const { criticosCuenta, orden } = seleccionarYOrdenar(
    contenedores,
    minimoContenedores,
    inicio
  );

  const puntosObjetivo = orden.map((contenedor) => contenedor.ubicacion);
  const waypoints = inicio ? [inicio, ...puntosObjetivo] : puntosObjetivo;

  let geometria: CoordenadaRuta[] = [];
  let segmentos: SegmentoRuta[] = [];
  let distanciaTotalKm = 0;
  let duracionTotalMin = 0;
  let fuenteRuta: FuenteRuta = "linea_recta";

  if (usarRedVial && waypoints.length >= 2) {
    try {
      const resultado = await consultarOSRM(waypoints);
      geometria = resultado.geometria;
      segmentos = resultado.segmentos;
      distanciaTotalKm = resultado.distanciaTotalKm;
      duracionTotalMin = resultado.duracionTotalMin;
      fuenteRuta = "osrm";
    } catch {
      fuenteRuta = "linea_recta";
    }
  }

  if (fuenteRuta === "linea_recta") {
    geometria = [...waypoints];

    segmentos = [];
    for (let i = 1; i < waypoints.length; i++) {
      const distanciaKm = distanciaHaversineKm(waypoints[i - 1], waypoints[i]);
      segmentos.push({
        distanciaKm,
        duracionMin: velocidadKmh > 0 ? (distanciaKm / velocidadKmh) * 60 : 0,
      });
    }

    distanciaTotalKm = segmentos.reduce((suma, segmento) => suma + segmento.distanciaKm, 0);
    duracionTotalMin = segmentos.reduce((suma, segmento) => suma + segmento.duracionMin, 0);
  }

  const desplazamiento = inicio ? 1 : 0;
  let acumulado = 0;

  const puntos: PuntoRuta[] = orden.map((contenedor, indice) => {
    const indiceSegmento = indice + desplazamiento - 1;
    const distanciaDesdeAnterior =
      indiceSegmento >= 0 && indiceSegmento < segmentos.length
        ? segmentos[indiceSegmento].distanciaKm
        : 0;
    acumulado += distanciaDesdeAnterior;

    return {
      contenedor,
      distanciaDesdeAnteriorKm: distanciaDesdeAnterior,
      distanciaAcumuladaKm: acumulado,
    };
  });

  return {
    puntos,
    geometria,
    contenedoresCriticos: criticosCuenta,
    contenedoresAtendidos: puntos.length,
    distanciaTotalKm,
    tiempoEstimadoMin: duracionTotalMin,
    fuenteRuta,
  };
}