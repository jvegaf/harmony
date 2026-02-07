# Fixes: Traktor Export Issues

## Fecha: 2026-02-07

## Problemas Identificados

### 1. Progreso de Export Estancado en 60%

**Síntoma**: Durante el export a Traktor NML, el progreso se quedaba en 60% sin actualizarse hasta completar.

**Causa Raíz**: El worker de export (`export-worker.ts`) solo enviaba actualizaciones de progreso adicionales después del 60% si había playlists para exportar (línea 165). Si no había playlists o el proceso de escritura tardaba mucho, el usuario no veía progreso visual.

**Solución Implementada**:

- Añadido `sendProgress` en 65% durante merge de playlists
- Añadido `sendProgress` en 70% cuando NO hay playlists (antes se saltaba)
- Añadido `sendProgress` en 75% antes de escribir archivo
- Añadido `sendProgress` en 80% durante creación de backup
- Añadido `sendProgress` en 82% cuando se salta el backup
- Añadido `sendProgress` en 85% después de crear backup
- Añadido `sendProgress` en 90% durante escritura de archivo
- Añadido `sendProgress` en 95% después de escribir archivo

**Archivo Modificado**: `src/main/lib/traktor/sync/export-worker.ts`

### 2. Export Innecesario en Cada Inicio

**Síntoma**: Con auto-sync configurado en modo `'bidirectional'`, la aplicación exportaba a Traktor en cada inicio, incluso cuando no había cambios en la librería de Harmony.

**Causa Raíz**: El servicio de auto-sync (`auto-sync-service.ts`) ejecutaba SIEMPRE el export cuando la dirección era `'bidirectional'` o `'export'`, sin verificar si había cambios pendientes en Harmony que necesitaran ser exportados.

**Solución Implementada**:

#### a) Flag de Cambios Pendientes

Añadido un nuevo campo opcional al tipo `TraktorConfig`:

```typescript
export interface TraktorConfig {
  // ... otros campos existentes

  /**
   * Flag indicating there are pending changes in Harmony
   * that need to be exported to Traktor. Set by library event handlers,
   * cleared after successful export.
   */
  hasPendingExportChanges?: boolean;

  // ... resto de campos
}
```

#### b) Marcar Flag en Cambios de Librería

En `IPCTraktorModule.ts`, cuando se detecta un cambio en la librería:

```typescript
libraryEventBus.on('library-changed', () => {
  // Mark that there are pending changes to export
  const config = this.getConfig();
  if (!config.hasPendingExportChanges) {
    log.debug('[IPCTraktor] Marking pending export changes');
    this.setConfig({ hasPendingExportChanges: true });
  }
  this.triggerAutoSyncDebounced();
});
```

#### c) Verificar Flag Antes de Exportar

En `auto-sync-service.ts`, en el método `runSync()`:

```typescript
// Export to Traktor
if (direction === 'export' || direction === 'bidirectional') {
  // Check if there are pending changes before exporting
  const config = this.operations.getConfig();
  const hasPendingChanges = config.hasPendingExportChanges ?? false;

  if (!hasPendingChanges) {
    log.info('[AutoSync] No pending export changes, skipping export');
    this.updateStatus({
      progress: 95,
      message: 'No changes to export',
    });
  } else {
    // ... ejecutar export ...
  }
}
```

#### d) Limpiar Flag Después de Export Exitoso

En `IPCTraktorModule.ts`, después de completar el export (tanto en el handler IPC como en el método interno):

```typescript
// Clear pending export changes flag after successful export
this.setConfig({ hasPendingExportChanges: false });
log.debug('[IPCTraktor] Cleared pending export changes flag');
```

**Archivos Modificados**:

- `src/preload/types/traktor.ts` - Añadido campo `hasPendingExportChanges`
- `src/main/lib/traktor/sync/auto-sync-service.ts` - Verificación del flag antes de exportar
- `src/main/modules/IPCTraktorModule.ts` - Marcar flag en cambios, limpiar después de export

## Flujo Completo

### Sin Cambios en Harmony

```
App Startup (bidirectional auto-sync enabled)
  ↓
Auto-Sync Service: triggerSync('startup')
  ↓
Direction: bidirectional
  ↓
1. Import from Traktor ✅
  ↓
2. Check hasPendingExportChanges → false
  ↓
Skip Export (no cambios pendientes) ✅
  ↓
Complete
```

### Con Cambios en Harmony

```
User edits track metadata in Harmony
  ↓
libraryEventBus.emit('library-changed')
  ↓
Set hasPendingExportChanges = true
  ↓
Trigger auto-sync (debounced)
  ↓
Direction: bidirectional
  ↓
1. Import from Traktor ✅
  ↓
2. Check hasPendingExportChanges → true
  ↓
3. Export to Traktor ✅
  ↓
4. Set hasPendingExportChanges = false
  ↓
Complete
```

## Testing

### Progreso de Export

1. ✅ Iniciar export manual desde Settings
2. ✅ Verificar que el progreso avanza suavemente de 0% a 100%
3. ✅ No debería quedarse estancado en 60%
4. ✅ Probar con y sin playlists

### Flag de Cambios Pendientes

1. ✅ Iniciar app con auto-sync bidirectional habilitado
2. ✅ **Sin hacer cambios**, esperar auto-sync
3. ✅ Verificar en logs: "No pending export changes, skipping export"
4. ✅ Hacer cambios en un track (metadata, cue points, etc.)
5. ✅ Verificar en logs: "Marking pending export changes"
6. ✅ Esperar auto-sync
7. ✅ Verificar que SE ejecuta el export
8. ✅ Verificar en logs: "Cleared pending export changes flag"
9. ✅ Reiniciar app
10. ✅ Verificar que NO se ejecuta export (no hay cambios pendientes)

## Beneficios

### Performance

- 🚀 Export solo se ejecuta cuando hay cambios reales
- 🚀 Ahorra tiempo en cada inicio de la app
- 🚀 Reduce escrituras innecesarias al disco

### User Experience

- 👍 Progreso visual claro durante export (0% → 100%)
- 👍 Feedback más granular de cada fase
- 👍 No hay "saltos" o pausas en el progreso

### Reliability

- ✅ Menor desgaste del SSD (menos escrituras)
- ✅ Menor riesgo de corrupción del NML (menos modificaciones)
- ✅ Logs más claros sobre qué se exporta y cuándo

## Notas de Implementación

### Compatibilidad con Configs Existentes

El campo `hasPendingExportChanges` es **opcional** (`?:`), por lo que:

- Configs existentes sin el campo funcionarán (valor `undefined`)
- `undefined ?? false` se evalúa como `false` (no hay cambios pendientes)
- Primera modificación de librería lo seteará a `true`

### Edge Cases Manejados

1. **Flag undefined**: Se trata como `false` (no hay cambios)
2. **Export falla**: El flag NO se limpia, así que se reintentará en próximo sync
3. **Export manual**: También limpia el flag
4. **Multiple library changes**: Solo se marca una vez (no acumula)

### Consideraciones Futuras

1. **Persistencia entre sesiones**: El flag se guarda en config, así que persiste entre reinicios
2. **Race conditions**: No hay problema porque todo corre en el main thread (single-threaded)
3. **Manual sync**: Si el usuario hace sync manual desde Settings, también se maneja correctamente

## Migración

No se requiere migración. Los cambios son **backward compatible**:

- Nuevo campo opcional en config
- Comportamiento por defecto seguro (no exportar si no está marcado)
- Logs claros para debugging

---

**Última actualización**: 2026-02-07

## Ver También

- `traktor-playlist-sync-fix.md` - Fix adicional para sincronización de cambios en playlists y track metadata
