# Plan: Corrección Completa de RLS en Usuarios

## Problema
El INSERT en la tabla `Usuarios` sigue fallando con error 42501 aunque la política `"Usuarios insert all"` existe.

## Causas Identificadas

### 1. Faltan permisos GRANT
Las migraciones solo crean políticas RLS pero **nunca dan permisos** a los roles `anon` y `authenticated` sobre la tabla `Usuarios`. Sin GRANT, Supabase bloquea las operaciones aunque la política RLS lo permita.

### 2. `registrarCuenta` no asigna `id = auth.uid()`
En `authService.ts:103`, el INSERT no incluye `id: session.user.id`, lo que crea un UUID diferente al del usuario autenticado. Esto rompe la política `"Usuarios select own"` que verifica `id = auth.uid()`.

### 3. `adminService.ts` crea un cliente nuevo por cada función
Esto es ineficiente y puede causar problemas de timing.

## Plan de Corrección

### Paso 1: Crear migración 27 con GRANTs
**Archivo**: `supabase/migrations/27_grant_usuarios_permissions.sql`

```sql
-- Dar permisos explícitos a los roles de Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;
```

### Paso 2: Corregir `registrarCuenta` en authService.ts
**Línea 103**: Agregar `id: session.user.id` al INSERT

```typescript
const { error: insertError } = await supabase.from("Usuarios").insert({
  id: session.user.id,          // ← AGREGAR ESTA LÍNEA
  nombre: datos.nombre,
  email,
  rol: "Ciudadano",
  telefono: null,
  zona_asignada: null,
  puntos_reciclaje: 0,
});
```

### Paso 3: SQL para ejecutar manualmente en Supabase
El usuario debe ejecutar en SQL Editor:

```sql
-- 1. Dar permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 2. Verificar políticas activas
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'Usuarios' AND schemaname = 'public';
```

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/27_grant_usuarios_permissions.sql` | **NUEVO** - GRANTs para anon y authenticated |
| `src/lib/authService.ts` | Agregar `id: session.user.id` en `registrarCuenta` |

## Verificación
1. Ejecutar SQL en Supabase (GRANTs + SELECT de verificación)
2. `npx tsc --noEmit` → 0 errores
3. `npm run informe`
