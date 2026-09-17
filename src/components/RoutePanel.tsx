"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ConfirmarEliminarContenedorModal from "@/components/ConfirmarEliminarContenedorModal";
import EditarContenedorModal from "@/components/EditarContenedorModal";
import {
  UMBRAL_CRITICO,
  esContenedorCritico,
  optimizarRuta,
} from "@/lib/routeOptimizer";
import type { RutaOptimizada } from "@/lib/routeOptimizer";
import {
  obtenerSnapshotEstadoHistorial,
  obtenerSnapshotHistorial,
  obtenerSnapshotServidorEstadoHistorial,
  obtenerSnapshotServidorHistorial,
  registrarRutaEjecutada,
  suscribirseAlHistorial,
  vaciarHistorial,
} from "@/lib/historialRutas";
import {
  listarOperadores,
  crearRutaConAsignacion,
  notificarAsignacionRuta,
  listarRutasGuardadas,
  asignarRutaAOperador,
} from "@/lib/operadoresService";
import { vaciarContenedor } from "@/lib/contenedoresStore";
import { puede } from "@/lib/rolesAutorizados";
import { obtenerSnapshotSesion } from "@/lib/authService";
import type { RegistroHistorialRuta } from "@/lib/historialRutas";
import type {
  Contenedor,
  EstadoContenedor,
  Ruta,
  UbicacionPunto,
  Usuario,
} from "@/types/schema";

const ETIQUETAS_ESTADO: Record<EstadoContenedor, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  en_mantenimiento: "En mantenimiento",
  repleto: "Repleto",
  vacio: "Vacío / Disponible",
};

const COLORES_ESTADO: Record<EstadoContenedor, string> = {
  activo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactivo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400",
  en_mantenimiento:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  repleto: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  vacio: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

interface RoutePanelProps {
  contenedores: Contenedor[];
  centroInicial?: UbicacionPunto;
  onRutaGenerada?: (ruta: RutaOptimizada | null) => void;
  onCargarRutaHistorial?: (registro: RegistroHistorialRuta) => void;
  onSalirRutaHistorial?: () => void;
  rutaHistorialId?: string | null;
}

function formatoDistancia(km: number): string {
  return `${km.toFixed(2)} km`;
}

function formatoTiempo(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos < 1) return "0 min";
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = Math.round(minutos % 60);
  return horas > 0 ? `${horas} h ${minutosRestantes} min` : `${minutosRestantes} min`;
}

function DatoResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-2 text-center dark:bg-zinc-800/50">
      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{valor}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
    </div>
  );
}

export default function RoutePanel({
  contenedores,
  centroInicial,
  onRutaGenerada,
  onCargarRutaHistorial,
  onSalirRutaHistorial,
  rutaHistorialId = null,
}: RoutePanelProps) {
  const [ruta, setRuta] = useState<RutaOptimizada | null>(null);
  const [generando, setGenerando] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarGestion, setMostrarGestion] = useState(false);
  const [contenedorAEditar, setContenedorAEditar] = useState<Contenedor | null>(
    null
  );
  const [contenedorAEliminar, setContenedorAEliminar] = useState<Contenedor | null>(
    null
  );
  const [vaciandoId, setVaciandoId] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [operadorSeleccionado, setOperadorSeleccionado] = useState<string>("");
  const [rutaIdGuardada, setRutaIdGuardada] = useState<string | null>(null);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState<string>("");

  const [rutasGuardadas, setRutasGuardadas] = useState<Ruta[]>([]);
  const [cargandoRutasGuardadas, setCargandoRutasGuardadas] = useState(false);
  const [mostrarRutasGuardadas, setMostrarRutasGuardadas] = useState(false);
  const [rutaGuardadaSeleccionada, setRutaGuardadaSeleccionada] = useState<Ruta | null>(null);
  const [asignandoRutaGuardada, setAsignandoRutaGuardada] = useState(false);

  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );
  const puedeEditar = sesion ? puede(sesion.rol, "editar_contenedor") : false;
  const puedeEliminar = sesion ? puede(sesion.rol, "eliminar_contenedor") : false;

  useEffect(() => {
    listarOperadores().then(setOperadores);
  }, []);

  const cargarRutasGuardadas = async () => {
    setCargandoRutasGuardadas(true);
    const rutas = await listarRutasGuardadas();
    setRutasGuardadas(rutas);
    setCargandoRutasGuardadas(false);
  };

  const seleccionarRutaGuardada = (ruta: Ruta) => {
    setRutaGuardadaSeleccionada(ruta);
    setOperadorSeleccionado(ruta.operador_asignado ?? "");
    setRutaIdGuardada(ruta.id);

    const contenedoresAsignados = contenedores.filter((c) =>
      ruta.contenedores_asignados.includes(c.id)
    );

    if (contenedoresAsignados.length > 0) {
      const puntos = contenedoresAsignados.map((c, i) => ({
        contenedor: c,
        distanciaDesdeAnteriorKm: i === 0 ? 0 : 0,
        distanciaAcumuladaKm: 0,
      }));

      const rutaOptimizada: RutaOptimizada = {
        puntos,
        geometria: ruta.geometria ?? [],
        contenedoresCriticos: contenedoresAsignados.length,
        contenedoresAtendidos: contenedoresAsignados.length,
        distanciaTotalKm: ruta.distancia_total ?? 0,
        tiempoEstimadoMin: 0,
        fuenteRuta: "osrm",
      };

      onRutaGenerada?.(rutaOptimizada);
    }
  };

  const asignarRutaGuardada = async () => {
    if (!rutaGuardadaSeleccionada || !operadorSeleccionado) return;
    setAsignandoRutaGuardada(true);
    try {
      await asignarRutaAOperador(rutaGuardadaSeleccionada.id, operadorSeleccionado);
      const operador = operadores.find((o) => o.id === operadorSeleccionado);
      await notificarAsignacionRuta(
        operadorSeleccionado,
        rutaGuardadaSeleccionada.nombre,
        rutaGuardadaSeleccionada.contenedores_asignados.length,
        rutaGuardadaSeleccionada.id
      );
      setMensajeConfirmacion(
        `✓ Ruta "${rutaGuardadaSeleccionada.nombre}" asignada a ${operador?.nombre ?? "operador"}`
      );
      setGuardadoOk(true);
    } catch {
      setErrorAccion("No se pudo asignar la ruta al operador");
    } finally {
      setAsignandoRutaGuardada(false);
    }
  };

  const historial = useSyncExternalStore(
    suscribirseAlHistorial,
    obtenerSnapshotHistorial,
    obtenerSnapshotServidorHistorial
  );

  const estadoHistorial = useSyncExternalStore(
    suscribirseAlHistorial,
    obtenerSnapshotEstadoHistorial,
    obtenerSnapshotServidorEstadoHistorial
  );

  const criticos = useMemo(
    () =>
      contenedores
        .filter(esContenedorCritico)
        .sort((a, b) => b.nivel_llenado - a.nivel_llenado),
    [contenedores]
  );

  const hayUbicacion = useMemo(
    () => contenedores.some((contenedor) => contenedor.ubicacion !== null),
    [contenedores]
  );

  const generarRuta = async () => {
    setGenerando(true);
    setGuardadoOk(false);
    setErrorAccion(null);
    try {
      if (criticos.length === 0) {
        throw new Error(
          `No hay contenedores con nivel ≥ ${UMBRAL_CRITICO}% para trazar la ruta.`
        );
      }
      const nueva = await optimizarRuta(criticos, { inicio: centroInicial ?? null });
      setRuta(nueva);
      onRutaGenerada?.(nueva);
    } catch (error) {
      setErrorAccion(
        error instanceof Error ? error.message : "No se pudo calcular la ruta."
      );
    } finally {
      setGenerando(false);
    }
  };

  const limpiarRuta = () => {
    setRuta(null);
    setGuardadoOk(false);
    setMensajeConfirmacion("");
    onRutaGenerada?.(null);
  };

  const nombreContenedorPorId = (id: string) =>
    contenedores.find((contenedor) => contenedor.id === id)?.numero_identificacion ??
    id.slice(0, 8);

  const guardarRuta = async () => {
    if (!ruta || guardando) return;
    setGuardando(true);
    setGuardadoOk(false);
    setErrorAccion(null);
    setMensajeConfirmacion("");
    try {
      // 1. Guardar en historial
      await registrarRutaEjecutada({
        distanciaKm: ruta.distanciaTotalKm,
        tiempoMin: ruta.tiempoEstimadoMin,
        contenedores: ruta.puntos.map((punto) => punto.contenedor),
        fuenteRuta: ruta.fuenteRuta,
        geometria: ruta.geometria,
      });

      // 2. Crear registro en tabla Rutas
      const nombreRuta = `Ruta-${new Date().getTime()}`;
      const rutaCreada = await crearRutaConAsignacion({
        nombre: nombreRuta,
        zona: null,
        contenedores_asignados: ruta.puntos.map((p) => p.contenedor.id),
        fecha_creacion: new Date().toISOString(),
        ultima_ejecucion: null,
        distancia_total: Math.round(ruta.distanciaTotalKm * 100) / 100,
        tiempo_estimado: `${Math.round(ruta.tiempoEstimadoMin)} min`,
        operador_asignado: operadorSeleccionado || null,
        estado: "pendiente",
        geometria: ruta.geometria,
      });

      setRutaIdGuardada(rutaCreada.id);

      // 3. Si hay operador seleccionado, asignar y notificar
      if (operadorSeleccionado) {
        const operador = operadores.find((o) => o.id === operadorSeleccionado);
        await notificarAsignacionRuta(
          operadorSeleccionado,
          nombreRuta,
          ruta.puntos.length,
          rutaCreada.id
        );
        setMensajeConfirmacion(
          `✓ Ruta guardada y asignada correctamente a ${operador?.nombre ?? "operador"}`
        );
      } else {
        setMensajeConfirmacion("✓ Ruta guardada en el historial.");
      }

      setGuardadoOk(true);
    } catch (error) {
      setErrorAccion(
        error instanceof Error ? error.message : "No se pudo guardar la ruta."
      );
    } finally {
      setGuardando(false);
    }
  };

  const manejarVaciarHistorial = async () => {
    if (estadoHistorial.estadoCarga === "cargando") return;
    setErrorAccion(null);
    try {
      await vaciarHistorial();
    } catch (error) {
      setErrorAccion(
        error instanceof Error ? error.message : "No se pudo vaciar el historial."
      );
    }
  };

  const manejarVaciarContenedor = async (idContenedor: string) => {
    if (vaciandoId) return;
    setErrorAccion(null);
    setVaciandoId(idContenedor);
    try {
      await vaciarContenedor(idContenedor);
      setGuardadoOk(false);
    } finally {
      setVaciandoId(null);
    }
  };

  const cargarRutaHistorial = (registro: RegistroHistorialRuta) => {
    if (registro.id === rutaHistorialId) {
      onSalirRutaHistorial?.();
    } else {
      onCargarRutaHistorial?.(registro);
    }
  };

  return (
    <div className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:max-h-[65vh]">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Panel de rutas y alertas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Prioriza contenedores con nivel ≥ {UMBRAL_CRITICO}%
          </p>
        </div>
        {ruta && (
          <button
            onClick={limpiarRuta}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Limpiar ruta
          </button>
        )}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Contenedores en estado crítico ({criticos.length})
          </h3>
          {criticos.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              No hay contenedores con nivel ≥ {UMBRAL_CRITICO}%.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {criticos.map((contenedor) => (
                <li
                  key={contenedor.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/30"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {contenedor.numero_identificacion}
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80">
                      {contenedor.zona ?? "Sin zona"} · {contenedor.tipo_residuo}
                    </p>
                  </div>
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {Math.round(contenedor.nivel_llenado)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setMostrarGestion((mostrar) => !mostrar)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Gestión de contenedores ({contenedores.length})
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {mostrarGestion ? "▲" : "▼"}
            </span>
          </button>

          {mostrarGestion && (
            <ul className="mt-3 space-y-2">
              {contenedores.map((contenedor) => {
                const nivel = Math.round(contenedor.nivel_llenado);
                const colorNivel =
                  nivel > UMBRAL_CRITICO ? "bg-red-500" : nivel >= 50 ? "bg-amber-500" : "bg-emerald-600";
                const esVacio = contenedor.estado === "vacio" || nivel === 0;
                return (
                  <li
                    key={contenedor.id}
                    className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {contenedor.numero_identificacion}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {contenedor.zona ?? "Sin zona"} · {contenedor.tipo_residuo}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <span
                            className={`h-2 w-2 rounded-full ${colorNivel}`}
                          />
                          {nivel}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLORES_ESTADO[contenedor.estado]}`}
                        >
                          {ETIQUETAS_ESTADO[contenedor.estado]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        disabled={esVacio || vaciandoId === contenedor.id}
                        title="Vaciar contenedor (0% y Vacío/Disponible)"
                        onClick={() => manejarVaciarContenedor(contenedor.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {vaciandoId === contenedor.id ? "Vaciando…" : "Vaciar"}
                      </button>
                      {puedeEditar && (
                        <button
                          type="button"
                          title="Editar contenedor"
                          onClick={() => setContenedorAEditar(contenedor)}
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                        >
                          Editar
                        </button>
                      )}
                      {puedeEliminar && (
                        <button
                          type="button"
                          title="Eliminar contenedor del mapa y de Supabase"
                          onClick={() => setContenedorAEliminar(contenedor)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setMostrarRutasGuardadas((mostrar) => !mostrar);
              if (!mostrarRutasGuardadas) cargarRutasGuardadas();
            }}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Rutas Guardadas ({rutasGuardadas.length})
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {mostrarRutasGuardadas ? "▲" : "▼"}
            </span>
          </button>

          {mostrarRutasGuardadas && (
            <div className="mt-3">
              {cargandoRutasGuardadas ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cargando rutas guardadas…
                </p>
              ) : rutasGuardadas.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No hay rutas guardadas aún.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rutasGuardadas.map((rutaGuardada) => (
                    <li
                      key={rutaGuardada.id}
                      className={`rounded-lg border px-3 py-2 ${
                        rutaGuardadaSeleccionada?.id === rutaGuardada.id
                          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {rutaGuardada.nombre}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {rutaGuardada.contenedores_asignados.length} contenedores ·{" "}
                            {rutaGuardada.distancia_total
                              ? `${rutaGuardada.distancia_total} km`
                              : "—"}{" "}
                            · {rutaGuardada.tiempo_estimado ?? "—"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            rutaGuardada.estado === "completada"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : rutaGuardada.estado === "en_progreso"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {rutaGuardada.estado}
                        </span>
                      </div>
                      <button
                        onClick={() => seleccionarRutaGuardada(rutaGuardada)}
                        className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          rutaGuardadaSeleccionada?.id === rutaGuardada.id
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {rutaGuardadaSeleccionada?.id === rutaGuardada.id
                          ? "Seleccionada"
                          : "Cargar en mapa"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {rutaGuardadaSeleccionada && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                  <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                    Asignar "{rutaGuardadaSeleccionada.nombre}" a Operador
                  </label>
                  <select
                    value={operadorSeleccionado}
                    onChange={(e) => setOperadorSeleccionado(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Sin asignar</option>
                    {operadores.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nombre} ({operador.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={asignarRutaGuardada}
                    disabled={!operadorSeleccionado || asignandoRutaGuardada}
                    className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {asignandoRutaGuardada ? "Asignando…" : "Asignar Ruta a Operador"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <button
          onClick={generarRuta}
          disabled={!hayUbicacion || generando || criticos.length === 0}
          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generando ? "Calculando ruta…" : "Generar ruta óptima"}
        </button>

        {errorAccion && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {errorAccion}
          </p>
        )}

        {ruta && (
          <section className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <DatoResumen
                etiqueta="Distancia total"
                valor={formatoDistancia(ruta.distanciaTotalKm)}
              />
              <DatoResumen
                etiqueta="Tiempo real (OSRM)"
                valor={formatoTiempo(ruta.tiempoEstimadoMin)}
              />
              <DatoResumen
                etiqueta="Atendidos"
                valor={`${ruta.contenedoresAtendidos}`}
              />
            </div>

            {ruta.fuenteRuta === "linea_recta" && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                OSRM no disponible: distancia estimada en línea recta.
              </p>
            )}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
              <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                Asignar ruta a Operador
              </label>
              {operadores.length === 0 ? (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  No hay operadores disponibles.
                </p>
              ) : (
                <select
                  value={operadorSeleccionado}
                  onChange={(e) => setOperadorSeleccionado(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Sin asignar (solo guardar)</option>
                  {operadores.map((operador) => (
                    <option key={operador.id} value={operador.id}>
                      {operador.nombre} ({operador.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={guardarRuta}
              disabled={guardando || guardadoOk}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando…"
                : guardadoOk
                  ? "✓ Guardada"
                  : operadorSeleccionado
                    ? "Guardar y Asignar Ruta"
                    : "Guardar / Confirmar Ruta"}
            </button>

            {guardadoOk && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                {mensajeConfirmacion}
              </p>
            )}

            <ol className="space-y-2">
              {ruta.puntos.map(({ contenedor, distanciaDesdeAnteriorKm, distanciaAcumuladaKm }, indice) => (
                <li
                  key={contenedor.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {indice + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {contenedor.numero_identificacion}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {contenedor.zona ?? "Sin zona"} ·{" "}
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {Math.round(contenedor.nivel_llenado)}%
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {indice === 0
                      ? formatoDistancia(distanciaAcumuladaKm)
                      : `+${formatoDistancia(distanciaDesdeAnteriorKm)}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMostrarHistorial((mostrar) => !mostrar)}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Historial de rutas ejecutadas ({historial.length})
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {mostrarHistorial ? "▲" : "▼"}
              </span>
            </button>
            {historial.length > 0 && (
              <button
                onClick={manejarVaciarHistorial}
                disabled={estadoHistorial.estadoCarga === "cargando"}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
              >
                Vaciar
              </button>
            )}
          </div>

          {mostrarHistorial &&
            (estadoHistorial.estadoCarga === "cargando" ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Cargando historial desde Supabase…
              </p>
            ) : estadoHistorial.estadoCarga === "error" ? (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                No se pudo cargar el historial: {estadoHistorial.mensajeError}
              </p>
            ) : historial.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Todavía no hay rutas confirmadas. Genera y guarda una ruta para registrarla aquí.
              </p>
            ) : (
              <ol className="mt-3 space-y-2">
                {historial.map((registro) => (
                  <li
                    key={registro.id}
                    className={`rounded-lg border px-3 py-2 ${
                      registro.id === rutaHistorialId
                        ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/50 dark:bg-emerald-500/10"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {registro.nombre}
                      </p>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(registro.fecha_ejecucion).toLocaleString("es-VE")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatoDistancia(registro.distanciaKm)}</span>
                      <span>{formatoTiempo(registro.tiempoMin)}</span>
                      <span>{registro.contenedoresAtendidos.length} contenedores</span>
                    </div>
                    {registro.contenedoresAtendidos.length > 0 && (
                      <p className="mt-1 truncate text-xs text-zinc-400 dark:text-zinc-500">
                        {registro.contenedoresAtendidos
                          .slice(0, 3)
                          .map(nombreContenedorPorId)
                          .join(", ")}
                        {registro.contenedoresAtendidos.length > 3 ? "…" : ""}
                      </p>
                    )}
                    {registro.fuenteRuta === "linea_recta" && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Distancia estimada (OSRM no disponible)
                      </p>
                    )}
                    <button
                      onClick={() => cargarRutaHistorial(registro)}
                      disabled={
                        !Array.isArray(registro.geometria) ||
                        registro.geometria.length < 2
                      }
                      className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        registro.id === rutaHistorialId
                          ? "border-red-600 bg-red-600 text-white hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-700"
                          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {registro.id === rutaHistorialId
                        ? "Ocultar ruta"
                        : "Ver en mapa"}
                    </button>
                  </li>
                ))}
              </ol>
            ))}
        </section>
      </div>

      {contenedorAEditar && (
        <EditarContenedorModal
          contenedor={contenedorAEditar}
          onCerrar={() => setContenedorAEditar(null)}
        />
      )}
      {contenedorAEliminar && (
        <ConfirmarEliminarContenedorModal
          contenedor={contenedorAEliminar}
          onCerrar={() => setContenedorAEliminar(null)}
        />
      )}
    </div>
  );
}