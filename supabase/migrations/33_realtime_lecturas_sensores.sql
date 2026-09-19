-- Migración 33: Habilitar Realtime para LecturasSensores
-- Necesario para el simulador de sensores y detección de anomalías en tiempo real.

ALTER TABLE public."LecturasSensores" REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public."LecturasSensores";
