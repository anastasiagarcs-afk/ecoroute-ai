# Plan: Corregir Política RLS de INSERT en Usuarios

## Problema
La función `cargarOCrearUsuario` en `reciclajeService.ts` intenta crear un usuario demo cuando no existe, pero falla porque la política RLS actual solo permite INSERT a usuarios autenticados.

## Causa Raíz
- Migración 03: `Usuarios insert para anon` → permitía INSERT a **todos** (anon + authenticated)
- Migración 24: `Usuarios insert auth` → solo permite INSERT a **authenticated**
- La función `cargarOCrearUsuario` se ejecuta cuando el usuario es **anónimo**

## Solución

### Archivo a crear: `supabase/migrations/26_fix_usuarios_insert_policy.sql`

```sql
-- Corrección: Permitir INSERT a cualquier usuario (anon o authenticated)
-- Necesario para la función cargarOCrearUsuario que crea el usuario demo

-- Eliminar política restrictiva anterior
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";

-- Nueva política: permite INSERT a cualquier rol
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);
```

### Pasos de ejecución:
1. Crear archivo de migración
2. Ejecutar el SQL en Supabase SQL Editor
3. Ejecutar `npx tsc --noEmit` para verificar TypeScript

### Verificación:
- `npx tsc --noEmit` → 0 errores
- El usuario demo podrá crearse sin autenticación previa
