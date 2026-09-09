# Plan de Trabajo - Proyecto "EcoRoute AI"
## Sistema Web de Optimización Dinámica de Rutas para la Recolección Eficiente de Residuos Sólidos Municipales

**Institución:** Universidad Nacional Experimental De Guayana (UNEG)  
**Asignatura:** Técnicas de Programación III / Ingeniería de Software I  
**Sección / Lapso:** Sección 1 - Lapso CIVA 2026  
**Autor:** Fabiola García (C.I.: 28.694.007)  
**Profesora:** Ing. Dubraska Roca  

---

### 1. Definición del Problema
#### Contexto General
En el sector de gestión de desechos sólidos (recolección municipal, tratamiento industrial, reciclaje y disposición final), los problemas se concentran en:
- **Falta de visibilidad en tiempo real:** No se cuenta con información actualizada sobre el estado de los contenedores, rutas y flota.
- **Rutas ineficientes:** Camiones compactadores realizan recorridos preprogramados sin importar si los contenedores están vacíos o desbordados, generando gasto innecesario de combustible y desgaste de flota.
- **Baja tasa de separación en la fuente:** Los ciudadanos no cuentan con información clara ni incentivos para clasificar correctamente sus residuos.
- **Costos operativos elevados:** Combustible, desgaste de flota y tiempos muertos generan gastos innecesarios.

#### Objetivo del Proyecto
Desarrollar una aplicación web/móvil que optimice la gestión de rutas de recolección de residuos, reduzca costos operativos y mejore la eficiencia mediante el uso de tecnologías modernas e inteligencia artificial.

---

### 2. Metodología Ágil: SCRUM
Adaptada a **4 Sprints semanales** (1 al 25 de septiembre de 2026):
- **Product Owner / Scrum Master / Equipo Dev:** Fabiola García (Ingeniería de Software full-stack, frontend, backend, QA).
- **Ceremonias:**
  - **Sprint Planning:** Lunes al inicio del Sprint.
  - **Daily Stand-up:** Reunión diaria de 15 minutos.
  - **Sprint Review & Retrospective:** Viernes al final del Sprint.

---

### 3. Requerimientos e Historias de Usuario (HU-01 a HU-15)

| ID | Épica / Módulo | Rol | Descripción | Criterios de Aceptación |
|---|---|---|---|---|
| **HU-01** | Gestión de Contenedores | Administrador | Registrar, modificar y eliminar contenedores en el sistema. | CRUD completo; validación GPS; actualización en mapa en tiempo real. |
| **HU-02** | Visualización en Mapa | Operador | Visualizar en un mapa interactivo todos los contenedores con su nivel de llenado. | Marcadores por color (<50% verde, 50-80% amarillo, >80% rojo); actualización cada 5 min. |
| **HU-03** | Consulta de Contenedores | Operador | Consultar el nivel de llenado actual de un contenedor específico. | Popup con ID, ubicación, tipo de residuo, nivel (%) y última lectura. |
| **HU-04** | Optimización de Rutas | Administrador | Generar una ruta óptima basada en los contenedores con mayor nivel de llenado. | Algoritmo TSP heurístico; prioriza llenado >80%; muestra distancia total y tiempo. |
| **HU-05** | Visualización de Rutas | Operador | Visualizar la ruta generada en el mapa para seguir el recorrido asignado. | Polilínea sobre mapa; resalta contenedor actual y siguiente. |
| **HU-06** | Alertas de Llenado | Administrador | Recibir alerta visual cuando un contenedor supere el 80% de su capacidad. | Lista de críticos en dashboard; notificación emergente; opción "atendido". |
| **HU-07** | Guías de Separación | Ciudadano | Consultar guías visuales de separación de residuos por material. | Contenido estático visual; acceso público sin login. |
| **HU-08** | Registro de Reciclaje | Ciudadano | Registrar reciclajes exitosos y acumular puntos de recompensa. | Formulario por kg; sumatoria automática de puntos; historial visible. |
| **HU-09** | Dashboard Gerencial | Gerente | Visualizar dashboard con indicadores clave (contenedores, promedio, rutas, toneladas). | Gráficos y tarjetas en tiempo real; filtros por zona y fechas. |
| **HU-10** | Reportes Exportables | Gerente | Generar reportes automáticos exportables (Excel/PDF) del historial de rutas. | Exportación con filtros por fecha y zona; formato profesional. |
| **HU-11** | Alertas Predictivas (IA) | Gerente | Recibir alertas predictivas (IA) sobre contenedores que alcanzaran capacidad máxima. | Integración con Gemini API; alerta si la probabilidad >85% en <4 horas. |
| **HU-12** | Gestión de Roles | Administrador | Gestionar roles y permisos (Admin, Operador, Ciudadano). | Supabase Auth + RLS; asignación exclusiva por Admin. |
| **HU-13** | Solicitud de Acceso | Operador | Registrarse y solicitar acceso al sistema para aprobación. | Formulario con datos; notificación al Admin; estado (pendiente/aprobado/rechazado). |
| **HU-14** | Cierre de Jornada | Operador | Registrar el cierre de jornada con el detalle de rutas ejecutadas. | Botón "Cerrar Jornada" que consolida km, rutas, combustible y contenedores atendidos. |
| **HU-15** | Detección de Anomalías | Gerente | Comparar nivel real vs. esperado para detectar sensores descalibrados. | Cálculo de desviaciones estadísticas; alerta por datos anómalos (>7 días constante). |

---

### 4. Tecnologías Especificadas

- **Frontend:** Next.js (App Router), Tailwind CSS, Leaflet/Mapbox
- **Backend:** Next.js API Routes + Supabase (PostgreSQL + Auth + Storage)
- **Base de Datos:** PostgreSQL (vía Supabase con Row Level Security)
- **IA / Optimización:** Gemini API (alertas predictivas) + Algoritmo heurístico propio (TSP)
- **Automatización:** n8n
- **Despliegue & Repositorio:** Vercel & GitHub

---

### 5. Esquema de Base de Datos (PostgreSQL - Supabase)

- **Contenedores:** `id` (UUID), `ubicacion` (GEOGRAPHY), `capacidad` (INT), `nivel_llenado` (DECIMAL), `tipo_residuo` (ENUM), `estado` (ENUM), `ultima_lectura` (TIMESTAMP), `zona` (STRING), `numero_identificacion` (STRING).
- **LecturasSensores:** `id` (UUID), `contenedor_id` (FK), `nivel_llenado` (DECIMAL), `temperatura` (DECIMAL), `fecha_hora` (TIMESTAMP), `bateria` (DECIMAL).
- **Rutas:** `id` (UUID), `nombre` (STRING), `zona` (STRING), `contenedores_asignados` (UUID[]), `fecha_creacion` (TIMESTAMP), `ultima_ejecucion` (TIMESTAMP), `distancia_total` (DECIMAL), `tiempo_estimado` (INTERVAL).
- **Usuarios:** `id` (UUID), `nombre` (STRING), `email` (STRING), `rol` (ENUM: Admin, Operador, Ciudadano), `telefono` (STRING), `zona_asignada` (STRING), `puntos_reciclaje` (INT).
- **PuntosReciclaje:** `id` (UUID), `usuario_id` (FK), `fecha` (TIMESTAMP), `material` (ENUM), `cantidad` (DECIMAL), `puntos_ganados` (INT), `validado_por` (FK).
- **HistorialRutas:** `id` (UUID), `ruta_id` (FK), `fecha_ejecucion` (TIMESTAMP), `contenedores_recogidos` (UUID[]), `tiempo_real` (INTERVAL), `combustible_consumido` (DECIMAL), `observaciones` (TEXT).
- **Notificaciones:** `id` (UUID), `usuario_id` (FK), `tipo` (ENUM), `mensaje` (TEXT), `leida` (BOOLEAN), `fecha_envio` (TIMESTAMP), `enlace` (STRING).

---

### 6. Cronograma de Sprints (4 Semanas)

#### **Sprint 1 (1 - 7 de septiembre): Cimientos, Base de Datos y Gestión de Contenedores**
- Configurar repositorio GitHub y estructura del proyecto Next.js.
- Configurar Supabase (PostgreSQL + Auth) y diseñar modelo de datos.
- Crear API base con Next.js API Routes (CRUD contenedores).
- Desarrollar prototipo de mapa interactivo (Leaflet) con contenedores.
- *Demo Sprint 1.*

#### **Sprint 2 (8 - 14 de septiembre): Optimización, Rutas Inteligentes y Alertas**
- Implementar algoritmo de optimización de rutas (TSP heurístico).
- Integrar rutas generadas en el mapa y visualización en tiempo real.
- Implementar sistema de alertas (contenedores >80%) e historial de rutas ejecutadas.
- *Demo Sprint 2.*

#### **Sprint 3 (15 - 21 de septiembre): Ciudadano, Separación en la Fuente y Gamificación**
- Desarrollar guías de separación de residuos (UI + Contenido).
- Implementar registro de separación exitosa y sistema de puntos/recompensas.
- Desarrollar dashboard de indicadores clave (costos, toneladas, eficiencia).
- *Demo Sprint 3.*

#### **Sprint 4 (22 - 25 de septiembre): Analítica, IA Predictiva, Notificaciones y Entrega Final**
- Implementar reportes exportables (Excel/PDF) y alertas predictivas (Gemini API).
- Implementar notificaciones push, gestión de roles, solicitudes de acceso y cierre de jornada.
- Implementar algoritmo de detección de anomalías en sensores.
- Pruebas de integración, despliegue en Vercel y defensa técnica final.