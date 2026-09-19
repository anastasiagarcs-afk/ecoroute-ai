export const ZONAS_PREDEFINIDAS = [
  "Alta Vista",
  "Puerto Ordaz",
  "San Félix",
  "Unare",
  "Zona Centro",
] as const;

export type Zona = (typeof ZONAS_PREDEFINIDAS)[number];
