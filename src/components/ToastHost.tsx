"use client";

import { useSyncExternalStore } from "react";
import {
  descartarToast,
  obtenerSnapshotServidorToasts,
  obtenerSnapshotToasts,
  suscribirseAToasts,
  type TipoNotificacionToast,
} from "@/lib/toastStore";

interface EstiloToast {
  icono: string;
  claseTarjeta: string;
  claseIcono: string;
  ariaViva: "polite" | "assertive";
}

const ESTILOS_POR_TIPO: Record<TipoNotificacionToast, EstiloToast> = {
  exito: {
    icono: "M5 13l4 4L19 7",
    claseTarjeta:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    claseIcono: "bg-emerald-600",
    ariaViva: "polite",
  },
  error: {
    icono: "M6 6l12 12M18 6L6 18",
    claseTarjeta:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
    claseIcono: "bg-red-600",
    ariaViva: "assertive",
  },
  info: {
    icono: "M12 7h.01M12 11v5",
    claseTarjeta:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
    claseIcono: "bg-sky-600",
    ariaViva: "polite",
  },
};

export default function ToastHost() {
  const notificaciones = useSyncExternalStore(
    suscribirseAToasts,
    obtenerSnapshotToasts,
    obtenerSnapshotServidorToasts
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {notificaciones.map((notificacion) => {
        const estilo =
          ESTILOS_POR_TIPO[notificacion.tipo] ?? ESTILOS_POR_TIPO.info;
        return (
          <div
            key={notificacion.id}
            role="status"
            aria-live={estilo.ariaViva}
            className={`toast-entrada pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg ${estilo.claseTarjeta}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${estilo.claseIcono} text-white`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d={estilo.icono} />
              </svg>
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-sm font-semibold">{notificacion.titulo}</p>
              {notificacion.detalle && (
                <p className="mt-0.5 text-xs opacity-90">
                  {notificacion.detalle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => descartarToast(notificacion.id)}
              aria-label="Cerrar notificación"
              className="-m-1 rounded-lg p-1 text-current opacity-60 transition-opacity hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="h-4 w-4"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}