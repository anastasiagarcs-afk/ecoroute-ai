"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Contenedor, UbicacionPunto } from "@/types/schema";

import "leaflet/dist/leaflet.css";

const UMBRAL_MEDIO = 50;
const UMBRAL_ALTO = 80;

const COLOR_NIVEL_BAJO = "#16a34a";
const COLOR_NIVEL_MEDIO = "#eab308";
const COLOR_NIVEL_ALTO = "#dc2626";

const CENTRO_POR_DEFECTO: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };
const ZOOM_POR_DEFECTO = 13;
const ZOOM_MINIMO = 11;

interface MapaProps {
  contenedores: Contenedor[];
  centro?: UbicacionPunto;
  zoom?: number;
  altura?: string | number;
  className?: string;
  onSelectContenedor?: (contenedor: Contenedor) => void;
}

function colorPorNivel(nivel: number): string {
  if (nivel > UMBRAL_ALTO) return COLOR_NIVEL_ALTO;
  if (nivel >= UMBRAL_MEDIO) return COLOR_NIVEL_MEDIO;
  return COLOR_NIVEL_BAJO;
}

function crearIconoMarcador(L: typeof import("leaflet"), contenedor: Contenedor) {
  const color = colorPorNivel(contenedor.nivel_llenado);
  const porcentaje = Math.round(contenedor.nivel_llenado);

  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;font-family:system-ui,sans-serif;font-size:9px;font-weight:700;line-height:1;">${porcentaje}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  });
}

function crearContenidoPopup(contenedor: Contenedor): string {
  const nivel = contenedor.nivel_llenado;
  const color = colorPorNivel(nivel);
  const ubicacion = contenedor.ubicacion
    ? `${contenedor.ubicacion.lat.toFixed(5)}, ${contenedor.ubicacion.lng.toFixed(5)}`
    : "Sin coordenadas";
  const ultimaLectura = contenedor.ultima_lectura
    ? new Date(contenedor.ultima_lectura).toLocaleString("es-ES")
    : "Sin lecturas";

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.6;min-width:220px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${contenedor.numero_identificacion}</div>
      <div><strong>ID:</strong> ${contenedor.id}</div>
      <div><strong>Ubicación:</strong> ${ubicacion}</div>
      <div><strong>Tipo de residuo:</strong> ${contenedor.tipo_residuo}</div>
      <div><strong>Zona:</strong> ${contenedor.zona ?? "Sin zona"}</div>
      <div><strong>Nivel de llenado:</strong> <span style="color:${color};font-weight:700;">${Math.round(nivel)}%</span></div>
      <div><strong>Última lectura:</strong> ${ultimaLectura}</div>
      <div><strong>Estado:</strong> ${contenedor.estado}</div>
    </div>`;
}

function Leyenda() {
  const items = [
    { color: COLOR_NIVEL_BAJO, etiqueta: "< 50%" },
    { color: COLOR_NIVEL_MEDIO, etiqueta: "50 - 80%" },
    { color: COLOR_NIVEL_ALTO, etiqueta: "> 80%" },
  ];

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-[1000] rounded-md border border-zinc-200 bg-white/95 p-3 text-xs text-zinc-700 shadow-md dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200">
      <p className="mb-2 font-semibold">Nivel de llenado</p>
      {items.map((item) => (
        <div key={item.etiqueta} className="flex items-center gap-2 py-0.5">
          <span
            className="h-3 w-3 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

export default function Map({
  contenedores,
  centro = CENTRO_POR_DEFECTO,
  zoom = ZOOM_POR_DEFECTO,
  altura = "100%",
  className = "",
  onSelectContenedor,
}: MapaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<LeafletMap | null>(null);
  const centroInicialRef = useRef(centro);
  const zoomInicialRef = useRef(zoom);
  const onSelectRef = useRef(onSelectContenedor);
  const [mapaListo, setMapaListo] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectContenedor;
  }, [onSelectContenedor]);

  useEffect(() => {
    let activo = true;
    let manejarResize: (() => void) | null = null;

    async function inicializarMapa() {
      const L = await import("leaflet");
      if (!activo || !contenedorRef.current || mapaRef.current) return;

      const mapa = L.map(contenedorRef.current, {
        zoomControl: true,
        minZoom: ZOOM_MINIMO,
      }).setView(
        [centroInicialRef.current.lat, centroInicialRef.current.lng],
        zoomInicialRef.current
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapa);

      manejarResize = () => mapa.invalidateSize();
      window.addEventListener("resize", manejarResize);

      mapaRef.current = mapa;
      setMapaListo(true);
    }

    inicializarMapa();

    return () => {
      activo = false;
      if (manejarResize) {
        window.removeEventListener("resize", manejarResize);
      }
      mapaRef.current?.remove();
      mapaRef.current = null;
      setMapaListo(false);
    };
  }, []);

  useEffect(() => {
    if (!mapaListo || !mapaRef.current) return;

    let activo = true;
    let capaMarcadores: LayerGroup | null = null;

    async function dibujarMarcadores() {
      const L = await import("leaflet");
      if (!activo || !mapaRef.current) return;

      const mapa = mapaRef.current;
      capaMarcadores = L.layerGroup().addTo(mapa);

      for (const contenedor of contenedores) {
        if (!contenedor.ubicacion) continue;

        const marcador = L.marker(
          [contenedor.ubicacion.lat, contenedor.ubicacion.lng],
          {
            icon: crearIconoMarcador(L, contenedor),
            title: contenedor.numero_identificacion,
          }
        )
          .bindPopup(crearContenidoPopup(contenedor))
          .on("click", () => onSelectRef.current?.(contenedor));

        marcador.addTo(capaMarcadores!);
      }
    }

    dibujarMarcadores();

    return () => {
      activo = false;
      capaMarcadores?.remove();
    };
  }, [contenedores, mapaListo]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ height: altura }}>
      {!mapaListo && (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Cargando mapa…
        </div>
      )}
      <div ref={contenedorRef} className="h-full w-full" />
      {mapaListo && <Leyenda />}
    </div>
  );
}