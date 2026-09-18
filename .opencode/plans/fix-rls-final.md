# Plan: Corrección Final de RLS y Auth

## Problemas Identificados

### 1. RLS 42501: INSERT como anon
- `cargarOCrearUsuario()` en `reciclajeService.ts:81` intenta INSERT sin sesión
- La política RLS solo permite INSERT a `authenticated`
- **Solución**: Crear política INSERT específica para el usuario demo

### 2. Failed to fetch: `email_confirm: true`
- `authService.ts:87,132` usa un parámetro de admin API
- **Solución**: Eliminar `email_confirm: true` de ambas funciones

## Plan de Corrección

### Paso 1: Crear migración 27 con política INSERT para demo
**Archivo**: `supabase/migrations/27_usuarios_insert_demo.sql`

```sql
-- Política INSERT para usuario demo (solo para ciudadano.demo@ecoroute.com)
CREATE POLICY "Usuarios insert demo"
  ON public."Usuarios" FOR INSERT TO anon
  WITH CHECK (email = 'ciudadano.demo@ecoroute.com');
```

### Paso 2: Eliminar `email_confirm: true` de authService.ts
**Archivo**: `src/lib/authService.ts`

Eliminar las líneas `// @ts-expect-error` y `email_confirm: true` en:
- `registrarCuenta()` (línea ~86-87)
- `registrarCuentaConSolicitud()` (línea ~131-132)

### Paso 3: SQL para ejecutar en Supabase
```sql
CREATE POLICY "Usuarios insert demo"
  ON public."Usuarios" FOR INSERT TO anon
  WITH CHECK (email = 'ciudadano.demo@ecoroute.com');
```

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/27_usuarios_insert_demo.sql` | **NUEVO** - Política INSERT para demo |
| `src/lib/authService.ts` | Eliminar `email_confirm: true` |

## Verificación
1. Ejecutar SQL en Supabase
2. `npx tsc --noEmit` → 0 errores
3. Recargar página - ambos errores deben desaparecer
