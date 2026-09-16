"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listarSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
} from "@/lib/adminService";
import { mostrarToast } from "@/lib/toastStore";
import { obtenerSnapshotSesion, cerrarSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import type { RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";

type SolicitudConUsuario = SolicitudAcceso & { Usuarios: Usuario };

export default function AdminPage() {
  const router = useRouter();
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const [solicitudes, setSolicitudes] = useState<SolicitudConUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const puedeAprobar = !sesion || puede(sesion.rol, "aprobar_solicitudes");

  useEffect(() => {
    if (!puedeAprobar) return;
    let activo = true;
    (async () => {
      const resultado = await listarSolicitudesPendientes();
      console.log("[Admin] Resultado carga solicitudes:", resultado);
      if (activo && resultado.exito && resultado.datos) {
        setSolicitudes(resultado.datos);
        setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [puedeAprobar]);

  async function manejarDecision(solicitudId: string, aprobar: boolean, rolAsignado?: RolUsuario) {
    setProcesando(solicitudId);
    const resultado = await aprobarSolicitud(solicitudId, aprobar, rolAsignado);
    if (resultado.exito) {
      mostrarToast(
        aprobar ? "Solicitud aprobada" : "Solicitud rechazada",
        aprobar
          ? `El usuario ahora tiene rol ${rolAsignado ? ETIQUETAS_ROL[rolAsignado] : "solicitado"}.`
          : "La solicitud fue rechazada.",
        "exito"
      );
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId));
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo procesar.", "error");
    }
    setProcesando(null);
  }

  async function manejarRechazar(solicitudId: string) {
    const motivo = prompt("Motivo del rechazo (opcional):");
    if (motivo === null) return;

    setProcesando(solicitudId);
    const resultado = await rechazarSolicitud(solicitudId, motivo || undefined);
    if (resultado.exito) {
      mostrarToast("Solicitud rechazada", "La solicitud fue denegada.", "exito");
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId));
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo rechazar.", "error");
    }
    setProcesando(null);
  }

  if (sesion && !puedeAprobar) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <section className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Acceso restringido
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tu rol ({ETIQUETAS_ROL[sesion.rol]}) no tiene permiso para
            administrar solicitudes de acceso.
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

  if (!sesion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <section className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Debes iniciar sesion como administrador.
          </p>
          <Link
            href="/acceso"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Iniciar sesion
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Gestion de Acceso
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Solicitudes de rol pendientes de revision
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-50 transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            ← Volver al dashboard
          </Link>
          <button
            type="button"
            onClick={async () => {
              await cerrarSesion();
              router.push("/acceso");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {solicitudes.length}
          </span>
          solicitud{solicitudes.length !== 1 ? "es" : ""} pendiente
          {solicitudes.length !== 1 ? "s" : ""}
        </div>
      </section>

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando solicitudes...
          </span>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-2xl">✓</span>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No hay solicitudes pendientes
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Cuando un usuario solicite acceso, aparecera aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol solicitado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {solicitudes.map((solicitud) => (
                <tr
                  key={solicitud.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {solicitud.Usuarios?.nombre ?? "Sin nombre"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {solicitud.Usuarios?.email ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {ETIQUETAS_ROL[solicitud.rol_solicitado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(solicitud.fecha_solicitud).toLocaleDateString(
                      "es-VE",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </td>
                  <td className="flex flex-wrap justify-end gap-1.5 px-4 py-3">
                    <button
                      type="button"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarDecision(solicitud.id, true, "Admin")}
                      className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                    >
                      {procesando === solicitud.id ? "..." : "Aprobar como Admin"}
                    </button>
                    <button
                      type="button"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarDecision(solicitud.id, true, "Gerente")}
                      className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {procesando === solicitud.id ? "..." : "Aprobar como Gerente"}
                    </button>
                    <button
                      type="button"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarDecision(solicitud.id, true, "Operador")}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {procesando === solicitud.id ? "..." : "Aprobar como Operador"}
                    </button>
                    <button
                      type="button"
                      disabled={procesando === solicitud.id}
                      onClick={() => manejarRechazar(solicitud.id)}
                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20 dark:hover:bg-red-500/20"
                    >
                      {procesando === solicitud.id ? "..." : "Rechazar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
