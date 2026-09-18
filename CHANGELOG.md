# Changelog — EcoRoute AI

## [Unreleased] — 2026-09-17

### Added
- Función RPC `completar_ruta` en Supabase para bypass seguro de RLS al marcar rutas como completadas (`supabase/migrations/22_rpc_completar_ruta.sql`).
- Tracking de `fecha_inicio` de jornada del operador, persistida en `localStorage`.
- Dos botones explícitos en la UI del operador: **Cierre Parcial** y **Cierre Final**.
- Función `calcularResumenJornadaFinal` para consolidar el total acumulado del día en cierres finales.
- Aislamiento de métricas tras cierre final: solo las rutas completadas después del nuevo `fecha_inicio` cuentan para el siguiente cierre.
- Historial del operador reorganizado en **dos columnas**: "Jornadas" y "Rutas Completadas".
- Visualización de historial sin mapa principal en la pestaña "Mi Historial".

### Fixed
- Bloqueo de RLS que impedía completar rutas cuyos contenedores ya estaban vaciados.
- Reinicio incorrecto del tiempo activo al realizar cierres parciales de jornada.
- Persistencia de rutas completadas en Supabase mediante RPC con `security definer`.
- Referencias rotas en `NavRol.tsx` (`aceptarRuta`, `procesandoId`).
- Error de tipo en comparación de código RLS (`"42501"`).
- Tipado de RPC `completar_ruta` no generado en `schema.ts`.

### Changed
- `calcularResumenJornada` ahora recibe `fecha_inicio`, `tipo_cierre` y filtra rutas finalizadas por el inicio de jornada.
- `obtenerRutasJornadaActual` acepta `fechaInicioJornada` opcional para filtrar rutas completadas.
- `cerrarJornada` persiste `tipo_cierre` y `fecha_inicio` en las observaciones del historial.
- `HistorialOperador` muestra jornadas y rutas en columnas separadas con badges de tipo de cierre.

### Security
- La RPC `completar_ruta` valida que solo el operador asignado pueda completar su ruta, evitando escalación de privilegios a pesar del bypass RLS.

---

## [1.0.0-sprint3] — 2026-09-14

### Added
- Módulo de reciclaje y gamificación para ciudadanos.
- Dashboard gerencial con indicadores clave.
- Solicitudes de acceso y gestión de roles.

### Fixed
- Correcciones de RLS para tablas de solicitudes y usuarios.

---

## [1.0.0-sprint2] — 2026-09-07

### Added
- Optimización de rutas con algoritmo TSP y OSRM.
- Visualización de rutas en el mapa.
- Alertas de contenedores críticos.
- Historial de rutas ejecutadas.

---

## [1.0.0-sprint1] — 2026-08-31

### Added
- Configuración inicial del proyecto Next.js 16 + React 19.
- Integración con Supabase Auth y PostgreSQL.
- CRUD de contenedores con mapa interactivo Leaflet.
- Guías de separación en la fuente.
