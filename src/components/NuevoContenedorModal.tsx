"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import {
  MATERIALES_GAMIFICACION,
  obtenerReglaMaterialGamificacion,
} from "@/lib/gamificacion";
import { registrarContenedor } from "@/lib/contenedoresStore";
import { useContenedores } from "@/hooks/useContenedores";
import { ZONAS_PREDEFINIDAS } from "@/lib/zonas";
import type { Contenedor, EstadoContenedor, MaterialReciclaje } from "@/types/schema";

import "leaflet/dist/leaflet.css";

const CENTRO_DEFAULT = { lat: 8.34739, lng: -62.65371 };

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

interface MapaSelectorProps {
  lat: string;
  lng: string;
  onUbicacionCambio: (lat: string, lng: string) => void;
  contenedoresExistentes: Contenedor[];
}

function MapaSelectorUbicacion({
  lat,
  lng,
  onUbicacionCambio,
  contenedoresExistentes,
}: MapaSelectorProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<LeafletMap | null>(null);
  const marcadorRef = useRef<LeafletMarker | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const onUbicacionCambioRef = useRef(onUbicacionCambio);
  onUbicacionCambioRef.current = onUbicacionCambio;

  useEffect(() => {
    let activo = true;

    async function init() {
      const L = await import("leaflet");
      if (!activo || !contenedorRef.current || mapaRef.current) return;

      const latNum = Number(lat);
      const lngNum = Number(lng);

      let center: [number, number];

      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        center = [latNum, lngNum];
      } else {
        const conUbicacion = contenedoresExistentes.filter(
          (c) => c.ubicacion && c.ubicacion.lat !== undefined && c.ubicacion.lng !== undefined
        );
        if (conUbicacion.length > 0) {
          const avgLat =
            conUbicacion.reduce((sum, c) => sum + c.ubicacion!.lat, 0) /
            conUbicacion.length;
          const avgLng =
            conUbicacion.reduce((sum, c) => sum + c.ubicacion!.lng, 0) /
            conUbicacion.length;
          center = [avgLat, avgLng];
        } else {
          center = [CENTRO_DEFAULT.lat, CENTRO_DEFAULT.lng];
        }
      }

      const mapa = L.map(contenedorRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(center, 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa);

      const iconoExistente = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:#a8a29e;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.25);opacity:0.65;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      for (const c of contenedoresExistentes) {
        if (!c.ubicacion) continue;
        const latC = Number(c.ubicacion.lat);
        const lngC = Number(c.ubicacion.lng);
        if (!Number.isFinite(latC) || !Number.isFinite(lngC)) continue;
        L.marker([latC, lngC], { icon: iconoExistente, interactive: true })
          .bindPopup(
            `<div style="font-size:12px;font-weight:600;">${c.numero_identificacion}<br/><span style="font-weight:400;text-transform:capitalize;">${c.tipo_residuo}${c.zona ? ` · ${c.zona}` : ""}</span></div>`
          )
          .addTo(mapa);
      }

      mapa.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        onUbicacionCambioRef.current(
          e.latlng.lat.toFixed(5),
          e.latlng.lng.toFixed(5)
        );
      });

      mapaRef.current = mapa;
      setMapaListo(true);
    }

    init();

    return () => {
      activo = false;
      mapaRef.current?.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapaListo) return;

    let activo = true;

    async function syncMarker() {
      const L = await import("leaflet");
      if (!activo || !mapaRef.current) return;

      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;

      if (!marcadorRef.current) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:24px;height:24px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        const marcador = L.marker([latNum, lngNum], {
          draggable: true,
          icon,
        }).addTo(mapaRef.current);
        marcador.on(
          "dragend",
          (e: {
            target: { getLatLng: () => { lat: number; lng: number } };
          }) => {
            const pos = e.target.getLatLng();
            onUbicacionCambioRef.current(
              pos.lat.toFixed(5),
              pos.lng.toFixed(5)
            );
          }
        );
        marcadorRef.current = marcador;
      } else {
        marcadorRef.current.setLatLng([latNum, lngNum]);
      }

      mapaRef.current.setView([latNum, lngNum]);
    }

    syncMarker();

    return () => {
      activo = false;
    };
  }, [mapaListo, lat, lng]);

  return (
    <div className="relative">
      <div
        ref={contenedorRef}
        className="h-60 w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
      />
      {!mapaListo && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          Cargando mapa…
        </div>
      )}
    </div>
  );
}

const MapaDinamico = dynamic(() => Promise.resolve(MapaSelectorUbicacion), {
  ssr: false,
});

export default function NuevoContenedorModal({
  onCerrar,
  onRegistrado,
}: NuevoContenedorModalProps) {
  const { contenedores } = useContenedores();
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

  const handleUbicacionCambio = (nuevaLat: string, nuevaLng: string) => {
    setLat(nuevaLat);
    setLng(nuevaLng);
    setError(null);
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
              className="flex items-center text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              <svg className="w-6 h-6 mr-2 inline-block flex-shrink-0" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="ncPinGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981"/>
                    <stop offset="100%" stopColor="#06B6D4"/>
                  </linearGradient>
                  <linearGradient id="ncLeafGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399"/>
                    <stop offset="100%" stopColor="#10B981"/>
                  </linearGradient>
                </defs>
                <path d="M32 62 C32 62 14 42 14 30 A18 18 0 1 1 50 30 C50 42 32 62 32 62 Z" fill="url(#ncPinGrad)"/>
                <circle cx="32" cy="30" r="13" fill="#0F172A"/>
                <path d="M32 20 C41 25 41 35 32 40 C23 35 23 25 32 20 Z" fill="url(#ncLeafGrad)"/>
                <path d="M32 21 L32 39" stroke="#0F172A" strokeWidth="1.5" opacity="0.55"/>
                <path d="M46 3 L48.8 12.2 L58 15 L48.8 17.8 L46 27 L43.2 17.8 L34 15 L43.2 12.2 Z" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1"/>
              </svg>
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
            <select
              id="zona-contenedor"
              value={zona}
              onChange={(evento) => setZona(evento.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="">Sin zona</option>
              {ZONAS_PREDEFINIDAS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Ubicación en el mapa
            </legend>

            <MapaDinamico
              lat={lat}
              lng={lng}
              onUbicacionCambio={handleUbicacionCambio}
              contenedoresExistentes={contenedores}
            />

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Los marcadores grises muestran contenedores existentes. Haz clic
              en el mapa o arrastra el marcador verde para ubicar el nuevo
              contenedor.
            </p>

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
              {obteniendoUbicacion
                ? "Obteniendo ubicación…"
                : "Usar mi ubicación actual"}
            </button>
            {coordenadasValidas() && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Marcador previsto en (
                {formatoCoordenada(coordenadasValidas()!.lat)},{" "}
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
