-- Migración correctiva: Arreglar políticas RLS de Usuarios
-- Elimina políticas abiertas que permitían acceso total y aplica control por rol

-- 1. Eliminar TODAS las políticas antiguas problemáticas
DROP POLICY IF EXISTS "Usuarios select para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios select admin" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update admin" ON public."Usuarios";

-- 2. Nuevas políticas seguras con control por rol

-- SELECT: Cualquier autenticado puede ver su propia fila
CREATE POLICY "Usuarios select own"
  ON public."Usuarios" FOR SELECT TO authenticated
  USING (id = auth.uid());

-- SELECT: Admin puede ver todas las filas
CREATE POLICY "Usuarios select admin"
  ON public."Usuarios" FOR SELECT TO authenticated
  USING (public.usuario_tiene_rol('Admin'));

-- INSERT: Cualquier autenticado puede insertar (necesario para registro)
CREATE POLICY "Usuarios insert auth"
  ON public."Usuarios" FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: Cualquier autenticado puede actualizar su propia fila
CREATE POLICY "Usuarios update own"
  ON public."Usuarios" FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin puede actualizar cualquier fila
CREATE POLICY "Usuarios update admin"
  ON public."Usuarios" FOR UPDATE TO authenticated
  USING (public.usuario_tiene_rol('Admin'))
  WITH CHECK (public.usuario_tiene_rol('Admin'));
