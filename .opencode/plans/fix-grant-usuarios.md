# Plan: Corregir Error 42501 - Solo GRANTs

## Diagnóstico
- La política `"Usuarios insert all"` **ya existe** en la BD
- Pero el INSERT sigue fallando con error 42501
- **Causa**: Faltan permisos GRANT para los roles `anon` y `authenticated`

## Solución
Ejecutar **únicamente** los GRANTs en Supabase SQL Editor:

```sql
-- Dar permisos explícitos a los roles de Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- Verificar permisos concedidos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'Usuarios' AND table_schema = 'public';
```

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/26_fix_usuarios_insert_policy.sql` | Actualizar: solo GRANTs (la política ya existe) |

## Verificación
1. Ejecutar SQL en Supabase
2. `npx tsc --noEmit` → 0 errores
3. Recargar página - el error 42501 debe desaparecer
