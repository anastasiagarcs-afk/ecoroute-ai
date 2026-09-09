"use client";

import { useState, type FormEvent } from "react";
import {
  MATERIALES_GAMIFICACION,
  obtenerReglaMaterialGamificacion,
} from "@/lib/gamificacion";
import { registrarContenedor } from "@/lib/contenedoresStore";
import type { Contenedor, EstadoContenedor, MaterialReciclaje } from "@/types/schema";

interface NuevoContenedorModalProps {
  onCerrar: () => void;
  onRegistrado?: (contenedor: Contenedor) => void;
}

function nombresTipos(): MaterialReciclaje[] {
  return MATERIALES_GAMIFICACION.map((regla) => regla.material);
}

function formatoCoordenada(valor: number): string {
  return `${valor.toFixed(5)}`;
}

export default function NuevoContenedorModal({
  onCerrar,
  onRegistrado,
}: NuevoContenedorModalProps) {
  const [numeroIdentificacion, setNumeroIdentificacion] = useState("");
  const [tipoResiduo, setTipoResiduo] = useState<MaterialReciclaje | "">("");
  const [nivelLlenado, setNivelLlenado] = useState("0");
  const [capacidad, setCapacidad] = useState("1000");
  const [zona, setZona] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const coordenadasValidas = (): { lat: number; lng: number } | null => {
    const latNumero = Number(lat);
    const lngNumero = Number(lng);
    if (
      !Number.isFinite(latNumero) ||
      !Number.isFinite(lngNumero) ||
      latNumero < -90 ||
      latNumero > 90 ||
      lngNumero < -180 ||
      lngNumero > 180
    ) {
      return null;
    }
    return { lat: latNumero, lng: lngNumero };
  };

  const llenarConUbicacionActual = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(
        "Tu navegador no permite obtener la ubicación. Ingresa latitud y longitud manualmente."
      );
      return;
    }
    setObteniendoUbicacion(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setLat(posicion.coords.latitude.toFixed(5));
        setLng(posicion.coords.longitude.toFixed(5));
        setObteniendoUbicacion(false);
      },
      () => {
        setObteniendoUbicacion(false);
        setError(
          "No se pudo obtener la ubicación. Ingresa latitud y longitud manualmente."
        );
      }
    );
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!tipoResiduo) {
      setError("Selecciona el tipo de residuo del contenedor.");
      return;
    }
    const coordenadas = coordenadasValidas();
    if (!coordenadas) {
      setError(
        "Ingresa coordenadas válidas (latitud entre -90 y 90; longitud entre -180 y 180)."
      );
      return;
    }

    const nivel = Number(nivelLlenado);
    const capacidadNumero = Number(capacidad);
    if (!Number.isFinite(nivel) || nivel < 0 || nivel > 100) {
      setError("El nivel de llenado inicial debe estar entre 0 y 100.");
      return;
    }
    if (!Number.isFinite(capacidadNumero) || capacidadNumero <= 0) {
      setError("La capacidad debe ser mayor a 0.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const contenedor = await registrarContenedor({
        numeroIdentificacion: numeroIdentificacion.trim(),
        tipoResiduo,
        nivelLlenado: nivel,
        lat: coordenadas.lat,
        lng: coordenadas.lng,
        capacidad: capacidadNumero,
        zona: zona.trim() || null,
        estado: "activo" satisfies EstadoContenedor,
      });
      onRegistrado?.(contenedor);
      onCerrar();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el contenedor."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-registrar-contenedor"
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2
              id="titulo-registrar-contenedor"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Registrar nuevo contenedor
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              El contenedor se guarda en Supabase y el marcador aparece al
              instante en el mapa.
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="codigo-contenedor"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Código / Nombre
            </label>
            <input
              id="codigo-contenedor"
              type="text"
              required
              placeholder="Ej. CNT-010"
              value={numeroIdentificacion}
              onChange={(evento) => {
                setNumeroIdentificacion(evento.target.value);
                setError(null);
              }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="nivel-llenado"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Nivel de llenado inicial (%)
              </label>
              <input
                id="nivel-llenado"
                type="number"
                min="0"
                max="100"
                step="1"
                value={nivelLlenado}
                onChange={(evento) => {
                  setNivelLlenado(evento.target.value);
                  setError(null);
                }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="capacidad-contenedor"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Capacidad (L)
              </label>
              <input
                id="capacidad-contenedor"
                type="number"
                min="1"
                step="1"
                value={capacidad}
                onChange={(evento) => {
                  setCapacidad(evento.target.value);
                  setError(null);
                }}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="zona-contenedor"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Zona (opcional)
            </label>
            <input
              id="zona-contenedor"
              type="text"
              placeholder="Ej. Zona Norte"
              value={zona}
              onChange={(evento) => setZona(evento.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Coordenadas
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="latitud-contenedor"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Latitud
                </label>
                <input
                  id="latitud-contenedor"
                  type="number"
                  step="any"
                  placeholder="8.34739"
                  value={lat}
                  onChange={(evento) => {
                    setLat(evento.target.value);
                    setError(null);
                  }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="longitud-contenedor"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Longitud
                </label>
                <input
                  id="longitud-contenedor"
                  type="number"
                  step="any"
                  placeholder="-62.65371"
                  value={lng}
                  onChange={(evento) => {
                    setLng(evento.target.value);
                    setError(null);
                  }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={llenarConUbicacionActual}
              disabled={obteniendoUbicacion}
              className="inline-flex w-fit items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {obteniendoUbicacion ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
            </button>
            {coordenadasValidas() && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Marcador previsto en ({formatoCoordenada(coordenadasValidas()!.lat)},{" "}
                {formatoCoordenada(coordenadasValidas()!.lng)})
              </p>
            )}
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
              {enviando ? "Registrando…" : "Registrar contenedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}