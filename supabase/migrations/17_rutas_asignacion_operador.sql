-- Migración 17: Asignación de rutas a operadores
-- Agrega columna operador_asignado y ajusta RLS para HU-04

-- 1. Agregar columna de asignación
ALTER TABLE public."Rutas"
  ADD COLUMN IF NOT EXISTS operador_asignado uuid REFERENCES public."Usuarios"(id);

-- 2. Actualizar policy SELECT para operador: ver solo sus rutas asignadas
DROP POLICY IF EXISTS "Rutas select operador" ON public."Rutas";
create policy "Rutas select operador"
  on public."Rutas"
  for select
  to authenticated
  using (
    public.usuario_tiene_rol('Operador')
    and operador_asignado = auth.uid()
  );

-- 3. Actualizar policy INSERT: Admin y Gerente pueden crear rutas
DROP POLICY IF EXISTS "Rutas insert admin" ON public."Rutas";
create policy "Rutas insert admin_gerente"
  on public."Rutas"
  for insert
  to authenticated
  with check (
    public.usuario_tiene_rol('Admin')
    or public.usuario_tiene_rol('Gerente')
  );

-- 4. Actualizar policy UPDATE: Admin y Gerente pueden actualizar rutas
DROP POLICY IF EXISTS "Rutas update admin" ON public."Rutas";
create policy "Rutas update admin_gerente"
  on public."Rutas"
  for update
  to authenticated
  using (
    public.usuario_tiene_rol('Admin')
    or public.usuario_tiene_rol('Gerente')
  )
  with check (
    public.usuario_tiene_rol('Admin')
    or public.usuario_tiene_rol('Gerente')
  );