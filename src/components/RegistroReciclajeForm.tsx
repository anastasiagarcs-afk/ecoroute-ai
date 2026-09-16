"use client";

import { useState, type FormEvent } from "react";
import { useContenedores } from "@/hooks/useContenedores";
import {
  MATERIALES_GAMIFICACION,
  calcularPuntosGamificacion,
  obtenerReglaMaterialGamificacion,
  redondearKg,
} from "@/lib/gamificacion";
import {
  registrarEntregaConWebhook,
  type ResultadoRegistroEntrega,
} from "@/lib/reciclajeService";
import { mostrarToast } from "@/lib/toastStore";
import type {
  Contenedor,
  MaterialReciclaje,
  TipoResiduo,
} from "@/types/schema";

interface RegistroReciclajeFormProps {
  onRegistrado?: (resultado: ResultadoRegistroEntrega) => void;
}

function nombreTipoResiduo(tipo: TipoResiduo): string {
  const regla = MATERIALES_GAMIFICACION.find((r) => r.material === tipo);
  return regla?.nombre ?? tipo;
}

function etiquetaContenedor(contenedor: Contenedor): string {
  const ubicacion = contenedor.ubicacion
    ? `${contenedor.ubicacion.lat.toFixed(4)}, ${contenedor.ubicacion.lng.toFixed(4)}`
    : "sin ubicación";
  return `[${contenedor.numero_identificacion}] - ${ubicacion} (${nombreTipoResiduo(
    contenedor.tipo_residuo
  )})`;
}

export default function RegistroReciclajeForm({
  onRegistrado,
}: RegistroReciclajeFormProps) {
  const [material, setMaterial] = useState<MaterialReciclaje | "">("");
  const [contenedorId, setContenedorId] = useState("");
  const [peso, setPeso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoRegistroEntrega | null>(
    null
  );

  const { contenedores } = useContenedores();

  const kg = Number(peso);
  const pesoValido = Number.isFinite(kg) && kg > 0;
  const regla = material ? obtenerReglaMaterialGamificacion(material) : undefined;
  const puntosEstimados =
    material && pesoValido ? calcularPuntosGamificacion(material, kg) : null;

  const enviarEntrega = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!material || !contenedorId || !pesoValido) return;

    setEnviando(true);
    setError(null);
    try {
      const resultadoConWebhook = await registrarEntregaConWebhook(
        material,
        redondearKg(kg),
        contenedorId
      );
      const nuevoResultado = resultadoConWebhook.resultado;
      setResultado(nuevoResultado);
      setPeso("");
      setMaterial("");
      mostrarToast(
        "Entrega registrada",
        `${nuevoResultado.puntosGanados} puntos ganados. Total acumulado: ${nuevoResultado.totalPuntos} puntos.`,
        "exito"
      );
      onRegistrado?.(nuevoResultado);
    } catch (error) {
      setResultado(null);
      setError(
        error instanceof Error ? error.message : "No se pudo registrar la entrega."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={enviarEntrega}
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Tipo de material
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIALES_GAMIFICACION.map((opcion) => {
              const seleccionado = material === opcion.material;
              return (
                <button
                  key={opcion.material}
                  type="button"
                  onClick={() => {
                    setMaterial(opcion.material);
                    setResultado(null);
                    setError(null);
                  }}
                  aria-pressed={seleccionado}
                  className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${
                    seleccionado
                      ? opcion.claseAcento
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-sm font-semibold">{opcion.nombre}</span>
                  <span className="mt-0.5 text-xs opacity-80">
                    {opcion.puntosPorKg} pts / kg
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="contenedor-acopio"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Contenedor / Punto de Acopio
          </label>
          <select
            id="contenedor-acopio"
            required
            value={contenedorId}
            onChange={(evento) => {
              setContenedorId(evento.target.value);
              setResultado(null);
              setError(null);
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            <option value="">
              Selecciona un contenedor o punto de acopio
            </option>
            {contenedores.map((contenedor) => (
              <option key={contenedor.id} value={contenedor.id}>
                {etiquetaContenedor(contenedor)}
              </option>
            ))}
          </select>
          {contenedores.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No hay contenedores cargados. Verifica la conexión con Supabase.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="peso-entrega"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Peso entregado
          </label>
          <div className="flex items-end gap-2">
            <input
              id="peso-entrega"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              placeholder="0.00"
              value={peso}
              onChange={(evento) => {
                const valor = evento.target.value;
                setPeso(valor);
                setResultado(null);
                setError(null);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <span className="pb-2.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              kg
            </span>
          </div>
          {regla && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tarifa actual: {regla.puntosPorKg} punto
              {regla.puntosPorKg !== 1 ? "s" : ""} por kilogramo de{" "}
              {regla.nombre.toLowerCase()}.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Puntos por esta entrega
          </span>
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {puntosEstimados !== null ? puntosEstimados : "—"}
          </span>
        </div>

        {resultado && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            Entrega registrada: {resultado.puntosGanados} puntos ganados. Total
            acumulado: {resultado.totalPuntos} puntos.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!material || !contenedorId || !pesoValido || enviando}
          className="inline-flex w-fit items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Registrando…" : "Registrar entrega"}
        </button>
      </form>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Cada entrega queda registrada en la tabla PuntosReciclaje y suma puntos
        al ciudadano en la tabla Usuarios, de forma persistente en Supabase.
      </p>
    </div>
  );
}