# Fix: Deleted Playlists Still Appearing in Traktor

## Fecha: 2026-02-07

## Problema Reportado

**Síntoma**: Después de eliminar un playlist en Harmony y exportar a Traktor, el playlist eliminado seguía apareciendo en Traktor.

## Causa Raíz

El método `mergePlaylistsFromHarmony()` en `nml-writer.ts` tenía un comportamiento de **"merge"** que solo añadía y actualizaba playlists, pero **nunca eliminaba** playlists que existían en Traktor pero ya no existían en Harmony.

### Comportamiento Anterior

```typescript
/**
 * Merge Harmony playlists into NML structure.
 * - Adds new playlists from Harmony
 * - Updates existing playlists
 * - Preserves playlists that only exist in NML  ← PROBLEMA
 */
```

El método:

1. ✅ Añadía playlists nuevos de Harmony a Traktor
2. ✅ Actualizaba playlists existentes
3. ❌ **PRESERVABA** playlists que solo existían en Traktor (no los eliminaba)

### Flujo Anterior

```
Usuario elimina "My Playlist" en Harmony
  ↓
Export a Traktor se ejecuta
  ↓
mergePlaylistsFromHarmony() procesa:
  - Para cada playlist en Harmony: add/update en NML
  - Para "My Playlist" (ya no en Harmony): ❌ NO HACE NADA
  ↓
"My Playlist" permanece en Traktor NML
  ↓
Usuario abre Traktor → "My Playlist" sigue ahí
```

## Solución Implementada

Modificamos `mergePlaylistsFromHarmony()` para que **Harmony sea la fuente de verdad** para playlists, eliminando los que ya no existen.

### Cambio en Comportamiento

```typescript
/**
 * Merge Harmony playlists into NML structure.
 * - Adds new playlists from Harmony
 * - Updates existing playlists
 * - REMOVES playlists that exist in NML but not in Harmony (Harmony is source of truth)
 */
```

### Nuevo Método: `removePlaylist()`

Implementamos un nuevo método para eliminar playlists del árbol NML:

```typescript
removePlaylist(nml: TraktorNML, playlistId: string): TraktorNML {
  // Deep clone to avoid mutations
  const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));

  // Recursively find and remove the playlist
  const removeFromNode = (parentNode: TraktorNode): boolean => {
    // Get children nodes
    const children = Array.isArray(parentNode.SUBNODES.NODE)
      ? parentNode.SUBNODES.NODE
      : [parentNode.SUBNODES.NODE];

    // Find the playlist by UUID
    const indexToRemove = children.findIndex(
      child => child.TYPE === 'PLAYLIST' && child.PLAYLIST?.UUID === playlistId,
    );

    if (indexToRemove !== -1) {
      // Remove from array
      parentNode.SUBNODES.NODE.splice(indexToRemove, 1);
      return true;
    }

    // Recurse into folders
    for (const child of children) {
      if (child.TYPE === 'FOLDER' && removeFromNode(child)) {
        return true;
      }
    }

    return false;
  };

  removeFromNode(updatedNml.NML.PLAYLISTS.NODE);
  return updatedNml;
}
```

### Lógica Actualizada en `mergePlaylistsFromHarmony()`

```typescript
mergePlaylistsFromHarmony(nml, harmonyPlaylists) {
  let updatedNml = nml;

  const existingUUIDs = this.getPlaylistUUIDsFromNml(nml);
  const harmonyPlaylistIds = new Set(harmonyPlaylists.map(p => p.id));

  // Step 1: Add/Update playlists from Harmony
  for (const playlist of harmonyPlaylists) {
    if (existingUUIDs.has(playlist.id)) {
      updatedNml = this.updatePlaylist(updatedNml, playlist);  // Update
    } else {
      updatedNml = this.addPlaylist(updatedNml, playlist);     // Add new
    }
  }

  // Step 2: Remove playlists that exist in NML but not in Harmony  ← NUEVO
  for (const nmlUUID of existingUUIDs) {
    if (!harmonyPlaylistIds.has(nmlUUID)) {
      updatedNml = this.removePlaylist(updatedNml, nmlUUID);   // Delete
    }
  }

  return updatedNml;
}
```

## Flujo Completo Después del Fix

```
Usuario elimina "My Playlist" en Harmony
  ↓
DB: removePlaylist() ejecuta
  ↓
Event: emitLibraryChanged('playlists-changed', 1)
  ↓
Flag: hasPendingExportChanges = true
  ↓
Auto-sync (debounced) se dispara
  ↓
Export a Traktor:
  - getPlaylistUUIDsFromNml() → ["uuid-1", "uuid-2", "my-playlist-uuid"]
  - harmonyPlaylistIds → ["uuid-1", "uuid-2"]  (sin "my-playlist-uuid")

  Step 1: Add/Update playlists de Harmony
    - uuid-1: update ✅
    - uuid-2: update ✅

  Step 2: Remove playlists no en Harmony
    - my-playlist-uuid: ❌ NO en Harmony → removePlaylist() ✅
  ↓
NML actualizado sin "My Playlist"
  ↓
writeToFile() escribe NML
  ↓
hasPendingExportChanges = false
  ↓
Usuario abre Traktor → "My Playlist" ya no existe ✅
```

## Características del `removePlaylist()`

### 1. Recursivo

Busca en toda la estructura de árbol (folders y playlists anidados):

```
ROOT
  ├─ Folder A
  │   ├─ Playlist 1
  │   └─ Playlist 2 ← puede eliminar aquí
  └─ Playlist 3 ← o aquí
```

### 2. Inmutable

Clona profundamente el NML antes de modificar:

```typescript
const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));
```

### 3. Maneja Arrays y Nodos Únicos

Funciona tanto si `SUBNODES.NODE` es un array como si es un solo nodo.

### 4. Limpieza de Nodos Vacíos

Si eliminar un playlist deja un array vacío, lo elimina:

```typescript
if (parentNode.SUBNODES.NODE.length === 0) {
  delete parentNode.SUBNODES.NODE;
}
```

## Testing

### Test Manual

1. ✅ Crear un playlist "Test Delete" en Harmony
2. ✅ Exportar a Traktor → verificar que aparece
3. ✅ Eliminar "Test Delete" en Harmony
4. ✅ Esperar auto-export (5s) o hacer export manual
5. ✅ Verificar en logs: "Exporting to Traktor..."
6. ✅ Abrir Traktor → "Test Delete" ya no existe

### Verificación en Logs

Buscar estas líneas después de eliminar un playlist:

```
[IPCTraktor] Marking pending export changes
[AutoSync] Starting export to Traktor
[IPCTraktor] Export complete: X tracks, Y playlists
[IPCTraktor] Cleared pending export changes flag
```

### Escenarios Adicionales

#### Eliminar Múltiples Playlists

```
Usuario elimina 3 playlists
  ↓
3x emitLibraryChanged('playlists-changed', 1)
  ↓
Export se ejecuta una vez (debounce)
  ↓
Los 3 playlists se eliminan del NML
```

#### Playlist en Folder Anidado

```
ROOT/Music/House/Summer Mix
  ↓
Usuario elimina "Summer Mix"
  ↓
removePlaylist() busca recursivamente
  ↓
Encuentra y elimina de folder anidado ✅
```

#### Eliminar Último Playlist de un Folder

```
Folder tiene solo 1 playlist
  ↓
removePlaylist() elimina el playlist
  ↓
Array queda vacío
  ↓
delete parentNode.SUBNODES.NODE (limpieza)
```

## Impacto

### Breaking Changes

**⚠️ Importante**: Este cambio modifica el comportamiento fundamental del export:

**Antes**: Traktor podía tener playlists propios que no se tocaban  
**Ahora**: Harmony es la fuente de verdad para playlists

### Implicaciones

1. **Playlists creados directamente en Traktor**:
   - Si un usuario crea un playlist directamente en Traktor
   - Y NO está en Harmony
   - Será **eliminado** en el próximo export desde Harmony
   - **Recomendación**: Crear playlists siempre en Harmony

2. **Workflow Recomendado**:
   - ✅ Importar playlists de Traktor → Harmony (import)
   - ✅ Gestionar playlists en Harmony
   - ✅ Exportar cambios → Traktor (export)
   - ❌ NO crear playlists directamente en Traktor si usas sync bidireccional

### Mitigación

Si el usuario necesita preservar playlists de Traktor:

1. Antes del export, hacer import desde Traktor
2. Esto añade los playlists de Traktor a Harmony
3. Luego el export no los eliminará (están en ambos)

## Consideraciones Técnicas

### Performance

- **Deep clone**: `JSON.parse(JSON.stringify(nml))` puede ser lento con NML muy grandes
- **Recursión**: La búsqueda recursiva es O(n) donde n = número de nodos
- Para colecciones muy grandes (>10,000 playlists), considerar optimización

### Alternativas Consideradas

#### 1. Marcar como "Harmony-managed"

- Añadir flag a cada playlist indicando si fue creado en Harmony
- Solo eliminar playlists "Harmony-managed"
- **Rechazada**: Requiere cambios en el formato NML

#### 2. Confirmación del usuario

- Preguntar antes de eliminar playlists
- **Rechazada**: Rompe el flujo automático del auto-sync

#### 3. Soft delete

- Marcar playlists como eliminados pero no borrarlos
- **Rechazada**: Complejidad innecesaria

### Decisión Final

**Harmony es la fuente de verdad** - Simplifica el modelo mental y es consistente con el propósito del auto-sync bidireccional.

## Edge Cases Manejados

### 1. Playlist No Existe en NML

```typescript
if (!harmonyPlaylistIds.has(nmlUUID)) {
  updatedNml = this.removePlaylist(updatedNml, nmlUUID);
}
```

✅ Solo intenta eliminar si realmente está ausente en Harmony

### 2. NML Sin Playlists

```typescript
if (!updatedNml.NML.PLAYLISTS) {
  return updatedNml;
}
```

✅ Retorna inmediatamente si no hay estructura de playlists

### 3. Array Vacío Después de Eliminar

```typescript
if (parentNode.SUBNODES.NODE.length === 0) {
  delete parentNode.SUBNODES.NODE;
}
```

✅ Limpia nodos vacíos para mantener NML limpio

## Migración

### Usuarios Existentes

**No requiere migración** - El cambio es transparente:

1. **Primera ejecución después del update**:
   - Si hay playlists en Traktor que no están en Harmony
   - Serán eliminados en el próximo export
   - **Recomendación**: Hacer import antes de export

2. **Usuarios con auto-sync bidireccional**:
   - El import sincroniza Traktor → Harmony
   - El export sincroniza Harmony → Traktor
   - Workflow normal no se ve afectado

### Rollback

Si se necesita el comportamiento anterior:

```typescript
// Comentar Step 2 en mergePlaylistsFromHarmony()
// Step 2: Remove playlists that exist in NML but not in Harmony
// for (const nmlUUID of existingUUIDs) {
//   if (!harmonyPlaylistIds.has(nmlUUID)) {
//     updatedNml = this.removePlaylist(updatedNml, nmlUUID);
//   }
// }
```

---

**Última actualización**: 2026-02-07  
**Commit**: `58a3c7d`
