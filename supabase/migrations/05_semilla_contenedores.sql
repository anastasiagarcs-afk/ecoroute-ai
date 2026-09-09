-- Sprint 5: Semilla de contenedores de demostración en Ciudad Guayana.
-- Si la tabla "Contenedores" está vacía, el cliente llama a esta función para
-- cargar 12 contenedores distribuidos en Puerto Ordaz, San Félix, Alta Vista y
-- Unare, con variedad de tipos de residuo y distintos niveles de llenado
-- (incluye 4 en estado crítico > 80% para probar la optimización de rutas).
--
-- Es idempotente: usa ON CONFLICT sobre numero_identificacion, así que
-- ejecutarla de nuevo nunca duplica filas ni borra datos existentes.

create or replace function public.sembrar_contenedores_demo()
returns integer
language plpgsql
as $$
declare
  v_insertados integer := 0;
begin
  insert into public."Contenedores"
    (numero_identificacion, ubicacion, capacidad, nivel_llenado, tipo_residuo, estado, ultima_lectura, zona)
  values
    ('CNT-001', st_setsrid(st_makepoint(-62.7174, 8.2772), 4326)::geography, 1000, 95, 'organico', 'repleto', now(), 'Alta Vista'),
    ('CNT-002', st_setsrid(st_makepoint(-62.7114, 8.3215), 4326)::geography, 800, 90, 'organico', 'repleto', now(), 'Puerto Ordaz'),
    ('CNT-003', st_setsrid(st_makepoint(-62.6535, 8.3470), 4326)::geography, 900, 88, 'plastico', 'activo', now(), 'San Félix'),
    ('CNT-004', st_setsrid(st_makepoint(-62.7245, 8.3152), 4326)::geography, 600, 74, 'plastico', 'activo', now(), 'Puerto Ordaz'),
    ('CNT-005', st_setsrid(st_makepoint(-62.6478, 8.3426), 4326)::geography, 500, 85, 'vidrio', 'activo', now(), 'San Félix'),
    ('CNT-006', st_setsrid(st_makepoint(-62.6320, 8.3620), 4326)::geography, 700, 55, 'vidrio', 'activo', now(), 'Unare'),
    ('CNT-007', st_setsrid(st_makepoint(-62.7030, 8.3098), 4326)::geography, 800, 62, 'papel_carton', 'activo', now(), 'Puerto Ordaz'),
    ('CNT-008', st_setsrid(st_makepoint(-62.6740, 8.3525), 4326)::geography, 1100, 25, 'papel_carton', 'activo', now(), 'San Félix'),
    ('CNT-009', st_setsrid(st_makepoint(-62.7240, 8.2705), 4326)::geography, 900, 30, 'metal', 'activo', now(), 'Alta Vista'),
    ('CNT-010', st_setsrid(st_makepoint(-62.6415, 8.3680), 4326)::geography, 700, 12, 'metal', 'activo', now(), 'Unare'),
    ('CNT-011', st_setsrid(st_makepoint(-62.6465, 8.3560), 4326)::geography, 600, 45, 'organico', 'activo', now(), 'Unare'),
    ('CNT-012', st_setsrid(st_makepoint(-62.6715, 8.3490), 4326)::geography, 1000, 68, 'plastico', 'activo', now(), 'San Félix')
  on conflict (numero_identificacion) do nothing;

  get diagnostics v_insertados = row_count;

  return v_insertados;
end;
$$;