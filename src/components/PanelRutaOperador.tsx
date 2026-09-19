"use client";

import { useState, useCallback } from "react";
import { vaciarContenedoresLote } from "@/lib/contenedoresStore";
import { marcarRutaCompletada } from "@/lib/operadoresService";
import type { Contenedor, Ruta } from "@/types/schema";

interface PanelRutaOperadorProps {
  ruta: Ruta;
  contenedores: Contenedor[];
  onRutaCompletada?: () => void;
  onContenedorVaciado?: () => void;
  onCerrar?: () => void;
}

function formatearDistancia(km: number | null): string {
  if (km == null) return "—";
  return `${km.toFixed(2)} km`;
}

export default function PanelRutaOperador({
  ruta,
  contenedores,
  onRutaCompletada,
  onContenedorVaciado,
  onCerrar,
}: PanelRutaOperadorProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contenedoresRuta = contenedores.filter((c) =>
    ruta.contenedores_asignados.includes(c.id)
  );

  const total = contenedoresRuta.length;
  const vaciados = contenedoresRuta.filter(
    (c) => c.nivel_llenado === 0
  ).length;

  const rutaCompletada = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);

    try {
      const idsPendientes = contenedoresRuta
        .filter((c) => c.nivel_llenado > 0)
        .map((c) => c.id);

      if (idsPendientes.length > 0) {
        try {
          await vaciarContenedoresLote(idsPendientes);
          onContenedorVaciado?.();
        } catch (err) {
          console.warn(
            "[EcoRoute] Error al vaciar contenedores (no bloqueante):",
            err instanceof Error ? err.message : err
          );
        }
      }

      const exito = await marcarRutaCompletada(ruta.id);
      if (exito) {
        onRutaCompletada?.();
      } else {
        setError("No se pudo completar la ruta. Verifica tu conexión o permisos.");
      }
    } catch {
      setError("No se pudo completar la ruta");
    } finally {
      setGuardando(false);
    }
  }, [guardando, contenedoresRuta, ruta, onRutaCompletada]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {ruta.nombre}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {total} contenedor(es) · {formatearDistancia(ruta.distancia_total)} ·{" "}
            {ruta.tiempo_estimado ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              ruta.estado === "en_progreso"
                ? "bg-blue-600 text-white"
                : ruta.estado === "completada"
                  ? "bg-emerald-600 text-white"
                  : ruta.estado === "cancelada"
                    ? "bg-red-600 text-white"
                    : "bg-amber-600 text-white"
            }`}
          >
            {ruta.estado === "en_progreso"
              ? "En Progreso"
              : ruta.estado === "completada"
                ? "Completada"
                : ruta.estado === "cancelada"
                  ? "Cancelada"
                  : "Aceptada"}
          </span>
          {onCerrar && (
            <button
              onClick={onCerrar}
              className="shrink-0 p-1 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              title="Cerrar panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Progreso</span>
          <span>
            {vaciados} de {total} vaciados
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${total > 0 ? (vaciados / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {contenedoresRuta.map((c) => {
          const nivel = Math.round(c.nivel_llenado);
          const colorNivel =
            nivel === 0
              ? "bg-emerald-500"
              : nivel <= 50
                ? "bg-amber-500"
                : "bg-red-500";
          const estaVaciado = c.nivel_llenado === 0;

          return (
            <li
              key={c.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                estaVaciado
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {c.numero_identificacion}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {c.zona ?? "Sin zona"} · {c.tipo_residuo}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className={`h-2 w-2 rounded-full ${colorNivel}`} />
                  {nivel}%
                </span>
                {estaVaciado ? (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Vaciado
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-3">
        <button
          onClick={rutaCompletada}
          disabled={guardando}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Procesando…" : "Ruta Completada"}
        </button>
      </div>
    </div>
  );
}
