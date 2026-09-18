-- Migración 33: Política RLS explícita para que Gerente lea notificaciones
-- Garantiza que los usuarios con rol 'Gerente' puedan consultar la tabla
-- public."Notificaciones" sin depender únicamente de la coincidencia exacta
-- entre auth.uid() y usuario_id.

-- Eliminar política previa si existe para evitar duplicados
DROP POLICY IF EXISTS "Notificaciones select gerente" ON public."Notificaciones";

-- Crear política explícita para Gerente (lee sus notificaciones y todas las
-- asignadas a usuarios con rol Gerente, al igual que Admin)
CREATE POLICY "Notificaciones select gerente"
  ON public."Notificaciones"
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.usuario_tiene_rol('Gerente')
  );
