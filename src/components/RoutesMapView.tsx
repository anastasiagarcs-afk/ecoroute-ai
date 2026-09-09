"use client";

import { useCallback, useState } from "react";
import Map from "@/components/Map";
import RoutePanel from "@/components/RoutePanel";
import type { RegistroHistorialRuta } from "@/lib/historialRutas";
import type { RutaOptimizada } from "@/lib/routeOptimizer";
import type { Contenedor, UbicacionPunto } from "@/types/schema";

interface RoutesMapViewProps {
  contenedores: Contenedor[];
  centro: UbicacionPunto;
  zoom?: number;
}

export default function RoutesMapView({
  contenedores,
  centro,
  zoom = 13,
}: RoutesMapViewProps) {
  const [ruta, setRuta] = useState<RutaOptimizada | null>(null);
  const [rutaHistorial, setRutaHistorial] = useState<RegistroHistorialRuta | null>(null);

  const manejarRutaGenerada = useCallback((nueva: RutaOptimizada | null) => {
    setRuta(nueva);
    setRutaHistorial(null);
  }, []);

  const manejarCargarRutaHistorial = useCallback((registro: RegistroHistorialRuta) => {
    setRutaHistorial(registro);
    setRuta(null);
  }, []);

  const manejarSalirRutaHistorial = useCallback(() => {
    setRutaHistorial(null);
    setRuta(null);
  }, []);

  const rutaPuntos = ruta?.geometria ?? rutaHistorial?.geometria ?? [];

  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800 lg:h-[65vh]">
        <Map contenedores={contenedores} centro={centro} zoom={zoom} rutaPuntos={rutaPuntos} />

        {rutaHistorial && (
          <div className="absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-blue-300 bg-white/95 px-3 py-2 shadow-md backdrop-blur dark:border-blue-500/40 dark:bg-zinc-900/95">
            <span className="min-w-0 truncate text-xs font-semibold text-blue-700 dark:text-blue-300">
              Viendo ruta guardada ·{" "}
              {new Date(rutaHistorial.fecha_ejecucion).toLocaleString("es-VE")}
            </span>
            <button
              onClick={manejarSalirRutaHistorial}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-600 bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-700"
            >
              ✕ Salir de vista
            </button>
          </div>
        )}
      </div>
      <RoutePanel
        contenedores={contenedores}
        centroInicial={centro}
        onRutaGenerada={manejarRutaGenerada}
        onCargarRutaHistorial={manejarCargarRutaHistorial}
        onSalirRutaHistorial={manejarSalirRutaHistorial}
        rutaHistorialId={rutaHistorial?.id ?? null}
      />
    </div>
  );
}