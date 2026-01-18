# Prune Mode Implementation

## Overview

Prune Mode is a feature that allows DJs to quickly review their music library and mark tracks for deletion using keyboard shortcuts. Users can listen to tracks sequentially and decide whether to keep or delete each one.

## User Flow

1. **Enter Prune Mode**: Click the "Prune" button in the header
2. **Listen & Decide**:
   - Press **D** to mark the current track for deletion and advance to the next
   - Press **K** to keep the current track and advance to the next
   - Press **Q** to quit Prune Mode
3. **Review**: After quitting, navigate to the "To Delete" playlist to review marked tracks
4. **Delete**: From the "To Delete" playlist, permanently delete the unwanted tracks

## Keyboard Shortcuts

- **D**: Mark track for deletion + advance to next track
- **K**: Keep track + advance to next track
- **Q**: Quit Prune Mode

## Visual Feedback

- **Red flash animation** when pressing D (delete)
- **Green flash animation** when pressing K (keep)
- **Live counter** showing number of tracks marked for deletion
- **Track info display** showing current track title, artist, and album

## Technical Implementation

### Backend (Main Process)

#### 1. Database Layer (`src/main/lib/db/database.ts`)

New methods added:

- `getOrCreateToDeletePlaylist()`: Gets or creates the special `__TO_DELETE__` playlist
- `addTrackToToDeletePlaylist(trackId)`: Adds a track to the To Delete playlist
- `removeTrackFromToDeletePlaylist(trackId)`: Removes a track from the playlist
- `clearToDeletePlaylist()`: Clears all tracks from the playlist

#### 2. IPC Channels (`src/preload/lib/ipc-channels.ts`)

New channels:

- `PLAYLIST_TO_DELETE_GET`
- `PLAYLIST_TO_DELETE_ADD_TRACK`
- `PLAYLIST_TO_DELETE_REMOVE_TRACK`
- `PLAYLIST_TO_DELETE_CLEAR`

#### 3. IPC Handlers (`src/main/modules/DatabaseModule.ts`)

Registered handlers for all To Delete playlist operations.

### Preload Bridge (`src/preload/index.ts`)

Exposed API methods:

- `db.playlists.getToDeletePlaylist()`
- `db.playlists.addTrackToToDelete(trackId)`
- `db.playlists.removeTrackFromToDelete(trackId)`
- `db.playlists.clearToDelete()`

### Frontend (Renderer Process)

#### 1. PruneView Component (`src/renderer/src/views/Prune/PruneView.tsx`)

Main component implementing:

- Keyboard event handling (D, K, Q)
- Track playback automation
- Visual feedback animations
- Navigation logic after quitting

#### 2. Routing (`src/renderer/src/views/router.tsx`)

Added `/prune` route mapped to PruneView component.

#### 3. Header Navigation (`src/renderer/src/components/AppHeader/AppHeader.tsx`)

Changed "Import" button to "Prune" button linking to `/prune`.

## Special Playlist: To Delete

- **ID**: `__TO_DELETE__` (double underscore prefix indicates internal playlist)
- **Name**: "To Delete"
- **Purpose**: Temporary holding area for tracks marked during Prune Mode
- **Lifecycle**:
  - Created automatically on first use
  - Persists across sessions
  - Can be accessed like any other playlist at `/playlists/__TO_DELETE__`

## Edge Cases Handled

1. **Empty Library**: Shows message "No tracks available to prune"
2. **End of Queue**: Shows completion message with option to view To Delete playlist or return to Library
3. **No Tracks Marked**: When quitting with 0 marked tracks, returns to Library instead of To Delete playlist
4. **Filtered Tracks**: Respects current library filters/search (only prunes visible tracks)

## Testing Checklist

- [ ] Click "Prune" button navigates to Prune Mode
- [ ] Tracks auto-play when entering Prune Mode
- [ ] Press D marks track and advances to next
- [ ] Press K advances to next without marking
- [ ] Press Q exits Prune Mode correctly
- [ ] Visual animations work for D and K keys
- [ ] Counter updates when tracks are marked
- [ ] To Delete playlist is created automatically
- [ ] Navigating to To Delete playlist shows marked tracks
- [ ] Empty library shows appropriate message
- [ ] End of queue shows completion message
- [ ] Filtered tracks are respected

## Code Quality

- ✅ ESLint passed (no errors)
- ✅ TypeScript type checking passed
- ✅ Follows project conventions (AGENTS.md)
- ✅ Proper error handling
- ✅ Logging for debugging
- ✅ AIDEV-NOTE comments for complex logic

## Future Enhancements

- Add "Undo" functionality to unmark tracks
- Add statistics (e.g., "Listened to X of Y tracks")
- Add option to shuffle tracks during pruning
- Add preview mode (listen to first 30 seconds only)
- Add bulk delete from To Delete playlist
- Add confirmation dialog before deleting tracks permanently

---

**Implementation Date**: 2026-01-18  
**Version**: 0.17.0
