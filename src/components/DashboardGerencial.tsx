"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Archive, BarChart3, AlertTriangle, MapPin } from "lucide-react";
import { useContenedores } from "@/hooks/useContenedores";
import {
  obtenerSnapshotHistorial,
  obtenerSnapshotServidorHistorial,
  suscribirseAlHistorial,
} from "@/lib/historialRutas";
import { mostrarToast } from "@/lib/toastStore";
import { obtenerSnapshotSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import {
  analizarContenedores,
  prediccionEstaEnRiesgo,
  type PrediccionContenedor,
} from "@/lib/geminiPredictiveService";
import {
  descargarCSV,
  imprimirReporte,
  type FiltrosExportacion,
} from "@/lib/reporteExportador";
import type { Contenedor } from "@/types/schema";

const UMBRAL_MEDIO = 50;
const UMBRAL_CRITICO = 80;

const ETIQUETAS_TIPO_RESIDUO: Record<string, string> = {
  organico: "Orgánico",
  reciclable: "Reciclable",
  no_reciclable: "No reciclable",
  vidrio: "Vidrio",
  papel_carton: "Papel / Cartón",
  plastico: "Plástico",
  metal: "Metal",
  peligroso: "Peligroso",
  mixto: "Mixto",
};

const COLORES_ESTADO: Record<string, string> = {
  activo: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  inactivo: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20",
  en_mantenimiento: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  repleto: "bg-rose-500/15 text-rose-400 ring-rose-500/20",
  vacio: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/20",
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  en_mantenimiento: "En mantenimiento",
  repleto: "Repleto",
  vacio: "Vacío / Disponible",
};

function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  colorFondo,
  colorTexto,
  colorBorde,
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  icono: React.ComponentType<{ className?: string }>;
  colorFondo: string;
  colorTexto: string;
  colorBorde: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-white p-4 shadow-sm transition-all hover:border-zinc-700 dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${colorBorde} ${colorFondo} ${colorTexto}`}>
        <Icono className="h-7 w-7" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
          {valor}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
        {detalle && (
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            {detalle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardGerencial() {
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const { contenedores } = useContenedores();

  const historial = useSyncExternalStore(
    suscribirseAlHistorial,
    obtenerSnapshotHistorial,
    obtenerSnapshotServidorHistorial
  );

  const zonas = useMemo(() => {
    const conjunto = new Set<string>();
    for (const contenedor of contenedores) {
      if (contenedor.zona) conjunto.add(contenedor.zona);
    }
    return ["Todas", ...[...conjunto].sort()];
  }, [contenedores]);

  const [zonaSeleccionada, setZonaSeleccionada] = useState("Todas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [predicciones, setPredicciones] = useState<PrediccionContenedor[]>([]);
  const [analizandoPrediccion, setAnalizandoPrediccion] = useState(false);

  const formatearHoras = (horas: number): string => {
    const horasCercanas = Math.max(0, horas);
    if (horasCercanas < 1)
      return "menos de 1 hora";
    const horasEnteras = Math.floor(horasCercanas);
    const minutos = Math.round((horasCercanas - horasEnteras) * 60);
    return minutos > 0
      ? `${horasEnteras} h ${minutos} min`
      : `${horasEnteras} h`;
  };

  const ejecutarPrediccionIA = async () => {
    setAnalizandoPrediccion(true);
    try {
      const resultado = await analizarContenedores(contenedoresFiltrados);
      setPredicciones(resultado);
      if (resultado.length === 0) {
        mostrarToast("No se pudo obtener una predicción", "info");
      }
    } catch {
      mostrarToast("Error al analizar los contenedores", "error");
    } finally {
      setAnalizandoPrediccion(false);
    }
  };

  const limpiarFiltros = () => {
    setZonaSeleccionada("Todas");
    setFechaDesde("");
    setFechaHasta("");
  };

  const contenedoresFiltrados = useMemo(() => {
    if (zonaSeleccionada === "Todas") return contenedores;
    return contenedores.filter((contenedor) => contenedor.zona === zonaSeleccionada);
  }, [contenedores, zonaSeleccionada]);

  const idsZona = useMemo(() => {
    if (zonaSeleccionada === "Todas") return null;
    return new Set(contenedoresFiltrados.map((contenedor) => contenedor.id));
  }, [contenedoresFiltrados, zonaSeleccionada]);

  const rutasFiltradas = useMemo(() => {
    const inicio = fechaDesde ? new Date(`${fechaDesde}T00:00:00`).getTime() : null;
    const fin = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).getTime() : null;

    return historial.filter((registro) => {
      const tiempo = new Date(registro.fecha_ejecucion).getTime();
      if (inicio !== null && tiempo < inicio) return false;
      if (fin !== null && tiempo > fin) return false;
      if (idsZona) {
        return registro.contenedoresAtendidos.some((id) => idsZona.has(id));
      }
      return true;
    });
  }, [historial, fechaDesde, fechaHasta, idsZona]);

  const datosPorZona = useMemo(() => {
    const agrupadas = new Map<string, Contenedor[]>();
    for (const contenedor of contenedores) {
      const clave = contenedor.zona ?? "Sin zona";
      const lista = agrupadas.get(clave) ?? [];
      lista.push(contenedor);
      agrupadas.set(clave, lista);
    }
    return [...agrupadas.entries()]
      .filter(
        ([, lista]) =>
          zonaSeleccionada === "Todas" ||
          lista.some((contenedor) => contenedor.zona === zonaSeleccionada)
      )
      .map(([zona, lista]) => {
        const total = lista.length;
        const bajos = lista.filter(
          (contenedor) => contenedor.nivel_llenado < UMBRAL_MEDIO
        ).length;
        const medios = lista.filter(
          (contenedor) =>
            contenedor.nivel_llenado >= UMBRAL_MEDIO &&
            contenedor.nivel_llenado <= UMBRAL_CRITICO
        ).length;
        const criticos = lista.filter(
          (contenedor) => contenedor.nivel_llenado > UMBRAL_CRITICO
        ).length;
        const promedio =
          total > 0
            ? Math.round(
                (lista.reduce((suma, c) => suma + c.nivel_llenado, 0) / total) * 10
              ) / 10
            : 0;
        return { zona, total, bajos, medios, criticos, promedio };
      })
      .sort(
        (a, b) => b.criticos - a.criticos || b.total - a.total || a.zona.localeCompare(b.zona)
      );
  }, [contenedores, zonaSeleccionada]);

  const totalContenedores = contenedoresFiltrados.length;
  const promedioLlenado =
    totalContenedores > 0
      ? Math.round(
          (contenedoresFiltrados.reduce((suma, c) => suma + c.nivel_llenado, 0) /
            totalContenedores) *
            10
        ) / 10
      : 0;
  const criticos = contenedoresFiltrados.filter(
    (contenedor) => contenedor.nivel_llenado > UMBRAL_CRITICO
  );
  const rangoFechas = fechaDesde || fechaHasta ? `${fechaDesde || "inicio"} – ${fechaHasta || "hoy"}` : "Todo el historial";

  if (sesion && !puede(sesion.rol, "ver_dashboard")) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Acceso restringido
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Tu rol ({ETIQUETAS_ROL[sesion.rol]}) no tiene permiso para ver el dashboard gerencial.
          Solicita acceso a un administrador.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard Gerencial
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Indicadores clave de recolección y estado de contenedores
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Zona
            <select
              value={zonaSeleccionada}
              onChange={(evento) => setZonaSeleccionada(evento.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {zonas.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Desde
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={(evento) => setFechaDesde(evento.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Hasta
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={(evento) => setFechaHasta(evento.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              descargarCSV(contenedoresFiltrados, rutasFiltradas, {
                zona: zonaSeleccionada === "Todas" ? "Todas" : zonaSeleccionada,
                fechaDesde,
                fechaHasta,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() =>
              imprimirReporte(contenedoresFiltrados, rutasFiltradas, {
                zona: zonaSeleccionada === "Todas" ? "Todas" : zonaSeleccionada,
                fechaDesde,
                fechaHasta,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-500"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaKpi
          etiqueta="Contenedores totales"
          valor={totalContenedores}
          detalle={zonaSeleccionada === "Todas" ? "Todas las zonas" : zonaSeleccionada}
          icono={Archive}
          colorFondo="bg-emerald-500/15"
          colorTexto="text-emerald-400"
          colorBorde="border border-emerald-500/20"
        />
        <TarjetaKpi
          etiqueta="Promedio de llenado"
          valor={`${promedioLlenado}%`}
          detalle="General de la selección"
          icono={BarChart3}
          colorFondo="bg-cyan-500/15"
          colorTexto="text-cyan-400"
          colorBorde="border border-cyan-500/20"
        />
        <TarjetaKpi
          etiqueta="Contenedores críticos"
          valor={criticos.length}
          detalle="> 80% de capacidad"
          icono={AlertTriangle}
          colorFondo="bg-rose-500/15"
          colorTexto="text-rose-400"
          colorBorde="border border-rose-500/20"
        />
        <TarjetaKpi
          etiqueta="Rutas ejecutadas"
          valor={rutasFiltradas.length}
          detalle={rangoFechas}
          icono={MapPin}
          colorFondo="bg-emerald-500/15"
          colorTexto="text-emerald-400"
          colorBorde="border border-emerald-500/20"
        />
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-zinc-900 via-emerald-950/20 to-zinc-900 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-50">
              Predicción de IA (HU-11)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estimación con Gemini de riesgo de desborde en las próximas horas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ejecutarPrediccionIA}
              disabled={analizandoPrediccion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analizandoPrediccion ? "Analizando…" : "Analizar con IA"}
            </button>
            {predicciones.length > 0 && (
              <button
                type="button"
                onClick={() => setPredicciones([])}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="Limpiar resultados"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {predicciones.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Toca <strong>Analizar con IA</strong> para generar la estimación predictiva.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {predicciones.map((prediccion) => {
              const enRiesgo = prediccionEstaEnRiesgo(prediccion);
              return (
                <div
                  key={prediccion.contenedorId}
                  className={`flex flex-col gap-2 rounded-lg border p-3 ${
                    enRiesgo
                      ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {prediccion.codigo}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {prediccion.zona ?? "Sin zona"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        enRiesgo
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      }`}
                    >
                      {enRiesgo ? "Riesgo" : "Normal"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {prediccion.nivelProyectadoEn4h.toFixed(1)}%
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      proyectado en 4h · actual {prediccion.nivelActual.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                    <span>
                      Crítico en{" "}
                      <strong>
                        {formatearHoras(prediccion.horasParaCritico)}
                      </strong>
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {Math.round(prediccion.probabilidad * 100)}% prob.
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {prediccion.fuente === "gemini"
                        ? "Gemini"
                        : prediccion.fuente === "sintetizada"
                          ? "Sintetizada"
                          : "Heurística"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Contenedores críticos (&gt; 80%)
          </h3>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">
            {criticos.length}
          </span>
        </div>
        {criticos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sin contenedores críticos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Código</th>
                  <th className="py-2 pr-3 font-semibold">Zona</th>
                  <th className="py-2 pr-3 font-semibold">Tipo</th>
                  <th className="py-2 pr-3 font-semibold">Nivel</th>
                  <th className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {criticos.map((contenedor) => (
                  <tr key={contenedor.id}>
                    <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {contenedor.numero_identificacion}
                    </td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">
                      {contenedor.zona ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-300">
                      {ETIQUETAS_TIPO_RESIDUO[contenedor.tipo_residuo] ?? contenedor.tipo_residuo}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                        {contenedor.nivel_llenado}%
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${COLORES_ESTADO[contenedor.estado] ?? "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20"}`}>
                        {ETIQUETAS_ESTADO[contenedor.estado]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Estado de llenado por zona
        </h3>
        {datosPorZona.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay contenedores con zona asignada.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &lt; 50%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50 – 80%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> &gt; 80%
              </span>
            </div>
            {datosPorZona.map(({ zona, total, bajos, medios, criticos, promedio }) => (
              <div key={zona} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {zona}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {total} contenedores · promedio {promedio}%
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {bajos > 0 && (
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(bajos / total) * 100}%` }}
                    />
                  )}
                  {medios > 0 && (
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(medios / total) * 100}%` }}
                    />
                  )}
                  {criticos > 0 && (
                    <div
                      className="bg-red-600"
                      style={{ width: `${(criticos / total) * 100}%` }}
                    />
                  )}
                </div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  {bajos} bajos · {medios} medios · {criticos} críticos
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
