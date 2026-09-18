# Plan: Dos Botones de Cierre + Aislamiento de Datos + Historial en Dos Columnas

## Resumen

Reemplazar el botón único "Cerrar Jornada del Día" por **dos botones explícitos** ("Cierre Parcial" y "Cierre Final"), garantizar el **aislamiento de métricas** tras cada cierre final (todo vuelve a 0), y reestructurar el historial en **dos columnas**: Jornadas y Rutas Completadas.

---

## 1. Dos Botones de Cierre (UI)

### Archivo: `app/page.tsx`

**Reemplazar** el botón único (líneas 373-381) por dos botones:

```tsx
{/* Botón Cierre Parcial */}
<button
  onClick={() => handleCerrarJornada("parcial")}
  className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
>
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  Cierre Parcial
</button>

{/* Botón Cierre Final */}
<button
  onClick={() => handleCerrarJornada("final")}
  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
>
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  Cierre Final
</button>
```

### Modificar `handleCerrarJornada` para aceptar tipo

```tsx
const handleCerrarJornada = useCallback(async (tipoCierre: "parcial" | "final") => {
  if (!sesion?.usuario?.id) return;

  const rutasJornada = await obtenerRutasJornadaActual(sesion.usuario.id, fechaInicioJornada);

  const resumen = calcularResumenJornada(rutasJornada, contenedores, fechaInicioJornada);

  // Sobrescribir el tipo de cierre con la elección explícita del usuario
  resumen.tipo_cierre = tipoCierre;

  setResumenJornada(resumen);
  setCierreJornadaVisible(true);
}, [sesion, contenedores, fechaInicioJornada]);
```

### Modificar `handleConfirmarCierre`

- Ya maneja el reset de `fechaInicioJornada` para cierre final
- Para cierre parcial: mantiene `fechaInicioJornada` intacto
- Ambos casos: persisten en Supabase vía `cerrarJornada()`
- Ambos casos: recargan rutas activas

---

## 2. Aislamiento de Datos Post-Cierre Final

### Archivo: `src/lib/operadoresService.ts`

**Modificar `obtenerRutasJornadaActual`** para aceptar `fechaInicioJornada`:

```tsx
export async function obtenerRutasJornadaActual(
  operadorId: string,
  fechaInicioJornada?: string
): Promise<Ruta[]> {
  // ... query igual que ahora ...

  const rutasDeHoy = (data ?? []).filter((ruta) => {
    // Rutas activas: siempre incluir
    if (ruta.estado === "aceptada" || ruta.estado === "en_progreso") return true;

    // Rutas completadas: solo si su ultima_ejecucion es posterior a fechaInicioJornada
    if (fechaInicioJornada && ruta.ultima_ejecucion) {
      return new Date(ruta.ultima_ejecucion) >= new Date(fechaInicioJornada);
    }

    // Fallback: filtro por día actual
    const fechaCreacion = new Date(ruta.fecha_creacion);
    return fechaCreacion >= hoy && fechaCreacion < manana;
  });

  return rutasDeHoy as Ruta[];
}
```

### Archivo: `src/lib/jornadaService.ts`

**Modificar `calcularResumenJornada`** para filtrar rutas por `fecha_inicio`:

```tsx
const rutasDelDia = (() => {
  if (rutas.length === 0) return [];

  const inicioJornada = new Date(fecha_inicio);

  return rutas.filter((r) => {
    // Rutas activas: siempre incluir
    if (r.estado === "aceptada" || r.estado === "en_progreso") return true;

    // Rutas completadas/finalizadas: solo si ultima_ejecucion >= fecha_inicio
    if (r.ultima_ejecucion) {
      return new Date(r.ultima_ejecucion) >= inicioJornada;
    }

    // Fallback: creada hoy
    return r.fecha_creacion && esMismaFecha(r.fecha_creacion, hoy);
  });
})();
```

---

## 3. Historial en Dos Columnas

### Archivo: `src/components/HistorialOperador.tsx`

**Reestructurar** el layout de una sola columna a dos columnas (`lg:grid-cols-2`):

**Columna izquierda: "Jornadas"**
- Lista de todos los registros de cierre (parciales y finales)
- Cada tarjeta muestra: tipo de cierre (badge), fecha/hora, rutas, km, tiempo, combustible
- Badges diferenciados: ámbar para parcial, esmeralda para final

**Columna derecha: "Rutas Completadas"**
- Lista de todas las rutas completadas del operador
- Cada tarjeta muestra: nombre, contenedores, distancia, estado, fecha
- Tarjetas expandibles con detalles (ID, contenedores, tiempo estimado)

```tsx
return (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
      Mi Historial
    </h3>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Columna Izquierda: Jornadas */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Jornadas ({jornadas.length})
        </h4>
        {/* ... lista de jornadas ... */}
      </div>

      {/* Columna Derecha: Rutas Completadas */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Rutas Completadas ({rutas.length})
        </h4>
        {/* ... lista de rutas ... */}
      </div>
    </div>
  </div>
);
```

---

## 4. Flujo Completo de Cierres

### Escenario: Múltiples cierres en un día

```
08:00 - Operador inicia sesión → fechaInicioJornada = 08:00
08:30 - Completa Ruta A
09:00 - Completa Ruta B
09:30 - Clic "Cierre Parcial" → guarda: 2 rutas, 10km, 1h30m
         fechaInicioJornada se mantiene en 08:00
10:00 - Se le asigna Ruta C, la completa
10:30 - Se le asigna Ruta D, la completa
11:00 - Clic "Cierre Final" → guarda: 2 rutas (C+D), 8km, 1h30m (desde 09:30)
         fechaInicioJornada = 11:00 (reset)
         → Métricas en UI vuelven a 0
11:30 - Se le asigna Ruta E, la completa
12:00 - Clic "Cierre Parcial" → guarda: 1 ruta (E), 4km, 1h (desde 11:00)
         fechaInicioJornada se mantiene en 11:00
12:30 - Se le asigna Ruta F, la completa
13:00 - Clic "Cierre Final" → guarda: 1 ruta (F), 4km, 2h (desde 11:00)
         fechaInicioJornada = 13:00 (reset)
```

### Escenario: Logout/Login entre cierres parciales

```
08:00 - Operador inicia sesión → fechaInicioJornada = 08:00 (localStorage)
09:00 - Completa Ruta A
09:30 - Clic "Cierre Parcial" → guarda registro
09:35 - Operador cierra sesión (internet se cae, etc.)
10:00 - Operador vuelve a iniciar sesión
         → fechaInicioJornada se lee de localStorage = 08:00
         → Las métricas NO se reinician
10:30 - Completa Ruta B
11:00 - Clic "Cierre Final" → guarda: 2 rutas (A+B), desde 08:00
         fechaInicioJornada = 11:00 (reset)
```

---

## 5. Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `app/page.tsx` | Dos botones, `handleCerrarJornada(tipo)`, pasar `fechaInicioJornada` a `obtenerRutasJornadaActual` |
| `src/lib/operadoresService.ts` | `obtenerRutasJornadaActual` acepta `fechaInicioJornada` y filtra rutas completadas por esa fecha |
| `src/lib/jornadaService.ts` | `calcularResumenJornada` filtra rutas por `fecha_inicio` |
| `src/components/HistorialOperador.tsx` | Layout en dos columnas: Jornadas + Rutas Completadas |
| `src/components/CierreJornadaModal.tsx` | Mostrar tipo de cierre explícito en el título/badge |
| `INFORME_PROYECTO.md` | Actualizar CU-OP-02, RF-27 a RF-32, estado de sprints |
| `README.md` | Actualizar estado de sprints |
| `CHANGELOG.md` | Agregar entradas para dos botones y aislamiento de datos |

---

## 6. Verificación

1. `npx tsc --noEmit` → 0 errores
2. `npm run informe` → regenerar BITACORA.md
3. Prueba manual del flujo:
   - Completar 2 rutas → Cierre Parcial → verificar que métricas se mantienen
   - Completar 2 rutas más → Cierre Final → verificar que métricas vuelven a 0
   - Completar 1 ruta → Cierre Final → verificar que solo cuenta 1 ruta
   - Logout → Login → verificar que fechaInicioJornada se preserva
   - Verificar historial en dos columnas

---

## 7. Regla de Git

**NO** ejecutar `git add`, `git commit`, `git push` ni ningún comando de Git.
Todos los cambios quedan únicamente en el Working Directory local.
