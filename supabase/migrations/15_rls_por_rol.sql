-- Migración 15: Políticas RLS por rol para EcoRoute AI
-- Reemplaza políticas TRUE (abiertas) por control basado en rol
-- Roles: Admin, Gerente, Operador, Ciudadano

-- Helper: función reutilizable para verificar el rol del usuario actual
create or replace function public.usuario_tiene_rol(p_rol text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."Usuarios"
    where id = auth.uid() and rol = p_rol::public.rol_usuario
  );
$$;

-- Helper: verificar si el usuario es Admin o Gerente
create or replace function public.usuario_es_gerente_o_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."Usuarios"
    where id = auth.uid() and rol in ('Admin', 'Gerente')
  );
$$;

-- ============================================================
-- CONTENEDORES
-- ============================================================
-- Eliminar políticas previas (TRUE = abiertas)
drop policy if exists "Contenedores select para anon" on public."Contenedores";
drop policy if exists "Contenedores insert para anon" on public."Contenedores";
drop policy if exists "Contenedores update para anon" on public."Contenedores";
drop policy if exists "Contenedores delete para anon" on public."Contenedores";

-- SELECT: todos los autenticados pueden ver contenedores (necesario para mapa)
create policy "Contenedores select auth"
  on public."Contenedores"
  for select
  to authenticated
  using (true);

-- SELECT: usuarios anónimos también pueden ver (mapa público / preview)
create policy "Contenedores select anon"
  on public."Contenedores"
  for select
  to anon
  using (true);

-- INSERT/UPDATE/DELETE: solo Admin y Operador
create policy "Contenedores insert admin_operador"
  on public."Contenedores"
  for insert
  to authenticated
  with check (public.usuario_tiene_rol('Admin') or public.usuario_tiene_rol('Operador'));

create policy "Contenedores update admin_operador"
  on public."Contenedores"
  for update
  to authenticated
  using (public.usuario_tiene_rol('Admin') or public.usuario_tiene_rol('Operador'))
  with check (public.usuario_tiene_rol('Admin') or public.usuario_tiene_rol('Operador'));

create policy "Contenedores delete admin"
  on public."Contenedores"
  for delete
  to authenticated
  using (public.usuario_tiene_rol('Admin'));

-- ============================================================
-- RUTAS (estaba bloqueada: RLS habilitado sin políticas)
-- ============================================================
-- SELECT: Admin/Gerente ven todas, Operador ve sus asignadas
create policy "Rutas select admin_gerente"
  on public."Rutas"
  for select
  to authenticated
  using (public.usuario_es_gerente_o_admin());

create policy "Rutas select operador"
  on public."Rutas"
  for select
  to authenticated
  using (
    public.usuario_tiene_rol('Operador')
    and contenedores_asignados is not null
  );

-- INSERT/UPDATE: solo Admin
create policy "Rutas insert admin"
  on public."Rutas"
  for insert
  to authenticated
  with check (public.usuario_tiene_rol('Admin'));

create policy "Rutas update admin"
  on public."Rutas"
  for update
  to authenticated
  using (public.usuario_tiene_rol('Admin'))
  with check (public.usuario_tiene_rol('Admin'));

-- ============================================================
-- PUNTOSRECICLAJE
-- ============================================================
drop policy if exists "PuntosReciclaje select para anon" on public."PuntosReciclaje";
drop policy if exists "PuntosReciclaje insert para anon" on public."PuntosReciclaje";

-- SELECT: Ciudadano ve los suyos, Admin/Gerente ven todos
create policy "PuntosReciclaje select own"
  on public."PuntosReciclaje"
  for select
  to authenticated
  using (usuario_id = auth.uid());

create policy "PuntosReciclaje select admin_gerente"
  on public."PuntosReciclaje"
  for select
  to authenticated
  using (public.usuario_es_gerente_o_admin());

-- INSERT: Ciudadano registra sus propios reciclajes
create policy "PuntosReciclaje insert own"
  on public."PuntosReciclaje"
  for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
drop policy if exists "Notificaciones select para anon" on public."Notificaciones";
drop policy if exists "Notificaciones insert para anon" on public."Notificaciones";

-- SELECT: usuario ve las suyas, Admin ve todas
create policy "Notificaciones select own"
  on public."Notificaciones"
  for select
  to authenticated
  using (usuario_id = auth.uid());

create policy "Notificaciones select admin"
  on public."Notificaciones"
  for select
  to authenticated
  using (public.usuario_tiene_rol('Admin'));

-- INSERT: cualquier autenticado puede crear notificaciones
create policy "Notificaciones insert auth"
  on public."Notificaciones"
  for insert
  to authenticated
  with check (true);

-- UPDATE: usuario marca las suyas como leídas
create policy "Notificaciones update own"
  on public."Notificaciones"
  for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ============================================================
-- HISTORIALRUTAS
-- ============================================================
drop policy if exists "HistorialRutas select anon" on public."HistorialRutas";
drop policy if exists "HistorialRutas insert anon" on public."HistorialRutas";
drop policy if exists "HistorialRutas delete anon" on public."HistorialRutas";

-- SELECT: Admin/Gerente ven todo, Operador ve el historial general
create policy "HistorialRutas select auth"
  on public."HistorialRutas"
  for select
  to authenticated
  using (true);

-- INSERT: Admin y Operador pueden registrar recorridos
create policy "HistorialRutas insert admin_operador"
  on public."HistorialRutas"
  for insert
  to authenticated
  with check (public.usuario_tiene_rol('Admin') or public.usuario_tiene_rol('Operador'));

-- DELETE: solo Admin
create policy "HistorialRutas delete admin"
  on public."HistorialRutas"
  for delete
  to authenticated
  using (public.usuario_tiene_rol('Admin'));