"use client";

import { useEffect, useState, useCallback } from "react";
import {
  estaSupabaseConfigurado,
  getSupabaseClient,
} from "@/lib/supabaseClient";
import { aceptarRuta, rechazarRuta } from "@/lib/operadoresService";
import type { Database, Notificacion } from "@/types/schema";

interface NotificacionesOperadorProps {
  usuarioId: string;
  onRutaAceptada?: () => void;
}

function formatearFecha(fecha: string): string {
  const d = new Date(fecha);
  const ahora = new Date();
  const diffMs = ahora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  return `Hace ${diffDias}d`;
}

export default function NotificacionesOperador({
  usuarioId,
  onRutaAceptada,
}: NotificacionesOperadorProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [accionandoId, setAccionandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!estaSupabaseConfigurado()) {
      setCargando(false);
      return;
    }

    const supabase = getSupabaseClient();
    supabase
      .from("Notificaciones")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("fecha_envio", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) {
          setNotificaciones(data as Notificacion[]);
        }
        setCargando(false);
      });
  }, [usuarioId]);

  const marcarLeida = useCallback(async (id: string) => {
    if (!estaSupabaseConfigurado()) return;
    const supabase = getSupabaseClient();
    await supabase
      .from("Notificaciones")
      .update({ leida: true } as Database["public"]["Tables"]["Notificaciones"]["Update"])
      .eq("id", id);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }, []);

  const handleAceptar = useCallback(
    async (notif: Notificacion) => {
      const rutaId = notif.enlace;
      if (!rutaId) return;

      setAccionandoId(notif.id);
      try {
        await aceptarRuta(rutaId);
        await marcarLeida(notif.id);
        onRutaAceptada?.();
      } catch (err) {
        console.error("Error al aceptar ruta:", err);
      } finally {
        setAccionandoId(null);
      }
    },
    [marcarLeida, onRutaAceptada]
  );

  const handleRechazar = useCallback(
    async (notif: Notificacion) => {
      const rutaId = notif.enlace;
      if (!rutaId) return;

      setAccionandoId(notif.id);
      try {
        await rechazarRuta(rutaId);
        await marcarLeida(notif.id);
      } catch (err) {
        console.error("Error al rechazar ruta:", err);
      } finally {
        setAccionandoId(null);
      }
    },
    [marcarLeida]
  );

  if (cargando) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cargando notificaciones…
        </p>
      </div>
    );
  }

  if (notificaciones.length === 0) {
    return null;
  }

  const noLeidas = notificaciones.filter((n) => !n.leida);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          Notificaciones
          {noLeidas.length > 0 && (
            <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {noLeidas.length}
            </span>
          )}
        </h3>
      </div>

      <ul className="mt-3 space-y-2">
        {notificaciones.map((notif) => {
          const esAsignacion = notif.tipo === "asignacion_ruta";
          const estaAccionando = accionandoId === notif.id;

          return (
            <li
              key={notif.id}
              className={`rounded-lg border px-3 py-2 ${
                notif.leida
                  ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                  : "border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-900/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {notif.mensaje}
                </p>
                <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
                  {formatearFecha(notif.fecha_envio)}
                </span>
              </div>

              {esAsignacion && !notif.leida && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleAceptar(notif)}
                    disabled={estaAccionando}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {estaAccionando ? "Procesando…" : "Aceptar Ruta"}
                  </button>
                  <button
                    onClick={() => handleRechazar(notif)}
                    disabled={estaAccionando}
                    className="rounded-lg bg-zinc-200 px-3 py-1 text-[10px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  >
                    {estaAccionando ? "Procesando…" : "Rechazar"}
                  </button>
                </div>
              )}

              {!esAsignacion && !notif.leida && (
                <button
                  onClick={() => marcarLeida(notif.id)}
                  className="mt-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Marcar como leída
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}