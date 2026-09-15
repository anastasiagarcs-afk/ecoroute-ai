-- Sprint 3: Gamificación y Separación en la Fuente.
-- Habilita el acceso anónimo (clave anon del cliente web) a las tablas
-- Usuarios y PuntosReciclaje y crea un ciudadano de demostración para que el
-- módulo funcione de inmediato.

alter table public."Usuarios" enable row level security;
alter table public."PuntosReciclaje" enable row level security;

create policy "Usuarios select para anon"
  on public."Usuarios"
  for select
  using (true);

create policy "Usuarios insert para anon"
  on public."Usuarios"
  for insert
  with check (true);

create policy "Usuarios update para anon"
  on public."Usuarios"
  for update
  using (true)
  with check (true);

create policy "PuntosReciclaje select para anon"
  on public."PuntosReciclaje"
  for select
  using (true);

create policy "PuntosReciclaje insert para anon"
  on public."PuntosReciclaje"
  for insert
  with check (true);

insert into public."Usuarios" (nombre, email, rol, telefono, zona_asignada, puntos_reciclaje)
values ('Ciudadano Demo', 'ciudadano.demo@ecoroute.com', 'Ciudadano', null, 'Zona Centro', 0)
on conflict (email) do nothing;