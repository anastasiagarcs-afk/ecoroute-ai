"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { estaSupabaseConfigurado, getSupabaseClient } from "@/lib/supabaseClient";
import {
  obtenerAlertasGlobales,
  marcarAlertaResuelta,
  eliminarAlerta,
  filtrarAlertas,
  type FiltroAlertas,
  type AlertaConContenedor,
} from "@/lib/alertasService";
import { mostrarToast } from "@/lib/toastStore";

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBadgeTipo(tipo: string) {
  if (tipo === "alerta_llenado") {
    return {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      ring: "ring-red-600/20 dark:ring-red-400/30",
      label: "Alerta de Llenado",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    };
  }
  return {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    ring: "ring-violet-600/20 dark:ring-violet-400/30",
    label: "Alerta Predictiva (IA)",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };
}

function puedeResolver(alerta: AlertaConContenedor): boolean {
  if (alerta.atendida) return false;
  if (alerta.contenedor_nivel_llenado !== null && alerta.contenedor_nivel_llenado >= 80) return false;
  return true;
}

export default function PanelAlertas() {
  const [alertas, setAlertas] = useState<AlertaConContenedor[]>([]);
  const [filtro, setFiltro] = useState<FiltroAlertas>("pendientes");
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const canceladoRef = useRef(false);

  const cargarAlertas = useCallback(async () => {
    if (!estaSupabaseConfigurado()) {
      setAlertas([]);
      setCargando(false);
      return;
    }
    const data = await obtenerAlertasGlobales();
    if (!canceladoRef.current) {
      setAlertas(data);
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    canceladoRef.current = false;
    cargarAlertas();
    return () => { canceladoRef.current = true; };
  }, [cargarAlertas]);

  // Realtime subscription
  useEffect(() => {
    if (!estaSupabaseConfigurado()) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`panel-alertas-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Notificaciones",
        },
        () => {
          if (!canceladoRef.current) {
            cargarAlertas();
          }
        }
      )
      .subscribe();

    return () => {
      canceladoRef.current = true;
      supabase.removeChannel(channel);
    };
  }, [cargarAlertas]);

  const handleMarcarResuelta = useCallback(async (id: string, contenedorId?: string | null, codigoContenedor?: string | null) => {
    setProcesandoId(id);
    const exito = await marcarAlertaResuelta(id, contenedorId, codigoContenedor);
    if (exito) {
      await cargarAlertas();
      mostrarToast(
        "Alerta resuelta",
        contenedorId || codigoContenedor
          ? "Alerta del contenedor resuelta (alertas anteriores eliminadas)."
          : "La alerta fue marcada como atendida.",
        "exito"
      );
    } else {
      mostrarToast("Error", "No se pudo marcar la alerta como resuelta.", "error");
    }
    setProcesandoId(null);
  }, [cargarAlertas]);

  const handleEliminar = useCallback(async (id: string) => {
    setProcesandoId(id);
    const exito = await eliminarAlerta(id);
    if (exito) {
      setAlertas((prev) => prev.filter((a) => a.id !== id));
      mostrarToast("Alerta eliminada", "La alerta fue eliminada permanentemente.", "exito");
    } else {
      mostrarToast("Error", "No se pudo eliminar la alerta.", "error");
    }
    setProcesandoId(null);
  }, []);

  const alertasFiltradas = filtrarAlertas(alertas, filtro);
  const pendientesCount = alertas.filter((a) => !a.atendida).length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header with filters */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Alertas del Sistema
          </h3>
          {pendientesCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendientesCount}
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          {(["todas", "pendientes", "resueltas"] as FiltroAlertas[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filtro === f
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando alertas...
          </span>
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <span className="text-2xl">✅</span>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {filtro === "todas"
              ? "No hay alertas registradas"
              : filtro === "pendientes"
              ? "No hay alertas pendientes"
              : "No hay alertas resueltas"}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {filtro === "pendientes"
              ? "Todas las alertas han sido atendidas."
              : "Las alertas aparecerán aquí cuando se detecten contenedores críticos."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {alertasFiltradas.map((alerta) => {
                const badge = getBadgeTipo(alerta.tipo);
                const nivel = alerta.contenedor_nivel_llenado;
                const deshabilitado = !puedeResolver(alerta);
                const enRiesgo = nivel !== null && nivel >= 80;
                const codigo = alerta.contenedor_codigo;

                return (
                  <tr
                    key={alerta.id}
                    className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950 ${
                      alerta.atendida ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {alerta.mensaje}
                    </td>
                    <td className="px-4 py-3">
                      {nivel !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            enRiesgo
                              ? "bg-red-100 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-400/30"
                              : "bg-emerald-100 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-400/30"
                          }`}
                        >
                          {enRiesgo && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          )}
                          {Math.round(nivel)}%
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {alerta.atendida ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Resuelta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-500">
                      {formatearFecha(alerta.fecha_envio)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!alerta.atendida && (
                          <div className="relative inline-flex items-center">
                            <button
                              type="button"
                              disabled={deshabilitado || procesandoId === alerta.id}
                              onClick={() => handleMarcarResuelta(alerta.id, alerta.contenedor_id, alerta.contenedor_codigo)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
                                deshabilitado
                                  ? "cursor-not-allowed bg-zinc-400 dark:bg-zinc-600"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                              title={
                                deshabilitado
                                  ? codigo
                                    ? `No se puede resolver: El contenedor ${codigo} aun supera el 80% de capacidad`
                                    : "No se puede resolver: El contenedor aun supera el 80% de capacidad"
                                  : alerta.contenedor_id
                                  ? codigo
                                    ? `Marcar como resuelta (afecta todas las alertas de ${codigo})`
                                    : "Marcar como resuelta (afecta todas las alertas de este contenedor)"
                                  : "Marcar como resuelta"
                              }
                            >
                              {procesandoId === alerta.id ? "..." : "Resolver"}
                            </button>
                            {enRiesgo && (
                              <span
                                className="ml-1 text-amber-500"
                                title={codigo
                                  ? `No se puede resolver: El contenedor ${codigo} aun supera el 80% de capacidad`
                                  : "No se puede resolver: El contenedor aun supera el 80% de capacidad"
                                }
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </span>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={procesandoId === alerta.id}
                          onClick={() => handleEliminar(alerta.id)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Eliminar alerta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
