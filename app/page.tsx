"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import DashboardGerencial from "@/components/DashboardGerencial";
import NuevoContenedorModal from "@/components/NuevoContenedorModal";
import RoutesMapView from "@/components/RoutesMapView";
import {
  CONTENEDORES_FALLBACK,
  obtenerSnapshotContenedores,
  obtenerSnapshotEstadoContenedores,
  obtenerSnapshotServidorContenedores,
  obtenerSnapshotServidorEstadoContenedores,
  suscribirseAContenedores,
} from "@/lib/contenedoresStore";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";
import { obtenerSnapshotSesion, cerrarSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import { useRouter } from "next/navigation";
import type { UbicacionPunto } from "@/types/schema";

const MapPreview = dynamic(() => import("@/components/Map"), { ssr: false });

const CENTRO_CIUDAD: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };

export default function Home() {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);

  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const contenedores = useSyncExternalStore(
    suscribirseAContenedores,
    obtenerSnapshotContenedores,
    obtenerSnapshotServidorContenedores
  );
  const estadoContenedores = useSyncExternalStore(
    suscribirseAContenedores,
    obtenerSnapshotEstadoContenedores,
    obtenerSnapshotServidorEstadoContenedores
  );

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
              <MapPreview
                contenedores={CONTENEDORES_FALLBACK}
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
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              EcoRoute AI
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Monitoreo de contenedores de residuos solidos — Ciudad Guayana
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puede(sesion.rol, "aprobar_solicitudes") && (
              <Link
                href="/admin"
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-900 px-3 py-1 text-xs font-medium text-violet-50 transition-colors hover:bg-violet-700 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
              >
                Gestion de Acceso
              </Link>
            )}
            {datosRespaldo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Datos de respaldo
              </span>
            )}
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {ETIQUETAS_ROL[sesion.rol]}
            </span>
            <Link
              href="/separacion"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Separacion y gamificacion
            </Link>
            {puede(sesion.rol, "gestionar_contenedores") && (
              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                + Registrar Contenedor
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await cerrarSesion();
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20 dark:hover:bg-red-500/20"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <DashboardGerencial />

      <section className="flex flex-1 justify-center">
        <RoutesMapView contenedores={contenedoresVisibles} centro={CENTRO_CIUDAD} />
      </section>

      {modalAbierto && (
        <NuevoContenedorModal onCerrar={() => setModalAbierto(false)} />
      )}
    </main>
  );
}
