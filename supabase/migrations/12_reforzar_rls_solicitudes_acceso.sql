-- Migración 12: Reforzar RLS en SolicitudesAcceso para permitir INSERT a usuarios autenticados
-- Garantiza que el flujo de registro (auth.uid() = Usuarios.id) funcione sin errores de RLS

-- Policy explícita para rol 'authenticated' (más permisiva que la existente)
create policy "SolicitudesAcceso insert authenticated"
  on public."SolicitudesAcceso"
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- También asegurar policy de SELECT para authenticated (dueño ve las suyas)
create policy "SolicitudesAcceso select authenticated"
  on public."SolicitudesAcceso"
  for select
  to authenticated
  using (usuario_id = auth.uid());