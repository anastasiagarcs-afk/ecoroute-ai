import {
  CATALOGO_RECOMPENSAS,
  NIVELES_GAMIFICACION,
  obtenerProgresoNivel,
  obtenerReglaMaterialGamificacion,
} from "@/lib/gamificacion";
import type { MaterialReciclaje, PuntosReciclaje, Usuario } from "@/types/schema";

interface GamificacionPanelProps {
  usuario: Usuario | null;
  entregas?: PuntosReciclaje[];
  cargando?: boolean;
  error?: string | null;
}

function formatoFecha(fecha: string): string {
  return new Date(fecha).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function nombreMaterial(material: MaterialReciclaje): string {
  return obtenerReglaMaterialGamificacion(material)?.nombre ?? material;
}

export default function GamificacionPanel({
  usuario,
  entregas = [],
  cargando = false,
  error = null,
}: GamificacionPanelProps) {
  if (cargando) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Cargando perfil del ciudadano desde Supabase…
      </div>
    );
  }

  if (!usuario) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
      >
        No hay un perfil de ciudadano disponible.
        {error ? ` (${error})` : ""}
      </div>
    );
  }

  const progreso = obtenerProgresoNivel(usuario.puntos_reciclaje);
  const indiceNivel = NIVELES_GAMIFICACION.findIndex(
    (nivel) => nivel.nombre === progreso.nombre
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {usuario.nombre} · {usuario.zona_asignada ?? "Sin zona asignada"}
            </p>
            <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {usuario.puntos_reciclaje}
              <span className="ml-2 text-base font-medium text-zinc-500 dark:text-zinc-400">
                puntos acumulados
              </span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              Nivel {indiceNivel + 1} · {progreso.nombre}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {progreso.esMaximo
                ? "Has alcanzado el nivel máximo."
                : `Te faltan ${progreso.puntosParaSiguiente} puntos para ser ${
                    progreso.siguienteNombre
                  } (${progreso.porcentaje}% del nivel actual).`}
            </span>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progreso.porcentaje}%` }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Catálogo de recompensas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CATALOGO_RECOMPENSAS.map((recompensa) => {
            const disponible =
              usuario.puntos_reciclaje >= recompensa.costoPuntos;
            return (
              <article
                key={recompensa.id}
                className={`flex flex-col rounded-2xl border p-4 shadow-sm dark:bg-zinc-900 ${
                  disponible
                    ? "border-emerald-300 bg-white dark:border-emerald-500/30"
                    : "border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {recompensa.nombre}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      disponible
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {recompensa.costoPuntos} pts
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {recompensa.descripcion}
                </p>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {disponible
                    ? "Disponible para canje"
                    : `Canjeable al alcanzar ${recompensa.costoPuntos} puntos`}
                </p>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          El canje de recompensas se habilitará en un próximo sprint. Este
          sprint consolida la acumulación de puntos y niveles.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Últimas entregas registradas
        </h2>
        {entregas.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aún no hay entregas registradas. Registra la primera desde la
            pestaña de Registro.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entregas.map((entrega) => (
              <li
                key={entrega.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-2.5 text-sm dark:bg-zinc-800/50"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {nombreMaterial(entrega.material)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatoFecha(entrega.fecha)} · {entrega.cantidad} kg
                  </p>
                </div>
                <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">
                  +{entrega.puntos_ganados} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}