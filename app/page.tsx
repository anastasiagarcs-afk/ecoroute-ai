import type { Contenedor } from "@/types/schema";
import Map from "@/components/Map";

const contenedoresMock: Contenedor[] = [
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000001",
    numero_identificacion: "CNT-001",
    ubicacion: { lat: 8.34942, lng: -62.65327 },
    capacidad: 1200,
    nivel_llenado: 92,
    tipo_residuo: "organico",
    estado: "activo",
    ultima_lectura: "2026-09-08T08:30:00.000Z",
    zona: "Zona Sur",
    created_at: "2026-07-15T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000002",
    numero_identificacion: "CNT-002",
    ubicacion: { lat: 8.34018, lng: -62.64772 },
    capacidad: 800,
    nivel_llenado: 85,
    tipo_residuo: "vidrio",
    estado: "activo",
    ultima_lectura: "2026-09-08T08:15:00.000Z",
    zona: "Zona Sur",
    created_at: "2026-07-20T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000003",
    numero_identificacion: "CNT-003",
    ubicacion: { lat: 8.36354, lng: -62.64082 },
    capacidad: 1000,
    nivel_llenado: 81,
    tipo_residuo: "metal",
    estado: "repleto",
    ultima_lectura: "2026-09-08T09:00:00.000Z",
    zona: "Zona Este",
    created_at: "2026-07-18T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000004",
    numero_identificacion: "CNT-004",
    ubicacion: { lat: 8.38023, lng: -62.66167 },
    capacidad: 600,
    nivel_llenado: 76,
    tipo_residuo: "plastico",
    estado: "activo",
    ultima_lectura: "2026-09-08T07:45:00.000Z",
    zona: "Zona Norte",
    created_at: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000005",
    numero_identificacion: "CNT-005",
    ubicacion: { lat: 8.35791, lng: -62.67218 },
    capacidad: 900,
    nivel_llenado: 64,
    tipo_residuo: "papel_carton",
    estado: "activo",
    ultima_lectura: "2026-09-08T08:05:00.000Z",
    zona: "Zona Centro",
    created_at: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000006",
    numero_identificacion: "CNT-006",
    ubicacion: { lat: 8.33551, lng: -62.65805 },
    capacidad: 700,
    nivel_llenado: 50,
    tipo_residuo: "organico",
    estado: "activo",
    ultima_lectura: "2026-09-08T07:20:00.000Z",
    zona: "Zona Sur",
    created_at: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000007",
    numero_identificacion: "CNT-007",
    ubicacion: { lat: 8.37112, lng: -62.63044 },
    capacidad: 500,
    nivel_llenado: 37,
    tipo_residuo: "reciclable",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:55:00.000Z",
    zona: "Zona Este",
    created_at: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000008",
    numero_identificacion: "CNT-008",
    ubicacion: { lat: 8.39237, lng: -62.64589 },
    capacidad: 1100,
    nivel_llenado: 22,
    tipo_residuo: "no_reciclable",
    estado: "en_mantenimiento",
    ultima_lectura: "2026-09-08T06:40:00.000Z",
    zona: "Zona Norte",
    created_at: "2026-08-12T10:00:00.000Z",
  },
  {
    id: "3f8c4e2a-1a9e-4e7b-b5d1-000000000009",
    numero_identificacion: "CNT-009",
    ubicacion: { lat: 8.34501, lng: -62.68234 },
    capacidad: 800,
    nivel_llenado: 12,
    tipo_residuo: "plastico",
    estado: "activo",
    ultima_lectura: "2026-09-08T06:30:00.000Z",
    zona: "Zona Centro",
    created_at: "2026-08-15T10:00:00.000Z",
  },
];

function TarjetaResumen({
  etiqueta,
  valor,
  colorPunto,
}: {
  etiqueta: string;
  valor: number;
  colorPunto: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${colorPunto}`} />
      <div>
        <p className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">{valor}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const total = contenedoresMock.length;
  const criticos = contenedoresMock.filter((c) => c.nivel_llenado > 80).length;
  const medios = contenedoresMock.filter((c) => c.nivel_llenado >= 50 && c.nivel_llenado <= 80).length;
  const bajos = contenedoresMock.filter((c) => c.nivel_llenado < 50).length;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            EcoRoute AI
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Monitoreo de contenedores de residuos sólidos — Ciudad Guayana
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Sprint 1 — Datos de ejemplo
        </span>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaResumen
          etiqueta="Contenedores totales"
          valor={total}
          colorPunto="bg-zinc-400"
        />
        <TarjetaResumen
          etiqueta="Nivel bajo (< 50%)"
          valor={bajos}
          colorPunto="bg-emerald-500"
        />
        <TarjetaResumen
          etiqueta="Nivel medio (50 - 80%)"
          valor={medios}
          colorPunto="bg-amber-500"
        />
        <TarjetaResumen
          etiqueta="Nivel crítico (> 80%)"
          valor={criticos}
          colorPunto="bg-red-500"
        />
      </section>

      <section className="flex flex-1 items-stretch">
        <div className="h-[65vh] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
          <Map contenedores={contenedoresMock} />
        </div>
      </section>
    </main>
  );
}