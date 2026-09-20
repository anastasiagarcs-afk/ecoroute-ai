# EcoRoute AI

**Sistema Web de Optimización Dinámica de Rutas para la Recolección Eficiente de Residuos Sólidos Municipales**

Desarrollado en el marco de las asignaturas **Técnicas de Programación III / Ingeniería de Software I** de la Universidad Nacional Experimental de Guayana (UNEG) — Sección 1, Lapso **CIVA 2026**.

Autora: **Fabiola García** (C.I.: 28.694.007) | Profesora: **Ing. Dubraska Roca**

EcoRoute AI monitorea contenedores de residuos en Ciudad Guayana, genera rutas óptimas de recolección y motiva la separación en la fuente mediante un sistema de puntos y recompensas para los ciudadanos.

---

## Funcionalidades actuales

- **Mapa interactivo** (Leaflet + OpenStreetMap) con marcadores coloreados según nivel de llenado: **<50% verde**, **50-80% ámbar**, **>80% rojo**.
- **CRUD de contenedores** (registrar, editar, eliminar, vaciar) con persistencia en Supabase y actualización en tiempo real.
- **Optimización de rutas**: algoritmo heurístico tipo **TSP** que prioriza contenedores críticos (>80%) y calcula la ruta vehicular con **OSRM** (fallback a línea recta por Haversine).
- **Historial de rutas ejecutadas** con persistencia en Supabase y respaldo local.
- **Separación en la fuente**: guías interactivas por material, públicas y sin login.
- **Registro de reciclaje y gamificación**: puntos por kg según material, niveles de ciudadano, catálogo de recompensas e historial de entregas.
- **Integración bidireccional con n8n**: webhook saliente para registro de reciclaje (fallback a Supabase) + API Route entrante `/api/webhooks/n8n` autenticada para recepción de alertas externas.
- **Sistema de alertas en tiempo real**: trigger SQL al ≥80%, predicción predictiva con Gemini AI y recepción de alertas desde n8n. Panel de administración con filtros y resolución de alertas.
- **Detección de anomalías en sensores**: monitoreo de batería (<20%), temperatura (>50°C) y sensores sin señal (>24h). KPIs, tabla consolidada por contenedor e historial con filtros y exportación CSV (rol Gerente).
- **Simulador de sensores IoT**: toggle en `/anomalias` que genera lecturas sintéticas cada 10s vía `/api/simular-sensores`, con 5% de contenedores "sin señal" para pruebas de anomalías.
- **Actualización en tiempo real (Supabase Realtime)**: suscripciones a `INSERT`/`UPDATE` en `LecturasSensores`, `Contenedores` y `Notificaciones` para refrescar anomalías, mapa y alertas automáticamente.
- **Gestión de roles y permisos**: Admin, Gerente, Operador y Ciudadano con RLS por rol y solicitudes de acceso.
- **Gestión de jornada del operador**: cierre parcial (mantiene tiempo activo) y cierre final (consolida métricas diarias), con diferenciación en el historial y bypass RLS mediante RPC para completar rutas.
- **EcoCiudadano**: módulo de separación en la fuente renombrado, con tarjetas coloreadas por material (orgánico, plástico, vidrio, papel/cartón, metal), registro de reciclaje, puntos y recompensas.
- **Notificaciones toast** (éxito / error / info) sobre el mapa.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Estilos** | Tailwind CSS v4 (responsive + modo claro/oscuro) |
| **Iconos** | lucide-react (SVG vectoriales) |
| **Mapas** | Leaflet 1.9 + tiles OpenStreetMap |
| **Rutas** | OSRM (perfil vehicular) + heurística TSP propia |
| **Backend** | Supabase (PostgreSQL + PostgREST + Row Level Security + PostGIS + Realtime) |
| **IA** | Google Gemini API (alertas predictivas de desbordamiento) |
| **Automatización** | n8n (webhook bidireccional: registro de reciclaje + recepción de alertas) + API Route simulador IoT |

---

## Estructura del proyecto

```text
ecoroute-ai/
├── app/                                  # Páginas (App Router)
│   ├── page.tsx                          # Dashboard principal (por rol)
│   ├── layout.tsx                        # Layout raíz
│   ├── admin/page.tsx                    # Panel de administración
│   ├── acceso/page.tsx                   # Login / registro
│   ├── separacion/page.tsx               # EcoCiudadano (guías de separación)
│   ├── anomalias/page.tsx                # Detección de anomalías (Gerente)
│   ├── reportes/page.tsx                 # Reportes completos (Admin/Gerente)
│   └── api/
│       ├── simular-sensores/route.ts     # API Route: simulador IoT
│       └── webhooks/n8n/route.ts         # API Route: recepción webhooks n8n
├── src/
│   ├── components/                       # 23 componentes modulares
│   ├── lib/                              # 19 módulos de lógica de negocio
│   ├── hooks/                            # Custom hooks (useContenedores)
│   └── types/schema.ts                   # Modelo tipado de datos
├── supabase/migrations/                  # 36 migraciones SQL idempotentes
├── scripts/                              # Generador de informes y seed de admin
├── docs/screenshots/                     # Capturas de pantalla del sistema
├── PLAN_PROYECTO.md                      # Plan de trabajo y sprints
├── INFORME_PROYECTO.md                   # Informe académico formal
├── BITACORA.md                           # Bitácora generada automáticamente
└── README.md                             # Este archivo
```

---

## Requisitos previos

* **Node.js 20+** y npm.
* Proyecto en **Supabase** (PostgreSQL) con las migraciones aplicadas.
* (Opcional) Instancia de **n8n** para automatizaciones externas.
* (Opcional) API Key de **Google Gemini** para alertas predictivas.

---

## Configuración e Instalación

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/anastasiagarcs-afk/ecoroute-ai.git
cd ecoroute-ai
npm install
```

### 2. Crear el archivo `.env.local` con las variables de entorno

```env
# Supabase (obligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Google Gemini IA (opcional - para alertas predictivas)
NEXT_PUBLIC_GEMINI_API_KEY=tu-gemini-api-key

# n8n Webhooks (opcional - para integración bidireccional)
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://tu-instancia-n8n/webhook/ecoroute-registro
N8N_WEBHOOK_SECRET=tu-secreto-webhook-para-n8n
```

### 3. Aplicar las migraciones de Supabase

Ejecuta en el **SQL Editor** de tu proyecto Supabase, en orden numérico, las migraciones de `supabase/migrations/`. Esto crea las 8 tablas, los enums de PostgreSQL, las 61 políticas RLS y las funciones RPC.

### 4. (Opcional) Sembrar usuario Admin inicial

```bash
npx tsx scripts/seed-admin.ts
```

Crea las credenciales `admin@ecoroute.com` / `Admin123456!` en Supabase Auth y la tabla Usuarios.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
# Abrir http://localhost:3000
```

> **Modo de respaldo local:** La aplicación funciona sin Supabase configurado; en ese caso, los contenedores demo se cargan desde `CONTENEDORES_FALLBACK` y el historial desde `localStorage`.

---

## Accesos Demo (Evaluación de Roles)

Para evaluar las funcionalidades restringidas por políticas RLS y permisos del sistema, se pueden utilizar las siguientes modalidades de acceso:

| Rol | Credencial / Ruta | Permisos Destacados |
| --- | --- | --- |
| **Admin** | `admin@ecoroute.com` / `Admin123456!` | Gestión de usuarios, solicitudes de rol, reportes globales y resolución de alertas. |
| **Gerente** | Registro en `/acceso` o asignado vía Admin | Acceso a `/anomalias`, simulador IoT, IA predictiva y reportes gerenciales. |
| **Operador** | Asignado vía Panel Admin | Ejecución de rutas asignadas, panel dinámico OSRM y cierre de jornada. |
| **Ciudadano** | Acceso público sin autenticación | Módulo EcoCiudadano en `/separacion`, guías de reciclaje y recompensas. |

---

## Endpoints de la API

| Ruta | Método | Descripción |
| --- | --- | --- |
| `/api/simular-sensores` | `POST` | Genera lecturas sintéticas para todos los contenedores (95% activos, 5% sin señal). Requiere `SUPABASE_SERVICE_ROLE_KEY`. |
| `/api/webhooks/n8n` | `POST` | Recepción de alertas externas desde n8n. Requiere header `X-Webhook-Secret`. |

---

## Scripts Disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `npm run build` | Compila la aplicación para producción. |
| `npm run start` | Inicia el servidor optimizado de producción. |
| `npm run lint` | Ejecuta el análisis estático de código con ESLint. |
| `npm run informe` | Inspecciona el repositorio y regenera automáticamente `BITACORA.md`. |

### Validaciones de calidad

```bash
npx tsc --noEmit   # Verificación estática de tipos TypeScript (0 errores)
npm run lint       # Análisis estático de ESLint (0 errores / 0 advertencias)
npm run build      # Compilación de producción Next.js / Turbopack
npm run informe    # Sincronización automática de métricas en BITACORA.md
```

---

## Estado de los Sprints

| Sprint | Alcance | Estado |
| --- | --- | --- |
| **1** | Base de datos, mapas y monitoreo de contenedores | ✅ Completado |
| **2** | Optimización de rutas (OSRM), historial y persistencia | ✅ Completado |
| **3** | Separación en la fuente, reciclaje, gamificación y dashboard gerencial | ✅ Completado |
| **4** | Analítica, IA predictiva (Gemini), reportes y notificaciones | ✅ Completado |
| **5** | Roles, solicitudes de acceso y cierre de jornada del operador | ✅ Completado |
| **6** | Detección de anomalías, simulador IoT y Supabase Realtime | ✅ Completado |
| **7** | Rediseño EcoCiudadano, documentación y auditoría del repositorio | ✅ Completado |

Consulta `PLAN_PROYECTO.md` e `INFORME_PROYECTO.md` para ver la especificación detallada de requerimientos (RF/RNF), historias de usuario y diagramas de arquitectura.

---

## Capturas de Pantalla

Las evidencias gráficas del sistema (mapa de monitoreo, optimizador de rutas vehicular, módulo EcoCiudadano y panel de anomalías) están disponibles en la carpeta `docs/screenshots/`.

---

## Documentación complementaria

| Archivo | Propósito |
| --- | --- |
| `PLAN_PROYECTO.md` | Plan de trabajo: fases, HU-01 a HU-15, cronograma y sprints. |
| `INFORME_PROYECTO.md` | Informe académico formal: RF, RNF, HUs, diagramas Mermaid, arquitectura, UI/UX. |
| `BITACORA.md` | Bitácora auto-generada mediante `npm run informe`. |
| `CHANGELOG.md` | Historial de cambios por versión. |
| `AGENTS.md` | Instrucciones para agentes AI (Next.js 16 rules + informe). |
| `.clinerules` | Reglas de arquitectura para asistentes AI (stack obligatorio, modularidad). |
| `docs/screenshots/` | Capturas de pantalla del sistema. |

---

## Licencia y Créditos

Proyecto desarrollado bajo un marco estrictamente académico. Sin licencia de uso comercial.

* **Institución:** Universidad Nacional Experimental de Guayana (UNEG)
* **Lapso Académico:** CIVA 2026
* **Asignaturas:** Técnicas de Programación III / Ingeniería de Software I
* **Autora:** Fabiola García (C.I.: 28.694.007)
* **Docente:** Ing. Dubraska Roca
* **Repositorio:** https://github.com/anastasiagarcs-afk/ecoroute-ai
