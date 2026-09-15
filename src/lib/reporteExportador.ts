import type { Contenedor, TipoResiduo } from "@/types/schema";
import type { RegistroHistorialRuta } from "@/lib/historialRutas";

export const ETIQUETA_TIPO_RESIDUO: Record<string, string> = {
  organico: "Orgánico",
  reciclable: "Reciclable",
  no_reciclable: "No reciclable",
  vidrio: "Vidrio",
  papel_carton: "Papel / Cartón",
  plastico: "Plástico",
  metal: "Metal",
  peligroso: "Peligroso",
  mixto: "Mixto",
};

export interface FiltrosExportacion {
  zona: string;
  fechaDesde: string;
  fechaHasta: string;
}

function escaparCSV(valor: string | number | null): string {
  const texto = String(valor ?? "");
  if (/[;"\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function filaCSV(campos: Array<string | number | null>): string {
  return campos.map(escaparCSV).join(";");
}

function nombreArchivo(base: string, extension: string, filtros: FiltrosExportacion): string {
  const zona = filtros.zona === "Todas" ? "todas" : filtros.zona.toLowerCase().replace(/\s+/g, "-");
  const fecha = new Date().toISOString().slice(0, 10);
  return `reporte-${base}-${zona}.${extension}`;
}

function construirCSV(
  contenedores: Contenedor[],
  rutas: RegistroHistorialRuta[],
  filtros: FiltrosExportacion
): string {
  const lineas: string[] = [];

  lineas.push(filaCSV(["Reporte gerencial ecoroute AI"]));
  lineas.push(
    filaCSV([
      "Generado",
      new Date().toLocaleString("es-VE"),
      "Zona",
      filtros.zona,
      "Desde",
      filtros.fechaDesde || "—",
      "Hasta",
      filtros.fechaHasta || "—",
    ])
  );
  lineas.push("");

  lineas.push(filaCSV(["CONTENEDORES"]));
  lineas.push(
    filaCSV([
      "Código",
      "Zona",
      "Tipo de residuo",
      "Capacidad",
      "Nivel de llenado (%)",
      "Estado",
      "Última lectura",
    ])
  );
  for (const contenedor of contenedores) {
    lineas.push(
      filaCSV([
        contenedor.numero_identificacion,
        contenedor.zona ?? "Sin zona",
        ETIQUETA_TIPO_RESIDUO[contenedor.tipo_residuo] ?? contenedor.tipo_residuo,
        contenedor.capacidad,
        Math.round(contenedor.nivel_llenado),
        contenedor.estado,
        contenedor.ultima_lectura,
      ])
    );
  }
  lineas.push("");

  lineas.push(filaCSV(["RUTAS EJECUTADAS"]));
  lineas.push(
    filaCSV(["Nombre", "Fecha", "Distancia (km)", "Tiempo (min)", "Contenedores", "Texto"])
  );
  for (const ruta of rutas) {
    lineas.push(
      filaCSV([
        ruta.nombre,
        ruta.fecha_ejecucion,
        ruta.distanciaKm,
        ruta.tiempoMin,
        ruta.contenedoresAtendidos.length,
        ruta.fuenteRuta,
      ])
    );
  }

  return lineas.join("\r\n");
}

export function descargarCSV(
  contenedores: Contenedor[],
  rutas: RegistroHistorialRuta[],
  filtros: FiltrosExportacion
): void {
  const csv = construirCSV(contenedores, rutas, filtros);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo("inventario", "csv", filtros);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

function filaDocumento(
  celdas: string[],
  esEncabezado = false
): string {
  const configuracion = esEncabezado
    ? "font-weight:600;background:#059669;color:#fff;"
    : "border-bottom:1px solid #e5e7eb;";
  return `<tr><td style="padding:6px 10px;${configuracion}">${celdas.join(
    '</td><td style="padding:6px 10px;' + configuracion + '">'
  )}</td></tr>`;
}

export function imprimirReporte(
  contenedores: Contenedor[],
  rutas: RegistroHistorialRuta[],
  filtros: FiltrosExportacion
): void {
  const resumenKpis = [
    ["Contenedores", String(contenedores.length)],
    ["En estado crítico", String(contenedores.filter((c) => c.nivel_llenado > 80).length)],
    ["Promedio de llenado", `${contenedores.length ? Math.round(contenedores.reduce((s, c) => s + c.nivel_llenado, 0) / contenedores.length) : 0}%`],
    ["Rutas ejecutadas", String(rutas.length)],
  ];

  const tablaContenedores = contenedores.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px;">`
        .concat(filaDocumento(["Código", "Zona", "Tipo", "Capacidad", "Nivel", "Estado"], true))
        .concat(
          contenedores
            .map((c) =>
              filaDocumento([
                c.numero_identificacion,
                c.zona ?? "—",
                ETIQUETA_TIPO_RESIDUO[c.tipo_residuo] ?? c.tipo_residuo,
                String(c.capacidad),
                `${Math.round(c.nivel_llenado)}%`,
                c.estado,
              ])
            )
            .join("")
        )
        .concat("</table>")
    : "<p>Sin contenedores para el rango seleccionado.</p>";

  const tablaRutas = rutas.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px;">`
        .concat(filaDocumento(["Nombre", "Fecha", "Distancia (km)", "Tiempo (min)", "Contenedores"], true))
        .concat(
          rutas
            .map((r) =>
              filaDocumento([
                r.nombre,
                new Date(r.fecha_ejecucion).toLocaleString("es-VE"),
                r.distanciaKm.toFixed(2),
                r.tiempoMin.toFixed(0),
                String(r.contenedoresAtendidos.length),
              ])
            )
            .join("")
        )
        .concat("</table>")
    : "<p>Sin rutas en el rango seleccionado.</p>";

  const ventana = window.open("", "_blank", "width=900,height=650");
  if (!ventana) return;

  ventana.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte gerencial · ecoroute AI</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;margin:32px;}
  h1{font-size:20px;margin:0 0 4px;}
  .meta{color:#71717a;font-size:12px;margin-bottom:20px;}
  section{margin-bottom:24px;}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#059669;border-bottom:1px solid #05966966;padding-bottom:4px;}
  .kpis{display:flex;gap:16px;margin:16px 0 24px;}
  .kpi{border:1px solid #e4e4e7;border-radius:10px;padding:12px 16px;min-width:120px;}
  .kpi b{display:block;font-size:20px;}
  .kpi span{font-size:11px;color:#71717a;}
  @media print{ .no-print{display:none;} }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 14px;background:#059669;color:#fff;border:0;border-radius:8px;cursor:pointer;">Imprimir / Guardar PDF</button>
  <h1>Reporte gerencial · ecoroute AI</h1>
  <p class="meta">
    Generado el ${new Date().toLocaleString("es-VE")} · Zona: ${filtros.zona} ·
    Rango: ${filtros.fechaDesde || "inicio"} a ${filtros.fechaHasta || "hoy"}
  </p>
  <div class="kpis">
    ${resumenKpis
      .map(
        ([etiqueta, valor]) =>
          `<div class="kpi"><b>${valor}</b><span>${etiqueta}</span></div>`
      )
      .join("")}
  </div>
  <section>
    <h2>Contenedores</h2>
    ${tablaContenedores}
  </section>
  <section>
    <h2>Rutas ejecutadas</h2>
    ${tablaRutas}
  </section>
</body>
</html>`);
  ventana.document.close();
}
