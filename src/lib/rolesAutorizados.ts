import type { RolUsuario } from "@/types/schema";

export type AccionSistema =
  | "ver_dashboard"
  | "ver_mapa"
  | "gestionar_contenedores"
  | "vaciar_contenedor"
  | "editar_contenedor"
  | "eliminar_contenedor"
  | "optimizar_rutas"
  | "exportar_reportes"
  | "usar_ia_predictiva"
  | "administrar_roles"
  | "aprobar_solicitudes"
  | "separacion_residuos"
  | "reciclar"
  | "ver_historial";

const PERMISOS: Record<RolUsuario, AccionSistema[]> = {
  Admin: [
    "ver_dashboard",
    "ver_mapa",
    "gestionar_contenedores",
    "vaciar_contenedor",
    "editar_contenedor",
    "eliminar_contenedor",
    "optimizar_rutas",
    "exportar_reportes",
    "usar_ia_predictiva",
    "administrar_roles",
    "aprobar_solicitudes",
    "separacion_residuos",
    "reciclar",
    "ver_historial",
  ],
  Gerente: [
    "ver_dashboard",
    "ver_mapa",
    "vaciar_contenedor",
    "editar_contenedor",
    "optimizar_rutas",
    "aprobar_solicitudes",
    "exportar_reportes",
    "usar_ia_predictiva",
    "ver_historial",
    "separacion_residuos",
  ],
  Operador: [
    "ver_mapa",
    "vaciar_contenedor",
    "optimizar_rutas",
    "ver_historial",
    "separacion_residuos",
  ],
  Ciudadano: [
    "ver_mapa",
    "separacion_residuos",
    "reciclar",
  ],
};

export function puede(rol: RolUsuario, accion: AccionSistema): boolean {
  if (rol === "Admin") return true;
  return PERMISOS[rol]?.includes(accion) ?? false;
}

export const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  Admin: "Administrador",
  Gerente: "Gerente",
  Operador: "Recolector",
  Ciudadano: "Ciudadano",
};
