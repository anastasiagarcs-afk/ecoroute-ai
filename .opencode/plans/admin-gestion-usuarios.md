# Plan: Rediseño de Vista de Administrador con Gestión de Usuarios Completa

## Objetivo
Rediseñar `app/admin/page.tsx` para integrar Gestión de Usuarios en una sola pantalla con sub-pestañas, cumpliendo RF-17 (solicitudes), RF-18 (gestión roles), RF-19 (zona), RF-20 (tabla usuarios), RF-21 (acciones).

## Análisis del Código Actual

### Estado Actual
- **`app/admin/page.tsx`**: Solo muestra solicitudes pendientes (253 líneas)
- **`src/lib/adminService.ts`**: Solo tiene `listarSolicitudesPendientes`, `aprobarSolicitud`, `rechazarSolicitud`
- **`src/types/schema.ts`**: Tipo `Usuario` sin campo `activo/inactivo`
- **RLS**: Admin puede ver todas las solicitudes (política `SolicitudesAcceso select admin`)

### Limitaciones Detectadas
1. No existe campo `activo` en tabla `Usuarios` → requiere migración
2. No hay función para listar todos los usuarios
3. No hay funciones para actualizar usuario (rol, zona, estado)
4. No hay políticas RLS para que Admin actualice usuarios

## Cambios Requeridos

### 1. Migración SQL (Nueva)
**Archivo**: `supabase/migrations/23_admin_gestion_usuarios.sql`

```sql
-- Agregar campo activo a Usuarios
ALTER TABLE public."Usuarios" ADD COLUMN activo boolean NOT NULL DEFAULT true;

-- Política RLS: Admin puede actualizar cualquier usuario
CREATE POLICY "Usuarios update admin"
  ON public."Usuarios"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public."Usuarios"
      WHERE id = auth.uid() AND rol = 'Admin'
    )
  );

-- Política RLS: Admin puede ver todos los usuarios
CREATE POLICY "Usuarios select admin"
  ON public."Usuarios"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."Usuarios"
      WHERE id = auth.uid() AND rol = 'Admin'
    )
  );
```

### 1.1 Validación de Login para Cuentas Desactivadas
**Archivo**: `src/lib/authService.ts`

Modificar la función `iniciarSesion` para verificar el campo `activo`:
```typescript
export async function iniciarSesion(email: string, password: string) {
  // ... login existente
  
  // Después del login, verificar si la cuenta está activa
  const { data: usuario } = await supabase
    .from("Usuarios")
    .select("activo")
    .eq("id", user.id)
    .single();
  
  if (usuario && !usuario.activo) {
    // Cerrar sesión inmediatamente
    await supabase.auth.signOut();
    return {
      exito: false,
      error: "Tu cuenta ha sido desactivada por un administrador. Contacta a soporte para reactivar tu acceso."
    };
  }
  
  return { exito: true, datos: user };
}
```

### 2. Actualizar Schema
**Archivo**: `src/types/schema.ts`

Agregar campo `activo` al tipo `Usuario`:
```typescript
export type Usuario = {
  // ... campos existentes
  activo: boolean;  // ← NUEVO
}
```

### 3. Expandir adminService.ts
**Archivo**: `src/lib/adminService.ts`

Agregar funciones:
```typescript
// Listar todos los usuarios
export async function listarUsuarios(): Promise<...>

// Actualizar rol de usuario
export async function actualizarRolUsuario(usuarioId: string, nuevoRol: RolUsuario): Promise<...>

// Actualizar zona de usuario
export async function actualizarZonaUsuario(usuarioId: string, nuevaZona: string): Promise<...>

// Toggle activo/inactivo
export async function toggleActivoUsuario(usuarioId: string, activo: boolean): Promise<...>
```

### 4. Rediseñar admin/page.tsx
**Estructura propuesta**:

```
┌─────────────────────────────────────────────────────────────┐
│  GESTIÓN DE USUARIOS                          [Volver] [Salir] │
├─────────────────────────────────────────────────────────────┤
│  [Solicitudes Pendientes (3)]  [Usuarios Registrados (25)]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ SUB-PESTAÑA ACTIVA ──────────────────────────────────┐  │
│  │                                                        │  │
│  │  (Contenido según pestaña seleccionada)                │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Sub-pestaña 1: Solicitudes Pendientes**
- Mantiene la funcionalidad actual
- Agrega contador en el tab

**Sub-pestaña 2: Usuarios Registrados**
- Tabla con columnas: Nombre/Email, Rol (badge), Zona, Estado, Acciones
- Acciones por fila:
  - Cambiar rol (select dropdown)
  - Reasignar zona (select con zonas predefinidas)
  - Toggle activo/inactivo (switch)

### 4.1 Zonas Predefinidas
Lista de zonas basada en los datos existentes en la BD:
```typescript
const ZONAS_PREDEFINIDAS = [
  "Alta Vista",
  "Puerto Ordaz",
  "San Félix",
  "Unare",
  "Zona Centro",
] as const;
```

### 5. Actualizar INFORME_PROYECTO.md
- RF-18, RF-19, RF-20, RF-21 → estado 🟢 (Completados)

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/23_admin_gestion_usuarios.sql` | **NUEVO** - Campo activo + RLS |
| `src/types/schema.ts` | Agregar `activo: boolean` a tipo `Usuario` |
| `src/lib/adminService.ts` | Agregar 4 funciones de gestión |
| `src/lib/authService.ts` | Agregar validación de cuenta activa en login |
| `app/admin/page.tsx` | Rediseño completo con sub-pestañas |
| `INFORME_PROYECTO.md` | Actualizar estados RF-18 a RF-21 |

## Detalle de Implementación

### Estado de la Tabla Usuarios

| Columna | Tipo | Descripción |
|---------|------|-------------|
| Nombre/Email | text | Combinado en una celda |
| Rol | badge | Colores: Admin=violeta, Gerente=azul, Operador=verde, Ciudadano=gris |
| Zona Asignada | text | Editable inline |
| Estado | toggle | Activo (verde) / Inactivo (rojo) |
| Acciones | buttons | Select rol, Edit zona, Toggle estado |

### Diseño de Sub-pestañas (Tabs)
- Usar `useState` para controlar pestaña activa
- Tabs con estilo Tailwind (border-bottom highlight)
- Contador de solicitudes pendientes en el tab
- Contador total de usuarios en el segundo tab

### Funciones del adminService

```typescript
// 1. Listar usuarios (excluye al Admin actual)
export async function listarUsuarios(): Promise<{
  exito: boolean;
  datos?: Usuario[];
  error?: string;
}> {
  const supabase = crearCliente();
  const { data, error } = await supabase
    .from("Usuarios")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) return { exito: false, error: error.message };
  return { exito: true, datos: data ?? [] };
}

// 2. Actualizar rol
export async function actualizarRolUsuario(
  usuarioId: string,
  nuevoRol: RolUsuario
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearCliente();
  const { error } = await supabase
    .from("Usuarios")
    .update({ rol: nuevoRol })
    .eq("id", usuarioId);
  
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

// 3. Actualizar zona
export async function actualizarZonaUsuario(
  usuarioId: string,
  nuevaZona: string | null
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearCliente();
  const { error } = await supabase
    .from("Usuarios")
    .update({ zona_asignada: nuevaZona })
    .eq("id", usuarioId);
  
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}

// 4. Toggle activo/inactivo
export async function toggleActivoUsuario(
  usuarioId: string,
  activo: boolean
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearCliente();
  const { error } = await supabase
    .from("Usuarios")
    .update({ activo })
    .eq("id", usuarioId);
  
  if (error) return { exito: false, error: error.message };
  return { exito: true };
}
```

### Estructura del Componente

```typescript
type TabActiva = "solicitudes" | "usuarios";

export default function AdminPage() {
  const [tabActiva, setTabActiva] = useState<TabActiva>("solicitudes");
  const [solicitudes, setSolicitudes] = useState<SolicitudConUsuario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  
  // ... lógica existente de solicitudes
  
  // Nueva función para cargar usuarios
  useEffect(() => {
    if (tabActiva === "usuarios") {
      cargarUsuarios();
    }
  }, [tabActiva]);
  
  // ... render con tabs
}
```

## Orden de Ejecución

1. Crear migración SQL (23_admin_gestion_usuarios.sql)
2. Actualizar schema.ts (agregar campo activo)
3. Expandir adminService.ts (4 nuevas funciones)
4. Modificar authService.ts (validación de cuenta activa en login)
5. Rediseñar admin/page.tsx (sub-pestañas + gestión usuarios)
6. Ejecutar `npx tsc --noEmit` (verificar 0 errores)
7. Actualizar INFORME_PROYECTO.md (RF-18 a RF-21 → 🟢)
8. Ejecutar `npm run informe`

## Regla Git
NO ejecutar `git add`, `git commit`, `git push`. Todos los cambios quedan en Working Directory.
