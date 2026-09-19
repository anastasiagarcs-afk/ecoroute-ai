"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  obtenerTodasLasLecturasAnomalas,
  type LecturaAnomala,
  type TipoAnomalia,
} from "@/lib/anomaliasService";
import { ZONAS_PREDEFINIDAS } from "@/lib/zonas";
import { estaSupabaseConfigurado, getSupabaseClient } from "@/lib/supabaseClient";

const ETIQUETAS_TIPO: Record<TipoAnomalia, string> = {
  bateria_baja: "Bateria critica",
  alta_temperatura: "Alta temperatura",
  sin_senal: "Sin senal",
};

const COLORES_BADGE: Record<TipoAnomalia, string> = {
  bateria_baja:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  alta_temperatura:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  sin_senal:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

function escaparCSV(valor: string | number | null): string {
  const texto = String(valor ?? "");
  if (/[;",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export default function HistorialAnomalias() {
  const [anomalias, setAnomalias] = useState<LecturaAnomala[]>([]);
  const [cargando, setCargando] = useState(true);
  const [zonaFiltro, setZonaFiltro] = useState("Todas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null>(null);

  useEffect(() => {
    obtenerTodasLasLecturasAnomalas().then((a) => {
      setAnomalias(a);
      setCargando(false);
    });

    if (!estaSupabaseConfigurado()) return;
    const supabase = getSupabaseClient();

    channelRef.current = supabase
      .channel("historial-anomalias-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "LecturasSensores" },
        () => {
          obtenerTodasLasLecturasAnomalas().then(setAnomalias);
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

  const filtradas = useMemo(() => {
    return anomalias.filter((a) => {
      if (zonaFiltro !== "Todas" && a.zona !== zonaFiltro) return false;
      const fecha = new Date(a.ultimaLectura).getTime();
      if (fechaDesde && fecha < new Date(fechaDesde).getTime()) return false;
      if (
        fechaHasta &&
        fecha > new Date(fechaHasta + "T23:59:59.999").getTime()
      )
        return false;
      return true;
    });
  }, [anomalias, zonaFiltro, fechaDesde, fechaHasta]);

  const exportarCSV = () => {
    const encabezado = [
      "Codigo",
      "Zona",
      "Tipo de Anomalia",
      "Bateria (%)",
      "Temperatura (C)",
      "Ultima Lectura",
      "Nivel (%)",
    ];

    const filas = filtradas.map((a) =>
      [
        a.numeroIdentificacion,
        a.zona,
        a.tipos.map((t) => ETIQUETAS_TIPO[t]).join(", "),
        a.bateria,
        a.temperatura,
        new Date(a.ultimaLectura).toLocaleString("es-VE"),
        a.nivelLlenado,
      ]
        .map(escaparCSV)
        .join(";")
    );

    const csv = [encabezado.join(";"), ...filas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `anomalias-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Zona
          </span>
          <select
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="Todas">Todas</option>
            {ZONAS_PREDEFINIDAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Desde
          </span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Hasta
          </span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <button
          type="button"
          onClick={exportarCSV}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Exportar CSV
        </button>
      </div>

      {cargando ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Cargando historial de anomalias...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Historial de Reportes ({filtradas.length})
            </h3>
          </div>

          {filtradas.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No hay registros que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-5 py-2.5">Codigo</th>
                    <th className="px-5 py-2.5">Zona</th>
                    <th className="px-5 py-2.5">Tipo</th>
                    <th className="px-5 py-2.5">Bateria</th>
                    <th className="px-5 py-2.5">Temp</th>
                    <th className="px-5 py-2.5">Ultima Lectura</th>
                    <th className="px-5 py-2.5">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((a) => (
                    <tr
                      key={`${a.contenedorId}-${a.ultimaLectura}`}
                      className="border-b border-zinc-50 dark:border-zinc-800/50"
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
      )}
    </section>
  );
}
