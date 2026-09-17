"use client";

import { useEffect, useState } from "react";
import { obtenerHistorialOperador } from "@/lib/operadoresService";
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

export default function HistorialOperador({
  operadorId,
}: HistorialOperadorProps) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerHistorialOperador(operadorId).then((data) => {
      setRutas(data);
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

  if (rutas.length === 0) {
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
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Mi Historial de Rutas
        <span className="ml-2 text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
          ({rutas.length} ruta{rutas.length !== 1 ? "s" : ""})
        </span>
      </h3>

      <ul className="mt-3 space-y-2">
        {rutas.map((ruta) => (
          <li
            key={ruta.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {ruta.nombre}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                  {ruta.contenedores_asignados?.length ?? 0} contenedor(es) ·{" "}
                  {ruta.distancia_total
                    ? `${ruta.distancia_total} km`
                    : "—"}{" "}
                  · {ruta.tiempo_estimado ?? "—"}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">
                {ruta.ultima_ejecucion
                  ? formatearFecha(ruta.ultima_ejecucion)
                  : formatearFecha(ruta.fecha_creacion)}
              </span>
            </div>
            <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Completada
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}