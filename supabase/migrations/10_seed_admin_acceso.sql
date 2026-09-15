-- Sprint 5: Seed Admin — bootstrap del primer administrador
-- Ejecuta esta función desde la app o el SQL Editor de Supabase después de registrarte.
-- Uso: SELECT public.seed_admin();
-- Resultado: tu usuario actual obtiene rol 'Admin' y puede acceder a /admin.

create or replace function public.seed_admin()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existe boolean;
begin
  if v_uid is null then
    raise exception 'Debes estar autenticado para ejecutar seed_admin';
  end if;

  select exists(select 1 from public."Usuarios" where id = v_uid) into v_existe;

  if v_existe then
    update public."Usuarios"
    set rol = 'Admin'
    where id = v_uid;
  else
    insert into public."Usuarios" (id, nombre, email, rol, puntos_reciclaje)
    values (v_uid, 'Administrador', current_setting('request.jwt.claims', true)::json->>'email', 'Admin', 0);
  end if;

  return json_build_object(
    'exito', true,
    'mensaje', 'Tu usuario ahora tiene rol Admin. Recarga la pagina.'
  );
end;
$$;
