# Plan: Corrección de Rutas Completadas en Cierre de Jornada

## Problema Identificado

### 1. Modal muestra "0 Completadas"
**Causa raíz:**
- `handleCerrarJornada` en `app/page.tsx` (línea 89-97) llama a `calcularResumenJornada` pasando solo `rutasActivasOperador`
- `rutasActivasOperador` solo contiene rutas con estado "aceptada" o "en_progreso" (ver `obtenerRutasActivasOperador` en `operadoresService.ts:185`)
- Las rutas completadas tienen estado "completada" y NO están en `rutasActivasOperador`
- Por lo tanto, `calcularResumenJornada` nunca ve las rutas completadas y las cuenta como 0

### 2. Duración total puede mostrar "00:00:00"
**Causa potencial:**
- `fechaInicioJornada` se inicializa desde localStorage o con `new Date().toISOString()`
- Si localStorage tiene un valor inválido o vacío, el cálculo del tiempo puede fallar
- Necesitamos verificar que el cálculo en `jornadaService.ts:102-104` funcione correctamente

### 3. Historial muestra "0 rutas"
**Causa:**
- Si `rutasEjecutadas` se guarda como 0 en `observaciones`, el historial mostrará 0
- Esto es consecuencia del problema #1

## Solución Propuesta

### Paso 1: Crear función para obtener todas las rutas de la jornada actual

**Archivo:** `src/lib/operadoresService.ts`

Crear nueva función `obtenerRutasJornadaActual`:
```typescript
export async function obtenerRutasJornadaActual(
  operadorId: string
): Promise<Ruta[]> {
  if (!estaSupabaseConfigurado()) return [];

  const supabase = getSupabaseClient();
  
  // Obtener todas las rutas del operador (activas + completadas de hoy)
  const { data, error } = await supabase
    .from("Rutas")
    .select("*")
    .eq("operador_asignado", operadorId)
    .in("estado", ["aceptada", "en_progreso", "completada", "finalizada_incompleta"])
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error al obtener rutas de la jornada:", error);
    return [];
  }

  // Filtrar solo las rutas de hoy
  const hoy = new Date();
  const rutasDeHoy = (data ?? []).filter((ruta) => {
    const fechaCreacion = new Date(ruta.fecha_creacion);
    return (
      fechaCreacion.getFullYear() === hoy.getFullYear() &&
      fechaCreacion.getMonth() === hoy.getMonth() &&
      fechaCreacion.getDate() === hoy.getDate()
    );
  });

  return rutasDeHoy as Ruta[];
}
```

### Paso 2: Modificar `handleCerrarJornada` para incluir rutas completadas

**Archivo:** `app/page.tsx`

Modificar `handleCerrarJornada` (línea 89-97):
```typescript
const handleCerrarJornada = useCallback(async () => {
  if (!sesion?.usuario?.id) return;
  
  // Obtener todas las rutas de la jornada actual (activas + completadas)
  const rutasJornada = await obtenerRutasJornadaActual(sesion.usuario.id);
  
  const resumen = calcularResumenJornada(
    rutasJornada,  // Ahora incluye rutas completadas
    contenedores,
    fechaInicioJornada
  );
  setResumenJornada(resumen);
  setCierreJornadaVisible(true);
}, [sesion, contenedores, fechaInicioJornada]);
```

### Paso 3: Agregar import de la nueva función

**Archivo:** `app/page.tsx`

Agregar en los imports (línea 17):
```typescript
import { 
  obtenerRutasActivasOperador, 
  marcarRutaEnProgreso,
  obtenerRutasJornadaActual  // NUEVO
} from "@/lib/operadoresService";
```

### Paso 4: Verificar inicialización de `fechaInicioJornada`

**Archivo:** `app/page.tsx`

Verificar que `fechaInicioJornada` se inicialice correctamente (línea 33):
```typescript
const [fechaInicioJornada, setFechaInicioJornada] = useState<string>(() => {
  if (typeof window === "undefined") return new Date().toISOString();
  const guardado = localStorage.getItem("ecoroute:jornada:inicio");
  return guardado || new Date().toISOString();
});
```

### Paso 5: Agregar logs de depuración

**Archivo:** `app/page.tsx`

Agregar logs en `handleCerrarJornada`:
```typescript
const handleCerrarJornada = useCallback(async () => {
  if (!sesion?.usuario?.id) return;
  
  const rutasJornada = await obtenerRutasJornadaActual(sesion.usuario.id);
  
  console.log("[EcoRoute] Rutas de la jornada:", rutasJornada.length);
  console.log("[EcoRoute] Estados:", rutasJornada.map(r => r.estado));
  console.log("[EcoRoute] Fecha inicio:", fechaInicioJornada);
  
  const resumen = calcularResumenJornada(
    rutasJornada,
    contenedores,
    fechaInicioJornada
  );
  
  console.log("[EcoRoute] Resumen calculado:", {
    rutasEjecutadas: resumen.rutasEjecutadas,
    rutasEnProceso: resumen.rutasEnProceso,
    tiempoTotalMinutos: resumen.tiempoTotalMinutos,
  });
  
  setResumenJornada(resumen);
  setCierreJornadaVisible(true);
}, [sesion, contenedores, fechaInicioJornada]);
```

### Paso 6: Verificar que `HistorialOperador.tsx` muestre correctamente los datos

**Archivo:** `src/components/HistorialOperador.tsx`

Verificar que las tarjetas lean `rutasEjecutadas` del objeto `jornada`:
- Línea 197: `{j.rutasEjecutadas} ruta{j.rutasEjecutadas !== 1 ? "s" : ""}`
- Línea 230: `{c.rutasEjecutadas} ruta{c.rutasEjecutadas !== 1 ? "s" : ""}`

Esto ya está correcto, solo necesitamos asegurarnos de que los datos se guarden correctamente.

## Archivos a Modificar

1. **`src/lib/operadoresService.ts`**
   - Agregar función `obtenerRutasJornadaActual`

2. **`app/page.tsx`**
   - Agregar import de `obtenerRutasJornadaActual`
   - Modificar `handleCerrarJornada` para usar la nueva función
   - Agregar logs de depuración
   - Verificar inicialización de `fechaInicioJornada`

3. **`src/components/CierreJornadaModal.tsx`**
   - No requiere cambios (ya muestra correctamente los datos del resumen)

4. **`src/components/HistorialOperador.tsx`**
   - No requiere cambios (ya muestra correctamente los datos guardados)

## Flujo de Datos Corregido

1. Usuario hace clic en "Cerrar Jornada del Día"
2. `handleCerrarJornada` se ejecuta:
   - Llama a `obtenerRutasJornadaActual(sesion.usuario.id)`
   - Esta función retorna TODAS las rutas de hoy (activas + completadas)
   - Pasa la lista completa a `calcularResumenJornada`
3. `calcularResumenJornada`:
   - Recibe rutas activas Y completadas
   - Cuenta correctamente `rutasEjecutadas` (completadas)
   - Cuenta correctamente `rutasEnProceso` (activas)
   - Calcula el tiempo transcurrido desde `fecha_inicio`
4. Modal muestra los datos correctos
5. Al confirmar, `cerrarJornada` guarda los datos correctos en Supabase
6. `HistorialOperador` muestra los datos guardados correctamente

## Verificación

Después de implementar los cambios:
1. Ejecutar `npx tsc --noEmit` para verificar 0 errores de TypeScript
2. Probar el flujo completo:
   - Completar 2-3 rutas
   - Abrir modal de cierre de jornada
   - Verificar que muestre "2 Completadas" o "3 Completadas"
   - Verificar que la duración total no sea "0 min"
   - Confirmar el cierre
   - Verificar en "Mi Historial" que se muestren las rutas completadas correctamente

## Consideraciones Adicionales

### Persistencia de `fecha_inicio`
- Ya se guarda en localStorage con clave `ecoroute:jornada:inicio`
- Se mantiene durante cierres parciales
- Se reinicia solo en cierres finales
- Esto es correcto y no requiere cambios

### Cálculo de tiempo
- El cálculo en `jornadaService.ts:102-104` es correcto
- Usa `Math.max(0, hoy.getTime() - inicio.getTime())` para evitar valores negativos
- Convierte milisegundos a minutos correctamente

### Compatibilidad con datos existentes
- Los cierres de jornada antiguos que no tengan `fecha_inicio` en `observaciones` mostrarán "Cierre: [fecha]" en lugar de "Inicio: [fecha] → Fin: [fecha]"
- Esto es manejado correctamente en `HistorialOperador.tsx:204-208`
