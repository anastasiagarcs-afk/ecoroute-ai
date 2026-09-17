    -- Migración 21: Agregar valor 'asignacion_ruta' al ENUM tipo_notificacion
    ALTER TYPE public.tipo_notificacion ADD VALUE IF NOT EXISTS 'asignacion_ruta';