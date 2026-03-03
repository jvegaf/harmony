
# Plan: Implementación de Context Menus

## Arquitectura General

Crear un **sistema de context menu basado en React** usando el componente `Menu` de Mantine v7. 
- Se crea un **hook `useContextMenu`** que gestiona el estado (posición, datos, visibilidad) del menú contextual.
- Se crean **3 componentes de menú** (uno por scope): `TrackContextMenu`, `PlaylistContextMenu`, `DetailsContextMenu`.
- Las acciones se ejecutan **directamente** llamando a las APIs de los stores de Zustand (sin pasar por eventos Tauri).
- El hook `useIPCMenuEvents` se mantiene intacto (por si se necesitan menú commands del backend en el futuro), pero ya no será el canal principal.

---

## Archivos a Crear

### 1. `src/hooks/useContextMenu.ts` — Hook genérico de estado del context menu

Gestiona:
- `opened: boolean` — si el menú está visible
- `position: { x: number, y: number }` — coordenadas del clic derecho
- `data: T` — payload genérico (tracks seleccionados, playlistId, etc.)
- `open(event, data)` — muestra el menú en las coordenadas del evento
- `close()` — cierra el menú

Será un hook genérico tipado: `useContextMenu<T>()`.

### 2. `src/components/ContextMenu/TrackContextMenu.tsx` — Menú contextual de tracks

Mantine `Menu` controlado (`opened` + coordenadas absolutas via CSS).

**Items del menú (en orden):**
1. **Edit Details** → `navigate('/details/${track.id}')` (solo si 1 track seleccionado)
2. **Separador**
3. **Add to New Playlist** → `playlistsAPI.create('New playlist', selected)`
4. **Add to Playlist →** Submenu dinámico con todas las playlists disponibles → `playlistsAPI.addTracks(playlistId, selected)`
5. **Remove from Playlist** → `playlistsAPI.removeTracks(currentPlaylist, selected)` (solo visible si `currentPlaylist !== null`)
6. **Separador**
7. **Find by Artist** → `libraryAPI.search(track.artist)` (solo si 1 track con artist)
8. **Search on...** → Submenu con search engines configurados → `shell.openExternal(url)` con query construida desde `urlTemplate`
9. **Separador**
10. **Filename to Tags** → `taggerAPI.filenameToTags(selected)`
11. **Find Tag Candidates** → `taggerAPI.findCandidates(selected)`
12. **Analyze Audio** → Función `analyzeAudio(selected)` (extraída de `useIPCMenuEvents`)
13. **Separador**
14. **Delete from Library** → `libraryAPI.deleteTracks(selected)` (usa confirmación existente)

### 3. `src/components/ContextMenu/PlaylistContextMenu.tsx` — Menú contextual de playlists

**Items del menú:**
1. **Rename** → `uiAPI.setRenamingPlaylist(playlistId)` (activa el input inline existente)
2. **Duplicate** → `playlistsAPI.duplicate(playlistId)`
3. **Export to M3U** → `playlistsAPI.exportToM3u(playlistId)`
4. **Separador**
5. **Delete Playlist** → `playlistsAPI.remove(playlistId)`

### 4. `src/components/ContextMenu/DetailsContextMenu.tsx` — Menú contextual del Details view

**Comportamiento:** En vez de un menú custom, **quitar el `event.preventDefault()`** para permitir el menú nativo del navegador (Cut/Copy/Paste) en los inputs de texto. El menú nativo es lo más útil en campos de formulario dentro de un WebView.

### 5. `src/components/ContextMenu/ContextMenu.module.css` — Estilos compartidos

Posicionamiento absoluto del menú en las coordenadas del clic derecho.

### 6. `src/components/ContextMenu/index.ts` — Re-exports

---

## Archivos a Modificar

### 7. `src/components/TrackList/TrackList.tsx`

- Importar `useContextMenu` y `TrackContextMenu`
- Modificar `onShowCtxtMenu` para llamar `contextMenu.open(event, payload)` en vez de `menu.tracklist(payload)`
- Renderizar `<TrackContextMenu />` dentro del componente

### 8. `src/components/Sidebar/Sidebar.tsx`

- Importar `useContextMenu` y `PlaylistContextMenu`
- Modificar `onShowCtxtMenu` para llamar `contextMenu.open(event, playlistId)` en vez de `menu.playlist(playlistId)`
- Renderizar `<PlaylistContextMenu />` dentro del componente

### 9. `src/views/Details/Details.tsx`

- **Eliminar** el `handleContextMenu` que hace `event.preventDefault()` + `menu.common()`
- **Quitar** los `onContextMenu={handleContextMenu}` de los inputs
- Esto restaura el menú nativo del WebView (cortar/copiar/pegar) en los campos de texto

### 10. `src/lib/tauri-api.ts`

- Actualizar los AIDEV-NOTE del objeto `menu` para indicar que los context menus ahora están implementados en los componentes React
- Mantener los stubs por retrocompatibilidad (no romper nada)

### 11. `src/hooks/useIPCMenuEvents.ts`

- Extraer la función `analyzeAudio` a un helper reutilizable (o exportarla) para que `TrackContextMenu` pueda usarla sin duplicar la lógica de notificaciones/progress
- Actualizar AIDEV-NOTE para reflejar que las acciones del menú ahora se llaman directamente

---

## Detalles Técnicos

### Posicionamiento del Menú
Mantine `Menu` con `position="bottom-start"` no funciona bien para context menus posicionales. Se usará **`Popover`** o un **`Menu` con `opened` controlado + estilo CSS posicional `position: fixed; top: Y; left: X`** anclado a un target invisible en las coordenadas del clic.

Patrón probado:
```tsx
<Menu opened={opened} onChange={setOpened} position="bottom-start">
  <Menu.Target>
    <div style={{ position: 'fixed', top: position.y, left: position.x, width: 0, height: 0 }} />
  </Menu.Target>
  <Menu.Dropdown>
    {/* items */}
  </Menu.Dropdown>
</Menu>
```

### Search Engines Submenu
- Al abrir el TrackContextMenu, cargar `searchEngines` desde `config.get('searchEngines')` 
- Construir la URL reemplazando `{query}` en `urlTemplate` con `encodeURIComponent(track.artist + ' ' + track.title)`
- Abrir con `shell.openExternal(url)`

### Cierre del Menú
- Click fuera → cierre automático (Mantine lo maneja)
- Scroll → cerrar menú
- Seleccionar un item → cerrar menú
- Escape → cerrar menú

---

## Orden de Implementación

1. Hook `useContextMenu` (base para todos los menús)
2. `TrackContextMenu` + integración en `TrackList`
3. `PlaylistContextMenu` + integración en `Sidebar`
4. Fix `Details.tsx` (quitar preventDefault)
5. Extraer `analyzeAudio` como helper reutilizable
6. Actualizar AIDEV-NOTEs
7. `pnpm run typecheck` + `pnpm run lint`
