-- Migración 02: persistencia del historial de rutas en Supabase.
-- Extiende HistorialRutas para guardar distancia total y la geometría
-- del trazado (permite redibujar la ruta en el mapa sin recalcular con OSRM).

alter table public."HistorialRutas"
  add column if not exists distancia_total numeric(10, 2) check (distancia_total >= 0);

alter table public."HistorialRutas"
  add column if not exists geometria jsonb;

-- Índice para consultas por fecha de ejecución (asegurado por si se aplicó la 01 con cambios).
create index if not exists idx_historial_fecha on public."HistorialRutas"(fecha_ejecucion);

-- RLS: la clave anónima del cliente (supabaseClient.ts) lee, registra y vacía el historial.
drop policy if exists "HistorialRutas select anon" on public."HistorialRutas";
create policy "HistorialRutas select anon"
  on public."HistorialRutas" for select
  using (true);

drop policy if exists "HistorialRutas insert anon" on public."HistorialRutas";
create policy "HistorialRutas insert anon"
  on public."HistorialRutas" for insert
  with check (true);

drop policy if exists "HistorialRutas delete anon" on public."HistorialRutas";
create policy "HistorialRutas delete anon"
  on public."HistorialRutas" for delete
  using (true);