"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { Archive, BarChart3, AlertTriangle } from "lucide-react";
import DashboardGerencial from "@/components/DashboardGerencial";
import HistorialOperador from "@/components/HistorialOperador";
import NuevoContenedorModal from "@/components/NuevoContenedorModal";
import PanelRutaOperador from "@/components/PanelRutaOperador";
import RoutesMapView from "@/components/RoutesMapView";
import CierreJornadaModal from "@/components/CierreJornadaModal";
import { useContenedores } from "@/hooks/useContenedores";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";
import { obtenerSnapshotSesion } from "@/lib/authService";
import { puede } from "@/lib/rolesAutorizados";
import { obtenerRutasActivasOperador, obtenerRutasJornadaActual, marcarRutaEnProgreso, marcarRutaCompletada } from "@/lib/operadoresService";
import {
  cerrarJornada,
  calcularResumenJornada,
  calcularResumenJornadaFinal,
  type ResumenJornada,
} from "@/lib/jornadaService";
import { mostrarToast } from "@/lib/toastStore";
import { vaciarContenedor } from "@/lib/contenedoresStore";
import type { Contenedor, Ruta, UbicacionPunto } from "@/types/schema";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const CENTRO_CIUDAD: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };

export default function Home() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaSeleccionadaId, setRutaSeleccionadaId] = useState<string | null>(null);
  const [tabOperador, setTabOperador] = useState<"rutas" | "historial">("rutas");
  const [rutasActivasOperador, setRutasActivasOperador] = useState<Ruta[]>([]);
  const [cierreJornadaVisible, setCierreJornadaVisible] = useState(false);
  const [resumenJornada, setResumenJornada] = useState<ResumenJornada | null>(null);
  const [guardandoJornada, setGuardandoJornada] = useState(false);
  const [fechaInicioJornada, setFechaInicioJornada] = useState<string>(() => {
    if (typeof window === "undefined") return new Date().toISOString();
    return localStorage.getItem("ecoroute:jornada:inicio") ?? new Date().toISOString();
  });
  const [indiceParadaActual, setIndiceParadaActual] = useState(0);
  const [guardandoAvance, setGuardandoAvance] = useState(false);

  const { contenedores, estado: estadoContenedores } = useContenedores();

  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const rutaSeleccionada = rutaSeleccionadaId
    ? rutasActivasOperador.find((r) => r.id === rutaSeleccionadaId) ?? null
    : null;

  const contenedoresRutaOrdenados = useMemo(() => {
    if (!rutaSeleccionada) return [];
    return rutaSeleccionada.contenedores_asignados
      .map((id) => contenedores.find((c) => c.id === id))
      .filter((c): c is Contenedor => c !== undefined);
  }, [rutaSeleccionada, contenedores]);

  const paradasContenedores = useMemo(
    () =>
      contenedoresRutaOrdenados
        .map((c) => c.ubicacion)
        .filter((u): u is UbicacionPunto => u !== null),
    [contenedoresRutaOrdenados]
  );

  const enfocarEn = paradasContenedores[indiceParadaActual] ?? null;

  const handleSeleccionarRuta = useCallback(
    async (ruta: Ruta) => {
      await marcarRutaEnProgreso(ruta.id);
      setRutaSeleccionadaId(ruta.id);
      setIndiceParadaActual(0);
    },
    []
  );

  const handleCerrarPanel = useCallback(() => {
    setRutaSeleccionadaId(null);
    setIndiceParadaActual(0);
  }, []);

  const cargarRutasOperador = useCallback(async () => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;
    const activas = await obtenerRutasActivasOperador(sesion.usuario.id);
    console.log("[EcoRoute] Rutas activas cargadas:", activas.length);
    setRutasActivasOperador(activas);
  }, [sesion]);

  const manejarSiguienteParada = useCallback(async () => {
    const contenedorActual = contenedoresRutaOrdenados[indiceParadaActual];
    if (!contenedorActual || guardandoAvance) return;
    setGuardandoAvance(true);
    try {
      if (contenedorActual.nivel_llenado > 0) {
        try {
          await vaciarContenedor(contenedorActual.id);
        } catch {
          console.warn("[EcoRoute] Error al vaciar contenedor (no bloqueante):", contenedorActual.id);
        }
      }
      if (indiceParadaActual >= contenedoresRutaOrdenados.length - 1) {
        if (rutaSeleccionada) {
          const exito = await marcarRutaCompletada(rutaSeleccionada.id);
          if (exito) {
            setRutasActivasOperador((prev) => prev.filter((r) => r.id !== rutaSeleccionada.id));
            setRutaSeleccionadaId(null);
            setIndiceParadaActual(0);
            void cargarRutasOperador();
          }
        }
        return;
      }
      setIndiceParadaActual((i) => i + 1);
    } finally {
      setGuardandoAvance(false);
    }
  }, [indiceParadaActual, contenedoresRutaOrdenados, guardandoAvance, rutaSeleccionada, cargarRutasOperador]);

  useEffect(() => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;

    // Cargar rutas activas del operador
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarRutasOperador();

    // Asegurar que localStorage tenga un timestamp de inicio de jornada
    if (!localStorage.getItem("ecoroute:jornada:inicio")) {
      localStorage.setItem("ecoroute:jornada:inicio", fechaInicioJornada);
    }
  }, [sesion, cargarRutasOperador, fechaInicioJornada]);

  const contenedoresVisibles =
    estadoContenedores.estadoCarga === "cargando" ? [] : contenedores;

  const totalContenedores = contenedoresVisibles.length;
  const promedioLlenado =
    totalContenedores > 0
      ? Math.round(
          (contenedoresVisibles.reduce((s, c) => s + c.nivel_llenado, 0) /
            totalContenedores) *
            10
        ) / 10
      : 0;
  const criticosCount = contenedoresVisibles.filter(
    (c) => c.nivel_llenado > 80
  ).length;

  const datosRespaldo =
    !estaSupabaseConfigurado() || estadoContenedores.estadoCarga === "error";

  const handleCerrarJornada = useCallback(
    async (tipoCierre: "parcial" | "final") => {
      if (!sesion?.usuario?.id) return;

      let resumen: ResumenJornada;

      if (tipoCierre === "parcial") {
        // Cierre parcial: solo rutas desde fechaInicioJornada
        const rutasJornada = await obtenerRutasJornadaActual(
          sesion.usuario.id,
          fechaInicioJornada
        );

        console.log(
          "[EcoRoute] Cierre parcial - rutas del segmento:",
          rutasJornada.length,
          "| estados:",
          rutasJornada.map((r) => r.estado)
        );
        console.log("[EcoRoute] Fecha inicio de jornada:", fechaInicioJornada);

        resumen = calcularResumenJornada(
          rutasJornada,
          contenedores,
          fechaInicioJornada,
          "parcial"
        );
      } else {
        // Cierre final: total acumulado del día
        resumen = await calcularResumenJornadaFinal(
          sesion.usuario.id,
          contenedores,
          fechaInicioJornada
        );

        console.log(
          "[EcoRoute] Cierre final - total del día:",
          resumen.rutasEjecutadas,
          "rutas ·",
          resumen.kmTotales.toFixed(1),
          "km ·",
          resumen.tiempoTotalMinutos,
          "min"
        );
      }

      console.log("[EcoRoute] Resumen calculado:", {
        rutasEjecutadas: resumen.rutasEjecutadas,
        rutasEnProceso: resumen.rutasEnProceso,
        tiempoTotalMinutos: resumen.tiempoTotalMinutos,
        tipoCierre: resumen.tipo_cierre,
      });

      setResumenJornada(resumen);
      setCierreJornadaVisible(true);
    },
    [sesion, contenedores, fechaInicioJornada]
  );

  const handleConfirmarCierre = useCallback(async () => {
    if (!resumenJornada || !sesion?.usuario?.id) return;
    setGuardandoJornada(true);
    try {
      await cerrarJornada({
        operador_id: sesion.usuario.id,
        resumen: resumenJornada,
      });

      const esCierreFinal = resumenJornada.tipo_cierre === "final";
      const mensaje = esCierreFinal
        ? "Jornada cerrada. Turno finalizado."
        : "Cierre parcial guardado. Puedes continuar trabajando.";

      mostrarToast(
        esCierreFinal ? "Cierre Final" : "Cierre Parcial",
        mensaje,
        "exito"
      );

      setCierreJornadaVisible(false);
      setResumenJornada(null);
      setRutaSeleccionadaId(null);

      if (esCierreFinal) {
        // Reiniciar todo para una nueva jornada
        const nuevaFechaInicio = new Date().toISOString();
        localStorage.setItem("ecoroute:jornada:inicio", nuevaFechaInicio);
        setFechaInicioJornada(nuevaFechaInicio);
      }
      // En cierre parcial: mantener fechaInicioJornada para continuidad

      cargarRutasOperador();
    } catch {
      mostrarToast("Error", "No se pudo guardar el cierre de jornada.", "error");
    } finally {
      setGuardandoJornada(false);
    }
  }, [
    resumenJornada,
    sesion,
    cargarRutasOperador,
    setRutaSeleccionadaId,
    setFechaInicioJornada,
  ]);

  if (!sesion) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <h1 className="flex items-center text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <svg className="w-8 h-8 mr-2 inline-block flex-shrink-0" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="lpPinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10B981"/>
                  <stop offset="100%" stopColor="#06B6D4"/>
                </linearGradient>
                <linearGradient id="lpLeafGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399"/>
                  <stop offset="100%" stopColor="#10B981"/>
                </linearGradient>
              </defs>
              <path d="M32 62 C32 62 14 42 14 30 A18 18 0 1 1 50 30 C50 42 32 62 32 62 Z" fill="url(#lpPinGrad)"/>
              <circle cx="32" cy="30" r="13" fill="#0F172A"/>
              <path d="M32 20 C41 25 41 35 32 40 C23 35 23 25 32 20 Z" fill="url(#lpLeafGrad)"/>
              <path d="M32 21 L32 39" stroke="#0F172A" strokeWidth="1.5" opacity="0.55"/>
              <path d="M46 3 L48.8 12.2 L58 15 L48.8 17.8 L46 27 L43.2 17.8 L34 15 L43.2 12.2 Z" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1"/>
            </svg>
            EcoRoute AI
          </h1>
          <Link
            href="/acceso"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Iniciar Sesion
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-8 px-4 pb-12 sm:px-6 lg:px-10">
          <section className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              Gestion Inteligente de
              <br />
              Residuos Solidos
            </h2>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
              Monitoreo en tiempo real, optimizacion de rutas y separacion
              responsable — Ciudad Guayana
            </p>
          </section>

          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/separacion"
              className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-all hover:border-emerald-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900">
                🗺
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Explorar como Ciudadano
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Mapa de contenedores, guias de separacion y reciclaje sin
                  credenciales
                </p>
              </div>
            </Link>

            <Link
              href="/acceso"
              className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-all hover:border-emerald-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900">
                🔑
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Iniciar Sesion
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Accede con tu cuenta para gestionar rutas, dashboard y
                  reportes
                </p>
              </div>
            </Link>

            <Link
              href="/acceso"
              className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-all hover:border-emerald-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-2xl dark:bg-violet-900">
                ✋
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Crear Cuenta / Solicitar Rol
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Registrate y solicita acceso como Operador o Gerente
                </p>
              </div>
            </Link>
          </div>

          <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
            <div className="h-[40vh] w-full sm:h-[50vh]">
              <Map
                contenedores={contenedores}
                centro={CENTRO_CIUDAD}
                zoom={12}
                altura="100%"
              />
            </div>
            <div className="flex items-center justify-center gap-6 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                {"< 50%"}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />
                50–80%
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                {"> 80%"}
              </span>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {sesion.rol === "Ciudadano"
              ? "Mi EcoRoute"
              : sesion.rol === "Operador"
                ? "Mapa y Rutas"
                : sesion.rol === "Gerente"
                  ? "Panel Gerencial"
                  : "EcoRoute AI"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {sesion.rol === "Ciudadano"
              ? "Registra tus reciclajes y acumula eco-puntos"
              : sesion.rol === "Operador"
                ? "Visualiza contenedores y optimiza rutas de recoleccion"
                : sesion.rol === "Gerente"
                  ? "Metricas globales, reportes y eficiencia de rutas"
                  : "Monitoreo de contenedores de residuos solidos — Ciudad Guayana"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {datosRespaldo && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Datos de respaldo
            </span>
          )}
          {puede(sesion.rol, "gestionar_contenedores") && (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              + Registrar Contenedor
            </button>
          )}
        </div>
      </header>

      {sesion.rol === "Ciudadano" && (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-3xl">♻</span>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Bienvenido, {sesion.usuario.nombre}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tienes {sesion.usuario.puntos_reciclaje} eco-puntos acumulados.
            Usa la navegacion para acceder a Separacion y Gamificacion.
          </p>
        </section>
      )}

      {sesion.rol === "Operador" && (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setTabOperador("rutas")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tabOperador === "rutas"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Rutas
          </button>
          <button
            onClick={() => setTabOperador("historial")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tabOperador === "historial"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Mi Historial
          </button>

          <button
            onClick={() => handleCerrarJornada("parcial")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cierre Parcial
          </button>

          <button
            onClick={() => handleCerrarJornada("final")}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cierre Final
          </button>
        </div>
      )}

      {sesion.rol === "Admin" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/15 text-emerald-400">
              <Archive className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{totalContenedores}</p>
              <p className="text-sm font-medium text-zinc-400">Contenedores</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/15 text-cyan-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{promedioLlenado}%</p>
              <p className="text-sm font-medium text-zinc-400">Promedio llenado</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{criticosCount}</p>
              <p className="text-sm font-medium text-zinc-400">Contenedores criticos</p>
            </div>
          </div>
        </div>
      )}

      {sesion.rol === "Gerente" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/15 text-emerald-400">
                <Archive className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{totalContenedores}</p>
                <p className="text-sm font-medium text-zinc-400">Contenedores</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/15 text-cyan-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{promedioLlenado}%</p>
                <p className="text-sm font-medium text-zinc-400">Promedio llenado</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/15 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{criticosCount}</p>
                <p className="text-sm font-medium text-zinc-400">Contenedores criticos</p>
              </div>
            </div>
          </div>

          <section className="flex flex-1 justify-center">
            <RoutesMapView contenedores={contenedoresVisibles} centro={CENTRO_CIUDAD} rol={sesion.rol} />
          </section>

          <DashboardGerencial />
        </>
      )}

      {sesion.rol === "Operador" && (
        <section className={`grid w-full grid-cols-1 items-start gap-4 ${tabOperador === "rutas" ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
          {tabOperador === "rutas" && (
            <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800 lg:h-[65vh]">
              <Map
                contenedores={rutaSeleccionada
                  ? contenedoresVisibles.filter((c) => rutaSeleccionada.contenedores_asignados.includes(c.id))
                  : contenedoresVisibles}
                centro={enfocarEn ?? CENTRO_CIUDAD}
                zoom={enfocarEn ? 16 : 13}
                rutaPuntos={rutaSeleccionada ? (rutaSeleccionada.geometria ?? []) : []}
                paradasRuta={paradasContenedores}
                indiceParadaActual={indiceParadaActual}
                enfocarEn={enfocarEn}
                rol={sesion.rol}
              />

              {rutaSeleccionada && contenedoresRutaOrdenados.length > 0 && (
                <div className="absolute bottom-4 left-4 z-[9999] w-72 rounded-xl border border-slate-700 bg-zinc-900 p-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      Parada {indiceParadaActual + 1} de {contenedoresRutaOrdenados.length}
                    </span>
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${((indiceParadaActual + 1) / contenedoresRutaOrdenados.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {contenedoresRutaOrdenados[indiceParadaActual] && (() => {
                    const actual = contenedoresRutaOrdenados[indiceParadaActual];
                    const nivel = Math.round(actual.nivel_llenado);
                    return (
                      <>
                        <div className="mt-3">
                          <p className="text-sm font-bold text-white">
                            {actual.numero_identificacion}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {actual.zona ?? "Sin zona"} · {actual.tipo_residuo}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                nivel > 80 ? "bg-red-500" : nivel >= 50 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            <span className="text-xs font-semibold text-white">{nivel}%</span>
                          </div>
                        </div>
                        <button
                          onClick={manejarSiguienteParada}
                          disabled={guardandoAvance}
                          className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {guardandoAvance
                            ? "Procesando…"
                            : indiceParadaActual >= contenedoresRutaOrdenados.length - 1
                              ? "Finalizar Ruta"
                              : "Marcar como recolectado"}
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="max-h-[80vh] w-full overflow-y-auto lg:max-h-[65vh]">
              {tabOperador === "rutas" ? (
                <>
                  {rutaSeleccionada ? (
                    <PanelRutaOperador
                      ruta={rutaSeleccionada}
                      contenedores={contenedoresVisibles}
                      onRutaCompletada={() => {
                        console.log(
                          "[EcoRoute] Ruta completada, actualizando estado local",
                          rutaSeleccionada?.id
                        );
                        if (rutaSeleccionada) {
                          setRutasActivasOperador((prev) =>
                            prev.filter((r) => r.id !== rutaSeleccionada.id)
                          );
                        }
                        setRutaSeleccionadaId(null);
                        void cargarRutasOperador();
                      }}
                      onCerrar={handleCerrarPanel}
                    />
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Ninguna ruta seleccionada. Presiona &quot;Continuar Ruta&quot; en el panel inferior para cargar el itinerario.
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      En Progreso ({rutasActivasOperador.length})
                    </h4>
                    {rutasActivasOperador.length === 0 ? (
                      <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        No tienes rutas activas. Espera una asignacion desde la campana de notificaciones.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {rutasActivasOperador.map((ruta) => (
                          <li key={ruta.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{ruta.nombre}</p>
                                <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {ruta.contenedores_asignados.length} contenedores · {ruta.distancia_total?.toFixed(1) ?? "—"} km
                                </p>
                                <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  ruta.estado === "en_progreso"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : ruta.estado === "aceptada"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}>
                                  {ruta.estado === "en_progreso" ? "En Progreso" : ruta.estado === "aceptada" ? "Aceptada" : "Pendiente"}
                                </span>
                              </div>
                              <button
                                onClick={() => handleSeleccionarRuta(ruta)}
                                className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700"
                              >
                                Continuar Ruta
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
              </>
            ) : (
              <HistorialOperador operadorId={sesion.usuario.id} />
            )}
          </div>
        </section>
      )}

      {sesion.rol !== "Operador" && sesion.rol !== "Gerente" && (
        <section className="flex flex-1 justify-center">
          <RoutesMapView contenedores={contenedoresVisibles} centro={CENTRO_CIUDAD} rol={sesion.rol} />
        </section>
      )}

      {modalAbierto && (
        <NuevoContenedorModal onCerrar={() => setModalAbierto(false)} />
      )}

      {cierreJornadaVisible && resumenJornada && (
        <CierreJornadaModal
          resumen={resumenJornada}
          onConfirmar={handleConfirmarCierre}
          onCancelar={() => { setCierreJornadaVisible(false); setResumenJornada(null); }}
          guardando={guardandoJornada}
        />
      )}
    </div>
  );
}