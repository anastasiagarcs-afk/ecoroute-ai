-- Migración 28: Políticas RLS seguras para Usuarios
-- Protege contra elevación de privilegios manteniendo flujo anónimo
-- Opción B: INSERT abierto con check estricto

-- 1. GRANTs explícitos para ambos roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Usuarios" TO authenticated;

-- 2. Eliminar TODAS las políticas previas (limpieza completa)
DROP POLICY IF EXISTS "Usuarios select all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios delete all" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios select own" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios select admin" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update own" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update admin" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios delete admin" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios select para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios update para anon" ON public."Usuarios";
DROP POLICY IF EXISTS "Usuarios insert demo" ON public."Usuarios";

-- 3. SELECT: Todos pueden ver (flujo anónimo + demo)
CREATE POLICY "Usuarios select all"
  ON public."Usuarios" FOR SELECT
  USING (true);

-- 4. INSERT: Abierto a todos pero con check estricto
-- Previene creación de Admin o inyección de puntos
CREATE POLICY "Usuarios insert safe"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (rol = 'Ciudadano' AND puntos_reciclaje = 0);

-- 5. UPDATE: Solo Admin (requiere función usuario_tiene_rol)
CREATE POLICY "Usuarios update admin"
  ON public."Usuarios" FOR UPDATE TO authenticated
  USING (public.usuario_tiene_rol('Admin'))
  WITH CHECK (public.usuario_tiene_rol('Admin'));

-- 6. DELETE: Solo Admin
CREATE POLICY "Usuarios delete admin"
  ON public."Usuarios" FOR DELETE TO authenticated
  USING (public.usuario_tiene_rol('Admin'));

-- 7. Verificación de políticas aplicadas
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE tablename = 'Usuarios' AND schemaname = 'public'
ORDER BY cmd, policyname;
