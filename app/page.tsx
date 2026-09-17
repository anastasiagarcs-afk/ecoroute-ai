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
import { useContenedores } from "@/hooks/useContenedores";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";
import { obtenerSnapshotSesion } from "@/lib/authService";
import { puede } from "@/lib/rolesAutorizados";
import { obtenerRutaActivaOperador, obtenerRutasActivasOperador, obtenerHistorialOperador } from "@/lib/operadoresService";
import type { Ruta, UbicacionPunto } from "@/types/schema";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const CENTRO_CIUDAD: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };

export default function Home() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaActiva, setRutaActiva] = useState<Ruta | null>(null);
  const [tabOperador, setTabOperador] = useState<"rutas" | "historial">("rutas");
  const [subTabOperador, setSubTabOperador] = useState<"activas" | "completadas">("activas");
  const [rutasActivasOperador, setRutasActivasOperador] = useState<Ruta[]>([]);
  const [rutasCompletadasOperador, setRutasCompletadasOperador] = useState<Ruta[]>([]);
  const [modoLectura, setModoLectura] = useState(false);

  const { contenedores, estado: estadoContenedores } = useContenedores();

  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const cargarRutasOperador = useCallback(async () => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;
    const [activas, completadas] = await Promise.all([
      obtenerRutasActivasOperador(sesion.usuario.id),
      obtenerHistorialOperador(sesion.usuario.id),
    ]);
    setRutasActivasOperador(activas);
    setRutasCompletadasOperador(completadas);
  }, [sesion]);

  const cargarRutaActiva = useCallback(() => {
    if (sesion?.rol === "Operador" && sesion.usuario?.id) {
      obtenerRutaActivaOperador(sesion.usuario.id).then((ruta) => {
        const estado = ruta?.estado ?? "pendiente";
        if (estado === "aceptada" || estado === "en_progreso") {
          setRutaActiva(ruta);
          setModoLectura(false);
        } else {
          setRutaActiva(null);
        }
      });
    }
  }, [sesion]);

  useEffect(() => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;

    cargarRutaActiva();
    cargarRutasOperador();

    const handler = () => {
      cargarRutaActiva();
      cargarRutasOperador();
    };
    window.addEventListener("ecoroute:ruta-aceptada", handler);
    return () => window.removeEventListener("ecoroute:ruta-aceptada", handler);
  }, [sesion, cargarRutaActiva, cargarRutasOperador]);

  const contenedoresVisibles =
    estadoContenedores.estadoCarga === "cargando" ? [] : contenedores;

  const datosRespaldo =
    !estaSupabaseConfigurado() || estadoContenedores.estadoCarga === "error";

  if (!sesion) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
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
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => { setTabOperador("rutas"); setRutaActiva(null); setModoLectura(false); }}
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
        </div>
      )}

      {puede(sesion.rol, "ver_dashboard") && <DashboardGerencial />}

      {sesion.rol === "Operador" ? (
        <section className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800 lg:h-[65vh]">
            <Map
              contenedores={rutaActiva && tabOperador === "rutas"
                ? contenedoresVisibles.filter((c) => rutaActiva.contenedores_asignados.includes(c.id))
                : contenedoresVisibles}
              centro={CENTRO_CIUDAD}
              zoom={13}
              rutaPuntos={rutaActiva && tabOperador === "rutas" ? (rutaActiva.geometria ?? []) : []}
              paradasRuta={rutaActiva && tabOperador === "rutas" ? (rutaActiva.geometria ?? []) : []}
              rol={sesion.rol}
            />
          </div>

          <div className="max-h-[80vh] w-full overflow-y-auto lg:max-h-[65vh]">
            {tabOperador === "rutas" ? (
              rutaActiva ? (
                <PanelRutaOperador
                  ruta={rutaActiva}
                  contenedores={contenedoresVisibles}
                  onRutaCompletada={() => { cargarRutaActiva(); cargarRutasOperador(); }}
                  modoLectura={modoLectura}
                />
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-3 flex gap-1 border-b border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setSubTabOperador("activas")}
                      className={`flex-1 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                        subTabOperador === "activas"
                          ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                          : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      En Progreso ({rutasActivasOperador.length})
                    </button>
                    <button
                      onClick={() => setSubTabOperador("completadas")}
                      className={`flex-1 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                        subTabOperador === "completadas"
                          ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                          : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      Completadas ({rutasCompletadasOperador.length})
                    </button>
                  </div>

                  {subTabOperador === "activas" ? (
                    rutasActivasOperador.length === 0 ? (
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
                                onClick={() => { setRutaActiva(ruta); setModoLectura(false); }}
                                className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700"
                              >
                                Continuar Ruta
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    rutasCompletadasOperador.length === 0 ? (
                      <p className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                        No tienes rutas completadas aun.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {rutasCompletadasOperador.map((ruta) => (
                          <li key={ruta.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{ruta.nombre}</p>
                                <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {ruta.contenedores_asignados.length} contenedores · {ruta.ultima_ejecucion ? new Date(ruta.ultima_ejecucion).toLocaleDateString() : "—"}
                                </p>
                                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Completada
                                </span>
                              </div>
                              <button
                                onClick={() => { setRutaActiva(ruta); setModoLectura(true); }}
                                disabled={!Array.isArray(ruta.geometria) || (ruta.geometria?.length ?? 0) < 2}
                                className="shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                Ver en Mapa
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              )
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
    </div>
  );
}