-- Script de diagnóstico para el flujo de notificaciones de EcoRoute
-- Ejecutar en el SQL Editor de Supabase como superadmin / postgres

-- 1. Verificar que el trigger existe y está habilitado
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trg_alerta_contenedor_critico';

-- 2. Verificar que la función del trigger existe
SELECT
  proname AS function_name,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'generar_alerta_llenado';

-- 3. Verificar que la tabla Notificaciones está en supabase_realtime
SELECT
  pubname AS publication_name,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('Notificaciones', 'Contenedores');

-- 4. Verificar REPLICA IDENTITY
SELECT
  relname AS table_name,
  CASE relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
    WHEN 'n' THEN 'nothing'
  END AS replica_identity
FROM pg_class
WHERE relname IN ('Notificaciones', 'Contenedores')
  AND relnamespace = 'public'::regnamespace;

-- 5. Verificar políticas RLS de Notificaciones
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'Notificaciones';

-- 6. Verificar usuarios Admin/Gerente existentes (comparar id de Usuarios vs auth.uid)
SELECT
  u.id AS usuario_id,
  u.email,
  u.rol,
  au.id AS auth_uid,
  (u.id = au.id) AS ids_coinciden
FROM public."Usuarios" u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.rol IN ('Admin', 'Gerente');

-- 7. Ver notificaciones recientes de alerta_llenado
SELECT
  n.id,
  n.usuario_id,
  n.tipo,
  n.mensaje,
  n.leida,
  n.fecha_envio
FROM public."Notificaciones" n
WHERE n.tipo = 'alerta_llenado'
ORDER BY n.fecha_envio DESC
LIMIT 10;

-- 8. Prueba manual: insertar una notificación para un Admin/Gerente específico
-- Descomenta y reemplaza <USUARIO_ID> con el id del usuario en sesión
-- INSERT INTO public."Notificaciones" (usuario_id, tipo, mensaje, leida, fecha_envio, enlace)
-- VALUES ('<USUARIO_ID>', 'alerta_llenado', 'Prueba de notificación manual', false, now(), '/#dashboard');
