-- Migración 26: Corrección DEFINITIVA de RLS en Usuarios
-- Soluciona error 42501 en INSERT (anon y authenticated)
  
-- 1. GRANTs (permisos de tabla para ambos roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 2. Limpiar TODAS las políticas INSERT conflictivas
DROP POLICY IF EXISTS "Usuarios insert para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert demo" ON public."Usuarios";

-- 3. Crear UNA política INSERT que cubra TODOS los roles
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);
