-- Migración 25: Política DELETE para Admin en Usuarios
-- Permite a los administradores eliminar usuarios del sistema

-- Admin puede eliminar cualquier usuario
CREATE POLICY "Usuarios delete admin"
  ON public."Usuarios" FOR DELETE TO authenticated
  USING (public.usuario_tiene_rol('Admin'));
