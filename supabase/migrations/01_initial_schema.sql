create extension if not exists postgis;

create type public.tipo_residuo as enum (
  'organico',
  'reciclable',
  'no_reciclable',
  'vidrio',
  'papel_carton',
  'plastico',
  'metal',
  'peligroso',
  'mixto'
);

create type public.estado_contenedor as enum (
  'activo',
  'inactivo',
  'en_mantenimiento',
  'repleto'
);

create type public.rol_usuario as enum (
  'Admin',
  'Operador',
  'Ciudadano'
);

create type public.material_reciclaje as enum (
  'organico',
  'vidrio',
  'papel_carton',
  'plastico',
  'metal'
);

create type public.tipo_notificacion as enum (
  'alerta_llenado',
  'alerta_predictiva',
  'solicitud_acceso',
  'jornada',
  'sistema'
);

create table public."Contenedores" (
  id uuid primary key default gen_random_uuid(),
  numero_identificacion text not null unique,
  ubicacion geography(Point, 4326),
  capacidad integer not null check (capacidad > 0),
  nivel_llenado numeric(5, 2) not null default 0 check (nivel_llenado >= 0 and nivel_llenado <= 100),
  tipo_residuo public.tipo_residuo not null default 'mixto',
  estado public.estado_contenedor not null default 'activo',
  ultima_lectura timestamptz,
  zona text,
  created_at timestamptz not null default now()
);

create table public."LecturasSensores" (
  id uuid primary key default gen_random_uuid(),
  contenedor_id uuid not null references public."Contenedores"(id) on delete cascade,
  nivel_llenado numeric(5, 2) not null check (nivel_llenado >= 0 and nivel_llenado <= 100),
  temperatura numeric(5, 2),
  fecha_hora timestamptz not null default now(),
  bateria numeric(5, 2) check (bateria >= 0 and bateria <= 100),
  created_at timestamptz not null default now()
);

create table public."Rutas" (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  zona text,
  contenedores_asignados uuid[] not null default '{}',
  fecha_creacion timestamptz not null default now(),
  ultima_ejecucion timestamptz,
  distancia_total numeric(10, 2) check (distancia_total >= 0),
  tiempo_estimado interval,
  created_at timestamptz not null default now()
);

create table public."Usuarios" (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  rol public.rol_usuario not null default 'Ciudadano',
  telefono text,
  zona_asignada text,
  puntos_reciclaje integer not null default 0 check (puntos_reciclaje >= 0),
  created_at timestamptz not null default now()
);

create table public."PuntosReciclaje" (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public."Usuarios"(id) on delete cascade,
  fecha timestamptz not null default now(),
  material public.material_reciclaje not null,
  cantidad numeric(10, 2) not null check (cantidad >= 0),
  puntos_ganados integer not null default 0 check (puntos_ganados >= 0),
  validado_por uuid references public."Usuarios"(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public."HistorialRutas" (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid references public."Rutas"(id) on delete set null,
  fecha_ejecucion timestamptz not null default now(),
  contenedores_recogidos uuid[] not null default '{}',
  tiempo_real interval,
  combustible_consumido numeric(10, 2) check (combustible_consumido >= 0),
  observaciones text,
  created_at timestamptz not null default now()
);

create table public."Notificaciones" (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public."Usuarios"(id) on delete cascade,
  tipo public.tipo_notificacion not null default 'sistema',
  mensaje text not null,
  leida boolean not null default false,
  fecha_envio timestamptz not null default now(),
  enlace text,
  created_at timestamptz not null default now()
);

alter table public."Contenedores" enable row level security;
alter table public."LecturasSensores" enable row level security;
alter table public."Rutas" enable row level security;
alter table public."Usuarios" enable row level security;
alter table public."PuntosReciclaje" enable row level security;
alter table public."HistorialRutas" enable row level security;
alter table public."Notificaciones" enable row level security;

create index idx_lecturas_contenedor on public."LecturasSensores"(contenedor_id);
create index idx_lecturas_fecha on public."LecturasSensores"(fecha_hora);
create index idx_historial_ruta on public."HistorialRutas"(ruta_id);
create index idx_historial_fecha on public."HistorialRutas"(fecha_ejecucion);
create index idx_notificaciones_usuario on public."Notificaciones"(usuario_id);
create index idx_puntos_usuario on public."PuntosReciclaje"(usuario_id);