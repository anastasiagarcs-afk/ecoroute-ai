import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function cargarEnvLocal(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  const contenido = readFileSync(envPath, "utf-8");
  const variables: Record<string, string> = {};
  for (const linea of contenido.split("\n")) {
    const trimmed = linea.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indice = trimmed.indexOf("=");
    if (indice === -1) continue;
    variables[trimmed.slice(0, indice).trim()] = trimmed.slice(indice + 1).trim();
  }
  return variables;
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

async function main() {
  const env = cargarEnvLocal();
  const url = env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceKey) {
    console.error("Faltan variables de entorno en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Consultando contenedores...");

  const { data: contenedores, error: errorContenedores } = await supabase
    .from("Contenedores")
    .select("id, numero_identificacion");

  if (errorContenedores || !contenedores?.length) {
    console.error("Error al consultar contenedores:", errorContenedores?.message);
    process.exit(1);
  }

  console.log(`Contenedores encontrados: ${contenedores.length}`);

  const ahora = new Date().toISOString();
  const lecturas = contenedores.map((c) => ({
    contenedor_id: c.id,
    nivel_llenado: randomBetween(70, 98),
    bateria: 95,
    temperatura: randomBetween(20, 45),
    fecha_hora: ahora,
    created_at: ahora,
  }));

  console.log("Insertando lecturas...");

  const { data, error } = await supabase
    .from("LecturasSensores")
    .insert(lecturas)
    .select("id");

  if (error) {
    console.error("Error al insertar lecturas:", error.message);
    process.exit(1);
  }

  console.log(`Lecturas insertadas exitosamente: ${data?.length ?? 0}`);
  console.log("");
  console.log("Detalle por contenedor:");
  contenedores.forEach((c, i) => {
    console.log(`  ${c.numero_identificacion}: ${lecturas[i].nivel_llenado}%`);
  });
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
