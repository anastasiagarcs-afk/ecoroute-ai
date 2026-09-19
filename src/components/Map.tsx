"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import ConfirmarEliminarContenedorModal from "@/components/ConfirmarEliminarContenedorModal";
import EditarContenedorModal from "@/components/EditarContenedorModal";
import PopupContenedor from "@/components/PopupContenedor";
import { vaciarContenedor } from "@/lib/contenedoresStore";
import type { Contenedor, RolUsuario, UbicacionPunto } from "@/types/schema";

import "leaflet/dist/leaflet.css";

const UMBRAL_MEDIO = 50;
const UMBRAL_ALTO = 80;

const COLOR_NIVEL_BAJO = "#16a34a";
const COLOR_NIVEL_MEDIO = "#eab308";
const COLOR_NIVEL_ALTO = "#dc2626";

const CENTRO_POR_DEFECTO: UbicacionPunto = { lat: 8.34739, lng: -62.65371 };
const ZOOM_POR_DEFECTO = 13;
const ZOOM_MINIMO = 11;

const COLOR_RUTA = "#2563eb";
const COLOR_EMERALD = "#10b981";
const COLOR_QUARTZ = "#a8a29e";

let moduloLeaflet: typeof import("leaflet") | null = null;

async function obtenerLeaflet(): Promise<typeof import("leaflet")> {
  moduloLeaflet ??= await import("leaflet");
  return moduloLeaflet;
}

interface MapaProps {
  contenedores: Contenedor[];
  centro?: UbicacionPunto;
  zoom?: number;
  altura?: string | number;
  className?: string;
  onSelectContenedor?: (contenedor: Contenedor) => void;
  rutaPuntos?: UbicacionPunto[];
  ajustarVistaARuta?: boolean;
  paradasRuta?: UbicacionPunto[];
  indiceParadaActual?: number;
  enfocarEn?: UbicacionPunto;
  rol?: RolUsuario | null;
}

function colorPorNivel(nivel: number): string {
  if (nivel > UMBRAL_ALTO) return COLOR_NIVEL_ALTO;
  if (nivel >= UMBRAL_MEDIO) return COLOR_NIVEL_MEDIO;
  return COLOR_NIVEL_BAJO;
}

function crearIconoContenedor(
  L: typeof import("leaflet"),
  nivelLlenado: number
) {
  const nivel = Math.round(nivelLlenado);
  const color = colorPorNivel(nivelLlenado);

  return L.divIcon({
    className: "custom-container-marker",
    html: `<div style="background-color:${color};width:24px;height:24px;border-radius:9999px;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:9px;font-weight:700;line-height:1;">${nivel}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -18],
  });
}

function coordenadasValidasDe(contenedor: Contenedor): UbicacionPunto | null {
  if (!contenedor.ubicacion) return null;
  const lat = parseFloat(String(contenedor.ubicacion.lat));
  const lng = parseFloat(String(contenedor.ubicacion.lng));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
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

function MapaContenedores({
  contenedores,
  centro = CENTRO_POR_DEFECTO,
  zoom = ZOOM_POR_DEFECTO,
  altura = "100%",
  className = "",
  onSelectContenedor,
  rutaPuntos = [],
  ajustarVistaARuta = true,
  paradasRuta = undefined,
  indiceParadaActual = undefined,
  enfocarEn = undefined,
  rol = null,
}: MapaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<LeafletMap | null>(null);
  const capaMarcadoresRef = useRef<LayerGroup | null>(null);
  const capaRutaRef = useRef<LayerGroup | null>(null);
  const centroInicialRef = useRef(centro);
  const zoomInicialRef = useRef(zoom);
  const onSelectRef = useRef(onSelectContenedor);
  const rolRef = useRef(rol);
  const ajusteInicialRef = useRef(false);
  const marcadoresRef = useRef<Map<string, LeafletMarker>>(new Map());
  const datosRef = useRef<Map<string, Contenedor>>(new Map());
  const raicesPopupRef = useRef<Map<string, Root>>(new Map());
  const popupAbiertoRef = useRef<string | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [contenedorAEditar, setContenedorAEditar] = useState<Contenedor | null>(
    null
  );
  const [contenedorAEliminar, setContenedorAEliminar] = useState<Contenedor | null>(
    null
  );

  useEffect(() => {
    onSelectRef.current = onSelectContenedor;
  }, [onSelectContenedor]);

  useEffect(() => {
    rolRef.current = rol;
  }, [rol]);

  function renderPopupContenido(id: string): void {
    const contenedor = datosRef.current.get(id);
    const raiz = raicesPopupRef.current.get(id);
    if (!contenedor || !raiz || popupAbiertoRef.current !== id) return;

    raiz.render(
      <PopupContenedor
        contenedor={contenedor}
        onVaciar={() => vaciarContenedor(contenedor.id)}
        onEditar={() => setContenedorAEditar(contenedor)}
        onEliminar={() => setContenedorAEliminar(contenedor)}
        rol={rolRef.current}
      />
    );
  }

  function limpiarPopupAbierto(id: string): void {
    if (popupAbiertoRef.current !== id) return;
    popupAbiertoRef.current = null;
    raicesPopupRef.current.get(id)?.render(null);
  }

  useEffect(() => {
    let activo = true;
    let manejarResize: (() => void) | null = null;
    const marcadores = marcadoresRef.current;
    const datos = datosRef.current;
    const raices = raicesPopupRef.current;

    async function inicializarMapa() {
      const L = await obtenerLeaflet();
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

      capaMarcadoresRef.current = L.layerGroup().addTo(mapa);
      capaRutaRef.current = L.layerGroup().addTo(mapa);

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
        capaMarcadoresRef.current = null;
        capaRutaRef.current = null;
        for (const raiz of raices.values()) {
          queueMicrotask(() => raiz.unmount());
        }
        raices.clear();
        marcadores.clear();
        datos.clear();
        popupAbiertoRef.current = null;
        ajusteInicialRef.current = false;
      };
  }, []);

  useEffect(() => {
    if (!mapaListo || !capaMarcadoresRef.current || !mapaRef.current) return;

    let activo = true;

    async function sincronizarMarcadores() {
      const L = await obtenerLeaflet();
      if (!activo || !capaMarcadoresRef.current || !mapaRef.current) return;

      const capa = capaMarcadoresRef.current;
      const idsVigentes = new Set(contenedores.map((contenedor) => contenedor.id));
      const coordenadasValidas: UbicacionPunto[] = [];

      for (const contenedor of contenedores) {
        const coordenadas = coordenadasValidasDe(contenedor);
        const marcador = marcadoresRef.current.get(contenedor.id);
        const previo = datosRef.current.get(contenedor.id);

        if (marcador) {
          if (
            coordenadas &&
            (marcador.getLatLng().lat !== coordenadas.lat ||
              marcador.getLatLng().lng !== coordenadas.lng)
          ) {
            marcador.setLatLng([coordenadas.lat, coordenadas.lng]);
          }
          if (!previo || previo.nivel_llenado !== contenedor.nivel_llenado) {
            marcador.setIcon(crearIconoContenedor(L, contenedor.nivel_llenado));
          }
          datosRef.current.set(contenedor.id, contenedor);
        } else if (coordenadas) {
          const id = contenedor.id;
          const contenedorPopup = document.createElement("div");
          const raizPopup = createRoot(contenedorPopup);
          raicesPopupRef.current.set(id, raizPopup);
          const marcadorNuevo = L.marker(
            [coordenadas.lat, coordenadas.lng],
            {
              icon: crearIconoContenedor(L, contenedor.nivel_llenado),
              title: contenedor.numero_identificacion,
            }
          )
            .bindPopup(contenedorPopup, {
              minWidth: 260,
              maxWidth: 300,
              className: "custom-leaflet-popup",
            })
            .on("click", () => {
              const actual = datosRef.current.get(id);
              if (actual) onSelectRef.current?.(actual);
            })
            .on("popupopen", () => {
              popupAbiertoRef.current = id;
              renderPopupContenido(id);
            })
            .on("popupclose", () => {
              limpiarPopupAbierto(id);
            })
            .addTo(capa);

          marcadoresRef.current.set(id, marcadorNuevo);
          datosRef.current.set(id, contenedor);
        }

        if (coordenadas) coordenadasValidas.push(coordenadas);
      }

      for (const [id, marcador] of marcadoresRef.current) {
        if (idsVigentes.has(id)) continue;
        const raiz = raicesPopupRef.current.get(id);
        if (raiz) queueMicrotask(() => raiz.unmount());
        raicesPopupRef.current.delete(id);
        if (popupAbiertoRef.current === id) popupAbiertoRef.current = null;
        marcador.remove();
        marcadoresRef.current.delete(id);
        datosRef.current.delete(id);
      }

      if (!ajusteInicialRef.current && coordenadasValidas.length > 0) {
        ajusteInicialRef.current = true;
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.fitBounds(
          L.latLngBounds(
            coordenadasValidas.map(
              (punto) => [punto.lat, punto.lng] as [number, number]
            )
          ),
          { padding: [40, 40] }
        );
        mapa.invalidateSize();
      }

      const idAbierto = popupAbiertoRef.current;
      if (idAbierto) renderPopupContenido(idAbierto);
    }

    sincronizarMarcadores();

    return () => {
      activo = false;
    };
  }, [contenedores, mapaListo, rol]);

  useEffect(() => {
    if (!mapaListo || !capaRutaRef.current || !mapaRef.current) return;

    let activo = true;

    async function dibujarRuta() {
      const L = await obtenerLeaflet();
      if (!activo || !capaRutaRef.current || !mapaRef.current) return;

      const capa = capaRutaRef.current;
      capa.clearLayers();
      if (rutaPuntos.length < 2) return;

      const latlngs = rutaPuntos.map((punto) => [punto.lat, punto.lng] as [number, number]);

      L.polyline(latlngs, {
        color: COLOR_RUTA,
        weight: 4,
        opacity: 0.85,
      }).addTo(capa);

      L.circleMarker(latlngs[0], {
        radius: 7,
        color: COLOR_RUTA,
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).addTo(capa);

      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: COLOR_RUTA,
        fillOpacity: 1,
      }).addTo(capa);

      if (paradasRuta && indiceParadaActual !== undefined) {
        if (paradasRuta[indiceParadaActual]) {
          const actual = paradasRuta[indiceParadaActual];
          L.circleMarker([actual.lat, actual.lng], {
            radius: 9,
            color: COLOR_EMERALD,
            weight: 4,
            fillColor: COLOR_EMERALD,
            fillOpacity: 0.9,
          })
            .bindTooltip("Parada actual", { direction: "top", permanent: false })
            .addTo(capa);
        }
        const siguiente = paradasRuta[indiceParadaActual + 1];
        if (siguiente) {
          L.circleMarker([siguiente.lat, siguiente.lng], {
            radius: 8,
            color: COLOR_QUARTZ,
            weight: 3,
            fillColor: "#ffffff",
            fillOpacity: 1,
          })
            .bindTooltip("Siguiente parada", { direction: "top", permanent: false })
            .addTo(capa);
        }
      }

      if (ajustarVistaARuta) {
        mapaRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
      }
    }

    dibujarRuta();

    return () => {
      activo = false;
    };
  }, [rutaPuntos, mapaListo, ajustarVistaARuta]);

  useEffect(() => {
    if (!mapaListo || !mapaRef.current || !enfocarEn) return;
    mapaRef.current.setView([enfocarEn.lat, enfocarEn.lng], 16, { animate: true });
  }, [mapaListo, enfocarEn]);


  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ height: altura }}>
      {!mapaListo && (
        <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Cargando mapa…
        </div>
      )}
      <div ref={contenedorRef} className="h-full w-full" />
      {mapaListo && <Leyenda />}

      {contenedorAEditar && (
        <EditarContenedorModal
          contenedor={contenedorAEditar}
          onCerrar={() => setContenedorAEditar(null)}
        />
      )}
      {contenedorAEliminar && (
        <ConfirmarEliminarContenedorModal
          contenedor={contenedorAEliminar}
          onCerrar={() => setContenedorAEliminar(null)}
        />
      )}
    </div>
  );
}

export default MapaContenedores;