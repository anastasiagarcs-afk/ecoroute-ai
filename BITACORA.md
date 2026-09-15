# Bitácora del Proyecto — EcoRoute AI
> Documento generado automáticamente el 14 de septiembre de 2026 a las 11:36 p. m. por `npm run informe`. No editar a mano: se regenera desde el código para mantenerse al día.
> **Nota**: Este archivo es el registro cronológico automático. Para el informe académico formal, ver `INFORME_PROYECTO.md`.

## 1. Arquitectura y Stack Tecnológico

| Capa | Tecnología | Detalle |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript | Componentes modulares en `src/components/`, páginas en `app/`. |
| Estilos | Tailwind CSS v4 | Utilidades puras, modo claro/oscuro y diseño responsive. |
| Mapas | Leaflet 1.9 + react-leaflet | Contenedores IoT y rutas dibujadas con polilíneas interactivas. |
| Rutas | OSRM | Optimización con perfiles vehiculares; fallback a línea recta sin conexión. |
| Backend | Supabase (Postgres + PostgREST + RLS) | Persistencia de historial de rutas, usuarios y puntos de reciclaje. |
| Geolocalización | PostgreSQL `geography` (extensión PostGIS) | Puntos y rutas espaciales en la base de datos. |

Flujo general: el cliente (navegador) usa `@supabase/ssr` con la clave anónima; cada tabla está protegida por Row Level Security. Si Supabase no está disponible, los módulos caen a un modo de respaldo local para no bloquear la demo.

## 2. Estado de los Sprints

| Sprint | Alcance | Estado |
| --- | --- | --- |
| Sprint 1 | Base de datos (schema + migraciones), mapas y monitoreo de contenedores | Completado |
| Sprint 2 | Optimización de rutas (OSRM), historial y persistencia en Supabase | Completado |
| Sprint 3 | Separación en la fuente, registro de reciclaje y gamificación | En Desarrollo |

## 3. Componentes de la aplicación

| Archivo | Export principal | Líneas | Descripción |
| --- | --- | --- | --- |
| `src/components/ConfirmarEliminarContenedorModal.tsx` | ConfirmarEliminarContenedorModal | 91 | Diálogo de confirmación para eliminar un contenedor en Supabase y quitar su marcador del mapa. |
| `src/components/DashboardGerencial.tsx` | DashboardGerencial | 575 | Dashboard gerencial: KPIs (totales, promedio de llenado, críticos >80%, rutas ejecutadas), filtros por zona y rango de fechas, gráfico de barras de estado por zona y tabla de contenedores críticos con acción Atender/Vaciar. |
| `src/components/EditarContenedorModal.tsx` | EditarContenedorModal | 226 | Modal para editar un contenedor existente: ajusta el porcentaje de llenado, el tipo de residuo y el estado (activo, vacío, mantenimiento, etc.), actualiza Supabase y refresca el marcador en el mapa. |
| `src/components/GamificacionPanel.tsx` | GamificacionPanel | 179 | Panel de gamificación: puntos acumulados, nivel del ciudadano, barra de progreso y catálogo de recompensas. |
| `src/components/Map.tsx` | MapaContenedores | 426 | Mapa Leaflet interactivo: contenedores en tiempo real y polilínea de la ruta activa. |
| `src/components/NuevoContenedorModal.tsx` | NuevoContenedorModal | 365 | Modal para registrar nuevos contenedores (código, tipo de residuo, nivel, capacidad y coordenadas); inserta vía la función Supabase registrar_contenedor y el marcador aparece al instante en el mapa. |
| `src/components/PopupContenedor.tsx` | PopupContenedor | 222 | Contenido en React del popup de cada marcador: información y estado del contenedor e icono con acciones Vaciar (0% y estado Vacío/Disponible), Editar y Eliminar. |
| `src/components/RegistroReciclajeForm.tsx` | RegistroReciclajeForm | 252 | Formulario ciudadano para registrar entregas (material + peso en kg) con cálculo automático de puntos e inserción en Supabase. |
| `src/components/RoutePanel.tsx` | RoutePanel | 556 | Panel de optimización de rutas: selector de contenedores, generación de ruta vía OSRM, persistencia en el historial, gestión de contenedores (vaciar, editar, eliminar) y reinicio a línea recta. |
| `src/components/RoutesMapView.tsx` | RoutesMapView | 108 | Vista integrada de mapa + panel de rutas. Coordina la ruta generada y la ruta histórica inspeccionada sobre Leaflet. |
| `src/components/SeparacionGuia.tsx` | SeparacionGuia | 216 | Guía interactiva de separación en la fuente: tarjetas por tipo de residuo con qué depositar y qué evitar. |
| `src/components/SeparacionModulo.tsx` | SeparacionModulo | 159 | Contenedor del módulo de Separación y Gamificación con navegación por pestañas. |
| `src/components/ToastHost.tsx` | ToastHost | 111 | Host global de notificaciones (toasts) usando useSyncExternalStore; posicionado sobre el mapa con animación de entrada y colores por tipo (éxito, error, info). |

## 4. Rutas de la aplicación

- `/` → `app/page.tsx`
- `/separacion` → `app/separacion/page.tsx`

## 5. Lógica de negocio (`src/lib`)

| Módulo | Líneas | Descripción |
| --- | --- | --- |
| `src/lib/contenedoresStore.ts` | 671 | Almacén de contenedores: carga y semilla desde Supabase, normalización de ubicación (objeto, GeoJSON, EWKT o WKB/EWKB hexadecimal con parseFloat), datos de respaldo en localStorage y registro, vaciado (0% y estado vacio), edición y eliminación en tiempo real. |
| `src/lib/gamificacion.ts` | 190 | Lógica pura de gamificación: puntos por kg según material, niveles de ciudadano, progreso y catálogo de recompensas. |
| `src/lib/geminiPredictiveService.ts` | 356 | Servicio predictivo con IA (HU-11/RF-24): obtiene el histórico de LecturasSensores desde Supabase (o sintetiza lecturas cuando no hay datos), ajusta un modelo de regresión lineal, consume opcionalmente la API de Gemini (NEXT_PUBLIC_GEMINI_API_KEY) y genera alertas predictivas que se persisten en la tabla Notificaciones (tipo 'alerta_predictiva'). |
| `src/lib/historialRutas.ts` | 384 | Almacén de historial de rutas con persistencia en Supabase (tabla HistorialRutas), reintentos y respaldo en localStorage. |
| `src/lib/n8nWebhook.ts` | 63 | Cliente para webhook n8n: obtiene URL desde env, POST JSON con timeout 6s (AbortController), payload {usuario_id, contenedor_id, material, peso_kg, timestamp}, fallback a null si falla. |
| `src/lib/reciclajeService.ts` | 264 | Servicio Supabase del módulo de reciclaje: usuario ciudadano actual, registro de entregas con webhook n8n (insert PuntosReciclaje + update Usuarios) y entregas recientes. |
| `src/lib/reporteExportador.ts` | 237 | — |
| `src/lib/routeOptimizer.ts` | 252 | Optimización de rutas con OSRM (perfiles vehiculares y pesos) y cálculo de ruta por distancia, con fallback a línea recta. |
| `src/lib/supabaseClient.ts` | 69 | Cliente Supabase del navegador: sanitización de variables de entorno, validación de configuración y detección del modo de respaldo. |
| `src/lib/toastStore.ts` | 61 | Mini-store de notificaciones (toasts) con patrón useSyncExternalStore: suscripción, snapshot, auto-descarte a 4.5s y descarte manual por ID. |

## 6. Base de datos (Supabase)

### Migraciones

- `supabase/migrations/01_initial_schema.sql`
- `supabase/migrations/02_historial_rutas_columns.sql`
- `supabase/migrations/03_gamificacion_politicas.sql`
- `supabase/migrations/04_contenedores_y_puntos.sql`
- `supabase/migrations/05_semilla_contenedores.sql`
- `supabase/migrations/06_eliminar_contenedores.sql`
- `supabase/migrations/07_estado_vacio_contenedores.sql`
- `supabase/migrations/08_lecturas_y_notificaciones_rls.sql`

Total de políticas RLS habilitadas en migraciones: 15.

### Tablas

| Tabla | Migración origen | Propósito |
| --- | --- | --- |
| `Contenedores` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `LecturasSensores` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `Rutas` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `Usuarios` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `PuntosReciclaje` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `HistorialRutas` | `01_initial_schema.sql` | Uso operativo del módulo. |
| `Notificaciones` | `01_initial_schema.sql` | Uso operativo del módulo. |

### Detalle de las tablas del Sprint 3

- `Usuarios`: acumula `puntos_reciclaje (integer)`; la migración 03 crea el ciudadano de demostración y políticas RLS para anónimo.
- `PuntosReciclaje`: cada entrega registra `material`, `cantidad (numeric)` y `puntos_ganados`; el total del usuario se actualiza de forma incremental tras cada inserción.

## 7. Cómo mantener este informe al día

1. Después de crear o modificar componentes, servicios, páginas o migraciones, ejecuta:

```bash
npm run informe
```

2. Revisa el diff de `INFORME_PROYECTO.md` y confírmalo en tu commit.

<!-- MANUAL_CHANGES_START -->
## 8. Cambios Recientes (Registro Manual)

### 2026-09-09 — Correcciones React 19 + Reorganización Docs
- **ToastHost.tsx**: `getServerSnapshot` estabilizado con `SNAPSHOT_SERVIDOR_VACIO` const (evita bucle SSR infinito).
- **Map.tsx**: `queueMicrotask(() => raiz.unmount())` en cleanup effects (evita "Attempted to synchronously unmount a root").
- **scripts/generar-informe.mjs**: Output configurado para `BITACORA.md` con preservación de sección manual.
- **Verificaciones**: `tsc --noEmit`, `lint`, `build` → 0 errores / compilación exitosa.

### 2026-09-14 — Cierre del Sprint 3: Polling automático + Dashboard Gerencial
- **contenedoresStore.ts**: polling automático cada 5 min (`INTERVALO_REFRESCO_CONTENEDORES_MS = 300000`). `refrescarContenedoresDesdeSupabase()` compara el resultado contra el cache (`mismoContenidoLista`) y solo actualiza/persiste/notifica si cambió; en error conserva la última carga válida (RF-08/HU-02).
- **DashboardGerencial.tsx**: dashboard gerencial con KPIs (total, promedio de llenado, críticos >80%, rutas ejecutadas), filtros por zona y rango de fechas (RF-22), gráfico de barras de estado por zona y tabla de contenedores críticos con botón Atender/Vaciar que vacía en Supabase (0% + estado `vacio`) y dispara toast de éxito (HU-06, HU-09, RF-14, RF-21).
- **app/page.tsx**: se reemplazan las tarjetas resumen por `<DashboardGerencial />`.
- **scripts/generar-informe.mjs**: descripción de `DashboardGerencial.tsx` añadida al informe automático.
- **Verificaciones**: `tsc --noEmit`, `lint`, `build` → 0 errores / compilación exitosa.

### 2026-09-14 — Sprint 4 (parcial): HU-05/RF-13 + HU-10/RF-23 + HU-11/RF-24
- **Map.tsx**: props `paradasRuta?`/`indiceParadaActual?` en interfaz, destructuring con defaults, constantes `COLOR_EMERALD` (`#10b981`) y `COLOR_QUARTZ` (`#a8a29e`), bloque de resaltado de parada actual (esmeralda) y siguiente (cuarzo) en polilínea (RF-13/HU-05).
- **RoutesMapView.tsx**: estado `indiceParadaActual` con reset a 0 al generar/cargar/salir ruta; stepper flotante "Parada actual · X de N · Siguiente →"; pasa `paradasRuta` y `indiceParadaActual` al `<Map>` (RF-13/HU-05).
- **geminiPredictiveService.ts** (nuevo): servicio de predicción IA con Gemini API + heurística; consulta `LecturasSensores` vía Supabase, sintetiza lecturas históricas, analiza tendencia lineal y calcula probabilidad/horas para crítico; exporta `analizarContenedores`, `prediccionEstaEnRiesgo`, `guardarAlertaPredictiva` (RF-24/HU-11).
- **reporteExportador.ts** (nuevo): exportación de reportes gerenciales a CSV y PDF con filtros por zona y rango de fechas (RF-23/HU-10).
- **DashboardGerencial.tsx**: tarjeta "Predicción de IA (HU-11)" con botón Analizar con IA, grid de predicciones por contenedor (nivel proyectado, probabilidad, fuente, horas para crítico) y botón Notificar a conductor (RF-24/HU-11).
- **Migración `08_lecturas_y_notificaciones_rls.sql`**: políticas RLS SELECT/INSERT para `LecturasSensores` y `Notificaciones` con clave anónima.
- **Verificaciones**: `npx tsc --noEmit` → 0 errores.
