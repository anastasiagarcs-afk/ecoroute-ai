"use client";

import { useState, useCallback } from "react";
import { vaciarContenedor, vaciarContenedoresLote } from "@/lib/contenedoresStore";
import { marcarRutaCompletada, cancelarRuta as cancelarRutaService } from "@/lib/operadoresService";
import { registrarRutaEjecutada } from "@/lib/historialRutas";
import { calcularResumenJornada, type ResumenJornada } from "@/lib/jornadaService";
import type { Contenedor, Ruta } from "@/types/schema";

interface PanelRutaOperadorProps {
  ruta: Ruta;
  contenedores: Contenedor[];
  rutasDelDia?: Ruta[];
  onRutaCompletada?: () => void;
  onCerrarJornada?: (resumen: ResumenJornada) => void;
  modoLectura?: boolean;
}

function formatearDistancia(km: number | null): string {
  if (km == null) return "—";
  return `${km.toFixed(2)} km`;
}

export default function PanelRutaOperador({
  ruta,
  contenedores,
  rutasDelDia = [],
  onRutaCompletada,
  onCerrarJornada,
  modoLectura = false,
}: PanelRutaOperadorProps) {
  const [contenedoresVaciados, setContenedoresVaciados] = useState<Set<string>>(
    new Set()
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contenedoresRuta = contenedores.filter((c) =>
    ruta.contenedores_asignados.includes(c.id)
  );

  const total = contenedoresRuta.length;
  const vaciadosLocal = contenedoresRuta.filter(
    (c) => contenedoresVaciados.has(c.id) || c.nivel_llenado === 0
  ).length;

  const vaciarContenedorLocal = useCallback(
    async (id: string) => {
      if (contenedoresVaciados.has(id)) return;
      try {
        await vaciarContenedor(id);
        setContenedoresVaciados((prev) => new Set(prev).add(id));
      } catch {
        setError("No se pudo vaciar el contenedor");
      }
    },
    [contenedoresVaciados]
  );

  const actualizarProgreso = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setMensaje(null);

    const idsPorVaciar = contenedoresRuta
      .filter(
        (c) =>
          contenedoresVaciados.has(c.id) &&
          c.nivel_llenado > 0
      )
      .map((c) => c.id);

    if (idsPorVaciar.length === 0) {
      setMensaje("No hay cambios pendientes por guardar.");
      setGuardando(false);
      return;
    }

    try {
      await vaciarContenedoresLote(idsPorVaciar);
      setMensaje(`Progreso actualizado: ${vaciadosLocal} de ${total} contenedores vaciados.`);
    } catch {
      setError("No se pudo actualizar el progreso");
    } finally {
      setGuardando(false);
    }
  }, [guardando, contenedoresRuta, contenedoresVaciados, vaciadosLocal, total]);

  const rutaCompletada = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const idsPendientes = contenedoresRuta
        .filter((c) => c.nivel_llenado > 0)
        .map((c) => c.id);

      if (idsPendientes.length > 0) {
        await vaciarContenedoresLote(idsPendientes);
      }

      await registrarRutaEjecutada({
        distanciaKm: ruta.distancia_total ?? 0,
        tiempoMin: 0,
        contenedores: contenedoresRuta,
        fuenteRuta: "osrm",
        geometria: ruta.geometria ?? [],
        operador_id: ruta.operador_asignado,
        ruta_id: ruta.id,
      });

      await marcarRutaCompletada(ruta.id);

      setMensaje("Ruta completada exitosamente.");
      onRutaCompletada?.();
    } catch {
      setError("No se pudo completar la ruta");
    } finally {
      setGuardando(false);
    }
  }, [guardando, contenedoresRuta, ruta, onRutaCompletada]);

  const handleCancelarRuta = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      await cancelarRutaService(ruta.id);

      await registrarRutaEjecutada({
        distanciaKm: 0,
        tiempoMin: 0,
        contenedores: contenedoresRuta,
        fuenteRuta: "osrm",
        geometria: ruta.geometria ?? [],
        operador_id: ruta.operador_asignado,
        ruta_id: ruta.id,
      });

      onRutaCompletada?.();
      setMensaje("Ruta cancelada y guardada en historial.");
    } catch (err) {
      console.error("Error al cancelar ruta:", err);
      setError("No se pudo cancelar la ruta");
    } finally {
      setGuardando(false);
    }
  }, [guardando, ruta, contenedoresRuta, onRutaCompletada]);

  const handleCerrarJornada = useCallback(() => {
    const resumen = calcularResumenJornada(rutasDelDia, contenedores);
    onCerrarJornada?.(resumen);
  }, [rutasDelDia, contenedores, onCerrarJornada]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {ruta.nombre}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {total} contenedor(es) · {formatearDistancia(ruta.distancia_total)} ·{" "}
            {ruta.tiempo_estimado ?? "—"}
          </p>
        </div>
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
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Progreso</span>
          <span>
            {vaciadosLocal} de {total} vaciados
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${total > 0 ? (vaciadosLocal / total) * 100 : 0}%` }}
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
          const estaVaciado = contenedoresVaciados.has(c.id) || c.nivel_llenado === 0;

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
                {!estaVaciado && !modoLectura ? (
                  <button
                    onClick={() => vaciarContenedorLocal(c.id)}
                    className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Vaciar
                  </button>
                ) : estaVaciado ? (
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
      {mensaje && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {mensaje}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {!modoLectura ? (
          <>
            <button
              onClick={actualizarProgreso}
              disabled={guardando || vaciadosLocal === 0}
              className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {guardando ? "Guardando…" : "Actualizar Progreso"}
            </button>
            <button
              onClick={handleCancelarRuta}
              disabled={guardando}
              className="flex-1 rounded-lg bg-red-600/20 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar Ruta
            </button>
            <button
              onClick={rutaCompletada}
              disabled={guardando}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? "Procesando…" : "Ruta Completada"}
            </button>
          </>
        ) : (
          <button
            onClick={onRutaCompletada}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cerrar Visualización
          </button>
        )}
      </div>

      {!modoLectura && onCerrarJornada && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            onClick={handleCerrarJornada}
            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            Cerrar Jornada
          </button>
        </div>
      )}
    </div>
  );
}