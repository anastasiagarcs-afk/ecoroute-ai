-- Sprint 6: Permite eliminar contenedores desde el mapa.
-- Complementa las políticas de la migración 04 (select/insert/update) con el
-- borrado, necesario para la acción "Eliminar" del popup del marcador.
-- Al borrar un contenedor, las entregas de reciclaje asociadas conservan su
-- historial con contenedor_id = null (FK con ON DELETE SET NULL).

create policy "Contenedores delete para anon"
  on public."Contenedores"
  for delete
  using (true);