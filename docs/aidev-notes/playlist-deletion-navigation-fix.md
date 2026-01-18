# Playlist Deletion Navigation Fix

**Date**: 2026-01-18  
**Issue**: Application crash when deleting a playlist while viewing it  
**Solution**: Check if user is on the playlist route before deletion and navigate away

## Problem

When a user was viewing a playlist and deleted it (via context menu or keyboard shortcut), the application would crash because the route reference to the deleted playlist became invalid. The app tried to render a playlist that no longer existed in the database.

## Root Cause

In `PlaylistsAPI.remove()`, the deletion was performed immediately without checking if the user was currently viewing that playlist. The sequence was:

1. User views playlist at route `/playlists/{playlistID}`
2. User triggers delete via menu (IPC event `CMD_PLAYLIST_REMOVE`)
3. `PlaylistsAPI.remove()` deletes from database
4. Router tries to revalidate but playlist no longer exists
5. **App crashes due to lost reference**

## Solution

Modified `src/renderer/src/stores/PlaylistsAPI.ts` in the `remove()` function to:

1. **Check current route** using `router.state.location.pathname`
2. **Compare** against the playlist being deleted (`/playlists/${playlistID}`)
3. **Navigate to library** (`/`) if user is viewing the playlist
4. **Then delete** the playlist safely
5. Revalidate router as usual

### Code Changes

```typescript
const remove = async (playlistID: string): Promise<void> => {
  logger.debug('calling remove playlist api');
  try {
    // AIDEV-NOTE: Check if user is currently viewing the playlist being deleted
    // If so, navigate away to prevent app crash due to lost reference
    const currentPath = router.state.location.pathname;
    const isViewingPlaylist = currentPath === `/playlists/${playlistID}`;

    if (isViewingPlaylist) {
      logger.info(`User is viewing playlist ${playlistID}, navigating to library before deletion`);
      await router.navigate('/');
    }

    await db.playlists.remove(playlistID);
    router.revalidate();
  } catch (err: any) {
    logger.warn(err);
  }
};
```

## Technical Details

### Router Access

- Used `router.state.location.pathname` to get current route
- Router instance imported from `./router` (React Router v6 HashRouter)

### Navigation

- `await router.navigate('/')` ensures navigation completes before deletion
- Library route (`/`) is the safe fallback destination

### IPC Event Flow

1. **Main Process**: User right-clicks playlist → Menu event fired
2. **IPC Channel**: `CMD_PLAYLIST_REMOVE` sent with `playlistId`
3. **Renderer**: `IPCMenuEvents.tsx` receives event
4. **API Call**: `PlaylistsAPI.remove(playlistId)` executed
5. **Navigation Check**: (NEW) Check if viewing playlist → navigate if needed
6. **Database**: Delete playlist
7. **Revalidation**: Router reloads data

## Routes Affected

- `/playlists/:playlistID` - Playlist view route
- `/` - Library view (safe fallback)

## Edge Cases Handled

✅ User viewing the playlist being deleted → Navigate to library  
✅ User viewing a different playlist → No navigation, direct deletion  
✅ User in library or other views → No navigation, direct deletion  
✅ Special playlists like `__TO_DELETE__` → Works the same way

## Testing Scenarios

### Scenario 1: Delete while viewing playlist

1. Navigate to `/playlists/some-playlist-id`
2. Right-click playlist in sidebar → Delete
3. **Expected**: Smooth transition to Library, no crash

### Scenario 2: Delete while viewing different playlist

1. Navigate to `/playlists/playlist-a`
2. Right-click on `playlist-b` in sidebar → Delete
3. **Expected**: Stay on `playlist-a`, `playlist-b` removed from sidebar

### Scenario 3: Delete while in Library

1. Stay in Library view (`/`)
2. Right-click playlist in sidebar → Delete
3. **Expected**: Playlist removed, stay in Library

### Scenario 4: Delete To Delete playlist while viewing it

1. Navigate to `/playlists/__TO_DELETE__`
2. Delete the playlist (if allowed by UI)
3. **Expected**: Navigate to Library before deletion

## Related Files

- `src/renderer/src/stores/PlaylistsAPI.ts` - Main fix location
- `src/renderer/src/components/Events/IPCMenuEvents.tsx` - IPC event handler
- `src/renderer/src/views/router.tsx` - Router configuration
- `src/preload/lib/ipc-channels.ts` - IPC channel definitions

## Future Improvements

- Could add a confirmation dialog before deleting playlists
- Could implement "undo" functionality using a soft-delete pattern
- Could add toast notification after successful deletion
- Could navigate to "most recently used" playlist instead of always going to Library

## Related Features

- Prune Mode (`/prune`) uses similar navigation patterns
- Playlist renaming also checks current route context
- Track deletion might benefit from similar safety checks

---

**Status**: ✅ Implemented and tested  
**Build**: Passes TypeScript type checking and ESLint  
**Commit**: Ready for commit
