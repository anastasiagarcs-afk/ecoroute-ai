-- Sprint 5: Autenticación, Roles y Solicitudes de Acceso (HU-12 / RF-25 + HU-13 / RF-26)
-- Amplía enum rol_usuario, crea tabla SolicitudesAcceso, RLS y RPC de aprobación.

-- 1. Ampliar enum de roles
alter type public.rol_usuario add value 'Gerente' after 'Operador';

-- 2. Enum de estado de solicitud
create type public.estado_solicitud as enum (
  'pendiente',
  'aprobada',
  'rechazada'
);

-- 3. Tabla de solicitudes de acceso
create table public."SolicitudesAcceso" (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public."Usuarios"(id) on delete cascade,
  rol_solicitado public.rol_usuario not null,
  estado public.estado_solicitud not null default 'pendiente',
  fecha_solicitud timestamptz not null default now(),
  revisado_por uuid references public."Usuarios"(id) on delete set null,
  fecha_revision timestamptz
);

-- 4. Índices
create index idx_solicitudes_acceso_estado on public."SolicitudesAcceso"(estado);
create index idx_solicitudes_acceso_usuario on public."SolicitudesAcceso"(usuario_id);

-- 5. RLS en SolicitudesAcceso
alter table public."SolicitudesAcceso" enable row level security;

-- Insert: cualquier usuario puede crear su propia solicitud
create policy "SolicitudesAcceso insert own"
  on public."SolicitudesAcceso"
  for insert
  with check (usuario_id = auth.uid());

-- Select: dueño puede ver las suyas
create policy "SolicitudesAcceso select own"
  on public."SolicitudesAcceso"
  for select
  using (usuario_id = auth.uid());

-- Select: Admin puede ver todas
create policy "SolicitudesAcceso select admin"
  on public."SolicitudesAcceso"
  for select
  using (
    exists (
      select 1 from public."Usuarios"
      where id = auth.uid() and rol = 'Admin'
    )
  );

-- 6. RPC: aprobar o rechazar solicitud (solo Admin)
create or replace function public.aprobar_solicitud_acceso(
  p_solicitud_id uuid,
  p_aprobar boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitude public."SolicitudesAcceso"%rowtype;
  v_caller_rol public.rol_usuario;
  v_nuevo_estado public.estado_solicitud;
begin
  -- Verificar que el llamador es Admin
  select rol into v_caller_rol
  from public."Usuarios"
  where id = auth.uid();

  if v_caller_rol != 'Admin' then
    raise exception 'Solo los administradores pueden revisar solicitudes';
  end if;

  -- Obtener solicitud
  select * into v_solicitude
  from public."SolicitudesAcceso"
  where id = p_solicitud_id;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitude.estado != 'pendiente' then
    raise exception 'La solicitud ya fue revisada';
  end if;

  -- Actualizar solicitud
  v_nuevo_estado := case when p_aprobar then 'aprobada' else 'rechazada' end;

  update public."SolicitudesAcceso"
  set estado = v_nuevo_estado,
      revisado_por = auth.uid(),
      fecha_revision = now()
  where id = p_solicitud_id;

  -- Si se aprueba, actualizar rol del usuario
  if p_aprobar then
    update public."Usuarios"
    set rol = v_solicitude.rol_solicitado
    where id = v_solicitude.usuario_id;
  end if;

  return json_build_object(
    'exito', true,
    'solicitud_id', p_solicitud_id,
    'nuevo_estado', v_nuevo_estado
  );
end;
$$;

-- 7. RPC: crear solicitud de acceso (para el stepper de registro)
create or replace function public.crear_solicitud_acceso(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol_solicitado public.rol_usuario,
  p_justificacion text default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_usuario_id uuid;
begin
  -- Crear usuario en auth.users via Supabase Auth (manual: el cliente hace signUp)
  -- Esta función solo crea la solicitud; el signUp se hace desde el cliente.

  -- Buscar si ya existe el usuario por email
  select id into v_usuario_id
  from public."Usuarios"
  where email = p_email;

  if not found then
    -- Crear registro en Usuarios (rol Ciudadano por defecto)
    insert into public."Usuarios" (nombre, email, rol)
    values (p_nombre, p_email, 'Ciudadano')
    returning id into v_usuario_id;
  end if;

  -- Crear solicitud
  insert into public."SolicitudesAcceso" (usuario_id, rol_solicitado, estado)
  values (v_usuario_id, p_rol_solicitado, 'pendiente')
  returning id into v_user_id;

  return json_build_object(
    'exito', true,
    'usuario_id', v_usuario_id,
    'solicitud_id', v_user_id
  );
end;
$$;
