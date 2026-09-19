-- Migration 36: Add 'alerta_n8n' to tipo_notificacion enum
-- Enables n8n webhook alerts to be stored in Notificaciones table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'alerta_n8n'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_notificacion')
  ) THEN
    ALTER TYPE public.tipo_notificacion ADD VALUE 'alerta_n8n';
  END IF;
END $$;
