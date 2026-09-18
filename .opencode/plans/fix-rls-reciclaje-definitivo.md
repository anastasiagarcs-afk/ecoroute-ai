# Plan Definitivo: Corregir Error 42501 en reciclajeService

## Causa Raíz Identificada

El error `42501` ocurre porque `cargarOCrearUsuario()` en `reciclajeService.ts` intenta crear un usuario demo incluso cuando hay un Admin logueado. La función no distingue entre:
- Usuario anónimo (necesita demo)
- Admin/Ciudadano logueado (debe usar su sesión)

## Plan de Corrección

### 1. Corregir `reciclajeService.ts` - Función `cargarOCrearUsuario()`

**Archivo**: `src/lib/reciclajeService.ts`

**Cambio**: La función debe:
1. Primero verificar si hay sesión autenticada
2. Si hay sesión → retornar el usuario autenticado desde la tabla Usuarios
3. Si NO hay sesión → usar/crear el demo user (comportamiento actual)

```typescript
async function cargarOCrearUsuario(): Promise<Usuario> {
  if (!estaSupabaseConfigurado()) throw errorSinSupabase();
  const supabase = getSupabaseClient();

  // 1. Verificar si hay sesión autenticada
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Usuario autenticado: buscar su perfil en Usuarios
    const { data: usuario, error } = await supabase
      .from("Usuarios")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    if (!error && usuario) return usuario;
    // Si no se encuentra el perfil, continuar con demo
  }

  // 2. Sin sesión: buscar o crear usuario demo
  const consulta = await supabase
    .from("Usuarios")
    .select("*")
    .eq("email", EMAIL_USUARIO_DEMO)
    .maybeSingle();

  if (!consulta.error && consulta.data) return consulta.data;

  // 3. Crear usuario demo si no existe
  const datosNuevo: InsertUsuario = {
    nombre: "Ciudadano Demo",
    email: EMAIL_USUARIO_DEMO,
    rol: "Ciudadano",
    telefono: null,
    zona_asignada: "Zona Centro",
    puntos_reciclaje: 0,
  };

  const creacion = await supabase
    .from("Usuarios")
    .insert(datosNuevo)
    .select()
    .single();

  if (creacion.error || !creacion.data) {
    throw errorSupabase(
      "No se pudo crear el usuario de demostración",
      creacion.error ?? "La consulta no devolvió datos."
    );
  }
  return creacion.data;
}
```

### 2. Asegurar Políticas RLS Correctas

**SQL para ejecutar en Supabase** (una sola vez):

```sql
-- =====================================================
-- CORRECCIÓN DEFINITIVA DE RLS PARA USUARIOS
-- =====================================================

-- 1. GRANTs (permisos de tabla)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 2. Limpiar TODAS las políticas INSERT existentes
DROP POLICY IF EXISTS "Usuarios insert para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert demo" ON public."Usuarios";

-- 3. Crear política INSERT permisiva para TODOS los roles
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);

-- 4. Verificar resultado
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'Usuarios' AND schemaname = 'public'
ORDER BY cmd, policyname;
```

### 3. Actualizar Migración 26

**Archivo**: `supabase/migrations/26_fix_usuarios_insert_policy.sql`

Actualizar con el SQL definitivo para que quede documentado.

### 4. Verificaciones

- `npx tsc --noEmit` → 0 errores
- `npm run build` → exitoso
- Funcionalidades preservadas:
  - ✅ Admin puede ver lista de usuarios
  - ✅ Admin puede cambiar roles, zonas, activar/desactivar
  - ✅ Admin puede eliminar usuarios
  - ✅ Ciudadano puede usar /separacion sin login
  - ✅ Ciudadano logueado ve sus propios puntos
  - ✅ Cierre de jornada parcial/final funciona

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/reciclajeService.ts` | Corregir `cargarOCrearUsuario()` para manejar sesión |
| `supabase/migrations/26_fix_usuarios_insert_policy.sql` | SQL definitivo |

## Orden de Ejecución

1. Modificar `reciclajeService.ts`
2. Ejecutar SQL en Supabase
3. `npx tsc --noEmit`
4. `npm run build`
5. Verificar funcionalidades
