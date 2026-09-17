# Plan: Unificar vista de historial — eliminar pestaña "Completadas"

## Objetivo
Eliminar la sub-pestaña "Completadas" del panel inferior del operador, dejando solo "En Progreso". Todo el historial se centraliza en la pestaña superior "Mi Historial".

## Estado actual
- `app/page.tsx` tiene un sistema de sub-tabs (`subTabOperador`) con "activas" y "completadas"
- `HistorialOperador.tsx` ya muestra rutas completadas, rechazadas, canceladas e incompletas
- `PanelRutaOperador.tsx` ya deselecciona la ruta al completar

## Cambios en `app/page.tsx`

### 1. Eliminar estados obsoletos (líneas 30, 32)
```diff
- const [subTabOperador, setSubTabOperador] = useState<"activas" | "completadas">("activas");
- const [rutasCompletadasOperador, setRutasCompletadasOperador] = useState<Ruta[]>([]);
```

### 2. Simplificar `cargarRutasOperador` (líneas 61-69)
```diff
  const cargarRutasOperador = useCallback(async () => {
    if (sesion?.rol !== "Operador" || !sesion.usuario?.id) return;
-   const [activas, completadas] = await Promise.all([
-     obtenerRutasActivasOperador(sesion.usuario.id),
-     obtenerHistorialOperador(sesion.usuario.id),
-   ]);
+   const activas = await obtenerRutasActivasOperador(sesion.usuario.id);
    setRutasActivasOperador(activas);
-   setRutasCompletadasOperador(completadas);
  }, [sesion]);
```

### 3. Actualizar `handleCerrarJornada` (líneas 83-88)
```diff
  const handleCerrarJornada = useCallback(() => {
-   const todasLasRutas = [...rutasActivasOperador, ...rutasCompletadasOperador];
-   const resumen = calcularResumenJornada(todasLasRutas, contenedores);
+   const resumen = calcularResumenJornada(rutasActivasOperador, contenedores);
    setResumenJornada(resumen);
    setCierreJornadaVisible(true);
- }, [rutasActivasOperador, rutasCompletadasOperador, contenedores]);
+ }, [rutasActivasOperador, contenedores]);
```

### 4. Limpiar import (línea 17)
```diff
- import { obtenerRutaActivaOperador, obtenerRutasActivasOperador, obtenerHistorialOperador, marcarRutaEnProgreso } from "@/lib/operadoresService";
+ import { obtenerRutasActivasOperador, marcarRutaEnProgreso } from "@/lib/operadoresService";
```

### 5. Simplificar `onRutaCompletada` (líneas 353-357)
```diff
  onRutaCompletada={() => {
    setRutaSeleccionadaId(null);
-   setSubTabOperador("completadas");
    cargarRutasOperador();
  }}
```

### 6. Eliminar sub-tabs y sección "Completadas" (líneas 367-459)

**ANTES** (estructura con sub-tabs):
```tsx
<div className="rounded-xl border ...">
  <div className="mb-3 flex gap-1 border-b ...">  ← SUB-TABS
    <button onClick={() => setSubTabOperador("activas")}>En Progreso</button>
    <button onClick={() => setSubTabOperador("completadas")}>Completadas</button>
  </div>
  {subTabOperador === "activas" ? (
    /* rutas activas */
  ) : (
    /* rutas completadas */
  )}
</div>
```

**DESPUÉS** (solo "En Progreso"):
```tsx
<div className="rounded-xl border ...">
  <h4 className="mb-3 text-xs font-semibold ...">En Progreso ({rutasActivasOperador.length})</h4>
  {rutasActivasOperador.length === 0 ? (
    <p>No tienes rutas activas...</p>
  ) : (
    <ul>...</ul>
  )}
</div>
```

## Archivos sin cambios
- `PanelRutaOperador.tsx` — Ya maneja correctamente `onRutaCompletada`
- `HistorialOperador.tsx` — Ya muestra rutas completadas, rechazadas, canceladas, incompletas

## Verificación
```bash
npx tsc --noEmit  # 0 errores
```

## Resultado esperado
- Panel inferior: solo "En Progreso" con lista de rutas activas
- Al completar ruta: se deselecciona, panel superior vuelve al Empty State, tarjeta desaparece del panel inferior
- Pestaña "Mi Historial": muestra todas las rutas terminadas con estado, fecha y detalles
