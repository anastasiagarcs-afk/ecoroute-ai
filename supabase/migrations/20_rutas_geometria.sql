-- Migración 20: Columna geometria en Rutas
-- Almacena el trazado OSRM/polinómica como JSONB (UbicacionPunto[])

ALTER TABLE public."Rutas"
  ADD COLUMN IF NOT EXISTS geometria jsonb;