"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  registrarCuenta,
  iniciarSesion,
  enviarSolicitudAcceso,
} from "@/lib/authService";
import type { RolUsuario } from "@/types/schema";

type Paso = "login" | "registro" | "solicitud";

const ROLES_DISPONIBLES: { valor: RolUsuario; etiqueta: string }[] = [
  { valor: "Operador", etiqueta: "Recolector / Operador" },
  { valor: "Gerente", etiqueta: "Gerente" },
];

export default function PaginaAcceso() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rolSolicitado, setRolSolicitado] = useState<RolUsuario>("Operador");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const resultado = await iniciarSesion(email, password);
    if (resultado.exito) {
      router.push("/");
    } else {
      setError(resultado.error ?? "Error al iniciar sesion");
    }
    setCargando(false);
  }

  async function manejarRegistro(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const resultado = await registrarCuenta(email, password, { nombre });
    if (resultado.exito) {
      setPaso("solicitud");
    } else {
      setError(resultado.error ?? "Error al registrar cuenta");
    }
    setCargando(false);
  }

  async function manejarSolicitud(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const resultado = await enviarSolicitudAcceso(rolSolicitado);
    if (resultado.exito) {
      setExito(true);
    } else {
      setError(resultado.error ?? "Error al enviar solicitud");
    }
    setCargando(false);
  }

  if (exito) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <span className="text-xl text-emerald-600 dark:text-emerald-400">✓</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Solicitud enviada
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Tu solicitud de acceso como <strong>{ROLES_DISPONIBLES.find(r => r.valor === rolSolicitado)?.etiqueta}</strong> fue enviada.
            Un administrador la revisara pronto.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {paso === "login" ? "Iniciar sesion" : paso === "registro" ? "Crear cuenta" : "Solicitar acceso"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {paso === "login"
              ? "Ingresa tus credenciales para acceder"
              : paso === "registro"
                ? "Crea tu cuenta para comenzar"
                : "Elige el rol que deseas solicitar"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {paso === "login" && (
            <form onSubmit={manejarLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Contrasena</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {cargando ? "Entrando..." : "Iniciar sesion"}
              </button>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                ¿No tienes cuenta?{" "}
                <button type="button" onClick={() => setPaso("registro")} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  Registrate
                </button>
              </p>
            </form>
          )}

          {paso === "registro" && (
            <form onSubmit={manejarRegistro} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Nombre</span>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Contrasena</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {cargando ? "Creando..." : "Crear cuenta"}
              </button>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => setPaso("login")} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  Inicia sesion
                </button>
              </p>
            </form>
          )}

          {paso === "solicitud" && (
            <form onSubmit={manejarSolicitud} className="flex flex-col gap-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Tu cuenta fue creada. Ahora solicita el rol que necesitas:
              </p>
              {ROLES_DISPONIBLES.map((rol) => (
                <label
                  key={rol.valor}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    rolSolicitado === rol.valor
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={rol.valor}
                    checked={rolSolicitado === rol.valor}
                    onChange={() => setRolSolicitado(rol.valor)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{rol.etiqueta}</span>
                </label>
              ))}
              <button
                type="submit"
                disabled={cargando}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {cargando ? "Enviando..." : "Enviar solicitud"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Omitir por ahora
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}