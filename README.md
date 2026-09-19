# EcoRoute AI

**Sistema Web de Optimizacion Dinamica de Rutas para la Recoleccion Eficiente de Residuos Solidos Municipales**

Desarrollado en el marco de las asignaturas **Tecnicas de Programacion III / Ingenieria de Software I** de la Universidad Nacional Experimental de Guayana (UNEG) -- Seccion 1, Lapso **CIVA 2026**.
Autora: **Fabiola Garcia** . Profesora: **Ing. Dubraska Roca**.

EcoRoute AI monitorea contenedores de residuos en Ciudad Guayana, genera rutas optimas de recoleccion y motiva la separacion en la fuente mediante un sistema de puntos y recompensas para los ciudadanos.

## Funcionalidades actuales

- **Mapa interactivo** (Leaflet + OpenStreetMap) con marcadores coloreados segun nivel de llenado: **<50% verde**, **50-80% ambar**, **>80% rojo**.
- **CRUD de contenedores** (registrar, editar, eliminar, vaciar) con persistencia en Supabase y actualizacion en tiempo real.
- **Optimizacion de rutas**: algoritmo heuristico tipo **TSP** que prioriza contenedores criticos (>80%) y calcula la ruta vehicular con **OSRM** (fallback a linea recta por Haversine).
- **Historial de rutas ejecutadas** con persistencia en Supabase y respaldo local.
- **Separacion en la fuente**: guias interactivas por material, publicas y sin login.
- **Registro de reciclaje y gamificacion**: puntos por kg segun material, niveles de ciudadano, catalogo de recompensas e historial de entregas.
- **Integracion bidireccional con n8n**: webhook saliente para registro de reciclaje (fallback a Supabase) + API Route entrante `/api/webhooks/n8n` autenticada para recepcion de alertas externas.
- **Sistema de alertas en tiempo real**: trigger SQL al >=80%, prediccion predictiva con Gemini AI, y recepcion de alertas desde n8n. Panel de administracion con filtros y resolucion de alertas.
- **Gestion de roles y permisos**: Admin, Gerente, Operador y Ciudadano con RLS por rol y solicitudes de acceso.
- **Gestion de jornada del operador**: cierre parcial (mantiene tiempo activo) y cierre final (consolida metricas diarias), con diferenciacion en el historial y bypass RLS mediante RPC para completar rutas.
- **Notificaciones toast** (exito / error / info) sobre el mapa.

## Stack tecnologico

| Capa | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 (responsive + modo claro/oscuro) |
| Mapas | Leaflet 1.9 + tiles OpenStreetMap |
| Rutas | OSRM (perfil vehicular) + heuristica TSP propia |
| Backend | Supabase (PostgreSQL + PostgREST + Row Level Security + PostGIS) |
| IA | Google Gemini API (alertas predictivas de desbordamiento) |
| Automatizacion | n8n (webhook bidireccional: registro de reciclaje + recepcion de alertas) |

## Estructura del proyecto

```
+-- app/                              # Paginas (App Router)
|   +-- page.tsx                      # Dashboard principal
|   +-- layout.tsx                    # Layout raiz
|   +-- admin/page.tsx                # Panel de administracion
|   +-- acceso/page.tsx               # Login / registro
|   +-- separacion/page.tsx           # Guias de separacion
|   +-- api/webhooks/n8n/route.ts     # API Route: recepcion webhooks n8n
+-- src/
|   +-- components/                   # 19 componentes modulares
|   +-- lib/                          # 17 modulos de logica de negocio
|   +-- hooks/                        # Custom hooks (useMapEffect)
|   +-- types/schema.ts               # Modelo tipado de datos
+-- supabase/migrations/              # 36 migraciones SQL idempotentes
+-- scripts/                          # Generador de informes y seed de admin
+-- PLAN_PROYECTO.md                  # Plan de trabajo y sprints
+-- INFORME_PROYECTO.md               # Informe academico formal (13 incisos)
+-- BITACORA.md                       # Bitacora generada automaticamente
```

## Requisitos previos

- Node.js 20+ y npm.
- Proyecto en **Supabase** (PostgreSQL) con las migraciones aplicadas.
- (Opcional) Instancia de **n8n** para automatizaciones externas.
- (Opcional) API Key de **Google Gemini** para alertas predictivas.

## Configuracion

1. Clona el repositorio e instala dependencias:

```bash
git clone https://github.com/anastasiagarcs-afk/ecoroute-ai.git
cd ecoroute-ai
npm install
```

2. Crea el archivo `.env.local` con las siguientes variables:

```env
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Google Gemini IA (opcional - para alertas predictivas)
NEXT_PUBLIC_GEMINI_API_KEY=tu-gemini-api-key

# n8n Webhooks (opcional - para integracion bidireccional)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/ecoroute-registro
N8N_WEBHOOK_SECRET=tu-secreto-webhook-para-n8n
```

3. Aplica las migraciones de `supabase/migrations/` en tu proyecto Supabase (SQL Editor, en orden numerico). Esto crea las 8 tablas, los enums de PostgreSQL, 61 politicas RLS y las funciones RPC.

4. (Opcional) Sembrar usuario Admin:

```bash
npx tsx scripts/seed-admin.ts
```

Crea `admin@ecoroute.com` / `Admin123456!` en Supabase Auth + tabla Usuarios.

> La aplicacion funciona en **modo de respaldo local** si Supabase no esta configurado: los contenedores demo se cargan desde `CONTENEDORES_FALLBACK` y el historial desde `localStorage`.

## Scripts

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` | Build de produccion |
| `npm run start` | Servidor de produccion |
| `npm run lint` | Linter ESLint |
| `npm run informe` | Regenera `BITACORA.md` desde el codigo |

### Validaciones de calidad

```bash
npx tsc --noEmit   # verificacion de tipos TypeScript
npm run lint       # analisis estatico ESLint
npm run build      # compilacion de produccion
```

## Estado de los sprints

| Sprint | Alcance | Estado |
| --- | --- | --- |
| 1 | Base de datos, mapas y monitoreo de contenedores | Completado |
| 2 | Optimizacion de rutas (OSRM), historial y persistencia | Completado |
| 3 | Separacion en la fuente, reciclaje, gamificacion y dashboard gerencial | Completado |
| 4 | Analitica, IA predictiva (Gemini), reportes y notificaciones | Completado |
| 5 | Roles, solicitudes de acceso y cierre de jornada del operador | Completado |

Ver `PLAN_PROYECTO.md` e `INFORME_PROYECTO.md` para el detalle de requerimientos (RF/RNF), historias de usuario y arquitectura.

## Licencia

Proyecto academico. Sin licencia de uso comercial.
