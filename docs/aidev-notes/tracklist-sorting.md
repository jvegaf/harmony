# Track List Sorting - Developer Notes

## Overview

This document describes the persistence mechanism for track list sorting preferences in the Harmony music manager.

---

## Sort Persistence Feature

### Problem

Users expect the track list to maintain their sorting preferences between sessions. Without persistence, the sorting would reset to default every time the application is restarted.

### Solution

The track list sorting state is persisted to the application configuration and restored on initialization.

---

## Implementation

### Configuration Initialization

**Location:** `src/renderer/src/stores/useLibraryStore.ts:78-79`

**Note:**

```typescript
// AIDEV-NOTE: Initialize tracklistSort from persisted config
const initialTracklistSort = config.__initialConfig.tracklistSort || { colId: 'path', mode: 'desc' };
```

**Details:**

- On store initialization, the sort configuration is read from `config.__initialConfig.tracklistSort`
- Falls back to default sorting: column `'path'` in descending mode (`'desc'`)
- This value is used to initialize the `tracklistSort` state in the Zustand store

**Default Sort:**

```typescript
{
  colId: 'path',    // Sort by file path (crate)
  mode: 'desc'      // Descending order (Z to A)
}
```

---

### Grid Initialization

**Location:** `src/renderer/src/components/TrackList/TrackList.tsx:160-167`

**Note:**

```typescript
// AIDEV-NOTE: Apply persisted sort configuration on grid initialization
if (tracklistSort && tracklistSort.colId && tracklistSort.mode) {
  params.api.applyColumnState({
    state: [{ colId: tracklistSort.colId, sort: tracklistSort.mode as 'asc' | 'desc' }],
    defaultState: { sort: null },
  });
  logger.info(`[TracksTable] Applied initial sort: ${tracklistSort.colId} ${tracklistSort.mode}`);
}
```

**Details:**

- Triggered in the `onGridReady` event handler
- Checks if valid `tracklistSort` configuration exists
- Uses AG Grid's `applyColumnState()` API to apply the persisted sort
- Logs the applied sort configuration for debugging

**AG Grid API:**

```typescript
params.api.applyColumnState({
  state: [
    {
      colId: tracklistSort.colId, // Column ID to sort
      sort: tracklistSort.mode, // 'asc' or 'desc'
    },
  ],
  defaultState: { sort: null }, // Clear any other column sorts
});
```

---

### Saving Sort Changes

**Location:** `src/renderer/src/components/TrackList/TrackList.tsx:208-222`

**Note:**

```typescript
// AIDEV-NOTE: Save sort state when user changes column sorting
const onSortChanged = useCallback(
  (event: SortChangedEvent) => {
    const sortedColumns = event.api.getColumnState().filter(col => col.sort !== null);

    if (sortedColumns.length > 0) {
      const colId = sortedColumns[0].colId!;
      const sortMode = sortedColumns[0].sort!;

      logger.info(`[TracksTable] Sort changed: ${colId}, mode: ${sortMode}`);
      libraryAPI.setTracklistSort(colId, sortMode);
    }
  },
  [libraryAPI],
);
```

**Details:**

- Triggered whenever user changes column sorting (clicks column header)
- Gets all columns that have sorting applied
- Takes the first sorted column (AG Grid supports multi-column sorting, but we only persist one)
- Calls `libraryAPI.setTracklistSort()` to persist the new configuration
- Logs the change for debugging

---

### Store API - Persist to Config

**Location:** `src/renderer/src/stores/useLibraryStore.ts:448-453`

```typescript
setTracklistSort: async (colId: string, mode: string): Promise<void> => {
  const tracklistSort = { colId, mode };
  set({ tracklistSort });
  await config.set('tracklistSort', tracklistSort);
  logger.debug('Tracklist sort saved:', tracklistSort);
},
```

**Details:**

- Updates the Zustand store state
- Persists to application config via IPC call: `config.set('tracklistSort', tracklistSort)`
- The config is saved to disk, ensuring persistence across app restarts

---

## Data Flow

```
User clicks column header
         ↓
AG Grid fires SortChangedEvent
         ↓
onSortChanged callback
         ↓
libraryAPI.setTracklistSort(colId, mode)
         ↓
Update Zustand store state
         ↓
config.set('tracklistSort', {...}) via IPC
         ↓
Saved to disk (electron-store)
```

**On App Restart:**

```
App starts
         ↓
config.__initialConfig.tracklistSort loaded
         ↓
useLibraryStore initialized with saved value
         ↓
TrackList component mounts
         ↓
onGridReady applies saved sort
         ↓
AG Grid displays sorted data
```

---

## Available Columns

Based on `TrackList.tsx:43-82`, the sortable columns are:

| Column ID    | Header Name | Description                |
| ------------ | ----------- | -------------------------- |
| `title`      | title       | Track title                |
| `artist`     | artist      | Track artist               |
| `duration`   | Time        | Track duration (formatted) |
| `path`       | Crate       | Parent folder name         |
| `rating`     | rating      | Star rating (custom sort)  |
| `genre`      | genre       | Music genre                |
| `year`       | year        | Release year               |
| `bpm`        | bpm         | Beats per minute           |
| `bitrate`    | bitrate     | Audio bitrate (formatted)  |
| `initialKey` | Key         | Musical key                |

---

## State Structure

### Zustand Store State

```typescript
{
  tracklistSort: {
    colId: string,    // Column ID (e.g., 'title', 'artist', 'path')
    mode: string      // Sort mode: 'asc' or 'desc'
  }
}
```

### Persisted Config (electron-store)

```json
{
  "tracklistSort": {
    "colId": "path",
    "mode": "desc"
  }
}
```

---

## Edge Cases

1. **Invalid persisted config**: Falls back to default `{ colId: 'path', mode: 'desc' }`
2. **Column doesn't exist**: AG Grid ignores invalid column IDs
3. **Multiple sorted columns**: Only the first sorted column is persisted
4. **No sorted columns**: Previous sort configuration remains in store but grid shows unsorted

---

## Related Files

- `src/renderer/src/stores/useLibraryStore.ts` - Store initialization and API
- `src/renderer/src/components/TrackList/TrackList.tsx` - Grid component with sort handlers
- `src/main/lib/config.ts` - Config persistence (electron-store)

---

## Future Improvements

Potential enhancements not yet implemented:

1. **Multi-column sorting**: Persist array of sort states instead of single column
2. **Per-playlist sorting**: Different sort preferences for different playlists
3. **Sort direction toggle**: Remember if user prefers ascending or descending for each column
4. **Column width persistence**: Save column widths along with sort state

---

**Last Updated:** 2026-01-17
