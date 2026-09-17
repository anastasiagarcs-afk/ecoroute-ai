-- Migración 22: Función RPC para completar rutas (bypass RLS seguro)
-- Permite al Operador completar solo sus rutas asignadas

create or replace function public.completar_ruta(p_ruta_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operador_id uuid;
  v_estado_actual text;
  v_caller_rol public.rol_usuario;
begin
  -- 1. Verificar que el llamador es Operador
  select rol into v_caller_rol
  from public."Usuarios"
  where id = auth.uid();

  if v_caller_rol != 'Operador' then
    raise exception 'Solo los operadores pueden completar rutas';
  end if;

  -- 2. Obtener la ruta y verificar asignación
  select operador_asignado, estado
  into v_operador_id, v_estado_actual
  from public."Rutas"
  where id = p_ruta_id;

  if v_operador_id is null then
    raise exception 'Ruta no encontrada';
  end if;

  -- 3. Verificar que la ruta está asignada al operador actual
  if v_operador_id != auth.uid() then
    raise exception 'No tienes permiso para completar esta ruta';
  end if;

  -- 4. Si ya está completada, retornar éxito (idempotente)
  if v_estado_actual = 'completada' then
    return json_build_object(
      'exito', true,
      'ruta_id', p_ruta_id,
      'estado', 'completada',
      'mensaje', 'Ruta ya estaba completada'
    );
  end if;

  -- 5. Actualizar estado
  update public."Rutas"
  set estado = 'completada',
      ultima_ejecucion = now()
  where id = p_ruta_id;

  return json_build_object(
    'exito', true,
    'ruta_id', p_ruta_id,
    'estado', 'completada',
    'mensaje', 'Ruta completada exitosamente'
  );
end;
$$;
