-- Migración 29: Trigger para alertas automáticas de llenado > 80%
-- Genera notificaciones tipo 'alerta_llenado' para Admin y Gerente

-- 1. Función del trigger
CREATE OR REPLACE FUNCTION public.generar_alerta_llenado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contenedor_id uuid;
  v_nivel_llenado numeric;
  v_numero_identificacion text;
  v_zona text;
  v_duplicado boolean;
BEGIN
  -- Determinar si es UPDATE o INSERT
  IF TG_OP = 'UPDATE' THEN
    v_contenedor_id := NEW.id;
    v_nivel_llenado := NEW.nivel_llenado;
    v_numero_identificacion := NEW.numero_identificacion;
    v_zona := NEW.zona;

    -- Solo actuar si el nivel_llenado cambió y ahora es >= 80
    IF OLD.nivel_llenado = NEW.nivel_llenado OR NEW.nivel_llenado < 80 THEN
      RETURN NEW;
    END IF;
  ELSE -- INSERT
    v_contenedor_id := NEW.id;
    v_nivel_llenado := NEW.nivel_llenado;
    v_numero_identificacion := NEW.numero_identificacion;
    v_zona := NEW.zona;

    -- Solo actuar si nivel_llenado >= 80
    IF NEW.nivel_llenado < 80 THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Verificar duplicados: buscar notificación activa no leída en las últimas 2 horas
  SELECT EXISTS(
    SELECT 1 FROM public."Notificaciones"
    WHERE usuario_id IN (
      SELECT id FROM public."Usuarios" WHERE rol IN ('Admin', 'Gerente')
    )
    AND tipo = 'alerta_llenado'
    AND mensaje LIKE '%' || v_numero_identificacion || '%'
    AND leida = false
    AND fecha_envio > now() - interval '2 hours'
  ) INTO v_duplicado;

  -- Si no hay duplicado, insertar notificaciones para Admin y Gerente
  IF NOT v_duplicado THEN
    INSERT INTO public."Notificaciones" (usuario_id, tipo, mensaje, leida, fecha_envio, enlace)
    SELECT
      u.id,
      'alerta_llenado',
      CASE
        WHEN v_zona IS NOT NULL
        THEN format('El contenedor %s en la zona %s ha alcanzado %s%% de capacidad',
                     v_numero_identificacion, v_zona, v_nivel_llenado)
        ELSE format('El contenedor %s ha alcanzado %s%% de capacidad',
                     v_numero_identificacion, v_nivel_llenado)
      END,
      false,
      now(),
      '/#dashboard'
    FROM public."Usuarios" u
    WHERE u.rol IN ('Admin', 'Gerente');
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Crear el trigger
DROP TRIGGER IF EXISTS trg_alerta_contenedor_critico ON public."Contenedores";
CREATE TRIGGER trg_alerta_contenedor_critico
  AFTER INSERT OR UPDATE OF nivel_llenado
  ON public."Contenedores"
  FOR EACH ROW
  WHEN (NEW.nivel_llenado >= 80)
  EXECUTE FUNCTION public.generar_alerta_llenado();
