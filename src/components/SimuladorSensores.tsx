"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { obtenerSnapshotSesion, suscribirseASesion } from "@/lib/authService";

const INTERVALO_MS = 10_000;

function SimuladorInterno() {
  const [activo, setActivo] = useState(false);
  const [ultimaEjecucion, setUltimaEjecucion] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ejecutarSimulacion = async () => {
    setEjecutando(true);
    try {
      const res = await fetch("/api/simular-sensores", { method: "POST" });
      const data = await res.json();
      setUltimaEjecucion(new Date().toLocaleTimeString("es-VE"));
      if (!res.ok) {
        console.error("[Simulador] Error del servidor:", data);
      } else {
        console.log("[Simulador] Ejecutado:", data);
      }
    } catch (err) {
      console.error("[Simulador] Error de red:", err);
    } finally {
      setEjecutando(false);
    }
  };

  useEffect(() => {
    if (activo) {
      void ejecutarSimulacion();
      intervalRef.current = setInterval(ejecutarSimulacion, INTERVALO_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activo]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setActivo(!activo)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          activo ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
        aria-pressed={activo}
      >
        <span
          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
            activo ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Simulador de Sensores
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {activo
            ? ejecutando
              ? "Ejecutando..."
              : `Activo (cada 10s)${ultimaEjecucion ? ` — Ultimo: ${ultimaEjecucion}` : ""}`
            : "Inactivo"}
        </span>
      </div>
    </div>
  );
}

export default function SimuladorSensores() {
  const sesion = useSyncExternalStore(
    suscribirseASesion,
    obtenerSnapshotSesion,
    () => null
  );
  if (!sesion || sesion.rol !== "Gerente") return null;
  return <SimuladorInterno />;
}
