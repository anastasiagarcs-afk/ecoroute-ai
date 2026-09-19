import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export async function POST() {
  const supabase = getSupabase();

  const { data: contenedores, error: errorContenedores } = await supabase
    .from("Contenedores")
    .select("id, nivel_llenado");

  if (errorContenedores) {
    return NextResponse.json(
      { error: errorContenedores.message },
      { status: 500 }
    );
  }

  if (!contenedores?.length) {
    return NextResponse.json({ ok: true, count: 0, sinSenal: 0 });
  }

  const shuffled = [...contenedores].sort(() => Math.random() - 0.5);
  const sinSenalCount = Math.max(1, Math.ceil(contenedores.length * 0.05));
  const sinSenalIds = new Set(
    shuffled.slice(0, sinSenalCount).map((c) => c.id)
  );
  const activos = contenedores.filter((c) => !sinSenalIds.has(c.id));

  const ahora = new Date().toISOString();
  const lecturas: Array<{
    contenedor_id: string;
    nivel_llenado: number;
    bateria: number;
    temperatura: number;
    fecha_hora: string;
  }> = [];

  for (const c of activos) {
    let nuevoNivel = c.nivel_llenado + randomBetween(1, 5);
    if (nuevoNivel > 95) nuevoNivel = randomBetween(0, 10);

    let bateria: number;
    if (Math.random() < 0.05) {
      bateria = randomBetween(5, 14);
    } else {
      bateria = randomBetween(60, 99);
    }

    let temperatura: number;
    if (Math.random() < 0.04) {
      temperatura = randomBetween(55, 70);
    } else {
      temperatura = randomBetween(22, 32);
    }

    lecturas.push({
      contenedor_id: c.id,
      nivel_llenado: Math.round(nuevoNivel * 100) / 100,
      bateria: Math.round(bateria * 100) / 100,
      temperatura: Math.round(temperatura * 100) / 100,
      fecha_hora: ahora,
    });
  }

  if (lecturas.length > 0) {
    const { error: errorInsert } = await supabase
      .from("LecturasSensores")
      .insert(lecturas);

    if (errorInsert) {
      return NextResponse.json(
        { error: errorInsert.message },
        { status: 500 }
      );
    }
  }

  for (const lectura of lecturas) {
    const { error: errorUpdate } = await supabase
      .from("Contenedores")
      .update({
        nivel_llenado: lectura.nivel_llenado,
        ultima_lectura: lectura.fecha_hora,
      })
      .eq("id", lectura.contenedor_id);

    if (errorUpdate) {
      return NextResponse.json(
        { error: errorUpdate.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    count: lecturas.length,
    sinSenal: sinSenalCount,
  });
}

export async function GET() {
  return POST();
}
