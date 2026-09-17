-- Migración 19: Estado de rutas + historial por operador
-- Agrega columna estado a Rutas para flujo de aceptación
-- Agrega operador_id a HistorialRutas para historial filtrado

-- 1. Agregar columna estado a Rutas
ALTER TABLE public."Rutas"
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente';

-- Comentario: valores posibles de estado
-- 'pendiente'  → ruta recién asignada, esperando aceptación
-- 'aceptada'   → operador aceptó la ruta
-- 'rechazada'  → operador rechazó la ruta
-- 'en_progreso'→ operador está ejecutando la ruta
-- 'completada' → ruta finalizada exitosamente

-- 2. Agregar columna operador_id a HistorialRutas
ALTER TABLE public."HistorialRutas"
  ADD COLUMN IF NOT EXISTS operador_id uuid REFERENCES public."Usuarios"(id);

-- 3. Index para búsquedas por operador en historial
CREATE INDEX IF NOT EXISTS idx_historial_rutas_operador
  ON public."HistorialRutas"(operador_id);