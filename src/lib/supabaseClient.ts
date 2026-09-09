import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/schema";

type EstadoConfiguracion = "pendiente" | "configurado" | "invalido";

let estadoConfiguracion: EstadoConfiguracion = "pendiente";
let supabaseUrlGuardada: string | null = null;
let supabaseAnonKeyGuardada: string | null = null;
let advertidoModoFallback = false;

function obtenerVariablesEntorno(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} | null {
  if (estadoConfiguracion === "configurado" && supabaseUrlGuardada && supabaseAnonKeyGuardada) {
    return { supabaseUrl: supabaseUrlGuardada, supabaseAnonKey: supabaseAnonKeyGuardada };
  }
  if (estadoConfiguracion === "invalido") return null;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (!/^https?:\/\//i.test(supabaseUrl) || !supabaseAnonKey) {
    estadoConfiguracion = "invalido";
    if (!advertidoModoFallback && typeof console !== "undefined") {
      advertidoModoFallback = true;
      console.warn(
        "[EcoRoute] Supabase no está configurado correctamente. La URL debe iniciar con https:// o http:// y la clave anónima no puede estar vacía. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local. Se activa el modo de respaldo local (historial guardado en este navegador)."
      );
    }
    return null;
  }

  supabaseUrlGuardada = supabaseUrl;
  supabaseAnonKeyGuardada = supabaseAnonKey;
  estadoConfiguracion = "configurado";
  return { supabaseUrl, supabaseAnonKey };
}

export function estaSupabaseConfigurado(): boolean {
  return obtenerVariablesEntorno() !== null;
}

export function createClient() {
  const variables = obtenerVariablesEntorno();
  if (!variables) {
    throw new Error(
      "Supabase no está configurado o la URL es inválida. Revisa tu archivo .env.local"
    );
  }
  console.log("Cliente Supabase inicializado hacia:", variables.supabaseUrl);
  return createBrowserClient<Database>(
    variables.supabaseUrl,
    variables.supabaseAnonKey
  );
}

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}