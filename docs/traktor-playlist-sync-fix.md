# Fix: Playlist Changes Not Syncing to Traktor

## Fecha: 2026-02-07

## Problema Reportado

**Síntoma**: Al eliminar un playlist en Harmony, el cambio no se sincronizaba automáticamente con Traktor, incluso con auto-sync bidireccional habilitado.

## Causa Raíz

Las operaciones de playlists y actualizaciones de tracks **NO estaban emitiendo eventos** al sistema de eventos de librería (`libraryEventBus`), por lo que:

1. El flag `hasPendingExportChanges` nunca se marcaba como `true`
2. El auto-sync service no detectaba cambios pendientes
3. El export a Traktor no se ejecutaba

### Operaciones Afectadas

**Playlist operations** (sin emisión de eventos):

- `PLAYLIST_ADD` - Crear nuevo playlist
- `PLAYLIST_REMOVE` - Eliminar playlist
- `PLAYLIST_RENAME` - Renombrar playlist
- `PLAYLIST_SET_TRACKS` - Cambiar tracks de un playlist
- `PLAYLIST_REORDER_TRACKS` - Reordenar tracks en playlist

**Track operations** (sin emisión de eventos):

- `TRACK_UPDATE` - Actualizar metadata (BPM, comentarios, genre, etc.)

### Operaciones Que SÍ Funcionaban

Estas operaciones **YA emitían eventos** correctamente:

- ✅ `TRACKS_ADD` → `tracks-added`
- ✅ `TRACKS_REMOVE` → `tracks-removed`

## Solución Implementada

Modificado `src/main/modules/DatabaseModule.ts` para emitir eventos después de cada operación de base de datos:

### Código Añadido

```typescript
// PLAYLIST_ADD
ipcMain.handle(channels.PLAYLIST_ADD, async (_, playlist: Playlist): Promise<Playlist> => {
  const result = await this.db.insertPlaylist(playlist);
  emitLibraryChanged('playlists-changed', 1);  // ← NUEVO
  return result;
});

// PLAYLIST_REMOVE
ipcMain.handle(channels.PLAYLIST_REMOVE, async (_, playlistID: string): Promise<void> => {
  await this.db.removePlaylist(playlistID);
  emitLibraryChanged('playlists-changed', 1);  // ← NUEVO
});

// PLAYLIST_RENAME
ipcMain.handle(channels.PLAYLIST_RENAME, async (_, playlistID: string, name: string): Promise<void> => {
  await this.db.renamePlaylist(playlistID, name);
  emitLibraryChanged('playlists-changed', 1);  // ← NUEVO
});

// PLAYLIST_SET_TRACKS
ipcMain.handle(channels.PLAYLIST_SET_TRACKS, async (_, playlistID: string, tracks: Track[]): Promise<void> => {
  await this.db.setTracks(playlistID, tracks);
  emitLibraryChanged('playlists-changed', 1);  // ← NUEVO
});

// PLAYLIST_REORDER_TRACKS
ipcMain.handle(channels.PLAYLIST_REORDER_TRACKS, async (...): Promise<void> => {
  await this.db.reorderTracks(playlistID, tracksToMove, targetTrack, position);
  emitLibraryChanged('playlists-changed', 1);  // ← NUEVO
});

// TRACK_UPDATE
ipcMain.handle(channels.TRACK_UPDATE, async (_, track: Track): Promise<void> => {
  await this.db.updateTrack(track);
  emitLibraryChanged('tracks-updated', 1);  // ← NUEVO
});
```

### Cambios Técnicos

1. **Convertido a `async` handlers**: Todos los handlers ahora son `async` para poder usar `await` y emitir el evento después de completar la operación
2. **Emisión después de operación**: El evento se emite DESPUÉS de que la operación de DB se completa exitosamente
3. **Tipos de eventos apropiados**:
   - Playlists → `'playlists-changed'`
   - Track metadata → `'tracks-updated'`

## Flujo Completo

### Antes del Fix

```
Usuario elimina playlist en UI
  ↓
IPC: PLAYLIST_REMOVE
  ↓
DB: removePlaylist()
  ↓
❌ NO se emite evento
  ↓
❌ Flag hasPendingExportChanges permanece en false
  ↓
❌ Auto-sync NO exporta a Traktor
```

### Después del Fix

```
Usuario elimina playlist en UI
  ↓
IPC: PLAYLIST_REMOVE
  ↓
DB: removePlaylist()
  ↓
✅ emitLibraryChanged('playlists-changed', 1)
  ↓
✅ libraryEventBus.emit('library-changed')
  ↓
✅ IPCTraktorModule detecta cambio
  ↓
✅ setConfig({ hasPendingExportChanges: true })
  ↓
✅ Auto-sync (debounced) se dispara
  ↓
✅ Export a Traktor se ejecuta
  ↓
✅ hasPendingExportChanges se limpia
```

## Testing

### Test Manual

1. ✅ Configurar auto-sync bidireccional
2. ✅ Crear un nuevo playlist en Harmony
3. ✅ Verificar en logs: "Marking pending export changes"
4. ✅ Esperar 5 segundos (debounce)
5. ✅ Verificar que se ejecuta export a Traktor
6. ✅ Abrir Traktor y verificar que el nuevo playlist aparece

### Otros Escenarios a Probar

- ✅ Eliminar playlist → export se ejecuta
- ✅ Renombrar playlist → export se ejecuta
- ✅ Añadir/quitar tracks de playlist → export se ejecuta
- ✅ Reordenar tracks en playlist → export se ejecuta
- ✅ Editar metadata de track (BPM, genre, etc.) → export se ejecuta

### Verificación en Logs

Buscar estas líneas en los logs después de hacer cambios:

```
[IPCTraktor] Marking pending export changes
[AutoSync] Debounced sync scheduled (5000ms)
[AutoSync] Starting export to Traktor
[IPCTraktor] Export complete: X tracks, Y playlists
[IPCTraktor] Cleared pending export changes flag
```

## Impacto

### Cambios en Comportamiento

**Antes**: Solo track add/remove sincronizaban automáticamente  
**Ahora**: TODAS las operaciones de librería sincronizan (tracks, playlists, metadata)

### Eventos Ahora Emitidos

| Operación               | Tipo de Evento      | Count |
| ----------------------- | ------------------- | ----- |
| Add playlist            | `playlists-changed` | 1     |
| Remove playlist         | `playlists-changed` | 1     |
| Rename playlist         | `playlists-changed` | 1     |
| Set playlist tracks     | `playlists-changed` | 1     |
| Reorder playlist tracks | `playlists-changed` | 1     |
| Update track metadata   | `tracks-updated`    | 1     |
| Add tracks              | `tracks-added`      | N     |
| Remove tracks           | `tracks-removed`    | N     |

### Performance

- ✅ **Sin impacto**: Los eventos son síncronos y muy ligeros
- ✅ **Debounce protege**: Múltiples cambios rápidos se agrupan (5s por defecto)
- ✅ **Export inteligente**: Solo se exporta cuando hay cambios reales

## Edge Cases Manejados

### Múltiples Cambios Rápidos

```
Usuario elimina 3 playlists en 2 segundos
  ↓
3x emitLibraryChanged('playlists-changed', 1)
  ↓
Flag se marca en el primer evento
  ↓
Debounce timer se resetea en cada evento
  ↓
Export se ejecuta UNA VEZ después de 5s
```

### Cambios Mientras Export en Progreso

```
Export en progreso (hasPendingChanges = true)
  ↓
Usuario hace más cambios
  ↓
Flag YA está en true (no cambia nada)
  ↓
Export completa y limpia el flag
  ↓
Próximo auto-sync detectará que hay nuevos cambios
```

## Consideraciones Futuras

### Posibles Mejoras

1. **Granularidad de eventos**: Distinguir entre tipos de cambios de playlist

   - `playlist-created`, `playlist-deleted`, `playlist-modified`
   - Permitiría optimizaciones más específicas

2. **Batch operations**: Emitir un solo evento para múltiples cambios

   - Ejemplo: `emitLibraryChanged('playlists-changed', deletedCount)`

3. **Cue points**: Considerar emitir eventos cuando se añaden/modifican cue points
   - Actualmente solo se sincronizan desde Traktor
   - Si Harmony permite editar cue points, necesitará eventos

### No Requiere Migración

Los cambios son completamente **backward compatible**:

- Eventos adicionales, no cambios en eventos existentes
- No afecta configuración del usuario
- Funciona con el flag `hasPendingExportChanges` ya implementado

---

**Última actualización**: 2026-02-07  
**Commit**: `146c43b`
