-- Sprint 5b: RPC ampliado con p_rol_asignado para gestion flexible de roles
-- El Admin puede aprobar con el rol solicitado O asignar un rol diferente.

create or replace function public.aprobar_solicitud_acceso(
  p_solicitud_id uuid,
  p_aprobar boolean,
  p_rol_asignado public.rol_usuario default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public."SolicitudesAcceso"%rowtype;
  v_caller_rol public.rol_usuario;
  v_nuevo_estado public.estado_solicitud;
  v_rol_final public.rol_usuario;
begin
  -- Verificar que el llamador es Admin
  select rol into v_caller_rol
  from public."Usuarios"
  where id = auth.uid();

  if v_caller_rol != 'Admin' then
    raise exception 'Solo los administradores pueden revisar solicitudes';
  end if;

  -- Obtener solicitud
  select * into v_solicitud
  from public."SolicitudesAcceso"
  where id = p_solicitud_id;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado != 'pendiente' then
    raise exception 'La solicitud ya fue revisada';
  end if;

  -- Determinar rol final
  if p_aprobar then
    v_rol_final := coalesce(p_rol_asignado, v_solicitud.rol_solicitado);
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
    set rol = v_rol_final
    where id = v_solicitud.usuario_id;
  end if;

  return json_build_object(
    'exito', true,
    'solicitud_id', p_solicitud_id,
    'nuevo_estado', v_nuevo_estado,
    'rol_asignado', case when p_aprobar then v_rol_final::text else null end
  );
end;
$$;
