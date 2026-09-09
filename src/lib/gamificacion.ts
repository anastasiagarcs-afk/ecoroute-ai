import type { MaterialReciclaje } from "@/types/schema";

export interface ReglaMaterialGamificacion {
  material: MaterialReciclaje;
  nombre: string;
  puntosPorKg: number;
  claseAcento: string;
  claseBadge: string;
}

export const MATERIALES_GAMIFICACION: ReglaMaterialGamificacion[] = [
  {
    material: "organico",
    nombre: "Orgánico",
    puntosPorKg: 1,
    claseAcento:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    claseBadge: "bg-emerald-500",
  },
  {
    material: "plastico",
    nombre: "Plástico",
    puntosPorKg: 2,
    claseAcento:
      "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    claseBadge: "bg-blue-500",
  },
  {
    material: "vidrio",
    nombre: "Vidrio",
    puntosPorKg: 2,
    claseAcento:
      "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    claseBadge: "bg-teal-500",
  },
  {
    material: "papel_carton",
    nombre: "Papel / Cartón",
    puntosPorKg: 3,
    claseAcento:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    claseBadge: "bg-amber-500",
  },
  {
    material: "metal",
    nombre: "Metal",
    puntosPorKg: 4,
    claseAcento:
      "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    claseBadge: "bg-violet-500",
  },
];

export function obtenerReglaMaterialGamificacion(
  material: MaterialReciclaje
): ReglaMaterialGamificacion | undefined {
  return MATERIALES_GAMIFICACION.find((regla) => regla.material === material);
}

export function redondearKg(cantidad: number): number {
  if (!Number.isFinite(cantidad)) return 0;
  return Math.round(cantidad * 100) / 100;
}

export function calcularPuntosGamificacion(
  material: MaterialReciclaje,
  cantidadKg: number
): number {
  const regla = obtenerReglaMaterialGamificacion(material);
  if (!regla) return 0;
  const kg = redondearKg(cantidadKg);
  if (kg <= 0) return 0;
  return Math.round(kg * regla.puntosPorKg);
}

export interface NivelGamificacion {
  nombre: string;
  minimo: number;
  maximo: number | null;
}

export const NIVELES_GAMIFICACION: NivelGamificacion[] = [
  { nombre: "Principiante", minimo: 0, maximo: 99 },
  { nombre: "Reciclador Activo", minimo: 100, maximo: 249 },
  { nombre: "Eco Héroe", minimo: 250, maximo: 499 },
  { nombre: "Guardián Ambiental", minimo: 500, maximo: null },
];

export interface ProgresoNivel {
  nombre: string;
  puntosActuales: number;
  puntosParaSiguiente: number | null;
  siguienteNombre: string | null;
  porcentaje: number;
  esMaximo: boolean;
}

export function obtenerProgresoNivel(puntos: number): ProgresoNivel {
  const indice = NIVELES_GAMIFICACION.findIndex(
    (nivel) =>
      puntos >= nivel.minimo &&
      (nivel.maximo === null || puntos <= nivel.maximo)
  );
  const actual = NIVELES_GAMIFICACION[indice] ?? NIVELES_GAMIFICACION[0];
  const siguiente = NIVELES_GAMIFICACION[indice + 1] ?? null;

  if (!siguiente) {
    return {
      nombre: actual.nombre,
      puntosActuales: puntos,
      puntosParaSiguiente: null,
      siguienteNombre: null,
      porcentaje: 100,
      esMaximo: true,
    };
  }

  const topeNivel = actual.maximo ?? 0;
  const base = Math.max(0, topeNivel - actual.minimo);
  const progreso =
    base > 0 ? ((puntos - actual.minimo) / base) * 100 : 0;

  return {
    nombre: actual.nombre,
    puntosActuales: puntos,
    puntosParaSiguiente: Math.max(0, siguiente.minimo - puntos),
    siguienteNombre: siguiente.nombre,
    porcentaje: Math.min(100, Math.max(0, Math.round(progreso))),
    esMaximo: false,
  };
}

export interface RecompensaGamificacion {
  id: string;
  nombre: string;
  descripcion: string;
  beneficio: string;
  costoPuntos: number;
}

export const CATALOGO_RECOMPENSAS: RecompensaGamificacion[] = [
  {
    id: "descuento_cafeteria",
    nombre: "10% en cafetería",
    descripcion:
      "Cupón de descuento válido en la cafetería del campus universitario.",
    beneficio: "Cupón de descuento",
    costoPuntos: 40,
  },
  {
    id: "entrada_cine_2x1",
    nombre: "2x1 en cine",
    descripcion:
      "Pase 2x1 para una función de cine en Ciudad Guayana.",
    beneficio: "Ocio y entretenimiento",
    costoPuntos: 80,
  },
  {
    id: "kit_separacion",
    nombre: "Kit de separación en casa",
    descripcion:
      "Set de bolsas y etiquetas reutilizables para separar residuos en el hogar.",
    beneficio: "Producto ecológico",
    costoPuntos: 150,
  },
  {
    id: "descuento_tienda_eco",
    nombre: "20% en tienda ecológica",
    descripcion:
      "Descuento en artículos reutilizables y de bajo impacto ambiental.",
    beneficio: "Cupón de descuento",
    costoPuntos: 200,
  },
  {
    id: "jornada_siembra",
    nombre: "Jornada de siembra comunitaria",
    descripcion:
      "Participación en una jornada de reforestación en Ciudad Guayana.",
    beneficio: "Experiencia ambiental",
    costoPuntos: 300,
  },
  {
    id: "reconocimiento_ecociudadano",
    nombre: "Reconocimiento EcoCiudadano",
    descripcion:
      "Mención pública municipal como ciudadano destacado en reciclaje.",
    beneficio: "Reconocimiento",
    costoPuntos: 500,
  },
];