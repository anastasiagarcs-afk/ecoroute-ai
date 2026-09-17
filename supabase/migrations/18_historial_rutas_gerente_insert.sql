-- Migración 18: Permitir INSERT en HistorialRutas al rol Gerente
-- Corrección del error RLS 42501 que bloqueaba a Gerente al guardar rutas

-- Eliminar policy anterior que solo permitía Admin y Operador
DROP POLICY IF EXISTS "HistorialRutas insert admin_operador" ON public."HistorialRutas";

-- Crear policy que incluya Admin, Gerente y Operador
CREATE POLICY "HistorialRutas insert admin_gerente_operador"
  ON public."HistorialRutas"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.usuario_tiene_rol('Admin')
    OR public.usuario_tiene_rol('Gerente')
    OR public.usuario_tiene_rol('Operador')
  );