export type TipoNotificacionToast = "exito" | "error" | "info" | "advertencia";

export interface NotificacionToast {
  id: number;
  tipo: TipoNotificacionToast;
  titulo: string;
  detalle?: string;
}

const TIEMPO_VISIBLE_MS = 4500;

let notificaciones: NotificacionToast[] = [];
let siguienteId = 1;
const subscriptores = new Set<() => void>();
const temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

function notificar(): void {
  for (const subscriptor of subscriptores) subscriptor();
}

export function suscribirseAToasts(onCambio: () => void): () => void {
  subscriptores.add(onCambio);
  return () => {
    subscriptores.delete(onCambio);
  };
}

export function obtenerSnapshotToasts(): NotificacionToast[] {
  return notificaciones;
}

export function obtenerSnapshotServidorToasts(): NotificacionToast[] {
  return [];
}

export function descartarToast(id: number): void {
  const temporizador = temporizadores.get(id);
  if (temporizador) {
    clearTimeout(temporizador);
    temporizadores.delete(id);
  }
  const cantidadPrevia = notificaciones.length;
  notificaciones = notificaciones.filter(
    (notificacion) => notificacion.id !== id
  );
  if (notificaciones.length !== cantidadPrevia) notificar();
}

export function mostrarToast(
  titulo: string,
  detalle?: string,
  tipo: TipoNotificacionToast = "info"
): void {
  const id = siguienteId++;
  notificaciones = [...notificaciones, { id, tipo, titulo, detalle }];
  notificar();
  temporizadores.set(
    id,
    setTimeout(() => descartarToast(id), TIEMPO_VISIBLE_MS)
  );
}