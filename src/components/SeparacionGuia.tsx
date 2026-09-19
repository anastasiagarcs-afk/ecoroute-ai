import type { MaterialReciclaje } from "@/types/schema";

export interface CategoriaGuiaSeparacion {
  material: MaterialReciclaje;
  titulo: string;
  colorReferencia: string;
  descripcion: string;
  depositar: string[];
  evitar: string[];
  claseBorde: string;
  claseDot: string;
}

export const GUIA_SEPARACION: CategoriaGuiaSeparacion[] = [
  {
    material: "organico",
    titulo: "Orgánico",
    colorReferencia: "Marrón",
    descripcion:
      "Residuos biodegradables de origen vegetal o animal que pueden compostarse para volver a la tierra.",
    depositar: [
      "Restos de frutas, verduras y hortalizas",
      "Cáscaras de huevo y de frutos secos",
      "Restos de comida y sobras sin empaque",
      "Posos de café y filtros de papel",
      "Servilletas de papel usadas",
    ],
    evitar: [
      "Bolsas plásticas, incluso compostables",
      "Vidrios, plásticos y metales",
      "Pañales, toallitas y material sanitario",
      "Aceite vegetal en grandes cantidades",
      "Restos de animales en mal estado",
    ],
    claseBorde: "border-amber-700/40 bg-amber-950/20",
    claseDot: "bg-amber-500",
  },
  {
    material: "plastico",
    titulo: "Plástico",
    colorReferencia: "Azul",
    descripcion:
      "Envases y objetos plásticos limpios y secos que pueden transformarse en nueva materia prima.",
    depositar: [
      "Botellas de agua y refrescos (PET)",
      "Envases de champú y jabón bien enjuagados",
      "Tapas y tapones plásticos",
      "Bandejas y envases de alimentos limpios",
      "Bolsas plásticas limpias y secas",
    ],
    evitar: [
      "Plásticos con restos de comida o grasa",
      "Bolsas negras y envoltorios de un solo uso sucios",
      "Envases de productos químicos peligrosos",
      "Juguetes rotos y artículos compuestos",
      "Poliestireno (unicel) sucio",
    ],
    claseBorde: "border-blue-500/40 bg-blue-950/20",
    claseDot: "bg-blue-500",
  },
  {
    material: "vidrio",
    titulo: "Vidrio",
    colorReferencia: "Verde",
    descripcion:
      "Envases de vidrio que se reciclan infinitas veces sin perder calidad.",
    depositar: [
      "Botellas de vidrio para bebidas",
      "Frascos de conservas y mermeladas",
      "Envases de perfume y cosmética",
      "Tapas metálicas y corchos (por separado)",
    ],
    evitar: [
      "Vidrio templado de ventanas y autos",
      "Cerámica, porcelana y loza",
      "Espejos y cristales de lámparas",
      "Tubos fluorescentes y bombillas",
      "Vasos y copas de vidrio templado",
    ],
    claseBorde: "border-emerald-500/40 bg-emerald-950/20",
    claseDot: "bg-emerald-500",
  },
  {
    material: "papel_carton",
    titulo: "Papel / Cartón",
    colorReferencia: "Amarillo",
    descripcion:
      "Papeles y cartones limpios y secos que pueden reciclarse en nuevos productos de fibra.",
    depositar: [
      "Cajas de cartón plegadas y sin cinta",
      "Periódicos y revistas",
      "Cuadernos y hojas de oficina",
      "Cartones de huevos y tubos de papel",
      "Bolsa de papel y envolturas limpias",
    ],
    evitar: [
      "Papel plastificado o encerado",
      "Cajas con grasa o alimentos adheridos",
      "Servilletas y pañuelos usados",
      "Recibos y tickets de papel térmico",
      "Cartones de bebidas tipo tetrabrik",
    ],
    claseBorde: "border-yellow-500/40 bg-yellow-950/20",
    claseDot: "bg-yellow-500",
  },
  {
    material: "metal",
    titulo: "Metal",
    colorReferencia: "Gris",
    descripcion:
      "Metales ferrosos y no ferrosos como aluminio y acero, altamente valorados en el reciclaje.",
    depositar: [
      "Latas de aluminio (refrescos y cerveza)",
      "Latas de conserva y alimentos enlatados",
      "Tapas y chapas metálicas",
      "Peroles, ollas y utensilios sin uso",
      "Envases metálicos limpios y vacíos",
    ],
    evitar: [
      "Aerosoles y latas de pintura con contenido",
      "Pilas, baterías o acumuladores",
      "Cables eléctricos con revestimiento plástico",
      "Chatarra con residuos peligrosos",
      "Metales oxidados o con contaminantes tóxicos",
    ],
    claseBorde: "border-cyan-500/40 bg-cyan-950/20",
    claseDot: "bg-cyan-500",
  },
];

export default function SeparacionGuia() {
  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          Regla de oro de la separación en la fuente
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400/80">
          Separa los residuos en seco: enjuaga y seca los envases antes de
          desecharlos. Un residuo limpio vale más, no contamina otros materiales
          y facilita todo el proceso de reciclaje.
        </p>
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-500/70">
          Referencia de colores por contenedor: marrón (orgánico), azul
          (plástico), verde (vidrio), amarillo (papel / cartón) y gris (metal).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GUIA_SEPARACION.map((categoria) => (
          <article
            key={categoria.material}
            className={`flex flex-col rounded-2xl border p-5 shadow-sm ${categoria.claseBorde}`}
          >
            <header className="mb-3 flex items-center gap-3">
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full ${categoria.claseDot}`}
                aria-hidden="true"
              />
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {categoria.titulo}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Contenedor {categoria.colorReferencia.toLowerCase()}
                </p>
              </div>
            </header>

            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
              {categoria.descripcion}
            </p>

            <div className="mb-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Depositar
              </h4>
              <ul className="flex flex-col gap-1.5">
                {categoria.depositar.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span
                      className="mt-0.5 text-emerald-400 font-bold"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                Evitar
              </h4>
              <ul className="flex flex-col gap-1.5">
                {categoria.evitar.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span
                      className="mt-0.5 text-rose-400 font-bold"
                      aria-hidden="true"
                    >
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
