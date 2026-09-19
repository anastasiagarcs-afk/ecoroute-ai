"use client";

import { useEffect, useRef, useState } from "react";
import { Battery, Thermometer, WifiOff } from "lucide-react";
import {
  detectarAnomalias,
  type LecturaAnomala,
  type TipoAnomalia,
} from "@/lib/anomaliasService";
import { estaSupabaseConfigurado, getSupabaseClient } from "@/lib/supabaseClient";

const ETIQUETAS_TIPO: Record<TipoAnomalia, string> = {
  bateria_baja: "Bateria critica",
  alta_temperatura: "Alta temperatura",
  sin_senal: "Sin senal",
};

const COLORES_FILA: Record<TipoAnomalia, string> = {
  bateria_baja:
    "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10",
  alta_temperatura:
    "border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/10",
  sin_senal:
    "border-l-4 border-l-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/10",
};

const COLORES_BADGE: Record<TipoAnomalia, string> = {
  bateria_baja:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  alta_temperatura:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  sin_senal:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

function colorFilaPreferido(tipos: TipoAnomalia[]): string {
  if (tipos.includes("alta_temperatura")) return COLORES_FILA.alta_temperatura;
  if (tipos.includes("bateria_baja")) return COLORES_FILA.bateria_baja;
  return COLORES_FILA.sin_senal;
}

export default function AnomaliasPanel() {
  const [anomalias, setAnomalias] = useState<LecturaAnomala[]>([]);
  const [cargando, setCargando] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null>(null);

  useEffect(() => {
    detectarAnomalias().then((a) => {
      setAnomalias(a);
      setCargando(false);
    });

    if (!estaSupabaseConfigurado()) return;
    const supabase = getSupabaseClient();

    channelRef.current = supabase
      .channel("anomalias-panel-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "LecturasSensores" },
        () => {
          detectarAnomalias().then(setAnomalias);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const bateriaCritica = anomalias.filter((a) =>
    a.tipos.includes("bateria_baja")
  ).length;
  const altaTemp = anomalias.filter((a) =>
    a.tipos.includes("alta_temperatura")
  ).length;
  const sinSenal = anomalias.filter((a) =>
    a.tipos.includes("sin_senal")
  ).length;

  if (cargando) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Cargando datos de sensores...
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/40 bg-amber-950/20 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/15 text-amber-400">
            <Battery className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {bateriaCritica}
            </p>
            <p className="text-sm font-medium text-zinc-400">
              Bateria critica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-rose-500/40 bg-rose-950/20 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/15 text-rose-400">
            <Thermometer className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {altaTemp}
            </p>
            <p className="text-sm font-medium text-zinc-400">
              Alta temperatura
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-500/40 bg-zinc-950/20 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-500/20 bg-zinc-500/15 text-zinc-400">
            <WifiOff className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {sinSenal}
            </p>
            <p className="text-sm font-medium text-zinc-400">Sin senal</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Sensores en Alerta ({anomalias.length})
          </h3>
        </div>

        {anomalias.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No se detectaron anomalias activas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-5 py-2.5">Codigo</th>
                  <th className="px-5 py-2.5">Zona</th>
                  <th className="px-5 py-2.5">Anomalias</th>
                  <th className="px-5 py-2.5">Bateria</th>
                  <th className="px-5 py-2.5">Temp</th>
                  <th className="px-5 py-2.5">Ultima Lectura</th>
                  <th className="px-5 py-2.5">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {anomalias.map((a) => (
                  <tr
                    key={a.contenedorId}
                    className={`border-b border-zinc-50 dark:border-zinc-800/50 ${colorFilaPreferido(a.tipos)}`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {a.numeroIdentificacion}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {a.zona}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="flex flex-wrap gap-1">
                        {a.tipos.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${COLORES_BADGE[t]}`}
                          >
                            {ETIQUETAS_TIPO[t]}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {a.bateria !== null ? `${a.bateria}%` : "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {a.temperatura !== null ? `${a.temperatura}\u00B0C` : "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(a.ultimaLectura).toLocaleString("es-VE")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-300">
                      {a.nivelLlenado}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
