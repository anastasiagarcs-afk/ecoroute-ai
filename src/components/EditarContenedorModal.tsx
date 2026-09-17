"use client";

import { useState, type FormEvent } from "react";
import {
  MATERIALES_GAMIFICACION,
  obtenerReglaMaterialGamificacion,
} from "@/lib/gamificacion";
import { actualizarContenedor } from "@/lib/contenedoresStore";
import type {
  Contenedor,
  EstadoContenedor,
  MaterialReciclaje,
} from "@/types/schema";

interface EditarContenedorModalProps {
  contenedor: Contenedor;
  onCerrar: () => void;
}

const OPCIONES_ESTADO: { valor: EstadoContenedor; etiqueta: string }[] = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "vacio", etiqueta: "Vacío / Disponible" },
  { valor: "inactivo", etiqueta: "Inactivo" },
  { valor: "en_mantenimiento", etiqueta: "En mantenimiento" },
  { valor: "repleto", etiqueta: "Repleto" },
];

function nombresTipos(): MaterialReciclaje[] {
  return MATERIALES_GAMIFICACION.map((regla) => regla.material);
}

export default function EditarContenedorModal({
  contenedor,
  onCerrar,
}: EditarContenedorModalProps) {
  const [tipoResiduo, setTipoResiduo] = useState<MaterialReciclaje | "">(() => {
    const regla = MATERIALES_GAMIFICACION.find(
      (item) => item.material === contenedor.tipo_residuo
    );
    return regla?.material ?? "organico";
  });
  const [nivelLlenado, setNivelLlenado] = useState(
    String(Math.round(contenedor.nivel_llenado))
  );
  const [estado, setEstado] = useState<EstadoContenedor>(contenedor.estado);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!tipoResiduo) {
      setError("Selecciona el tipo de residuo del contenedor.");
      return;
    }

    const nivel = Number(nivelLlenado);
    if (!Number.isFinite(nivel) || nivel < 0 || nivel > 100) {
      setError("El nivel de llenado debe estar entre 0 y 100.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      await actualizarContenedor(contenedor.id, {
        nivelLlenado: nivel,
        tipoResiduo,
        estado,
      });
      onCerrar();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo actualizar el contenedor."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-contenedor"
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="titulo-editar-contenedor"
              className="flex items-center text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              <svg className="w-6 h-6 mr-2 inline-block flex-shrink-0" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="ecPinGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#10B981"/>
                    <stop offset="100%" stop-color="#06B6D4"/>
                  </linearGradient>
                  <linearGradient id="ecLeafGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#34D399"/>
                    <stop offset="100%" stop-color="#10B981"/>
                  </linearGradient>
                </defs>
                <path d="M32 62 C32 62 14 42 14 30 A18 18 0 1 1 50 30 C50 42 32 62 32 62 Z" fill="url(#ecPinGrad)"/>
                <circle cx="32" cy="30" r="13" fill="#0F172A"/>
                <path d="M32 20 C41 25 41 35 32 40 C23 35 23 25 32 20 Z" fill="url(#ecLeafGrad)"/>
                <path d="M32 21 L32 39" stroke="#0F172A" stroke-width="1" opacity="0.55"/>
                <path d="M44 7.2 L45.6 13.1 L51.5 14.7 L45.6 16.3 L44 22.2 L42.4 16.3 L36.5 14.7 L42.4 13.1 Z" fill="#3B82F6"/>
              </svg>
              Editar contenedor {contenedor.numero_identificacion}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ajusta el porcentaje de llenado, el tipo de residuo o el estado
              del contenedor. Los cambios se guardan en Supabase y el marcador
              se refresca al instante.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={enviar} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Tipo de residuo
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {nombresTipos().map((material) => {
                const regla = obtenerReglaMaterialGamificacion(material);
                const seleccionado = tipoResiduo === material;
                return (
                  <button
                    key={material}
                    type="button"
                    onClick={() => {
                      setTipoResiduo(material);
                      setError(null);
                    }}
                    aria-pressed={seleccionado}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      seleccionado
                        ? regla?.claseAcento ?? ""
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {regla?.nombre ?? material}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="nivel-llenado-editar"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Nivel de llenado (%)
            </label>
            <input
              id="nivel-llenado-editar"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              value={nivelLlenado}
              onChange={(evento) => {
                setNivelLlenado(evento.target.value);
                setError(null);
              }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Estado
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPCIONES_ESTADO.map((opcion) => {
                const seleccionado = estado === opcion.valor;
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => {
                      setEstado(opcion.valor);
                      setError(null);
                    }}
                    aria-pressed={seleccionado}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      seleccionado
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}