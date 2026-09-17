# Plan: Fix Route Completion Persistence Issue

## Problem Analysis
Routes are not persisting as "completada" in Supabase after clicking "Ruta Completada". The route remains in "En Progreso" and doesn't appear in "Mi Historial".

## Root Cause
The `marcarRutaCompletada` function in `operadoresService.ts` performs an UPDATE query but doesn't verify if the update actually affected any rows. Possible issues:
1. RLS policies might be blocking the update
2. The WHERE clause might not match any rows (route already completed or ID mismatch)
3. The function throws an error on failure, but the frontend might not be handling it correctly
4. No verification that the update was successful

## Solution

### 1. Improve `marcarRutaCompletada` in `src/lib/operadoresService.ts`
**Changes:**
- Add `.select()` to the update query to verify the update
- Check if any rows were actually updated
- Return a boolean or the updated route to indicate success
- Don't throw an error if the route is already "completada" (idempotent)
- Add better error logging

**Before:**
```typescript
export async function marcarRutaCompletada(rutaId: string): Promise<void> {
  if (!estaSupabaseConfigurado()) {
    throw new Error("Supabase no está configurado");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("Rutas")
    .update({
      estado: "completada" as EstadoRuta,
      ultima_ejecucion: new Date().toISOString(),
    } as UpdateRuta)
    .eq("id", rutaId);

  if (error) {
    console.error("Error al marcar ruta completada:", JSON.stringify(error, null, 2));
    if (error?.code && error?.code === 42501) {
      console.error("⚠️ Error RLS detectado...");
    }
    throw new Error("No se pudo marcar la ruta como completada");
  }
}
```

**After:**
```typescript
export async function marcarRutaCompletada(rutaId: string): Promise<boolean> {
  if (!estaSupabaseConfigurado()) {
    console.warn("[EcoRoute] Supabase no está configurado");
    return false;
  }

  const supabase = getSupabaseClient();
  
  // First, check if route exists and get current state
  const { data: rutaActual, error: selectError } = await supabase
    .from("Rutas")
    .select("id, estado")
    .eq("id", rutaId)
    .maybeSingle();

  if (selectError) {
    console.error("[EcoRoute] Error al consultar ruta:", JSON.stringify(selectError, null, 2));
    return false;
  }

  if (!rutaActual) {
    console.warn("[EcoRoute] Ruta no encontrada:", rutaId);
    return false;
  }

  // If already completed, return success (idempotent)
  if (rutaActual.estado === "completada") {
    console.log("[EcoRoute] Ruta ya está completada:", rutaId);
    return true;
  }

  // Perform the update with select to verify
  const { data: rutaActualizada, error: updateError } = await supabase
    .from("Rutas")
    .update({
      estado: "completada" as EstadoRuta,
      ultima_ejecucion: new Date().toISOString(),
    } as UpdateRuta)
    .eq("id", rutaId)
    .select("id, estado")
    .maybeSingle();

  if (updateError) {
    console.error("[EcoRoute] Error al marcar ruta completada:", JSON.stringify(updateError, null, 2));
    if (updateError?.code === 42501) {
      console.error("⚠️ Error RLS: Políticas de seguridad denegaron la actualización");
    }
    return false;
  }

  if (!rutaActualizada) {
    console.error("[EcoRoute] No se pudo actualizar la ruta:", rutaId);
    return false;
  }

  console.log("[EcoRoute] Ruta completada exitosamente:", rutaId);
  return true;
}
```

### 2. Update `PanelRutaOperador.tsx` to handle the boolean response
**Changes:**
- Check the return value of `marcarRutaCompletada`
- Only call `onRutaCompletada` if the update was successful
- Show appropriate error message if it failed

**Before:**
```typescript
await marcarRutaCompletada(ruta.id);
onRutaCompletada?.();
```

**After:**
```typescript
const exito = await marcarRutaCompletada(ruta.id);
if (exito) {
  onRutaCompletada?.();
} else {
  setError("No se pudo completar la ruta. Verifica tu conexión o permisos.");
}
```

### 3. Verify `obtenerRutasActivasOperador` filters correctly
**Current implementation:**
```typescript
.in("estado", ["aceptada", "en_progreso"])
```

This should already exclude "completada" routes. No changes needed.

### 4. Verify `obtenerHistorialOperador` includes "completada"
**Current implementation:**
```typescript
.in("estado", ["completada", "finalizada_incompleta", "cancelada", "rechazada"])
```

This already includes "completada". No changes needed.

### 5. Add debugging/logging
**In `app/page.tsx`:**
- Add console.log in `onRutaCompletada` callback to track when it's called
- Add console.log in `cargarRutasOperador` to see what routes are being loaded

## Files to Modify
1. `src/lib/operadoresService.ts` - Improve `marcarRutaCompletada`
2. `src/components/PanelRutaOperador.tsx` - Handle boolean response
3. `app/page.tsx` - Add debugging logs (optional)

## Verification Steps
1. Run `npx tsc --noEmit` to ensure 0 TypeScript errors
2. Test the flow:
   - Click "Ruta Completada" on a route with containers already empty
   - Verify the route disappears from "En Progreso"
   - Switch to "Mi Historial" and verify the route appears there
   - Check browser console for success/error messages
3. Check Supabase dashboard to verify the route's `estado` is "completada"

## Expected Behavior
- Routes complete successfully even if containers are already empty
- Completed routes disappear from "En Progreso" immediately
- Completed routes appear in "Mi Historial"
- Clear error messages if completion fails
- Idempotent operation (completing an already-completed route succeeds)
