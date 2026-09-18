# Plan: Agregar Botón de Eliminar y Ordenamiento en Tabla de Usuarios

## Problema
1. La columna "ACCIONES" en la tabla "Usuarios Registrados" está vacía
2. La tabla no tiene un ordenamiento lógico por prioridad de rol

## Solución

### 1. Agregar función `eliminarUsuario` en adminService.ts
**Archivo**: `src/lib/adminService.ts`

```typescript
export async function eliminarUsuario(
  usuarioId: string
): Promise<{ exito: boolean; error?: string }> {
  const supabase = crearCliente();
  const { error } = await supabase
    .from("Usuarios")
    .delete()
    .eq("id", usuarioId);

  if (error) return { exito: false, error: error.message };
  return { exito: true };
}
```

### 2. Agregar política RLS para DELETE en Usuarios
**Archivo**: `supabase/migrations/25_usuarios_delete_admin.sql`

```sql
-- Admin puede eliminar usuarios
CREATE POLICY "Usuarios delete admin"
  ON public."Usuarios" FOR DELETE TO authenticated
  USING (public.usuario_tiene_rol('Admin'));
```

### 3. Actualizar admin/page.tsx
**Cambios**:
- Importar `eliminarUsuario` de adminService
- Agregar función `manejarEliminar` con confirmación
- Agregar botón de eliminar (ícono 🗑️) en la columna ACCIONES
- Agregar función `ordenarPorRol` para ordenar usuarios por prioridad

### Ordenamiento por prioridad de rol:
```typescript
const PRIORIDAD_ROL: Record<RolUsuario, number> = {
  Admin: 0,      // Primero
  Gerente: 1,
  Operador: 2,   // Recolector
  Ciudadano: 3,  // Último
};

// Dentro del mismo rol, ordenar por fecha de creación (más antiguo primero)
const usuariosOrdenados = [...usuarios].sort((a, b) => {
  const prioridadA = PRIORIDAD_ROL[a.rol];
  const prioridadB = PRIORIDAD_ROL[b.rol];
  if (prioridadA !== prioridadB) return prioridadA - prioridadB;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
});
```

### Efectos de cascada al eliminar usuario:
- `PuntosReciclaje` → CASCADE (se eliminan los registros)
- `Notificaciones` → CASCADE (se eliminan)
- `SolicitudesAcceso` → CASCADE (se eliminan)
- `HistorialRutas.operador_id` → Se mantiene (no tiene FK)

### 4. Ejecutar `npx tsc --noEmit`

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `src/lib/adminService.ts` | Agregar `eliminarUsuario()` |
| `supabase/migrations/25_usuarios_delete_admin.sql` | **NUEVO** - Política DELETE para Admin |
| `app/admin/page.tsx` | Agregar botón eliminar + handler + ordenamiento por rol |
