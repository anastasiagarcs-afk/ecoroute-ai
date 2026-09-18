# Plan: Corrección Completa de RLS, Auth y Cliente Supabase

## Resumen de Cambios

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `supabase/migrations/26_fix_usuarios_insert_policy.sql` | Actualizar con GRANTs + política INSERT |
| 2 | `src/lib/authService.ts` | Agregar `id: session.user.id` en `registrarCuenta` |
| 3 | `src/lib/adminService.ts` | Reemplazar `crearCliente()` por `getSupabaseClient()` |
| 4 | `INFORME_PROYECTO.md` | Documentar correcciones |

---

## 1. Migración RLS y Permisos

**Archivo**: `supabase/migrations/26_fix_usuarios_insert_policy.sql`

```sql
-- Migración 26: Corrección completa de RLS y permisos en Usuarios

-- 1. Eliminar políticas restrictivas anteriores
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";

-- 2. Política INSERT permisiva para cualquier rol
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);

-- 3. Permisos explícitos para roles de Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;
```

---

## 2. Corrección en Auth Service

**Archivo**: `src/lib/authService.ts`

**Función**: `registrarCuenta` (línea ~103)

**Cambio**: Agregar `id: session.user.id` al INSERT

```typescript
// ANTES (incorrecto - crea UUID diferente al auth):
const { error: insertError } = await supabase.from("Usuarios").insert({
  nombre: datos.nombre,
  email,
  rol: "Ciudadano",
  telefono: null,
  zona_asignada: null,
  puntos_reciclaje: 0,
});

// DESPUÉS (correcto - usa el mismo UUID que auth):
const { error: insertError } = await supabase.from("Usuarios").insert({
  id: session.user.id,           // ← AGREGAR ESTA LÍNEA
  nombre: datos.nombre,
  email,
  rol: "Ciudadano",
  telefono: null,
  zona_asignada: null,
  puntos_reciclaje: 0,
});
```

**Por qué**: Sin este cambio, la tabla `Usuarios` tiene un UUID diferente al de `auth.users`, y la política RLS `"Usuarios select own"` (que verifica `id = auth.uid()`) nunca coincide.

---

## 3. Consolidación del Cliente Supabase

**Archivo**: `src/lib/adminService.ts`

**Cambios**:

### 3.1 Eliminar función `crearCliente()`
Eliminar las líneas 6-11:
```typescript
// ELIMINAR ESTA FUNCIÓN:
function crearCliente() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 3.2 Actualizar importación
```typescript
// ANTES:
import { createBrowserClient } from "@supabase/ssr";
import type { Database, RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";

// DESPUÉS:
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { RolUsuario, SolicitudAcceso, Usuario } from "@/types/schema";
```

### 3.3 Reemplazar `crearCliente()` por `getSupabaseClient()`
En cada función, cambiar:
```typescript
// ANTES:
const supabase = crearCliente();

// DESPUÉS:
const supabase = getSupabaseClient();
```

**Funciones a actualizar** (9 en total):
- `listarSolicitudesPendientes()`
- `aprobarSolicitud()`
- `rechazarSolicitud()`
- `listarUsuarios()`
- `actualizarRolUsuario()`
- `actualizarZonaUsuario()`
- `toggleActivoUsuario()`
- `eliminarUsuario()`

---

## 4. Documentación y Verificación

### 4.1 Actualizar INFORME_PROYECTO.md
Agregar nota en la sección de correcciones recientes.

### 4.2 Ejecutar verificación
```bash
npx tsc --noEmit
npm run informe
```

---

## SQL para ejecutar en Supabase

```sql
-- 1. Aplicar corrección de RLS
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";

CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);

-- 2. Dar permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 3. Verificar resultado
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'Usuarios' AND schemaname = 'public';
```
