"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { obtenerSnapshotSesion, cerrarSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import { estaSupabaseConfigurado, getSupabaseClient } from "@/lib/supabaseClient";
import { aceptarRuta, rechazarRuta } from "@/lib/operadoresService";
import type { AccionSistema } from "@/lib/rolesAutorizados";
import type { RolUsuario, Notificacion } from "@/types/schema";

type NavLink = {
  href: string;
  etiqueta: string;
  accion: AccionSistema;
};

const LINKS_POR_ROL: Record<RolUsuario, NavLink[]> = {
  Admin: [
    { href: "/", etiqueta: "Dashboard", accion: "ver_dashboard" },
    { href: "/admin", etiqueta: "Solicitudes", accion: "aprobar_solicitudes" },
    { href: "/separacion", etiqueta: "Separacion", accion: "separacion_residuos" },
  ],
  Gerente: [
    { href: "/", etiqueta: "Dashboard", accion: "ver_dashboard" },
    { href: "/separacion", etiqueta: "Separacion", accion: "separacion_residuos" },
  ],
  Operador: [
    { href: "/", etiqueta: "Mapa y Rutas", accion: "ver_mapa" },
    { href: "/separacion", etiqueta: "Separacion", accion: "separacion_residuos" },
  ],
  Ciudadano: [
    { href: "/", etiqueta: "Mapa", accion: "ver_mapa" },
    { href: "/separacion", etiqueta: "Separacion", accion: "separacion_residuos" },
  ],
};

function formatearFechaRelativa(fecha: string): string {
  const d = new Date(fecha);
  const ahora = new Date();
  const diffMs = ahora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `${diffHoras}h`;
  const diffDias = Math.floor(diffHoras / 24);
  return `${diffDias}d`;
}

export default function NavRol() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [popoverAbierto, setPopoverAbierto] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sesion || !estaSupabaseConfigurado()) return;

    const supabase = getSupabaseClient();
    supabase
      .from("Notificaciones")
      .select("*")
      .eq("usuario_id", sesion.usuario.id)
      .order("fecha_envio", { ascending: false })
      .limit(15)
      .then(({ data, error }) => {
        if (!error && data) {
          setNotificaciones(data as Notificacion[]);
        }
      });
  }, [sesion]);

  useEffect(() => {
    if (!sesion || !estaSupabaseConfigurado()) return;

    const supabase = getSupabaseClient();
    const canal = supabase
      .channel("notificaciones-nav")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Notificaciones" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string })?.id;
            if (oldId) {
              setNotificaciones((prev) => prev.filter((n) => n.id !== oldId));
            }
            return;
          }
          const nueva = payload.new as Notificacion;
          if (nueva.usuario_id === sesion.usuario.id) {
            setNotificaciones((prev) => [nueva, ...prev.slice(0, 14)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [sesion]);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const marcarLeida = useCallback(async (id: string) => {
    if (!estaSupabaseConfigurado()) return;
    const supabase = getSupabaseClient();
    await supabase
      .from("Notificaciones")
      .update({ leida: true } as Notificacion)
      .eq("id", id);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }, []);

  const handleAceptarRuta = useCallback(async (notif: Notificacion) => {
    let enlaceRuta = notif.enlace;

    // Fallback: buscar ruta pendiente en Supabase si el enlace no viene en la notificación
    if (!enlaceRuta && sesion?.usuario?.id) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("Rutas")
        .select("id")
        .eq("operador_asignado", sesion.usuario.id)
        .eq("estado", "pendiente")
        .order("fecha_creacion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error en fallback de ruta:", error.message);
        return;
      }
      if (data) {
        enlaceRuta = data.id;
      }
    }

    if (!enlaceRuta || procesandoId) return;
    setProcesandoId(notif.id);
    try {
      await aceptarRuta(enlaceRuta);
      await marcarLeida(notif.id);
      window.dispatchEvent(
        new CustomEvent("ecoroute:ruta-aceptada", {
          detail: { rutaId: enlaceRuta },
        })
      );
      setPopoverAbierto(false);
    } catch (err) {
      console.error("Error al aceptar ruta:", err);
    } finally {
      setProcesandoId(null);
    }
  }, [marcarLeida, sesion, procesandoId]);

  const handleRechazarRuta = useCallback(async (notif: Notificacion) => {
    if (!notif.enlace || procesandoId) return;
    setProcesandoId(notif.id);
    try {
      await rechazarRuta(notif.enlace);
      await marcarLeida(notif.id);
      setPopoverAbierto(false);
    } catch (err) {
      console.error("Error al rechazar ruta:", err);
    } finally {
      setProcesandoId(null);
    }
  }, [marcarLeida, procesandoId]);

  if (!sesion) return null;

  const links = LINKS_POR_ROL[sesion.rol].filter((link) =>
    puede(sesion.rol, link.accion)
  );

  const noLeidas = notificaciones.filter((n) => !n.leida);

  const marcarTodasLeidas = async () => {
    if (!estaSupabaseConfigurado()) return;
    const supabase = getSupabaseClient();
    const idsNoLeidas = noLeidas.map((n) => n.id);
    if (idsNoLeidas.length === 0) return;
    await supabase
      .from("Notificaciones")
      .update({ leida: true } as Notificacion)
      .in("id", idsNoLeidas);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 lg:px-10">
      <Link
        href="/"
        className="mr-4 flex items-center text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
        <svg className="w-8 h-8 mr-2" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="navPinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10B981"/>
              <stop offset="100%" stopColor="#06B6D4"/>
            </linearGradient>
            <linearGradient id="navLeafGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399"/>
              <stop offset="100%" stopColor="#10B981"/>
            </linearGradient>
          </defs>
          <path d="M32 62 C32 62 14 42 14 30 A18 18 0 1 1 50 30 C50 42 32 62 32 62 Z" fill="url(#navPinGrad)"/>
          <circle cx="32" cy="30" r="13" fill="#0F172A"/>
          <path d="M32 20 C41 25 41 35 32 40 C23 35 23 25 32 20 Z" fill="url(#navLeafGrad)"/>
          <path d="M32 21 L32 39" stroke="#0F172A" strokeWidth="1.5" opacity="0.55"/>
          <path d="M46 3 L48.8 12.2 L58 15 L48.8 17.8 L46 27 L43.2 17.8 L34 15 L43.2 12.2 Z" fill="#38BDF8"/>
        </svg>
        EcoRoute
      </Link>

      <div className="flex items-center gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              pathname === link.href
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }`}
          >
            {link.etiqueta}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setPopoverAbierto(!popoverAbierto)}
            className="relative rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {noLeidas.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {noLeidas.length > 9 ? "9+" : noLeidas.length}
              </span>
            )}
          </button>

          {popoverAbierto && (
            <div className="absolute right-0 top-full z-[9999] mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-700">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Notificaciones
                </h3>
                {noLeidas.length > 0 && (
                  <button
                    onClick={marcarTodasLeidas}
                    className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Sin notificaciones
                  </p>
                ) : (
                  <ul>
                    {notificaciones.map((notif) => {
                      const esAsignacion = notif.tipo === "asignacion_ruta";
                      const estaProcesando = procesandoId === notif.id;

                      return (
                        <li
                          key={notif.id}
                          className={`border-b border-zinc-100 px-4 py-2.5 last:border-b-0 dark:border-zinc-800 ${
                            notif.leida
                              ? "bg-white dark:bg-zinc-900"
                              : "bg-emerald-50/50 dark:bg-emerald-950/20"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.leida && (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                                {notif.mensaje}
                              </p>
                              <span className="mt-0.5 block text-[10px] text-zinc-500 dark:text-zinc-400">
                                {formatearFechaRelativa(notif.fecha_envio)}
                              </span>
                            </div>
                            {!notif.leida && !esAsignacion && (
                              <button
                                onClick={() => marcarLeida(notif.id)}
                                className="shrink-0 text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                title="Marcar como leída"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {esAsignacion && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleAceptarRuta(notif)}
                                disabled={estaProcesando}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                              >
                                {estaProcesando ? "Procesando…" : "Aceptar Ruta"}
                              </button>
                              <button
                                onClick={() => handleRechazarRuta(notif)}
                                disabled={estaProcesando}
                                className="rounded-lg bg-red-600/20 px-3 py-1 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {ETIQUETAS_ROL[sesion.rol]}
        </span>
        <button
          type="button"
          onClick={async () => {
            await cerrarSesion();
            router.push("/acceso");
          }}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}