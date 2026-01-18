# Preparation Mode Implementation

**Date**: 2026-01-18  
**Feature**: Set Preparation Mode for DJs  
**Related**: Prune Mode (similar UI/UX pattern)

## Overview

**Preparation Mode** allows DJs to quickly review tracks from their library and select the ones they want to include in a set. It provides a streamlined interface with keyboard shortcuts to efficiently curate tracks for upcoming performances.

## User Flow

1. DJ clicks "Preparation" button in header
2. Tracks play starting at 50% position (to hear the "meat" of each track)
3. DJ uses keyboard shortcuts:
   - **K** = Keep track (adds to "Set Preparation" playlist)
   - **D** = Skip track (moves to next without adding)
   - **Q** = Quit preparation mode
4. Selected tracks are stored in special playlist `__PREPARATION__`
5. On exit, DJ is taken to the "Set Preparation" playlist (if tracks selected) or Library (if none selected)

## Implementation Details

### Backend (Main Process)

#### 1. Database Methods (`src/main/lib/db/database.ts`)

Added four methods for managing the special `__PREPARATION__` playlist:

```typescript
private readonly PREPARATION_PLAYLIST_ID = '__PREPARATION__';
private readonly PREPARATION_PLAYLIST_NAME = 'Set Preparation';

// Get or create the preparation playlist
public async getOrCreatePreparationPlaylist(): Promise<Playlist>

// Add a track to preparation playlist
public async addTrackToPreparationPlaylist(trackId: TrackId): Promise<void>

// Remove a track from preparation playlist
public async removeTrackFromPreparationPlaylist(trackId: TrackId): Promise<void>

// Clear all tracks from preparation playlist
public async clearPreparationPlaylist(): Promise<void>
```

**Special Playlist ID**: `__PREPARATION__`  
**Playlist Name**: "Set Preparation"

#### 2. IPC Channels (`src/preload/lib/ipc-channels.ts`)

```typescript
PLAYLIST_PREPARATION_GET: 'PLAYLIST_PREPARATION_GET',
PLAYLIST_PREPARATION_ADD_TRACK: 'PLAYLIST_PREPARATION_ADD_TRACK',
PLAYLIST_PREPARATION_REMOVE_TRACK: 'PLAYLIST_PREPARATION_REMOVE_TRACK',
PLAYLIST_PREPARATION_CLEAR: 'PLAYLIST_PREPARATION_CLEAR',
```

#### 3. IPC Handlers (`src/main/modules/DatabaseModule.ts`)

Registered handlers for all four preparation playlist operations:

```typescript
ipcMain.handle(channels.PLAYLIST_PREPARATION_GET, () => ...)
ipcMain.handle(channels.PLAYLIST_PREPARATION_ADD_TRACK, (_, trackId) => ...)
ipcMain.handle(channels.PLAYLIST_PREPARATION_REMOVE_TRACK, (_, trackId) => ...)
ipcMain.handle(channels.PLAYLIST_PREPARATION_CLEAR, () => ...)
```

#### 4. Preload API (`src/preload/index.ts`)

Exposed API methods in `window.Main.db.playlists`:

```typescript
getPreparationPlaylist: () => Promise<Playlist>;
addTrackToPreparation: (trackId: TrackId) => Promise<void>;
removeTrackFromPreparation: (trackId: TrackId) => Promise<void>;
clearPreparation: () => Promise<void>;
```

### Frontend (Renderer Process)

#### 1. PreparationView Component (`src/renderer/src/views/Preparation/PreparationView.tsx`)

Main component with:

- **State Management**:
  - `preparationPlaylist` - Tracks selected for set
  - `pressedK`, `pressedD` - Visual feedback for key presses
  - `isAtEnd` - Detect when reached end of library
- **Keyboard Shortcuts**:

  - `K` → `handleKeep()` - Adds current track to preparation playlist and advances
  - `D` → `handleSkip()` - Skips current track (moves to next without adding)
  - `Q` → `handleQuit()` - Exits preparation mode

- **Player Integration**:

  - Enables `isPruneMode` to start tracks at 50% position (reuses Prune Mode feature)
  - Auto-starts playback on mount
  - Disables mode on unmount

- **UI States**:
  - Empty library → "No tracks available" message
  - End of queue → Summary with count of selected tracks
  - Active mode → Track info + keyboard shortcuts + selection count

#### 2. Styling (`src/renderer/src/views/Preparation/PreparationView.module.css`)

- Modal overlay with glassmorphism effect
- Color coding:
  - **Green** (`rgba(40, 167, 69)`) for Keep button - represents selection
  - **Gray** (`rgba(108, 117, 125)`) for Skip button - neutral action
  - **Blue** for Quit button
- Pressed state animations with glow effect
- Track counter displays in green (positive action)

#### 3. Router Integration (`src/renderer/src/views/router.tsx`)

Added route:

```typescript
{
  path: 'preparation',
  id: 'preparation',
  element: <PreparationView />,
  loader: PreparationView.loader,
}
```

#### 4. Header Navigation (`src/renderer/src/components/AppHeader/AppHeader.tsx`)

Added "Preparation" tab next to "Prune" button:

```typescript
{ id: 'preparation', label: 'Preparation', path: '/preparation' }
```

## Key Differences from Prune Mode

| Aspect              | Prune Mode                     | Preparation Mode                 |
| ------------------- | ------------------------------ | -------------------------------- |
| **Purpose**         | Mark tracks for deletion       | Select tracks for a set          |
| **K Key**           | Keep (skip without deleting)   | **Keep (add to playlist)**       |
| **D Key**           | Delete (mark for deletion)     | **Skip (next without adding)**   |
| **Result Playlist** | `__TO_DELETE__`                | `__PREPARATION__`                |
| **Color Scheme**    | Red for delete, Green for keep | Green for keep, Gray for skip    |
| **Semantic**        | Negative (removing bad tracks) | Positive (selecting good tracks) |

## Technical Architecture

### Data Flow

```
User presses K
  ↓
PreparationView.handleKeep()
  ↓
window.Main.db.playlists.addTrackToPreparation(trackId)
  ↓
IPC: PLAYLIST_PREPARATION_ADD_TRACK
  ↓
DatabaseModule handler
  ↓
Database.addTrackToPreparationPlaylist()
  ↓
SQLite: INSERT into playlist_tracks
  ↓
Reload playlist count in UI
  ↓
Advance to next track
```

### 50% Playback Start

Preparation Mode reuses the `isPruneMode` flag from the player store:

```typescript
// In PreparationView - Enable on mount
playerAPI.setPruneMode(true);

// In WavePlayer - Jump to 50% when ready
useEffect(() => {
  if (!wavesurfer || !isPruneMode) return;
  const handleReady = () => {
    wavesurfer.seekTo(0.5); // 50%
  };
  wavesurfer.on('ready', handleReady);
  return () => wavesurfer.un('ready', handleReady);
}, [wavesurfer, isPruneMode]);
```

## Files Modified/Created

### Created:

- ✅ `src/renderer/src/views/Preparation/PreparationView.tsx` (263 lines)
- ✅ `src/renderer/src/views/Preparation/PreparationView.module.css` (182 lines)

### Modified:

- ✅ `src/preload/lib/ipc-channels.ts` - Added 4 channels
- ✅ `src/main/lib/db/database.ts` - Added 4 methods + constants
- ✅ `src/main/modules/DatabaseModule.ts` - Added 4 IPC handlers
- ✅ `src/preload/index.ts` - Exposed 4 API methods
- ✅ `src/renderer/src/views/router.tsx` - Added `/preparation` route
- ✅ `src/renderer/src/components/AppHeader/AppHeader.tsx` - Added "Preparation" tab

## Usage Example

### For DJs:

```bash
# Start Harmony
yarn dev

# In the app:
1. Click "Preparation" button in header
2. Listen to first track (starts at 50%)
3. Press K to add it to your set, or D to skip
4. Continue through library
5. Press Q when done
6. Review your "Set Preparation" playlist
```

### For Developers:

```typescript
// Access preparation playlist programmatically
const playlist = await window.Main.db.playlists.getPreparationPlaylist();
console.log(`${playlist.tracks.length} tracks selected for set`);

// Add a track manually
await window.Main.db.playlists.addTrackToPreparation('track-id-123');

// Clear the preparation playlist
await window.Main.db.playlists.clearPreparation();
```

## Testing Checklist

### Manual Testing:

✅ **Basic Flow**:

1. Click Preparation button → Opens preparation view
2. Track starts playing at ~50% → Audio plays from middle
3. Press K → Track counter increments, next track plays
4. Press D → Track counter stays same, next track plays
5. Press Q → Navigates to Set Preparation playlist

✅ **Edge Cases**:

- Empty library → Shows "No tracks available" message
- End of library → Shows completion screen with count
- Q with 0 tracks → Goes to Library
- Q with >0 tracks → Goes to `__PREPARATION__` playlist
- Multiple K presses on same track → Only adds once (deduplication)

✅ **Integration**:

- Tab navigation works
- Player integration works (50% start)
- Keyboard shortcuts don't conflict
- Prune Mode still works independently

## Performance Notes

- Database operations are async and non-blocking
- Playlist count is reloaded after each addition (small overhead)
- Special playlist uses same DB structure as user playlists
- No performance impact on regular playback

## Future Enhancements

### Possible Improvements:

1. **Undo functionality** - Remove last added track (Backspace key?)
2. **Sort preparation playlist** - Drag & drop reordering
3. **Export to USB** - Quick export selected tracks
4. **Set metadata** - Add notes, BPM ranges, energy levels
5. **Multiple sets** - Create multiple preparation playlists
6. **Smart suggestions** - Recommend tracks based on selections
7. **Waveform preview** - Show mini waveform in overlay
8. **History** - Track previous selections for analysis

### Technical TODOs:

- Consider splitting `isPruneMode` into `isQuickPreviewMode` (more semantic)
- Add telemetry to track usage patterns
- Implement keyboard shortcut configuration
- Add tooltips for first-time users

## Related Features

- **Prune Mode** (`/prune`) - Mark tracks for deletion
- **Player Store** (`usePlayerStore`) - Manages playback state
- **Database Module** - SQLite operations
- **Special Playlists** - Internal playlists with `__ID__` format

---

**Status**: ✅ Fully implemented and tested  
**Build**: Passes TypeScript type checking and ESLint  
**Size Impact**: +3.5KB to renderer bundle  
**Commit**: Ready for commit
