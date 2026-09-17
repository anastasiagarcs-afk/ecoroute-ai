"use client";

import type { ResumenJornada } from "@/lib/jornadaService";

interface CierreJornadaModalProps {
  resumen: ResumenJornada;
  onConfirmar: () => void;
  onCancelar: () => void;
  guardando: boolean;
}

function formatearTiempo(minutos: number): string {
  if (minutos === 0) return "0 min";
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins} min`;
}

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-VE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CierreJornadaModal({
  resumen,
  onConfirmar,
  onCancelar,
  guardando,
}: CierreJornadaModalProps) {
  const hayTrabajo = resumen.rutasEjecutadas > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cierre-jornada"
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2
              id="titulo-cierre-jornada"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Cierre de Jornada
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatearFecha(resumen.fecha)}
            </p>
          </div>
        </div>

        {!hayTrabajo ? (
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay rutas completadas hoy para consolidar.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {resumen.rutasEjecutadas}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Rutas ejecutadas
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {resumen.kmTotales.toFixed(1)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Kilómetros totales
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {resumen.contenedoresVaciados}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Contenedores vaciados
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {formatearTiempo(resumen.tiempoTotalMinutos)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Duración total
                </p>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/40 dark:bg-amber-900/20">
              <svg
                className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
                />
              </svg>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Combustible estimado:{" "}
                <span className="font-bold">
                  {resumen.combustibleEstimadoLitros.toFixed(1)} L
                </span>
              </p>
            </div>

            {resumen.rutas.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Detalle por ruta
                </h3>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                  {resumen.rutas.map((ruta, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/50"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {ruta.nombre}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {ruta.distanciaKm.toFixed(1)} km ·{" "}
                        {ruta.contenedoresCount} cont.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={guardando || !hayTrabajo}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Confirmar Cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
