"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  registrarCuentaConSolicitud,
  iniciarSesion,
} from "@/lib/authService";
import type { RolUsuario } from "@/types/schema";

const ROLES_DISPONIBLES: { valor: RolUsuario; etiqueta: string; icono: string }[] = [
  { valor: "Operador", etiqueta: "Recolector / Operador", icono: "\u{1F69B}" },
  { valor: "Gerente", etiqueta: "Gerente", icono: "\u{1F454}" },
];

export default function PaginaAcceso() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [rolExito, setRolExito] = useState<RolUsuario | null>(null);

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
    const resultado = await registrarCuentaConSolicitud(email, password, { nombre }, rolSeleccionado);
    if (resultado.exito) {
      setExito(true);
      setRolExito(resultado.rolSolicitado ?? null);
    } else {
      setError(resultado.error ?? "Error al registrar cuenta");
    }
    setCargando(false);
  }

  if (exito) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <span className="text-xl text-emerald-600 dark:text-emerald-400">✓</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            ¡Cuenta creada!
          </h2>
          {rolExito ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tu solicitud de acceso como <strong>{ROLES_DISPONIBLES.find(r => r.valor === rolExito)?.etiqueta}</strong> fue enviada al administrador para su aprobación.
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Ya puedes acceder a la aplicación como Ciudadano.
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="EcoRoute AI">
            <defs>
              <linearGradient id="loginPinGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#10B981"/>
                <stop offset="100%" stop-color="#06B6D4"/>
              </linearGradient>
              <linearGradient id="loginLeafGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34D399"/>
                <stop offset="100%" stop-color="#10B981"/>
              </linearGradient>
            </defs>
            <path d="M32 62 C32 62 14 42 14 30 A18 18 0 1 1 50 30 C50 42 32 62 32 62 Z" fill="url(#loginPinGrad)"/>
            <circle cx="32" cy="30" r="13" fill="#0F172A"/>
            <path d="M32 20 C41 25 41 35 32 40 C23 35 23 25 32 20 Z" fill="url(#loginLeafGrad)"/>
            <path d="M32 21 L32 39" stroke="#0F172A" stroke-width="1" opacity="0.55"/>
            <path d="M44 7.2 L45.6 13.1 L51.5 14.7 L45.6 16.3 L44 22.2 L42.4 16.3 L36.5 14.7 L42.4 13.1 Z" fill="#3B82F6"/>
          </svg>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {modo === "login" ? "Iniciar sesion" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {modo === "login"
              ? "Ingresa tus credenciales para acceder"
              : "Crea tu cuenta y elige tu rol"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {modo === "login" && (
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
                <button type="button" onClick={() => setModo("registro")} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  Registrate
                </button>
              </p>
            </form>
          )}

          {modo === "registro" && (
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

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Rol</span>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    rolSeleccionado === null
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="rol-registro"
                    checked={rolSeleccionado === null}
                    onChange={() => setRolSeleccionado(null)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Ciudadano - Recicla y acumula puntos
                  </span>
                </label>
                {ROLES_DISPONIBLES.map((rol) => (
                  <label
                    key={rol.valor}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      rolSeleccionado === rol.valor
                        ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rol-registro"
                      checked={rolSeleccionado === rol.valor}
                      onChange={() => setRolSeleccionado(rol.valor)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {rol.icono} {rol.etiqueta} - Requiere aprobacion del Admin
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {cargando ? "Creando..." : "Crear cuenta"}
              </button>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                ¿Ya tienes cuenta?{" "}
                <button type="button" onClick={() => setModo("login")} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                  Inicia sesion
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}