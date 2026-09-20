# Bitácora del Proyecto — EcoRoute AI
> Documento generado automáticamente el 20 de septiembre de 2026 a las 07:33 a. m. por `npm run informe`. No editar a mano: se regenera desde el código para mantenerse al día.
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
| Sprint 3 | Separación en la fuente, registro de reciclaje y gamificación | Completado |
| Sprint 4 | Analítica, IA predictiva (Gemini), reportes y notificaciones | Completado |
| Sprint 5 | Roles, autenticación, solicitudes de acceso y cierre de jornada | Completado |
| Sprint 6 | Detección de anomalías, simulador IoT y Supabase Realtime | Completado |
| Sprint 7 | Rediseño EcoCiudadano, documentación y auditoría del repositorio | Completado |

## 3. Componentes de la aplicación

| Archivo | Export principal | Líneas | Descripción |
| --- | --- | --- | --- |
| `src/components/AnomaliasPanel.tsx` | AnomaliasPanel | 208 | Panel de anomalías activas: muestra KPIs de batería, temperatura y sensores sin señal, y tabla consolidada por contenedor con tipos de anomalía. |
| `src/components/CierreJornadaModal.tsx` | CierreJornadaModal | 263 | Modal de cierre de jornada con dos modos: parcial (mantiene activa) y final (consolida día). |
| `src/components/ConfirmarEliminarContenedorModal.tsx` | ConfirmarEliminarContenedorModal | 91 | Diálogo de confirmación para eliminar un contenedor en Supabase y quitar su marcador del mapa. |
| `src/components/DashboardGerencial.tsx` | DashboardGerencial | 594 | Dashboard gerencial: KPIs (totales, promedio de llenado, críticos >80%, rutas ejecutadas), filtros por zona y rango de fechas, gráfico de barras de estado por zona y tabla de contenedores críticos con acción Atender/Vaciar. |
| `src/components/EditarContenedorModal.tsx` | EditarContenedorModal | 268 | Modal para editar un contenedor existente: ajusta el porcentaje de llenado, el tipo de residuo y el estado (activo, vacío, mantenimiento, etc.), actualiza Supabase y refresca el marcador en el mapa. |
| `src/components/GamificacionPanel.tsx` | GamificacionPanel | 179 | Panel de gamificación: puntos acumulados, nivel del ciudadano, barra de progreso y catálogo de recompensas. |
| `src/components/HistorialAnomalias.tsx` | HistorialAnomalias | 253 | Historial de anomalías con filtros por tipo, severidad y rango de fechas; incluye exportación CSV. |
| `src/components/HistorialOperador.tsx` | HistorialOperador | 309 | Panel dual del operador: columnas de jornadas (parciales/finales) y rutas completadas, con detalle expandible. |
| `src/components/Map.tsx` | MapaContenedores | 442 | Mapa Leaflet interactivo: contenedores en tiempo real y polilínea de la ruta activa. |
| `src/components/NavRol.tsx` | NavRol | 576 | Navegación por pestañas dinámica según el rol del usuario y permisos definidos en rolesAutorizados.ts. |
| `src/components/NotificacionesOperador.tsx` | NotificacionesOperador | 132 | Campanita de notificaciones en tiempo real con dropdown de alertas y lectura. |
| `src/components/NuevoContenedorModal.tsx` | NuevoContenedorModal | 593 | Modal para registrar nuevos contenedores (código, tipo de residuo, nivel, capacidad y coordenadas); inserta vía la función Supabase registrar_contenedor y el marcador aparece al instante en el mapa. |
| `src/components/PanelAlertas.tsx` | PanelAlertas | 349 | Panel de administración de alertas: filtros, resolución, envío a n8n y acciones sobre alertas. |
| `src/components/PanelRutaOperador.tsx` | PanelRutaOperador | 208 | Panel del operador para ejecutar y completar la ruta del día, con indicadores de progreso. |
| `src/components/PopupContenedor.tsx` | PopupContenedor | 238 | Contenido en React del popup de cada marcador: información y estado del contenedor e icono con acciones Vaciar (0% y estado Vacío/Disponible), Editar y Eliminar. |
| `src/components/RegistroReciclajeForm.tsx` | RegistroReciclajeForm | 244 | Formulario ciudadano para registrar entregas (material + peso en kg) con cálculo automático de puntos e inserción en Supabase. |
| `src/components/RoutePanel.tsx` | RoutePanel | 963 | Panel de optimización de rutas: selector de contenedores, generación de ruta vía OSRM, persistencia en el historial, gestión de contenedores (vaciar, editar, eliminar) y reinicio a línea recta. |
| `src/components/RoutesMapView.tsx` | RoutesMapView | 135 | Vista integrada de mapa + panel de rutas. Coordina la ruta generada y la ruta histórica inspeccionada sobre Leaflet. |
| `src/components/RutaPersonalizadaModal.tsx` | RutaPersonalizadaModal | 232 | Modal para crear una ruta personalizada seleccionando contenedores manualmente. |
| `src/components/SeparacionGuia.tsx` | SeparacionGuia | 223 | Guía interactiva de separación en la fuente: tarjetas por tipo de residuo con qué depositar y qué evitar. |
| `src/components/SeparacionModulo.tsx` | SeparacionModulo | 155 | Contenedor del módulo de Separación y Gamificación con navegación por pestañas. |
| `src/components/SimuladorSensores.tsx` | SimuladorSensores | 91 | Toggle de control del simulador IoT: activa/desactiva la generación de lecturas sintéticas cada 10 s. |
| `src/components/ToastHost.tsx` | ToastHost | 121 | Host global de notificaciones (toasts) usando useSyncExternalStore; posicionado sobre el mapa con animación de entrada y colores por tipo (éxito, error, info). |

## 4. Rutas de la aplicación

- `/acceso` → `app/acceso/page.tsx`
- `/admin` → `app/admin/page.tsx`
- `/anomalias` → `app/anomalias/page.tsx`
- `/` → `app/page.tsx`
- `/reportes` → `app/reportes/page.tsx`
- `/separacion` → `app/separacion/page.tsx`

## 5. Lógica de negocio (`src/lib`)

| Módulo | Líneas | Descripción |
| --- | --- | --- |
| `src/lib/adminService.ts` | 134 | Operaciones de administrador: aprobación/rechazo de solicitudes de acceso y gestión de roles. |
| `src/lib/alertasService.ts` | 223 | Gestión de alertas: obtiene, marca como leídas/atendidas, resuelve y envía alertas a n8n. |
| `src/lib/anomaliasService.ts` | 131 | Servicio de detección de anomalías: clasifica sensores por batería crítica, temperatura extrema y pérdida de señal; exporta a CSV. |
| `src/lib/authService.ts` | 251 | Autenticación y registro: login/logout con Supabase Auth, creación de solicitudes de acceso y registro directo de ciudadanos. |
| `src/lib/contenedoresStore.ts` | 787 | Almacén de contenedores: carga y semilla desde Supabase, normalización de ubicación (objeto, GeoJSON, EWKT o WKB/EWKB hexadecimal con parseFloat), datos de respaldo en localStorage y registro, vaciado (0% y estado vacio), edición y eliminación en tiempo real. |
| `src/lib/gamificacion.ts` | 190 | Lógica pura de gamificación: puntos por kg según material, niveles de ciudadano, progreso y catálogo de recompensas. |
| `src/lib/geminiPredictiveService.ts` | 351 | Servicio predictivo con IA (HU-11/RF-24): obtiene el histórico de LecturasSensores desde Supabase (o sintetiza lecturas cuando no hay datos), ajusta un modelo de regresión lineal, consume opcionalmente la API de Gemini (NEXT_PUBLIC_GEMINI_API_KEY) y genera alertas predictivas que se persisten en la tabla Notificaciones (tipo 'alerta_predictiva'). |
| `src/lib/historialRutas.ts` | 397 | Almacén de historial de rutas con persistencia en Supabase (tabla HistorialRutas), reintentos y respaldo en localStorage. |
| `src/lib/jornadaService.ts` | 371 | Lógica de cierre de jornada del operador: cierre parcial/final y persistencia en HistorialRutas. |
| `src/lib/n8nWebhook.ts` | 122 | Cliente para webhook n8n: obtiene URL desde env, POST JSON con timeout 6s (AbortController), payload {usuario_id, contenedor_id, material, peso_kg, timestamp}, fallback a null si falla. |
| `src/lib/operadoresService.ts` | 393 | Servicios del operador: carga de rutas asignadas, completado y consulta de jornadas históricas. |
| `src/lib/reciclajeService.ts` | 279 | Servicio Supabase del módulo de reciclaje: usuario ciudadano actual, registro de entregas con webhook n8n (insert PuntosReciclaje + update Usuarios) y entregas recientes. |
| `src/lib/reporteExportador.ts` | 237 | Exportación de reportes gerenciales a CSV y PDF con filtros por zona y fechas. |
| `src/lib/rolesAutorizados.ts` | 76 | Matriz de permisos por rol; define la función puede(rol, accion) con short-circuit de superusuario Admin. |
| `src/lib/routeOptimizer.ts` | 258 | Optimización de rutas con OSRM (perfiles vehiculares y pesos) y cálculo de ruta por distancia, con fallback a línea recta. |
| `src/lib/supabaseClient.ts` | 69 | Cliente Supabase del navegador: sanitización de variables de entorno, validación de configuración y detección del modo de respaldo. |
| `src/lib/supabaseServer.ts` | 29 | — |
| `src/lib/toastStore.ts` | 61 | Mini-store de notificaciones (toasts) con patrón useSyncExternalStore: suscripción, snapshot, auto-descarte a 4.5s y descarte manual por ID. |
| `src/lib/zonas.ts` | 10 | — |

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
- `supabase/migrations/09_roles_y_solicitudes_acceso_rls.sql`
- `supabase/migrations/10_seed_admin_acceso.sql`
- `supabase/migrations/11_aprobar_solicitud_rol_asignado.sql`
- `supabase/migrations/12_reforzar_rls_solicitudes_acceso.sql`
- `supabase/migrations/13_actualizar_rpc_rechazo.sql`
- `supabase/migrations/14_restaurar_rls_admin_solicitudes.sql`
- `supabase/migrations/15_rls_por_rol.sql`
- `supabase/migrations/16_drop_aprobar_solicitud_overloads.sql`
- `supabase/migrations/17_rutas_asignacion_operador.sql`
- `supabase/migrations/18_historial_rutas_gerente_insert.sql`
- `supabase/migrations/19_ruta_estado_historial_operador.sql`
- `supabase/migrations/20_rutas_geometria.sql`
- `supabase/migrations/21_add_enum_asignacion_ruta.sql`
- `supabase/migrations/22_rpc_completar_ruta.sql`
- `supabase/migrations/23_admin_gestion_usuarios.sql`
- `supabase/migrations/24_fix_usuarios_rls.sql`
- `supabase/migrations/25_usuarios_delete_admin.sql`
- `supabase/migrations/26_fix_usuarios_insert_policy.sql`
- `supabase/migrations/28_security_rls_usuarios_final.sql`
- `supabase/migrations/29_trigger_alerta_llenado.sql`
- `supabase/migrations/30_fix_realtime_notificaciones.sql`
- `supabase/migrations/31_habilitar_realtime_completo.sql`
- `supabase/migrations/32_fix_trigger_duplicados.sql`
- `supabase/migrations/33_fix_rls_gerente_notificaciones.sql`
- `supabase/migrations/33_realtime_lecturas_sensores.sql`
- `supabase/migrations/34_update_notificaciones_estado.sql`
- `supabase/migrations/35_add_contenedor_id_to_notificaciones.sql`
- `supabase/migrations/36_add_alerta_n8n_type.sql`

Total de políticas RLS habilitadas en migraciones: 61.

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
| `SolicitudesAcceso` | `09_roles_y_solicitudes_acceso_rls.sql` | Uso operativo del módulo. |

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

### 2026-09-15 — Sprint 5: Optimización flujo de registro + Auto-confirmación email + Dominio @ecoroute.com
- **authService.ts**: `signUp()` con `emailConfirm: true` — bypass de confirmación por correo en desarrollo para evitar bloqueos por "email rate limit exceeded" de Supabase (capa gratuita).
- **app/acceso/page.tsx**: Selector de rol en el paso de registro (Ciudadano / Operador / Gerente). Bifurcación: Ciudadano → acceso directo a `/`; Operador/Gerente → paso "solicitud" para enviar solicitud al panel `/admin`.
- **scripts/seed-admin.ts**: Admin por defecto `admin@ecoroute.com` / `Admin123456!` (dominio corporativo simulado aceptado por Supabase).
- **Archivos demo actualizados**: `reciclajeService.ts`, `geminiPredictiveService.ts`, `supabase/migrations/03_gamificacion_politicas.sql` — emails `@ecoroute.test` → `@ecoroute.com`.
- **Arquitectura QA/Dev**: El uso de `emailConfirm: true` y el dominio `@ecoroute.com` son decisiones deliberadas para entornos de prueba (QA/Dev) que evitan los límites de tasa (rate limits) de envío de emails de Supabase en su plan gratuito durante la evaluación. En producción se usará dominio real + flujo de confirmación por email estándar.
- **Verificaciones**: `npx tsc --noEmit`, `npm run lint`, `npm run build` → 0 errores / compilación exitosa.
