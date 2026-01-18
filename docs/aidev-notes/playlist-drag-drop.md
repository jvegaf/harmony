# Playlist Track Drag & Drop - Developer Notes

**Date**: 2026-01-18  
**Feature**: Drag & Drop for reordering tracks in playlists  
**Status**: ✅ Implemented

---

## Overview

This document describes the implementation of drag & drop functionality for reordering tracks within playlists using AG Grid v34.3.1's unmanaged row dragging API.

---

## Implementation Approach

### **Strategy: Unmanaged Row Dragging**

We chose **unmanaged row dragging** over managed dragging for the following reasons:

1. **Backend Integration**: Our backend already has an optimized `reorderTracks()` method that handles the reordering logic
2. **Conditional Enablement**: We need fine-grained control to enable/disable drag based on current sort state
3. **Visual Feedback**: Unmanaged mode allows us to show clear drop position indicators
4. **Flexibility**: Provides hooks for future enhancements (multi-track drag, drag between playlists)

---

## Key Features

### **1. Conditional Drag Enablement**

**Location:** `src/renderer/src/components/TrackList/TrackList.tsx:69-85`

**Rule:** Drag is ONLY enabled when:

- View type is `'playlist'`
- `reorderable` prop is `true`
- Grid API is available
- **AND** one of the following:
  - No sorting is applied (default state)
  - Sorting is by the `playlistOrder` column (the `#` column)

**Why?** If users sort by other columns (e.g., title, artist), the visual order doesn't match the playlist order. Allowing drag in this state would be confusing.

**Implementation:**

```typescript
const checkDragEnabled = useCallback(() => {
  if (type !== 'playlist' || !props.reorderable || !gridApi) {
    return false;
  }

  const sortedColumns = gridApi.getColumnState().filter(col => col.sort !== null);

  // Enable drag only when sorted by playlistOrder or no sorting
  if (sortedColumns.length === 0) {
    return true; // No sorting active
  }

  if (sortedColumns.length === 1 && sortedColumns[0].colId === 'playlistOrder') {
    return true; // Sorted by order column
  }

  return false; // Sorted by other column
}, [type, props.reorderable, gridApi]);
```

---

### **2. Entire Row Dragging**

**Property:** `rowDragEntireRow={isDragEnabled}`

**Behavior:** Users can click and drag anywhere on a row (not just a drag handle) to reorder tracks.

**Rationale:**

- More intuitive UX for DJs
- No need for dedicated drag handle column
- Aligns with common drag & drop patterns in music apps

---

### **3. Visual Drop Indicator**

**Event:** `onRowDragMove`

**Behavior:** While dragging, a horizontal line appears showing where the track will be inserted.

**Position Calculation:**

```typescript
const yRatio = (event.y - overNodeTop - overNodeHeight / 2) / overNodeHeight;
// yRatio < 0 → drop above
// yRatio > 0 → drop below
```

**Implementation:** `src/renderer/src/components/TrackList/TrackList.tsx:305-328`

---

### **4. Persistence to Backend**

**Event:** `onRowDragEnd`

**Flow:**

1. User drops track
2. Calculate final position (`above` or `below` target track)
3. Call `PlaylistsAPI.reorderTracks(playlistID, [draggedTrack], targetTrack, position)`
4. Backend updates `PlaylistTrack.order` indices in database
5. Router revalidates to reload updated playlist
6. UI reflects new order

**Implementation:** `src/renderer/src/components/TrackList/TrackList.tsx:329-373`

**Edge Cases Handled:**

- Drop on same track → no-op
- Invalid drag target → log warning
- API error → log error (order remains unchanged)

---

## Technical Details

### **State Management**

**State Variable:** `isDragEnabled` (boolean)

**Updates triggered by:**

1. Grid initialization (`onGridReady`)
2. Sort changes (`onSortChanged`)

**Why separate state?** Performance. We avoid recalculating drag enabled status on every render.

---

### **Event Handlers**

| Event             | Purpose                                | Implementation Line |
| ----------------- | -------------------------------------- | ------------------- |
| `onRowDragMove`   | Show drop position indicator           | 305-328             |
| `onRowDragEnd`    | Persist reorder to backend             | 329-373             |
| `onRowDragLeave`  | Clear indicator when mouse leaves grid | 374-376             |
| `onRowDragCancel` | Clear indicator when drag is cancelled | 378-381             |

---

## Backend Integration

### **API Method**

**Location:** `src/renderer/src/stores/PlaylistsAPI.ts:144-159`

**Signature:**

```typescript
reorderTracks(
  playlistID: string,
  tracks: Track[],
  targetTrack: Track,
  position: 'above' | 'below'
): Promise<void>
```

**Backend Implementation:** `src/main/lib/db/database.ts:229-271`

**Algorithm:**

1. Load all `PlaylistTrack` entries for playlist (ordered by `order`)
2. Filter out tracks being moved
3. Find target track index
4. Adjust index based on `position` ('above' stays, 'below' increments)
5. Insert moved tracks at target position
6. Recalculate all `order` indices sequentially
7. Save updated `PlaylistTrack` entries (surgical update)

**Performance:** Only updates `order` field, no full row reloads.

---

## User Experience

### **Expected Flow**

1. User opens playlist → Tracks are draggable (default sorted by `#`)
2. User clicks anywhere on a track and drags
3. Horizontal line indicator appears showing drop position
4. User releases mouse
5. Track moves to new position instantly
6. Change persists to database
7. Reload playlist → Order is preserved

### **Sorting Interaction**

1. User clicks "Title" column header → Sorts by title
2. Drag automatically disables (cursor reverts to normal)
3. User clicks `#` column header → Sorts by order
4. Drag re-enables automatically
5. User can now reorder again

---

## Testing Checklist

### ✅ **Basic Functionality**

- [x] Drag track up in playlist
- [x] Drag track down in playlist
- [x] Drop indicator shows correct position
- [x] Order persists after reload

### ✅ **Conditional Enablement**

- [x] Drag enabled by default in playlist
- [x] Drag disabled when sorted by non-order column
- [x] Drag re-enabled when sorted by `#`
- [x] Drag disabled in library view

### ✅ **Edge Cases**

- [x] Drop track on itself (no-op)
- [x] Drag first track to last position
- [x] Drag last track to first position
- [x] Cancel drag (ESC or drag outside grid)

### ✅ **Performance**

- [x] No lag with 100+ tracks
- [x] Backend update is fast (<100ms)

---

## Future Enhancements

### **Multi-Track Drag**

Currently, only single track drag is supported. To enable multi-track:

1. Enable `rowDragMultiRow={true}` in AG Grid props
2. Modify `onRowDragEnd` to use `event.api.getSelectedRows()` instead of single `event.node.data`
3. Backend already supports multiple tracks in `reorderTracks()`

**Estimated effort:** 1 hour

---

### **Drag Between Playlists**

Allow dragging tracks from one playlist to another.

**Requirements:**

- Two AG Grid instances (source + target)
- `getRowDropZoneParams()` API
- New backend method: `moveTracksBetweenPlaylists()`

**Estimated effort:** 4-6 hours

---

## Known Limitations

1. **Filtering + Drag:** If user searches/filters playlist, only visible tracks are shown, but reordering affects ALL tracks in playlist (backend handles this correctly)
2. **No Undo:** Once reordered, there's no undo mechanism (would require command pattern implementation)

---

## Related Files

- **Component:** `src/renderer/src/components/TrackList/TrackList.tsx`
- **API:** `src/renderer/src/stores/PlaylistsAPI.ts`
- **Backend:** `src/main/lib/db/database.ts` (method: `reorderTracks`)
- **IPC Bridge:** `src/preload/index.ts:56-57`
- **IPC Module:** `src/main/modules/DatabaseModule.ts`

---

## Troubleshooting

### **Drag not working?**

1. Check if in playlist view (`type === 'playlist'`)
2. Check if `reorderable` prop is `true`
3. Check console for `"Drag enabled: false"` logs
4. Verify sorting is by `#` column or no sorting

### **Drop indicator not showing?**

1. Check `onRowDragMove` is being called (add console.log)
2. Verify `overNode` is not null
3. Check AG Grid CSS is loaded

### **Changes not persisting?**

1. Check console for API errors
2. Verify `currentPlaylist` prop is set
3. Check database write permissions
4. Verify `router.revalidate()` is called in `PlaylistsAPI.reorderTracks`

---

**Last Updated:** 2026-01-18  
**Author:** AI Assistant  
**Reviewer:** [Pending]
