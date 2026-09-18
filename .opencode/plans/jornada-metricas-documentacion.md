# Plan: Ajuste de Métricas de Jornada, Cierre de Turno y Documentación

## Resumen Ejecutivo
Implementar la lógica de métricas de jornada con diferenciación entre cierre parcial y final, mantener el tiempo activo tras cierres parciales, y actualizar la documentación/casos de uso para el módulo de Operador.

---

## 1. Análisis del Estado Actual

### 1.1 Código Existente
- **`jornadaService.ts`**: Calcula resumen de jornada pero no maneja `fecha_inicio` ni diferencia entre cierre parcial/final
- **`app/page.tsx`**: Maneja estado local de jornada pero no persiste `fecha_inicio`
- **`HistorialOperador.tsx`**: Muestra historial pero no diferencia tipo de cierre
- **`supabase/migrations/22_rpc_completar_ruta.sql`**: Ya implementada (bypass RLS)

### 1.2 Brechas Identificadas
1. No hay tracking de `fecha_inicio` de la jornada
2. No se diferencia entre cierre parcial y cierre final
3. Los contadores se reinician completamente al cerrar (deberían mantener tiempo activo)
4. Documentación no refleja los casos de uso del Operador
5. Matriz de seguimiento no actualizada con el estado real

---

## 2. Implementación Técnica

### 2.1 Ajustes en `src/lib/jornadaService.ts`

#### 2.1.1 Agregar campo `fecha_inicio` a `ResumenJornada`
```typescript
export interface ResumenJornada {
  fecha_inicio: string;  // NUEVO: cuándo inició la jornada
  fecha: string;  // fecha del cierre
  rutasEjecutadas: number;
  rutasEnProceso: number;
  kmTotales: number;
  contenedoresVaciados: number;
  tiempoTotalMinutos: number;
  combustibleEstimadoLitros: number;
  rutas: DetalleRutaJornada[];
  tipo_cierre: 'parcial' | 'final';  // NUEVO
}
```

#### 2.1.2 Modificar `calcularResumenJornada`
- Recibir `fecha_inicio` como parámetro
- Calcular `tiempoTotalMinutos` desde `fecha_inicio` hasta ahora
- Determinar `tipo_cierre` basado en `rutasEnProceso`:
  - Si `rutasEnProceso > 0` → `tipo_cierre: 'parcial'`
  - Si `rutasEnProceso === 0` → `tipo_cierre: 'final'`

#### 2.1.3 Modificar `cerrarJornada`
- Persistir `fecha_inicio` en `observaciones` JSON
- Persistir `tipo_cierre` en `observaciones` JSON
- No marcar rutas como `finalizada_incompleta` si es cierre parcial (solo si es final)

#### 2.1.4 Agregar función `acumularMetricasDiarias`
```typescript
export async function acumularMetricasDiarias(
  operadorId: string,
  fechaInicio: string
): Promise<ResumenJornadaGuardado[]> {
  // Obtener todos los cierres del día
  // Sumar métricas acumuladas
  // Retornar consolidado diario
}
```

### 2.2 Ajustes en `app/page.tsx`

#### 2.2.1 Agregar estado `fechaInicioJornada`
```typescript
const [fechaInicioJornada, setFechaInicioJornada] = useState<string>(
  () => localStorage.getItem('ecoroute:jornada:inicio') ?? new Date().toISOString()
);
```

#### 2.2.2 Modificar `handleCerrarJornada`
- Pasar `fechaInicioJornada` a `calcularResumenJornada`
- Determinar tipo de cierre basado en `rutasEnProceso`

#### 2.2.3 Modificar `handleConfirmarCierre`
- Si es cierre parcial: mantener `fechaInicioJornada`, reiniciar solo contadores operativos
- Si es cierre final: reiniciar todo incluyendo `fechaInicioJornada`
- Persistir `fechaInicioJornada` en localStorage

#### 2.2.4 Agregar efecto para inicializar `fechaInicioJornada`
```typescript
useEffect(() => {
  if (sesion?.usuario?.id) {
    const inicio = localStorage.getItem('ecoroute:jornada:inicio');
    if (!inicio) {
      const nuevoInicio = new Date().toISOString();
      localStorage.setItem('ecoroute:jornada:inicio', nuevoInicio);
      setFechaInicioJornada(nuevoInicio);
    } else {
      setFechaInicioJornada(inicio);
    }
  }
}, [sesion]);
```

### 2.3 Ajustes en `src/components/HistorialOperador.tsx`

#### 2.3.1 Diferenciar tipo de cierre en la UI
- Mostrar badge "Cierre Parcial" o "Cierre Final" según `tipo_cierre`
- Si es cierre final, mostrar métricas acumuladas del día
- Calcular tiempo total transcurrido desde `fecha_inicio`

#### 2.3.2 Agregar función de consolidación diaria
```typescript
function calcularConsolidadoDiario(
  cierres: ResumenJornadaGuardado[],
  fecha: string
): { kmTotales: number; rutasEjecutadas: number; tiempoTotal: string } {
  // Filtrar cierres de la misma fecha
  // Sumar métricas
  // Retornar consolidado
}
```

### 2.4 Crear Migración SQL (Opcional)

Si se necesita persistir `fecha_inicio` en la base de datos:

```sql
-- supabase/migrations/23_jornada_fecha_inicio.sql
ALTER TABLE "HistorialRutas"
ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMP;

-- Actualizar observaciones para incluir tipo_cierre
-- (No se requiere cambio de schema, se guarda en JSON)
```

---

## 3. Actualización de Documentación

### 3.1 Casos de Uso del Operador (INFORME_PROYECTO.md)

Agregar en sección **e. Diagramas de Casos de Uso**:

#### CU-OP-01: Gestión de Tiempo y Continuidad de Jornada
- **Actor**: Operador
- **Precondición**: Operador autenticado
- **Flujo principal**:
  1. Operador inicia sesión → sistema registra `fecha_inicio`
  2. Operador completa rutas → contadores se actualizan en tiempo real
  3. Operador cierra jornada parcialmente → sistema mantiene `fecha_inicio`
  4. Operador continúa trabajando → tiempo activo se mantiene
  5. Operador cierra jornada final → sistema consolida métricas diarias
- **Postcondición**: Métricas persistidas en Supabase

#### CU-OP-02: Cierre Parcial vs. Cierre Final Consolidado
- **Actor**: Operador
- **Precondición**: Al menos una ruta completada
- **Flujo alternativo A (Cierre Parcial)**:
  1. Operador presiona "Cerrar Jornada"
  2. Sistema detecta rutas `en_progreso`
  3. Sistema etiqueta como "Cierre Parcial / Intermedio"
  4. Sistema persiste métricas parciales
  5. Sistema mantiene `fecha_inicio` para consolidación posterior
- **Flujo alternativo B (Cierre Final)**:
  1. Operador presiona "Cerrar Jornada"
  2. Sistema detecta 0 rutas `en_progreso`
  3. Sistema etiqueta como "Cierre Final Diario"
  4. Sistema consolida métricas de todos los cierres del día
  5. Sistema reinicia `fecha_inicio` para próxima jornada

#### CU-OP-03: Finalización de Ruta sin Bloqueos
- **Actor**: Operador
- **Precondición**: Ruta asignada con contenedores
- **Flujo principal**:
  1. Operador presiona "Ruta Completada"
  2. Sistema invoca RPC `completar_ruta` (bypass RLS)
  3. Sistema actualiza estado a `completada` en Supabase
  4. Sistema actualiza contadores locales inmediatamente
  5. Sistema elimina ruta de "En Progreso"
  6. Sistema limpia panel superior
- **Flujo alternativo**: Si contenedores ya están vacíos, sistema continúa sin error

#### CU-OP-04: Consulta de Historial Unificado sin Mapa
- **Actor**: Operador
- **Precondición**: Al menos una jornada cerrada
- **Flujo principal**:
  1. Operador cambia a pestaña "Mi Historial"
  2. Sistema oculta mapa principal
  3. Sistema muestra lista de jornadas cerradas
  4. Sistema diferencia entre "Cierre Parcial" y "Cierre Final"
  5. Sistema muestra métricas consolidadas para cierres finales
  6. Operador puede expandir cada jornada para ver detalle

### 3.2 Matriz de Seguimiento / Trazabilidad (INFORME_PROYECTO.md)

Actualizar sección **b.1 Requerimientos Funcionales**:

| ID | Requerimiento | HU | Estado | Evidencia |
|----|---------------|----| -------|-----------|
| RF-28 | Cerrar jornada con detalle de rutas ejecutadas | HU-14 | **Implementado** | `jornadaService.ts:cerrarJornada`; `app/page.tsx:handleConfirmarCierre` |
| RF-29 | Diferenciar cierre parcial vs. final | HU-14 | **Implementado** | `jornadaService.ts:calcularResumenJornada` (campo `tipo_cierre`) |
| RF-30 | Mantener tiempo activo tras cierre parcial | HU-14 | **Implementado** | `app/page.tsx:fechaInicioJornada` (localStorage) |
| RF-31 | Consolidar métricas diarias en cierre final | HU-14 | **Implementado** | `HistorialOperador.tsx:calcularConsolidadoDiario` |
| RF-32 | Completar ruta sin bloqueos RLS | HU-14 | **Implementado** | `operadoresService.ts:marcarRutaCompletada` (RPC `completar_ruta`) |

### 3.3 Actualizar README.md

Agregar en sección **Funcionalidades actuales**:

- **Gestión de jornada del operador**: cierre parcial (mantiene tiempo activo) y cierre final (consolida métricas diarias), con diferenciación en historial.

### 3.4 Actualizar CHANGELOG.md (si existe)

Si no existe, crear con formato:

```markdown
# Changelog

## [Unreleased] - 2026-09-17

### Added
- RPC `completar_ruta` para bypass RLS seguro (migración 22)
- Diferenciación entre cierre parcial y cierre final de jornada
- Tracking de `fecha_inicio` de jornada con persistencia en localStorage
- Consolidación de métricas diarias en cierre final

### Fixed
- Bloqueo de RLS al completar rutas con contenedores vaciados
- Reinicio incorrecto de tiempo activo tras cierre parcial
```

---

## 4. Plan de Implementación Paso a Paso

### Fase 1: Ajustes de Código (Prioridad Alta)
1. **Modificar `jornadaService.ts`**:
   - Agregar `fecha_inicio` y `tipo_cierre` a `ResumenJornada`
   - Modificar `calcularResumenJornada` para recibir `fecha_inicio`
   - Modificar `cerrarJornada` para persistir `tipo_cierre`
   - Agregar función `acumularMetricasDiarias`

2. **Modificar `app/page.tsx`**:
   - Agregar estado `fechaInicioJornada` con persistencia en localStorage
   - Modificar `handleCerrarJornada` para pasar `fechaInicioJornada`
   - Modificar `handleConfirmarCierre` para diferenciar tipo de cierre
   - Agregar efecto para inicializar `fechaInicioJornada`

3. **Modificar `HistorialOperador.tsx`**:
   - Diferenciar tipo de cierre en la UI (badges)
   - Agregar función `calcularConsolidadoDiario`
   - Mostrar métricas consolidadas para cierres finales

### Fase 2: Verificación Técnica (Prioridad Alta)
4. **Ejecutar validaciones**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

### Fase 3: Actualización de Documentación (Prioridad Media)
5. **Actualizar `INFORME_PROYECTO.md`**:
   - Agregar casos de uso CU-OP-01 a CU-OP-04
   - Actualizar matriz de seguimiento con RF-28 a RF-32

6. **Actualizar `README.md`**:
   - Agregar funcionalidad de gestión de jornada

7. **Crear/Actualizar `CHANGELOG.md`**:
   - Documentar cambios recientes

### Fase 4: Verificación Final (Prioridad Alta)
8. **Ejecutar `npm run informe`** para regenerar bitácora
9. **Revisar diff** para confirmar cambios esperados
10. **Verificar que no hay commits automáticos** (regla estricta de Git)

---

## 5. Criterios de Aceptación

### 5.1 Funcionalidad
- [ ] `fecha_inicio` se registra al iniciar sesión
- [ ] Cierre parcial mantiene `fecha_inicio` y reinicia solo contadores operativos
- [ ] Cierre final reinicia todo y consolida métricas diarias
- [ ] Historial diferencia entre "Cierre Parcial" y "Cierre Final"
- [ ] RPC `completar_ruta` funciona sin bloqueos RLS
- [ ] Contadores se actualizan inmediatamente al completar ruta

### 5.2 Documentación
- [ ] Casos de uso CU-OP-01 a CU-OP-04 documentados
- [ ] Matriz de seguimiento actualizada con RF-28 a RF-32
- [ ] README.md actualizado
- [ ] CHANGELOG.md creado/actualizado

### 5.3 Calidad de Código
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm run lint` → 0 errores
- [ ] `npm run build` → éxito
- [ ] No hay commits automáticos (regla estricta)

---

## 6. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Pérdida de `fecha_inicio` al limpiar localStorage | Medio | Baja | Agregar fallback a `new Date().toISOString()` |
| Conflicto entre múltiples sesiones del mismo operador | Bajo | Baja | Usar `session.usuario.id` como clave en localStorage |
| Error en cálculo de tiempo total | Medio | Media | Validar con pruebas manuales de escenarios |
| Documentación desactualizada | Bajo | Alta | Regenerar con `npm run informe` después de cambios |

---

## 7. Archivos a Modificar

### Código
- `src/lib/jornadaService.ts`
- `app/page.tsx`
- `src/components/HistorialOperador.tsx`

### Documentación
- `INFORME_PROYECTO.md`
- `README.md`
- `CHANGELOG.md` (crear si no existe)

### Base de Datos (Opcional)
- `supabase/migrations/23_jornada_fecha_inicio.sql` (si se requiere persistir `fecha_inicio`)

---

## 8. Estimación de Tiempo

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 1: Ajustes de código | 45 minutos |
| Fase 2: Verificación técnica | 10 minutos |
| Fase 3: Documentación | 30 minutos |
| Fase 4: Verificación final | 10 minutos |
| **Total** | **~95 minutos** |

---

## 9. Próximos Pasos

1. **Confirmar plan con el usuario**
2. **Implementar Fase 1** (ajustes de código)
3. **Ejecutar Fase 2** (verificación técnica)
4. **Implementar Fase 3** (documentación)
5. **Ejecutar Fase 4** (verificación final)
6. **Entregar resumen de cambios** (sin commits)

---

**¿Procedo con la implementación?**
