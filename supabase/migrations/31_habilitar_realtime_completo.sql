-- Migración 31: Habilitar Realtime para Notificaciones y Contenedores
-- Garantiza que ambas tablas estén en supabase_realtime con REPLICA IDENTITY FULL.
    
-- Notificaciones (idempotente, por si la migración 30 ya se aplicó)
ALTER TABLE public."Notificaciones" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public."Notificaciones";

-- Contenedores (la suscripción en contenedoresStore.ts también depende de Realtime)
ALTER TABLE public."Contenedores" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public."Contenedores";
