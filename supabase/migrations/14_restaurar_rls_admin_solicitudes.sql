-- Migración 14: Restaurar política RLS Admin para SELECT en SolicitudesAcceso
-- La migración 12 eliminó la política Admin y solo dejó la de "dueño ve las suyas"
-- Esto causaba que el Admin no pudiera ver las solicitudes de otros usuarios

-- 1. Eliminar la política restrictiva que solo permitía ver las propias
drop policy if exists "SolicitudesAcceso select authenticated" on public."SolicitudesAcceso";

-- 2. Restaurar política Admin para ver TODAS las solicitudes
-- NOTA: Usa tabla "Usuarios" (no "perfiles") con rol = 'Admin'
create policy "SolicitudesAcceso select admin"
  on public."SolicitudesAcceso"
  for select
  to authenticated
  using (
    exists (
      select 1 from public."Usuarios"
      where id = auth.uid() and rol = 'Admin'
    )
  );