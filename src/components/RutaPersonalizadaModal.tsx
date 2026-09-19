"use client";

import { useState } from "react";
import { ZONAS_PREDEFINIDAS } from "@/lib/zonas";
import type { EstadoContenedor, MaterialReciclaje } from "@/types/schema";

export interface FiltrosRutaPersonalizada {
  zona: string | null;
  estados: EstadoContenedor[];
  tiposResiduo: MaterialReciclaje[];
  nivelMinimo: number;
}

interface RutaPersonalizadaModalProps {
  onAplicar: (filtros: FiltrosRutaPersonalizada) => void;
  onCerrar: () => void;
}

const OPCIONES_ESTADO: { valor: EstadoContenedor; etiqueta: string }[] = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "repleto", etiqueta: "Repleto" },
  { valor: "vacio", etiqueta: "Vacío" },
  { valor: "inactivo", etiqueta: "Inactivo" },
  { valor: "en_mantenimiento", etiqueta: "En mantenimiento" },
];

const OPCIONES_TIPO: { valor: MaterialReciclaje; etiqueta: string }[] = [
  { valor: "organico", etiqueta: "Orgánico" },
  { valor: "plastico", etiqueta: "Plástico" },
  { valor: "vidrio", etiqueta: "Vidrio" },
  { valor: "papel_carton", etiqueta: "Papel / Cartón" },
  { valor: "metal", etiqueta: "Metal" },
];

export default function RutaPersonalizadaModal({
  onAplicar,
  onCerrar,
}: RutaPersonalizadaModalProps) {
  const [zona, setZona] = useState<string>("");
  const [estados, setEstados] = useState<EstadoContenedor[]>([]);
  const [tiposResiduo, setTiposResiduo] = useState<MaterialReciclaje[]>([]);
  const [nivelMinimo, setNivelMinimo] = useState(0);

  const toggleEstado = (valor: EstadoContenedor) => {
    setEstados((prev) =>
      prev.includes(valor) ? prev.filter((e) => e !== valor) : [...prev, valor]
    );
  };

  const toggleTipo = (valor: MaterialReciclaje) => {
    setTiposResiduo((prev) =>
      prev.includes(valor) ? prev.filter((t) => t !== valor) : [...prev, valor]
    );
  };

  const manejarAplicar = () => {
    onAplicar({
      zona: zona || null,
      estados,
      tiposResiduo,
      nivelMinimo,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-ruta-personalizada"
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="titulo-ruta-personalizada"
              className="flex items-center text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              <svg
                className="mr-2 inline-block h-6 w-6 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
                <circle cx="6" cy="6" r="1" fill="currentColor" />
                <circle cx="6" cy="12" r="1" fill="currentColor" />
                <circle cx="6" cy="18" r="1" fill="currentColor" />
              </svg>
              Generar ruta personalizada
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Selecciona los filtros para definir los contenedores que incluir en
              la ruta.
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

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="filtro-zona"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Filtrar por Zona
            </label>
            <select
              id="filtro-zona"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="">Todas las zonas</option>
              {ZONAS_PREDEFINIDAS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Filtrar por Estado del Contenedor
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OPCIONES_ESTADO.map((opcion) => {
                const seleccionado = estados.includes(opcion.valor);
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => toggleEstado(opcion.valor)}
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
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Filtrar por Tipo de Residuo
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OPCIONES_TIPO.map((opcion) => {
                const seleccionado = tiposResiduo.includes(opcion.valor);
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => toggleTipo(opcion.valor)}
                    aria-pressed={seleccionado}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      seleccionado
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="filtro-nivel-minimo"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Nivel de Llenado Mínimo: {nivelMinimo}%
            </label>
            <input
              id="filtro-nivel-minimo"
              type="range"
              min="0"
              max="100"
              step="5"
              value={nivelMinimo}
              onChange={(e) => setNivelMinimo(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={manejarAplicar}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Generar ruta
          </button>
        </div>
      </div>
    </div>
  );
}
