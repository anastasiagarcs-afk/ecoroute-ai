-- Sprint 4: Registro de contenedores y ubicación del reciclaje.
-- 1) Habilita el acceso anónimo a Contenedores para leer el inventario y crear
--    nuevos puntos mediante la función registrar_contenedor.
-- 2) Vincula cada entrega de reciclaje con el contenedor / punto de acopio.

alter table public."Contenedores" enable row level security;

create policy "Contenedores select para anon"
  on public."Contenedores"
  for select
  using (true);

create policy "Contenedores insert para anon"
  on public."Contenedores"
  for insert
  with check (true);

create policy "Contenedores update para anon"
  on public."Contenedores"
  for update
  using (true)  
  with check (true);

alter table public."PuntosReciclaje"
  add column if not exists contenedor_id uuid
  references public."Contenedores"(id) on delete set null;

create index if not exists idx_puntos_contenedor
  on public."PuntosReciclaje"(contenedor_id);

-- Función para registrar un contenedor desde el cliente. Recibe lat/lng y
-- construye la columna geography(Point, 4326) con PostGIS, devolviendo la fila
-- completa (ubicación como GeoJSON) para dibujar el marcador al instante.
create or replace function public.registrar_contenedor(
  p_numero_identificacion text,
  p_tipo_residuo public.tipo_residuo,
  p_nivel_llenado numeric,
  p_lat double precision,
  p_lng double precision,
  p_capacidad numeric default 1000,
  p_zona text default null,
  p_estado public.estado_contenedor default 'activo'
)
returns jsonb
language plpgsql
as $$
declare
  v_resultado jsonb;
begin
  if p_numero_identificacion is null or trim(p_numero_identificacion) = '' then
    raise exception 'El código del contenedor es obligatorio.';
  end if;

  if p_tipo_residuo is null then
    raise exception 'El tipo de residuo es obligatorio.';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Se requieren coordenadas válidas (lat: -90..90, lng: -180..180).';
  end if;

  insert into public."Contenedores" as nuevo
    (numero_identificacion, ubicacion, capacidad, nivel_llenado, tipo_residuo, estado, ultima_lectura, zona)
  values
    (trim(p_numero_identificacion), st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_capacidad, p_nivel_llenado, p_tipo_residuo, p_estado, now(), p_zona)
  returning to_jsonb(nuevo) into v_resultado;

  return v_resultado;
end;
$$;