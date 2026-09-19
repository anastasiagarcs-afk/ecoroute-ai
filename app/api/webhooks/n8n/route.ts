import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TipoNotificacion } from "@/types/schema";

interface WebhookBody {
  tipo?: TipoNotificacion;
  mensaje: string;
  contenedor_id?: string | null;
  roles?: string[];
  enlace?: string;
}

function validarSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-webhook-secret");
  return !!secret && secret === process.env.N8N_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  if (!validarSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.mensaje || typeof body.mensaje !== "string") {
    return NextResponse.json(
      { error: "mensaje is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const roles = body.roles ?? ["Admin", "Gerente"];
  const { data: usuarios } = await supabase
    .from("Usuarios")
    .select("id")
    .in("rol", roles);

  if (!usuarios?.length) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const notificaciones = usuarios.map((u) => ({
    usuario_id: u.id,
    tipo: (body.tipo ?? "alerta_n8n") as TipoNotificacion,
    mensaje: body.mensaje,
    leida: false,
    fecha_envio: new Date().toISOString(),
    enlace: body.enlace ?? "/#dashboard",
    atendida: false,
    fecha_atencion: null,
    contenedor_id: body.contenedor_id ?? null,
  }));

  const { error } = await supabase
    .from("Notificaciones")
    .insert(notificaciones);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: notificaciones.length });
}
