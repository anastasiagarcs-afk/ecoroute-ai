# EcoRoute AI

**Sistema Web de Optimización Dinámica de Rutas para la Recolección Eficiente de Residuos Sólidos Municipales**

Desarrollado en el marco de las asignaturas **Técnicas de Programación III / Ingeniería de Software I** de la Universidad Nacional Experimental de Guayana (UNEG) — Sección 1, Lapso **CIVA 2026**.
Autora: **Fabiola García** · Profesora: **Ing. Dubraska Roca**.

EcoRoute AI monitorea contenedores de residuos en Ciudad Guayana, genera rutas óptimas de recolección y motiva la separación en la fuente mediante un sistema de puntos y recompensas para los ciudadanos.

## Funcionalidades actuales

- **Mapa interactivo** (Leaflet + OpenStreetMap) con marcadores coloreados según nivel de llenado: **<50% verde**, **50–80% ámbar**, **>80% rojo**.
- **CRUD de contenedores** (registrar, editar, eliminar, vaciar) con persistencia en Supabase y actualización en tiempo real.
- **Optimización de rutas**: algoritmo heurístico tipo **TSP** que prioriza contenedores críticos (>80%) y calcula la ruta vehicular con **OSRM** (fallback a línea recta por Haversine).
- **Historial de rutas ejecutadas** con persistencia en Supabase y respaldo local.
- **Separación en la fuente**: guías interactivas por material, públicas y sin login.
- **Registro de reciclaje y gamificación**: puntos por kg según material, niveles de ciudadano, catálogo de recompensas e historial de entregas.
- **Integración con n8n** vía webhook para el registro de reciclaje (fallback automático a Supabase).
- **Gestión de jornada del operador**: cierre parcial (mantiene tiempo activo) y cierre final (consolida métricas diarias), con diferenciación en el historial y bypass RLS mediante RPC para completar rutas.
- **Notificaciones toast** (éxito / error / info) sobre el mapa.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 (responsive + modo claro/oscuro) |
| Mapas | Leaflet 1.9 + tiles OpenStreetMap |
| Rutas | OSRM (perfil vehicular) + heurística TSP propia |
| Backend | Supabase (PostgreSQL + PostgREST + Row Level Security + PostGIS) |
| Automatización | n8n (webhook de reciclaje y flujos de alertas) |
| IA (Sprint 4) | Google Gemini API (alertas predictivas de desbordamiento) |

## Estructura del proyecto

```
├── app/                    # Páginas (App Router): / y /separacion
├── src/
│   ├── components/         # 12 componentes modulares (mapa, modales, paneles, toasts)
│   ├── lib/                # Lógica de negocio (contenedores, rutas, reciclaje, n8n, toasts)
│   └── types/schema.ts     # Modelo tipado de datos + tipos de Supabase
├── supabase/migrations/    # 22+ migraciones SQL idempotentes
├── scripts/                # scripts/generar-informe.mjs (regenera BITACORA.md)
├── docs/screenshots/       # Capturas para el informe académico
├── PLAN_PROYECTO.md        # Plan de trabajo y sprints
├── INFORME_PROYECTO.md     # Informe académico formal (13 incisos)
└── BITACORA.md             # Bitácora generada automáticamente
```

## Requisitos previos

- Node.js 20+ y npm.
- Proyecto en **Supabase** (PostgreSQL) con las migraciones aplicadas.
- (Opcional) URL de un webhook **n8n** para el módulo de reciclaje.

## Configuración

1. Clona el repositorio e instala dependencias:

```bash
git clone https://github.com/anastasiagarcs-afk/ecoroute-ai.git
cd ecoroute-ai
npm install
```

2. Crea el archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/ecoroute-registro   # opcional
```

3. Aplica las migraciones de `supabase/migrations/` en tu proyecto Supabase (SQL Editor, en orden numérico). Esto crea las 7 tablas, los enums de PostgreSQL, 12 políticas RLS y las funciones `registrar_contenedor` y `sembrar_contenedores_demo`.

> La aplicación funciona en **modo de respaldo local** si Supabase no está configurado: los contenedores demo se cargan desde `CONTENEDORES_FALLBACK` y el historial desde `localStorage`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Linter ESLint |
| `npm run informe` | Regenera `BITACORA.md` desde el código |

### Validaciones de calidad

```bash
npx tsc --noEmit   # verificación de tipos TypeScript
npm run lint       # análisis estático ESLint
npm run build      # compilación de producción
```

## Estado de los sprints

| Sprint | Alcance | Estado |
| --- | --- | --- |
| 1 | Base de datos, mapas y monitoreo de contenedores | ✅ Completado |
| 2 | Optimización de rutas (OSRM), historial y persistencia | ✅ Completado |
| 3 | Separación en la fuente, reciclaje, gamificación y dashboard gerencial | ✅ Completado |
| 4 | Analítica, IA predictiva (Gemini), reportes y notificaciones | ✅ Completado |
| 5 | Roles, solicitudes de acceso y cierre de jornada del operador | ✅ Completado |

Ver `PLAN_PROYECTO.md` e `INFORME_PROYECTO.md` para el detalle de requerimientos (RF/RNF), historias de usuario y arquitectura.

## Licencia

Proyecto académico. Sin licencia de uso comercial.