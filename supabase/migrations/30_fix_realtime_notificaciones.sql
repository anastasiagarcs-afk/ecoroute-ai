-- Migración 30: Habilitar Realtime en la tabla Notificaciones
-- Sin esto, la suscripción postgres_changes en NavRol.tsx nunca recibe eventos

-- 1. Asignar REPLICA IDENTITY FULL (requerido para que los eventos UPDATE/DELETE incluyan datos completos)
ALTER TABLE public."Notificaciones" REPLICA IDENTITY FULL;

-- 2. Agregar la tabla a la publicación supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public."Notificaciones";
