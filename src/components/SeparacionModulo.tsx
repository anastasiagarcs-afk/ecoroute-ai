"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GamificacionPanel from "@/components/GamificacionPanel";
import RegistroReciclajeForm from "@/components/RegistroReciclajeForm";
import SeparacionGuia from "@/components/SeparacionGuia";
import {
  obtenerEntregasRecientes,
  obtenerUsuarioActual,
  recargarUsuarioActual,
  type ResultadoRegistroEntrega,
} from "@/lib/reciclajeService";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";
import type { PuntosReciclaje, Usuario } from "@/types/schema";

type Pestana = "guia" | "registro" | "panel";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "guia", etiqueta: "Guía de separación" },
  { id: "registro", etiqueta: "Registrar reciclaje" },
  { id: "panel", etiqueta: "Mis puntos y recompensas" },
];

export default function SeparacionModulo() {
  const [pestana, setPestana] = useState<Pestana>("guia");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [entregas, setEntregas] = useState<PuntosReciclaje[]>([]);
  const [servicioDisponible] = useState(() => estaSupabaseConfigurado());
  const [cargando, setCargando] = useState(() => estaSupabaseConfigurado());
  const [errorServicio, setErrorServicio] = useState<string | null>(() =>
    estaSupabaseConfigurado()
      ? null
      : "El módulo de gamificación requiere la configuración de Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY). La guía de separación sigue disponible."
  );

  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const perfil = await obtenerUsuarioActual();
        if (!activo) return;
        setUsuario(perfil);
        const recientes = await obtenerEntregasRecientes(perfil.id);
        if (activo) setEntregas(recientes);
      } catch (error) {
        if (activo) {
          setErrorServicio(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el perfil del ciudadano."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, []);

  const manejarRegistrado = async (resultado: ResultadoRegistroEntrega) => {
    setCargando(true);
    try {
      const [perfil, recientes] = await Promise.all([
        recargarUsuarioActual(),
        obtenerEntregasRecientes(resultado.usuarioId),
      ]);
      setUsuario(perfil);
      setEntregas(recientes);
      setErrorServicio(null);
    } catch (error) {
      setErrorServicio(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el perfil del ciudadano."
      );
    } finally {
      setCargando(false);
      setPestana("panel");
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              ← Volver al mapa de monitoreo
            </Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Separación en la Fuente y Gamificación
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aprende a separar tus residuos, registra tus entregas y acumula
              puntos por cada kilogramo reciclado.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Sprint 3 — Separación y gamificación
          </span>
        </div>

        <nav
          aria-label="Secciones del módulo de separación"
          className="flex w-fit flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {PESTANAS.map((pestanaItem) => (
            <button
              key={pestanaItem.id}
              type="button"
              onClick={() => setPestana(pestanaItem.id)}
              aria-current={pestana === pestanaItem.id ? "page" : undefined}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                pestana === pestanaItem.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {pestanaItem.etiqueta}
            </button>
          ))}
        </nav>
      </header>

      {errorServicio && !servicioDisponible && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
        >
          {errorServicio}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {pestana === "guia" && <SeparacionGuia />}
        {pestana === "registro" && (
          <RegistroReciclajeForm onRegistrado={manejarRegistrado} />
        )}
        {pestana === "panel" && (
          <GamificacionPanel
            usuario={usuario}
            entregas={entregas}
            cargando={cargando}
            error={errorServicio}
          />
        )}
      </div>
    </main>
  );
}