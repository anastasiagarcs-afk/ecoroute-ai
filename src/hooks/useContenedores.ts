"use client";

import { useSyncExternalStore, useEffect } from "react";
import {
  obtenerSnapshotContenedores,
  obtenerSnapshotEstadoContenedores,
  obtenerSnapshotServidorContenedores,
  obtenerSnapshotServidorEstadoContenedores,
  suscribirseAContenedores,
  suscribirseRealtimeContenedores,
} from "@/lib/contenedoresStore";
import { estaSupabaseConfigurado } from "@/lib/supabaseClient";

export function useContenedores() {
  useEffect(() => {
    if (!estaSupabaseConfigurado()) return;
    const cleanup = suscribirseRealtimeContenedores();
    return cleanup;
  }, []);

  const contenedores = useSyncExternalStore(
    suscribirseAContenedores,
    obtenerSnapshotContenedores,
    obtenerSnapshotServidorContenedores
  );

  const estado = useSyncExternalStore(
    suscribirseAContenedores,
    obtenerSnapshotEstadoContenedores,
    obtenerSnapshotServidorEstadoContenedores
  );

  return { contenedores, estado };
}
