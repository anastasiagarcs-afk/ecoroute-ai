"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { obtenerSnapshotSesion, cerrarSesion } from "@/lib/authService";
import { puede, ETIQUETAS_ROL } from "@/lib/rolesAutorizados";
import type { AccionSistema } from "@/lib/rolesAutorizados";
import type { RolUsuario } from "@/types/schema";
import { useRouter } from "next/navigation";

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

export default function NavRol() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = useSyncExternalStore(
    () => () => {},
    obtenerSnapshotSesion,
    () => null
  );

  if (!sesion) return null;

  const links = LINKS_POR_ROL[sesion.rol].filter((link) =>
    puede(sesion.rol, link.accion)
  );

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 lg:px-10">
      <Link
        href="/"
        className="mr-4 text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
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