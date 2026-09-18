-- Migración 26: Corregir política RLS de INSERT en Usuarios
-- Permite INSERT a cualquier usuario (anon o authenticated)
-- Necesario para la función cargarOCrearUsuario que crea el usuario demo

-- Eliminar política restrictiva anterior
DROP POLICY IF EXISTS "Usuarios insert auth" ON public."Usuarios";

-- Nueva política: permite INSERT a cualquier rol
CREATE POLICY "Usuarios insert all"
  ON public."Usuarios" FOR INSERT
  WITH CHECK (true);
