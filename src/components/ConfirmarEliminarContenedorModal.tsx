"use client";

import { useState } from "react";
import { eliminarContenedor } from "@/lib/contenedoresStore";
import type { Contenedor } from "@/types/schema";

interface ConfirmarEliminarContenedorModalProps {
  contenedor: Contenedor;
  onCerrar: () => void;
}

export default function ConfirmarEliminarContenedorModal({
  contenedor,
  onCerrar,
}: ConfirmarEliminarContenedorModalProps) {
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setEliminando(true);
    setError(null);
    try {
      await eliminarContenedor(contenedor.id);
      onCerrar();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo eliminar el contenedor."
      );
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-eliminar-contenedor"
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h2
            id="titulo-eliminar-contenedor"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Eliminar contenedor
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ¿Seguro que deseas eliminar{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {contenedor.numero_identificacion}
            </strong>
            ? Se borrará de Supabase y su marcador desaparecerá del mapa. Las
            entregas de reciclaje asociadas conservan su historial.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={eliminando}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={eliminando}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {eliminando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}