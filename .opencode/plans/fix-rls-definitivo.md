# Plan: Corrección DEFINITIVA de RLS en Usuarios

## Diagnóstico

| Problema | Causa |
|----------|-------|
| INSERT falla con Admin logueado | La política `Usuarios insert demo` solo aplica a `anon`, pero el request va como `authenticated` |
| `Usuarios insert all` no existe | Nunca fue creada en ninguna migración |
| GRANTs podrían faltar | Migración 26 solo tiene GRANTs pero quizás no se ejecutó |

## Flujo del error:
1. Admin se loguea → sesión en cookies → cliente usa rol `authenticated`
2. Navega a `/separacion` → `cargarOCrearUsuario()` intenta INSERT
3. `Usuarios insert demo` solo aplica a `anon` → **42501**
4. `Usuarios insert all` no existe → **42501**

## Solución: SQL Único Definitivo

Ejecutar en Supabase SQL Editor:

```sql
-- 1. GRANTs (permisos de tabla)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 2. Limpiar políticas INSERT conflictivas
DROP POLICY IF EXISTS "Usuarios insert para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert demo" ON public."Usuarios";

-- 3. Crear UNA política INSERT que cubra TODOS los roles
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);

-- 4. Verificar resultado
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'Usuarios' AND schemaname = 'public';
```

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/26_fix_usuarios_insert_policy.sql` | Actualizar con SQL definitivo |
| `supabase/migrations/27_usuarios_insert_demo.sql` | Eliminar (redundante) |

## Verificación
1. Ejecutar SQL en Supabase
2. `npx tsc --noEmit` → 0 errores
3. Recargar página - error debe desaparecer
