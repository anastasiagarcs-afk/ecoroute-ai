-- Sprint 6: Nuevo estado "vacio" para el ciclo de vida del contenedor.
-- Al vaciar un contenedor (Operación Logística) se marca como Vacío/Disponible
-- en la tabla Contenedores para reflejarlo en el mapa en tiempo real.
-- Es idempotente: solo añade el valor si aún no existe en el enum.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'estado_contenedor'
      and e.enumlabel = 'vacio'
  ) then
    alter type public.estado_contenedor add value 'vacio';
  end if;
end;
$$;