import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const RUTA_RAIZ = process.cwd();

const DESCRIPCIONES_COMPONENTES = {
  "Map.tsx":
    "Mapa Leaflet interactivo: contenedores en tiempo real y polilínea de la ruta activa.",
  "RoutePanel.tsx":
    "Panel de optimización de rutas: selector de contenedores, generación de ruta vía OSRM, persistencia en el historial, gestión de contenedores (vaciar, editar, eliminar) y reinicio a línea recta.",
  "RoutesMapView.tsx":
    "Vista integrada de mapa + panel de rutas. Coordina la ruta generada y la ruta histórica inspeccionada sobre Leaflet.",
  "SeparacionGuia.tsx":
    "Guía interactiva de separación en la fuente: tarjetas por tipo de residuo con qué depositar y qué evitar.",
  "RegistroReciclajeForm.tsx":
    "Formulario ciudadano para registrar entregas (material + peso en kg) con cálculo automático de puntos e inserción en Supabase.",
  "GamificacionPanel.tsx":
    "Panel de gamificación: puntos acumulados, nivel del ciudadano, barra de progreso y catálogo de recompensas.",
  "DashboardGerencial.tsx":
    "Dashboard gerencial: KPIs (totales, promedio de llenado, críticos >80%, rutas ejecutadas), filtros por zona y rango de fechas, gráfico de barras de estado por zona y tabla de contenedores críticos con acción Atender/Vaciar.",
  "SeparacionModulo.tsx":
    "Contenedor del módulo de Separación y Gamificación con navegación por pestañas.",
  "NuevoContenedorModal.tsx":
    "Modal para registrar nuevos contenedores (código, tipo de residuo, nivel, capacidad y coordenadas); inserta vía la función Supabase registrar_contenedor y el marcador aparece al instante en el mapa.",
  "EditarContenedorModal.tsx":
    "Modal para editar un contenedor existente: ajusta el porcentaje de llenado, el tipo de residuo y el estado (activo, vacío, mantenimiento, etc.), actualiza Supabase y refresca el marcador en el mapa.",
  "ConfirmarEliminarContenedorModal.tsx":
    "Diálogo de confirmación para eliminar un contenedor en Supabase y quitar su marcador del mapa.",
  "PopupContenedor.tsx":
    "Contenido en React del popup de cada marcador: información y estado del contenedor e icono con acciones Vaciar (0% y estado Vacío/Disponible), Editar y Eliminar.",
  "ToastHost.tsx":
    "Host global de notificaciones (toasts) usando useSyncExternalStore; posicionado sobre el mapa con animación de entrada y colores por tipo (éxito, error, info).",
};

const DESCRIPCIONES_LIB = {
  "routeOptimizer.ts":
    "Optimización de rutas con OSRM (perfiles vehiculares y pesos) y cálculo de ruta por distancia, con fallback a línea recta.",
  "gamificacion.ts":
    "Lógica pura de gamificación: puntos por kg según material, niveles de ciudadano, progreso y catálogo de recompensas.",
  "reciclajeService.ts":
    "Servicio Supabase del módulo de reciclaje: usuario ciudadano actual, registro de entregas con webhook n8n (insert PuntosReciclaje + update Usuarios) y entregas recientes.",
  "historialRutas.ts":
    "Almacén de historial de rutas con persistencia en Supabase (tabla HistorialRutas), reintentos y respaldo en localStorage.",
  "contenedoresStore.ts":
    "Almacén de contenedores: carga y semilla desde Supabase, normalización de ubicación (objeto, GeoJSON, EWKT o WKB/EWKB hexadecimal con parseFloat), datos de respaldo en localStorage y registro, vaciado (0% y estado vacio), edición y eliminación en tiempo real.",
  "supabaseClient.ts":
    "Cliente Supabase del navegador: sanitización de variables de entorno, validación de configuración y detección del modo de respaldo.",
  "toastStore.ts":
    "Mini-store de notificaciones (toasts) con patrón useSyncExternalStore: suscripción, snapshot, auto-descarte a 4.5s y descarte manual por ID.",
  "n8nWebhook.ts":
    "Cliente para webhook n8n: obtiene URL desde env, POST JSON con timeout 6s (AbortController), payload {usuario_id, contenedor_id, material, peso_kg, timestamp}, fallback a null si falla.",
};

function listarArchivos(directorio, extension, recursivo = false) {
  const ruta = join(RUTA_RAIZ, directorio);
  if (!existsSync(ruta)) return [];
  const resultados = [];
  const recorrer = (rutaActual) => {
    for (const entrada of readdirSync(rutaActual, { withFileTypes: true })) {
      const rutaCompleta = join(rutaActual, entrada.name);
      if (entrada.isDirectory() && recursivo) {
        recorrer(rutaCompleta);
      } else if (entrada.isFile() && entrada.name.endsWith(extension)) {
        resultados.push(rutaCompleta);
      }
    }
  };
  recorrer(ruta);
  return resultados.sort();
}

function leer(ruta) {
  try {
    return readFileSync(ruta, "utf8");
  } catch {
    return "";
  }
}

function contarLineas(ruta) {
  const contenido = leer(ruta);
  return contenido ? contenido.split(/\r?\n/).length : 0;
}

function exportacionPrincipal(ruta) {
  const coincidencia = /export\s+default\s+(?:function\s+(\w+)|(\w+))\b/.exec(
    leer(ruta)
  );
  return coincidencia ? (coincidencia[1] ?? coincidencia[2]) : "—";
}

function tablasDeMigraciones() {
  const nombres = new Map();
  for (const ruta of listarArchivos("supabase/migrations", ".sql")) {
    const contenido = leer(ruta);
    for (const coincidencia of contenido.matchAll(
      /create\s+table\s+public\."([^"]+)"/gi
    )) {
      nombres.set(coincidencia[1], ruta.split(/[\\/]/).pop());
    }
  }
  return [...nombres.entries()];
}

function conteoPoliticas() {
  let total = 0;
  for (const ruta of listarArchivos("supabase/migrations", ".sql")) {
    total += (leer(ruta).match(/create\s+policy/gi) ?? []).length;
  }
  return total;
}

function rutaWeb(archivo) {
  const partes = archivo
    .replace(/\\/g, "/")
    .split("/");
  const indiceApp = partes.indexOf("app");
  const rutaApp = indiceApp >= 0 ? partes.slice(indiceApp + 1) : partes;
  const limpias = rutaApp.filter(
    (parte) => parte && parte !== "page.tsx"
  );
  return limpias.length ? `/${limpias.join("/")}` : "/";
}

function rutaRelativa(archivo) {
  const relativa = archivo.replace(/\\/g, "/").replace(RUTA_RAIZ.replace(/\\/g, "/") + "/", "");
  return relativa;
}

function fechaHoy() {
  return new Date().toLocaleString("es-VE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const componentes = listarArchivos("src/components", ".tsx");
const librerias = listarArchivos("src/lib", ".ts");
const paginas = listarArchivos("app", ".tsx", true).filter((ruta) =>
  ruta.endsWith("page.tsx")
);
const migraciones = listarArchivos("supabase/migrations", ".sql");
const tablas = tablasDeMigraciones();

// Función para extraer la sección manual preservada del archivo existente
function extraerSeccionManual(rutaArchivo) {
  const marcador = "<!-- MANUAL_CHANGES_START -->";
  try {
    const contenido = readFileSync(rutaArchivo, "utf8");
    const idx = contenido.indexOf(marcador);
    if (idx !== -1) {
      // Retornar contenido DESPUÉS del marcador (sin incluir el marcador)
      return contenido.slice(idx + marcador.length).trimStart();
    }
  } catch {
    // Archivo no existe o error de lectura
  }
  return "";
}

const BITACORA_PATH = join(RUTA_RAIZ, "BITACORA.md");
const seccionManual = extraerSeccionManual(BITACORA_PATH);

const secciones = [
  "# Bitácora del Proyecto — EcoRoute AI",
  `> Documento generado automáticamente el ${fechaHoy()} por \`npm run informe\`. No editar a mano: se regenera desde el código para mantenerse al día.`,
  "> **Nota**: Este archivo es el registro cronológico automático. Para el informe académico formal, ver `INFORME_PROYECTO.md`.",
  "",
  "## 1. Arquitectura y Stack Tecnológico",
  "",
  "| Capa | Tecnología | Detalle |",
  "| --- | --- | --- |",
  "| Frontend | Next.js 16 (App Router) + React 19 + TypeScript | Componentes modulares en `src/components/`, páginas en `app/`. |",
  "| Estilos | Tailwind CSS v4 | Utilidades puras, modo claro/oscuro y diseño responsive. |",
  "| Mapas | Leaflet 1.9 + react-leaflet | Contenedores IoT y rutas dibujadas con polilíneas interactivas. |",
  "| Rutas | OSRM | Optimización con perfiles vehiculares; fallback a línea recta sin conexión. |",
  "| Backend | Supabase (Postgres + PostgREST + RLS) | Persistencia de historial de rutas, usuarios y puntos de reciclaje. |",
  "| Geolocalización | PostgreSQL `geography` (extensión PostGIS) | Puntos y rutas espaciales en la base de datos. |",
  "",
  "Flujo general: el cliente (navegador) usa `@supabase/ssr` con la clave anónima; cada tabla está protegida por Row Level Security. Si Supabase no está disponible, los módulos caen a un modo de respaldo local para no bloquear la demo.",
  "",
  "## 2. Estado de los Sprints",
  "",
  "| Sprint | Alcance | Estado |",
  "| --- | --- | --- |",
  "| Sprint 1 | Base de datos (schema + migraciones), mapas y monitoreo de contenedores | Completado |",
  "| Sprint 2 | Optimización de rutas (OSRM), historial y persistencia en Supabase | Completado |",
  "| Sprint 3 | Separación en la fuente, registro de reciclaje y gamificación | En Desarrollo |",
  "",
  "## 3. Componentes de la aplicación",
  "",
  "| Archivo | Export principal | Líneas | Descripción |",
  "| --- | --- | --- | --- |",
  ...componentes.map(
    (ruta) =>
      `| \`src/components/${basename(ruta)}\` | ${exportacionPrincipal(ruta)} | ${contarLineas(
        ruta
      )} | ${DESCRIPCIONES_COMPONENTES[basename(ruta)] ?? "—"} |`
  ),
  "",
  "## 4. Rutas de la aplicación",
  "",
  ...paginas.map(
    (ruta) => `- \`${rutaWeb(ruta)}\` → \`${rutaRelativa(ruta)}\``
  ),
  "",
  "## 5. Lógica de negocio (`src/lib`)",
  "",
  "| Módulo | Líneas | Descripción |",
  "| --- | --- | --- |",
  ...librerias.map(
    (ruta) =>
      `| \`src/lib/${basename(ruta)}\` | ${contarLineas(
        ruta
      )} | ${DESCRIPCIONES_LIB[basename(ruta)] ?? "—"} |`
  ),
  "",
  "## 6. Base de datos (Supabase)",
  "",
  "### Migraciones",
  "",
  ...migraciones.map((ruta) => `- \`${rutaRelativa(ruta)}\``),
  "",
  `Total de políticas RLS habilitadas en migraciones: ${conteoPoliticas()}.`,
  "",
  "### Tablas",
  "",
  "| Tabla | Migración origen | Propósito |",
  "| --- | --- | --- |",
  ...tablas.map(
    ([tabla, origen]) =>
      `| \`${tabla}\` | \`${origen}\` | Uso operativo del módulo. |`
  ),
  "",
  "### Detalle de las tablas del Sprint 3",
  "",
  "- `Usuarios`: acumula `puntos_reciclaje (integer)`; la migración 03 crea el ciudadano de demostración y políticas RLS para anónimo.",
  "- `PuntosReciclaje`: cada entrega registra `material`, `cantidad (numeric)` y `puntos_ganados`; el total del usuario se actualiza de forma incremental tras cada inserción.",
  "",
  "## 7. Cómo mantener este informe al día",
  "",
  "1. Después de crear o modificar componentes, servicios, páginas o migraciones, ejecuta:",
  "",
  "```bash",
  "npm run informe",
  "```",
  "",
  "2. Revisa el diff de `INFORME_PROYECTO.md` y confírmalo en tu commit.",
  "",
  "<!-- MANUAL_CHANGES_START -->",
];

const contenidoFinal = secciones.join("\n") + "\n" + seccionManual;

writeFileSync(
  BITACORA_PATH,
  contenidoFinal,
  "utf8"
);

console.log(
  `BITACORA.md regenerado: ${componentes.length} componentes, ${librerias.length} módulos, ${paginas.length} páginas, ${migraciones.length} migraciones, ${tablas.length} tablas.`
);