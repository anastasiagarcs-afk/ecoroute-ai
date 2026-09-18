"use client";

import { useEffect, useState } from "react";
import { obtenerHistorialOperador } from "@/lib/operadoresService";
import { obtenerResumenesJornada, type ResumenJornadaGuardado } from "@/lib/jornadaService";
import { aIntervalo } from "@/lib/historialRutas";
import type { Ruta } from "@/types/schema";

interface HistorialOperadorProps {
  operadorId: string;
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearTiempo(iso: string | null): string {
  if (!iso) return "—";
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) return iso;
  const horas = Number(match[1] ?? 0);
  const mins = Number(match[2] ?? 0);
  if (horas === 0 && mins === 0) return "—";
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins} min`;
}

function formatearHora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeTipoCierre(tipo: "parcial" | "final") {
  if (tipo === "final") {
    return (
      <span className="inline-block rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300">
        Cierre Final Diario
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800/40 dark:text-amber-300">
      Cierre Parcial / Intermedio
    </span>
  );
}

function calcularTiempoEntre(inicio: string, fin: string): number {
  const start = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function badgeEstado(estado: string) {
  switch (estado) {
    case "completada":
      return (
        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Completada
        </span>
      );
    case "rechazada":
      return (
        <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Rechazada
        </span>
      );
    case "cancelada":
      return (
        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Cancelada
        </span>
      );
    case "finalizada_incompleta":
      return (
        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Incompleta
        </span>
      );
    default:
      return (
        <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {estado}
        </span>
      );
  }
}

export default function HistorialOperador({
  operadorId,
}: HistorialOperadorProps) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [jornadas, setJornadas] = useState<ResumenJornadaGuardado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const toggleExpandida = (rutaId: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(rutaId)) next.delete(rutaId);
      else next.add(rutaId);
      return next;
    });
  };

  useEffect(() => {
    Promise.all([
      obtenerHistorialOperador(operadorId),
      obtenerResumenesJornada(operadorId),
    ]).then(([rutasData, jornadasData]) => {
      setRutas(rutasData);
      setJornadas(jornadasData);
      setCargando(false);
    });
  }, [operadorId]);

  if (cargando) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cargando historial…
        </p>
      </div>
    );
  }

  if (rutas.length === 0 && jornadas.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Mi Historial de Rutas
        </h3>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Aún no has completado rutas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Mi Historial
      </h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Columna Izquierda: Jornadas */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Jornadas ({jornadas.length})
          </h4>

          {jornadas.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Aún no has cerrado jornadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {jornadas.map((j) => {
                const minutosReales = j.fecha_inicio
                  ? calcularTiempoEntre(j.fecha_inicio, j.fecha_ejecucion)
                  : null;
                const tiempoRealIso =
                  minutosReales != null ? aIntervalo(minutosReales) : j.tiempoReal;
                const esFinal = j.tipo_cierre === "final";

                return (
                  <li
                    key={j.id}
                    className={`rounded-lg border px-3 py-2 ${esFinal ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20" : "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-medium ${esFinal ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
                          {esFinal ? "Cierre Final" : "Cierre Parcial"}
                        </p>
                        <p className={`mt-0.5 text-[10px] ${esFinal ? "text-emerald-700/80 dark:text-emerald-400/70" : "text-amber-600/80 dark:text-amber-400/70"}`}>
                          {j.rutasEjecutadas} ruta{j.rutasEjecutadas !== 1 ? "s" : ""} ·{" "}
                          {j.kmTotales.toFixed(1)} km ·{" "}
                          {formatearTiempo(tiempoRealIso)}
                          {j.combustibleConsumido != null &&
                            ` · ${j.combustibleConsumido.toFixed(1)} L`}
                        </p>
                        <p className={`mt-0.5 text-[10px] ${esFinal ? "text-emerald-700/70 dark:text-emerald-400/60" : "text-amber-600/70 dark:text-amber-400/60"}`}>
                          {j.fecha_inicio
                            ? `Inicio: ${formatearHora(j.fecha_inicio)} → Fin: ${formatearHora(
                                j.fecha_ejecucion
                              )}`
                            : `Cierre: ${formatearHora(j.fecha_ejecucion)}`}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] ${esFinal ? "text-emerald-700/70 dark:text-emerald-400/60" : "text-amber-600/70 dark:text-amber-400/60"}`}>
                        {formatearFecha(j.fecha_ejecucion)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {badgeTipoCierre(j.tipo_cierre)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Columna Derecha: Rutas Completadas */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Rutas Completadas ({rutas.length})
          </h4>

          {rutas.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Aún no has completado rutas.
            </p>
          ) : (
            <ul className="space-y-2">
              {rutas.map((ruta) => {
                const expandida = expandidas.has(ruta.id);
                const contenedoresCount = ruta.contenedores_asignados?.length ?? 0;
                return (
                  <li
                    key={ruta.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {ruta.nombre}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {contenedoresCount} contenedor(es) ·{" "}
                          {ruta.distancia_total ? `${ruta.distancia_total} km` : "—"} ·{" "}
                          {ruta.tiempo_estimado ?? "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleExpandida(ruta.id)}
                        className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        title={expandida ? "Contraer detalles" : "Expandir detalles"}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform ${expandida ? "rotate-180" : ""}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      {badgeEstado(ruta.estado)}
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {ruta.ultima_ejecucion
                          ? formatearFecha(ruta.ultima_ejecucion)
                          : formatearFecha(ruta.fecha_creacion)}
                      </span>
                    </div>
                    {expandida && (
                      <div className="mt-2 space-y-1 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">ID:</span>{" "}
                          {ruta.id}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Contenedores:</span>{" "}
                          {contenedoresCount}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Distancia:</span>{" "}
                          {ruta.distancia_total ? `${ruta.distancia_total} km` : "—"}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Tiempo estimado:</span>{" "}
                          {ruta.tiempo_estimado ?? "—"}
                        </p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Finalizada:</span>{" "}
                          {ruta.ultima_ejecucion ? formatearFecha(ruta.ultima_ejecucion) : "—"}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
