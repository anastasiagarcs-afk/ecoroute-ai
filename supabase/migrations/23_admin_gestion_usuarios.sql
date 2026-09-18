  -- Sprint 6: Gestión completa de usuarios por Admin (HU-12 / RF-18, RF-19, RF-20, RF-21)
  -- Agrega campo activo a Usuarios, políticas RLS para Admin y funciones de gestión.

  -- 1. Agregar campo activo a Usuarios (default true para usuarios existentes)
  ALTER TABLE public."Usuarios" ADD COLUMN activo boolean NOT NULL DEFAULT true;

  -- 2. Política RLS: Admin puede ver todos los usuarios
  CREATE POLICY "Usuarios select admin"
    ON public."Usuarios"
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public."Usuarios"
        WHERE id = auth.uid() AND rol = 'Admin'
      )
    );

  -- 3. Política RLS: Admin puede actualizar cualquier usuario (rol, zona, activo)
  CREATE POLICY "Usuarios update admin"
    ON public."Usuarios"
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public."Usuarios"
        WHERE id = auth.uid() AND rol = 'Admin'
      )
    );
