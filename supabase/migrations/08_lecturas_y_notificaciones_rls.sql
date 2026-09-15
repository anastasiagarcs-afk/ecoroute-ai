-- Sprint 4: Analítica e Inteligencia Artificial.
-- Habilita el acceso anónimo del cliente web a las lecturas de sensores y a las
-- alertas predictivas, necesarios para el servicio geminiPredictiveService:
--   * HU-11/RF-24: consulta del histórico de LecturasSensores para estimar la
--     tendencia de llenado y proyectar contenedores en riesgo.
--   * Notificaciones: lectura inicial y registro de alertas de tipo
--     'alerta_predictiva' al superar el contenedor el umbral crítico.

create policy "LecturasSensores select para anon"
  on public."LecturasSensores"
  for select
  using (true);

create policy "Notificaciones select para anon"
  on public."Notificaciones"
  for select
  using (true);

create policy "Notificaciones insert para anon"
  on public."Notificaciones"
  for insert
  with check (true);
