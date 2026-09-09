"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import NuevoContenedorModal from "@/components/NuevoContenedorModal";
import RoutesMapView from "@/components/RoutesMapView";
import {
  obtenerSnapshotContenedores,
  obtenerSnapshotEstadoContenedores,
  obtenerSnapshotServidorContenedores,
  obtenerSnapshotServidorEstadoContenedores,
  suscribirseAContenedores,
} from "@/lib/contenedoresStore";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";
import type { UbicacionPunto } from "@/types/schema";

const CENTRO_CIUDAD: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };

function TarjetaResumen({
  etiqueta,
  valor,
  colorPunto,
}: {
  etiqueta: string;
  valor: number;
  colorPunto: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${colorPunto}`} />
      <div>
        <p className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">{valor}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [modalAbierto, setModalAbierto] = useState(false);

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

  const total = contenedoresVisibles.length;
  const criticos = contenedoresVisibles.filter((c) => c.nivel_llenado > 80).length;
  const medios = contenedoresVisibles.filter(
    (c) => c.nivel_llenado >= 50 && c.nivel_llenado <= 80
  ).length;
  const bajos = contenedoresVisibles.filter((c) => c.nivel_llenado < 50).length;

  const datosRespaldo =
    !estaSupabaseConfigurado() || estadoContenedores.estadoCarga === "error";

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              EcoRoute AI
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Monitoreo de contenedores de residuos sólidos — Ciudad Guayana
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {datosRespaldo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Datos de respaldo
              </span>
            )}
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sprint 4 — Módulo de contenedores
            </span>
            <Link
              href="/separacion"
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sprint 3 — Separación y gamificación →
            </Link>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              + Registrar Contenedor
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaResumen
          etiqueta="Contenedores totales"
          valor={total}
          colorPunto="bg-zinc-400"
        />
        <TarjetaResumen
          etiqueta="Nivel bajo (< 50%)"
          valor={bajos}
          colorPunto="bg-emerald-500"
        />
        <TarjetaResumen
          etiqueta="Nivel medio (50 - 80%)"
          valor={medios}
          colorPunto="bg-amber-500"
        />
        <TarjetaResumen
          etiqueta="Nivel crítico (> 80%)"
          valor={criticos}
          colorPunto="bg-red-500"
        />
      </section>

      <section className="flex flex-1 justify-center">
        <RoutesMapView contenedores={contenedoresVisibles} centro={CENTRO_CIUDAD} />
      </section>

      {modalAbierto && (
        <NuevoContenedorModal onCerrar={() => setModalAbierto(false)} />
      )}
    </main>
  );
}