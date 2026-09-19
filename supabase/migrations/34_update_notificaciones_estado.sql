-- Migration 34: Add atendida/fecha_atencion columns and Admin RLS policies
-- Requirements: RF-09 (panel de alertas) and RF-10 (marcar como resuelta)

ALTER TABLE public."Notificaciones"
ADD COLUMN IF NOT EXISTS atendida BOOLEAN DEFAULT false;

ALTER TABLE public."Notificaciones"
ADD COLUMN IF NOT EXISTS fecha_atencion TIMESTAMPTZ NULL;

DROP POLICY IF EXISTS "Notificaciones select admin" ON public."Notificaciones";
DROP POLICY IF EXISTS "Notificaciones update admin" ON public."Notificaciones";
DROP POLICY IF EXISTS "Notificaciones delete admin" ON public."Notificaciones";

CREATE POLICY "Notificaciones select admin"
ON public."Notificaciones"
FOR SELECT
USING (usuario_tiene_rol('Admin'));

CREATE POLICY "Notificaciones update admin"
ON public."Notificaciones"
FOR UPDATE
USING (usuario_tiene_rol('Admin'))
WITH CHECK (usuario_tiene_rol('Admin'));

CREATE POLICY "Notificaciones delete admin"
ON public."Notificaciones"
FOR DELETE
USING (usuario_tiene_rol('Admin'));
