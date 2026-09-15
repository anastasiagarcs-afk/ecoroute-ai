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
    const clave = trimmed.slice(0, indice).trim();
    const valor = trimmed.slice(indice + 1).trim();
    variables[clave] = valor;
  }
  return variables;
}

async function main() {
  const env = cargarEnvLocal();

  const url = env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceKey) {
    console.error("Faltan variables de entorno en .env.local:");
    if (!url) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = "admin@ecoroute.com";
  const password = "Admin123456!";

  console.log(`Verificando usuario: ${email}`);

  const { data: lista } = await supabase.auth.admin.listUsers();
  const existente = lista?.users?.find((u) => u.email === email);

  let userId: string;

  if (existente) {
    console.log(`Usuario ya existe (id: ${existente.id}). Actualizando rol...`);
    userId = existente.id;
  } else {
    console.log("Creando usuario en Supabase Auth...");
    const { data: nuevo, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error("Error al crear usuario:", error.message);
      process.exit(1);
    }
    userId = nuevo!.user.id;
    console.log(`Usuario creado (id: ${userId}).`);
  }

  console.log("Upsert en tabla Usuarios...");
  const { error: upsertError } = await supabase.from("Usuarios").upsert(
    {
      id: userId,
      nombre: "Administrador",
      email,
      rol: "Admin",
      telefono: null,
      zona_asignada: null,
      puntos_reciclaje: 0,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("Error al upsert en Usuarios:", upsertError.message);
    process.exit(1);
  }

  console.log("");
  console.log("Admin sembrado correctamente:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Rol:      Admin`);
  console.log(`  User ID:  ${userId}`);
  console.log("");
  console.log("Puedes iniciar sesion en /acceso con estas credenciales.");
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
