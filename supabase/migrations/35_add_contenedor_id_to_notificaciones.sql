    -- Migration 35: Add contenedor_id to Notificaciones for cascade resolution
    -- Links alerts to containers for bulk operations and fill-level validation

    ALTER TABLE public."Notificaciones"
    ADD COLUMN IF NOT EXISTS contenedor_id UUID REFERENCES public."Contenedores"(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_notificaciones_contenedor_id
    ON public."Notificaciones"(contenedor_id);
