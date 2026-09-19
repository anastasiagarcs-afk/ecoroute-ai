"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listarSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
  listarUsuarios,
  actualizarRolUsuario,
  actualizarZonaUsuario,
  toggleActivoUsuario,
  eliminarUsuario,
} from "@/lib/adminService";
import { mostrarToast } from "@/lib/toastStore";
import { obtenerSnapshotSesion, cerrarSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import PanelAlertas from "@/components/PanelAlertas";
import type { RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";

type SolicitudConUsuario = SolicitudAcceso & { Usuarios: Usuario };
type TabActiva = "solicitudes" | "usuarios" | "alertas";

const ZONAS_PREDEFINIDAS = [
  "Alta Vista",
  "Puerto Ordaz",
  "San Félix",
  "Unare",
  "Zona Centro",
] as const;

const COLORES_ROL: Record<RolUsuario, string> = {
  Admin: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400",
  Gerente: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400",
  Operador: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  Ciudadano: "bg-zinc-50 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-500/10 dark:text-zinc-400",
};

const PRIORIDAD_ROL: Record<RolUsuario, number> = {
  Admin: 0,
  Gerente: 1,
  Operador: 2,
  Ciudadano: 3,
};

export default function AdminPage() {
  const router = useRouter();
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const [tabActiva, setTabActiva] = useState<TabActiva>("solicitudes");
  const [solicitudes, setSolicitudes] = useState<SolicitudConUsuario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const puedeAdministrar = !sesion || puede(sesion.rol, "aprobar_solicitudes");

  // Cargar solicitudes pendientes
  useEffect(() => {
    if (!puedeAdministrar) return;
    let activo = true;
    (async () => {
      const resultado = await listarSolicitudesPendientes();
      if (activo && resultado.exito && resultado.datos) {
        setSolicitudes(resultado.datos);
        setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [puedeAdministrar]);

  // Cargar usuarios cuando se selecciona la pestaña
  useEffect(() => {
    if (tabActiva === "usuarios" && puedeAdministrar) {
      cargarUsuarios();
    }
  }, [tabActiva, puedeAdministrar]);

  async function cargarUsuarios() {
    setCargando(true);
    const resultado = await listarUsuarios();
    if (resultado.exito && resultado.datos) {
      setUsuarios(resultado.datos);
    }
    setCargando(false);
  }

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

  async function manejarCambiarRol(usuarioId: string, nuevoRol: RolUsuario) {
    setProcesando(usuarioId);
    const resultado = await actualizarRolUsuario(usuarioId, nuevoRol);
    if (resultado.exito) {
      mostrarToast("Rol actualizado", `El usuario ahora tiene rol ${ETIQUETAS_ROL[nuevoRol]}.`, "exito");
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, rol: nuevoRol } : u))
      );
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo actualizar el rol.", "error");
    }
    setProcesando(null);
  }

  async function manejarCambiarZona(usuarioId: string, nuevaZona: string | null) {
    setProcesando(usuarioId);
    const resultado = await actualizarZonaUsuario(usuarioId, nuevaZona);
    if (resultado.exito) {
      mostrarToast("Zona actualizada", `Zona asignada: ${nuevaZona || "Sin zona"}.`, "exito");
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, zona_asignada: nuevaZona } : u))
      );
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo actualizar la zona.", "error");
    }
    setProcesando(null);
  }

  async function manejarToggleActivo(usuarioId: string, activo: boolean) {
    setProcesando(usuarioId);
    const resultado = await toggleActivoUsuario(usuarioId, activo);
    if (resultado.exito) {
      mostrarToast(
        activo ? "Cuenta activada" : "Cuenta desactivada",
        activo ? "El usuario puede acceder al sistema." : "El usuario no podrá iniciar sesión.",
        activo ? "exito" : "info"
      );
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, activo } : u))
      );
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo cambiar el estado.", "error");
    }
    setProcesando(null);
  }

  async function manejarEliminar(usuarioId: string, nombreUsuario: string) {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar al usuario "${nombreUsuario}"?\n\nEsta acción eliminará permanentemente:\n- Sus puntos de reciclaje\n- Sus notificaciones\n- Sus solicitudes de acceso\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setProcesando(usuarioId);
    const resultado = await eliminarUsuario(usuarioId);
    if (resultado.exito) {
      mostrarToast("Usuario eliminado", `"${nombreUsuario}" fue eliminado del sistema.`, "exito");
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioId));
    } else {
      mostrarToast("Error", resultado.error ?? "No se pudo eliminar el usuario.", "error");
    }
    setProcesando(null);
  }

  if (sesion && !puedeAdministrar) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <section className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Acceso restringido
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Tu rol ({ETIQUETAS_ROL[sesion.rol]}) no tiene permiso para
            administrar usuarios.
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
            Gestion de Usuarios
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Administrar solicitudes de acceso y cuentas de usuarios
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

      {/* Sub-pestañas */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setTabActiva("solicitudes")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tabActiva === "solicitudes"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Solicitudes Pendientes
          {solicitudes.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              {solicitudes.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTabActiva("usuarios")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tabActiva === "usuarios"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Usuarios Registrados
          {usuarios.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-zinc-500 px-2 py-0.5 text-xs font-medium text-white">
              {usuarios.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTabActiva("alertas")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tabActiva === "alertas"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          🔔 Alertas
        </button>
      </div>

      {/* Contenido de pestañas */}
      {tabActiva === "solicitudes" ? (
        // Pestaña de Solicitudes Pendientes
        cargando ? (
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
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${COLORES_ROL[solicitud.rol_solicitado]}`}>
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
        )
      ) : tabActiva === "usuarios" ? (
        // Pestaña de Usuarios Registrados
        cargando ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Cargando usuarios...
            </span>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-2xl">👥</span>
            <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No hay usuarios registrados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Nombre / Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Zona Asignada</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[...usuarios]
                  .sort((a, b) => {
                    const prioridadA = PRIORIDAD_ROL[a.rol];
                    const prioridadB = PRIORIDAD_ROL[b.rol];
                    if (prioridadA !== prioridadB) return prioridadA - prioridadB;
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                  })
                  .map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {usuario.nombre}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-500">
                        {usuario.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={usuario.rol}
                        disabled={procesando === usuario.id || usuario.id === sesion?.usuario.id}
                        onChange={(e) => manejarCambiarRol(usuario.id, e.target.value as RolUsuario)}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium ring-1 ring-inset ${COLORES_ROL[usuario.rol]} border-transparent focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <option value="Admin">Administrador</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Operador">Recolector</option>
                        <option value="Ciudadano">Ciudadano</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={usuario.zona_asignada ?? ""}
                        disabled={procesando === usuario.id}
                        onChange={(e) => manejarCambiarZona(usuario.id, e.target.value || null)}
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <option value="">Sin zona</option>
                        {ZONAS_PREDEFINIDAS.map((zona) => (
                          <option key={zona} value={zona}>
                            {zona}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={procesando === usuario.id || usuario.id === sesion?.usuario.id}
                        onClick={() => manejarToggleActivo(usuario.id, !usuario.activo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          usuario.activo ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            usuario.activo ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-500">
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {procesando === usuario.id && (
                          <span className="text-xs text-zinc-500">Guardando...</span>
                        )}
                        <button
                          type="button"
                          disabled={procesando === usuario.id || usuario.id === sesion?.usuario.id}
                          onClick={() => manejarEliminar(usuario.id, usuario.nombre)}
                          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Eliminar usuario"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Pestaña de Alertas (Admin only)
        <PanelAlertas />
      )}
    </main>
  );
}
