"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
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
import { obtenerRutasActivasOperador, marcarRutaEnProgreso } from "@/lib/operadoresService";
import { cerrarJornada, calcularResumenJornada, type ResumenJornada } from "@/lib/jornadaService";
import { mostrarToast } from "@/lib/toastStore";
import type { Ruta, UbicacionPunto } from "@/types/schema";

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

  const { contenedores, estado: estadoContenedores } = useContenedores();

  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const rutaSeleccionada = rutaSeleccionadaId
    ? rutasActivasOperador.find((r) => r.id === rutaSeleccionadaId) ?? null
    : null;

  const handleSeleccionarRuta = useCallback(
    async (ruta: Ruta) => {
      await marcarRutaEnProgreso(ruta.id);
      setRutaSeleccionadaId(ruta.id);
    },
    []
  );

  const handleCerrarPanel = useCallback(() => {
    setRutaSeleccionadaId(null);
  }, []);

  const cargarRutasOperador = useCallback(async () => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;
    const activas = await obtenerRutasActivasOperador(sesion.usuario.id);
    console.log("[EcoRoute] Rutas activas cargadas:", activas.length);
    setRutasActivasOperador(activas);
  }, [sesion]);

  useEffect(() => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;

    cargarRutasOperador();
  }, [sesion, cargarRutasOperador]);

  const contenedoresVisibles =
    estadoContenedores.estadoCarga === "cargando" ? [] : contenedores;

  const datosRespaldo =
    !estaSupabaseConfigurado() || estadoContenedores.estadoCarga === "error";

  const handleCerrarJornada = useCallback(() => {
    const resumen = calcularResumenJornada(rutasActivasOperador, contenedores);
    setResumenJornada(resumen);
    setCierreJornadaVisible(true);
  }, [rutasActivasOperador, contenedores]);

  const handleConfirmarCierre = useCallback(async () => {
    if (!resumenJornada || !sesion?.usuario?.id) return;
    setGuardandoJornada(true);
    try {
      await cerrarJornada({
        operador_id: sesion.usuario.id,
        resumen: resumenJornada,
      });
      mostrarToast("Jornada cerrada", "El resumen de la jornada fue guardado correctamente.", "exito");
      setCierreJornadaVisible(false);
      setResumenJornada(null);
      setRutaSeleccionadaId(null);
      cargarRutasOperador();
    } catch {
      mostrarToast("Error", "No se pudo guardar el cierre de jornada.", "error");
    } finally {
      setGuardandoJornada(false);
    }
  }, [resumenJornada, sesion, cargarRutasOperador, setRutaSeleccionadaId]);

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
                  ? "Dashboard Gerencial"
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
            onClick={handleCerrarJornada}
            className="ml-auto flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cerrar Jornada del Día
          </button>
        </div>
      )}

      {puede(sesion.rol, "ver_dashboard") && <DashboardGerencial />}

      {sesion.rol === "Operador" ? (
        <section className={`grid w-full grid-cols-1 items-start gap-4 ${tabOperador === "rutas" ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
          {tabOperador === "rutas" && (
            <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800 lg:h-[65vh]">
              <Map
                contenedores={rutaSeleccionada
                  ? contenedoresVisibles.filter((c) => rutaSeleccionada.contenedores_asignados.includes(c.id))
                  : contenedoresVisibles}
                centro={CENTRO_CIUDAD}
                zoom={13}
                rutaPuntos={rutaSeleccionada ? (rutaSeleccionada.geometria ?? []) : []}
                paradasRuta={rutaSeleccionada ? (rutaSeleccionada.geometria ?? []) : []}
                rol={sesion.rol}
              />
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
                        Ninguna ruta seleccionada. Presiona "Continuar Ruta" en el panel inferior para cargar el itinerario.
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
      ) : (
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