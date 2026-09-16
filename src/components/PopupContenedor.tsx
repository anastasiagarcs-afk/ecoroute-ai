"use client";

import { useState } from "react";
import { puede } from "@/lib/rolesAutorizados";
import type { Contenedor, EstadoContenedor, RolUsuario } from "@/types/schema";

interface PopupContenedorProps {
  contenedor: Contenedor;
  onVaciar: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  rol?: RolUsuario | null;
}

const ETIQUETAS_ESTADO: Record<EstadoContenedor, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  en_mantenimiento: "En mantenimiento",
  repleto: "Repleto",
  vacio: "Vacío / Disponible",
};

const COLORES_ESTADO: Record<EstadoContenedor, string> = {
  activo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactivo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400",
  en_mantenimiento:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  repleto: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  vacio: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

function claseColorNivel(nivel: number): string {
  if (nivel > 80) return "bg-red-600";
  if (nivel >= 50) return "bg-amber-500";
  return "bg-emerald-600";
}

function claseBoton(base: string): string {
  return `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition-colors ${base}`;
}

function IconoVaciar() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconoEditar() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconoPapelera() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function formatoCoordenadas(contenedor: Contenedor): string {
  const ubicacion = contenedor.ubicacion;
  if (!ubicacion) return "Sin coordenadas";
  return `${ubicacion.lat.toFixed(4)}, ${ubicacion.lng.toFixed(4)}`;
}

function FilaDetalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <dt className="shrink-0 font-medium text-gray-500 dark:text-gray-400">
        {etiqueta}
      </dt>
      <dd className="text-right font-semibold text-gray-800 dark:text-slate-100">
        {valor}
      </dd>
    </div>
  );
}

export default function PopupContenedor({
  contenedor,
  onVaciar,
  onEditar,
  onEliminar,
  rol = null,
}: PopupContenedorProps) {
  const [vaciando, setVaciando] = useState(false);
  const nivel = Math.round(contenedor.nivel_llenado);
  const etiquetaEstado = ETIQUETAS_ESTADO[contenedor.estado];
  const colorEstado = COLORES_ESTADO[contenedor.estado];

  const mostrarAcciones = rol !== null && rol !== "Ciudadano";
  const mostrarVaciar = mostrarAcciones && puede(rol, "vaciar_contenedor");
  const mostrarEditar = mostrarAcciones && puede(rol, "editar_contenedor");
  const mostrarEliminar = mostrarAcciones && puede(rol, "eliminar_contenedor");

  const manejarVaciar = () => {
    if (vaciando) return;
    setVaciando(true);
    onVaciar();
    window.setTimeout(() => setVaciando(false), 500);
  };

  return (
    <div className="min-w-[240px] space-y-2 p-3 font-sans text-slate-800 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-bold leading-tight text-gray-900 dark:text-slate-50">
          {contenedor.numero_identificacion}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colorEstado}`}
        >
          {etiquetaEstado}
        </span>
      </div>

      <dl className="space-y-1">
        <FilaDetalle
          etiqueta="Tipo de residuo"
          valor={contenedor.tipo_residuo}
        />
        <FilaDetalle etiqueta="Zona" valor={contenedor.zona ?? "Sin zona"} />
        <FilaDetalle
          etiqueta="Ubicación"
          valor={formatoCoordenadas(contenedor)}
        />
      </dl>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Nivel de llenado
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${claseColorNivel(nivel)}`}
        >
          {nivel}%
        </span>
      </div>

      {(mostrarVaciar || mostrarEditar || mostrarEliminar) && (
        <div
          className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700"
          onClick={(evento) => evento.stopPropagation()}
          onMouseDown={(evento) => evento.stopPropagation()}
        >
          {mostrarVaciar && (
            <button
              type="button"
              disabled={vaciando}
              title="Vaciar contenedor (marca 0% y Vacío/Disponible)"
              onClick={(evento) => {
                evento.stopPropagation();
                manejarVaciar();
              }}
              className={claseBoton(
                "bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <IconoVaciar />
              {vaciando ? "Vaciando…" : "Vaciar"}
            </button>
          )}
          {mostrarEditar && (
            <button
              type="button"
              title="Editar contenedor"
              onClick={(evento) => {
                evento.stopPropagation();
                onEditar();
              }}
              className={claseBoton(
                "bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              )}
            >
              <IconoEditar />
              Editar
            </button>
          )}
          {mostrarEliminar && (
            <button
              type="button"
              aria-label="Eliminar contenedor"
              title="Eliminar contenedor del mapa y de Supabase"
              onClick={(evento) => {
                evento.stopPropagation();
                onEliminar();
              }}
              className={claseBoton("bg-red-600 hover:bg-red-700")}
            >
              <IconoPapelera />
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}