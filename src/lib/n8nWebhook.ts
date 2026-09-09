import type { MaterialReciclaje } from "@/types/schema";

export interface PayloadRegistroN8N {
  usuario_id: string;
  contenedor_id: string;
  material: MaterialReciclaje;
  peso_kg: number;
  timestamp: string;
}

export interface RespuestaRegistroN8N {
  exito: boolean;
  puntosGanados?: number;
  totalPuntos?: number;
  transaccionId?: string;
  mensaje?: string;
}

const TIEMPO_ESPERA_MS = 6000;

export function obtenerUrlWebhookN8N(): string | null {
  const cruda = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "";
  const url = cruda.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export async function enviarRegistroAN8N(
  payload: PayloadRegistroN8N
): Promise<RespuestaRegistroN8N | null> {
  const url = obtenerUrlWebhookN8N();
  if (!url) return null;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_ESPERA_MS);

  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controlador.signal,
    });

    if (!respuesta.ok) {
      console.warn(
        `[EcoRoute] El webhook de n8n respondió con estado ${respuesta.status}. Se usa el fallback a Supabase.`
      );
      return null;
    }

    const contenido: Partial<RespuestaRegistroN8N> = await respuesta.json();
    return { exito: true, ...contenido };
  } catch (error) {
    console.warn(
      "[EcoRoute] No se pudo alcanzar el webhook de n8n. Se usa el fallback a Supabase.",
      error
    );
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}