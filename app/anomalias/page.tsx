"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import AnomaliasPanel from "@/components/AnomaliasPanel";
import HistorialAnomalias from "@/components/HistorialAnomalias";
import { obtenerSnapshotSesion } from "@/lib/authService";
import { puede } from "@/lib/rolesAutorizados";

export default function AnomaliasPage() {
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  if (sesion && !puede(sesion.rol, "ver_anomalias")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <section className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Acceso restringido
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tu rol no tiene permiso para ver anomalías.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Detección de Anomalías
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Monitoreo de sensores, baterías y temperatura en tiempo real
          </p>
        </div>
      </header>
      <AnomaliasPanel />
      <HistorialAnomalias />
    </div>
  );
}
