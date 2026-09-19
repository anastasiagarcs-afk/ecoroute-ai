"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import DashboardGerencial from "@/components/DashboardGerencial";
import { obtenerSnapshotSesion } from "@/lib/authService";
import { puede } from "@/lib/rolesAutorizados";

export default function ReportesPage() {
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  if (sesion && !puede(sesion.rol, "ver_reportes")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <section className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Acceso restringido
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tu rol no tiene permiso para ver reportes.
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reportes
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Metricas globales, analisis predictivo y exportacion de datos
        </p>
      </header>
      <DashboardGerencial ocultarTitulo />
    </div>
  );
}
