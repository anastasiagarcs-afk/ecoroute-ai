-- Migración 12: Reforzar RLS en SolicitudesAcceso (Idempotente)

-- 1. Eliminar políticas previas si existen para evitar el error 42710
drop policy if exists "SolicitudesAcceso insert authenticated" on public."SolicitudesAcceso";
drop policy if exists "SolicitudesAcceso select authenticated" on public."SolicitudesAcceso";

-- 2. Crear policy explícita para INSERT (usuario crea su propia solicitud)
create policy "SolicitudesAcceso insert authenticated"
  on public."SolicitudesAcceso"
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- 3. Crear policy explícita para SELECT (usuario lee sus propias solicitudes)
create policy "SolicitudesAcceso select authenticated"
  on public."SolicitudesAcceso"
  for select
  to authenticated
  using (usuario_id = auth.uid());