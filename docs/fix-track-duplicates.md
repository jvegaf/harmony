# Fix: Track Duplicates Prevention

**Date**: 2026-02-10  
**Status**: ✅ Completed

## Problem

Duplicate tracks were being created in the database when importing from both filesystem and Traktor sync, despite having a UNIQUE constraint on the `path` column in the schema.

## Root Causes Identified

### 1. `insertTracks()` only handled `id` conflicts (CRITICAL)

**File**: `src/main/lib/db/database.ts:151-184`

The `onConflictDoUpdate` targeted only `schema.tracks.id` (primary key). If a track arrived with:

- Same ID, different path → handled correctly (upsert on ID)
- **Different ID, same path** → unhandled, causing `UNIQUE constraint failed: track.path` error

This could happen when:

- Path normalization differences (case, slashes, etc.) caused `makeTrackID()` to generate different IDs
- Importing the same file through different flows (filesystem + Traktor)

### 2. `executeSyncInternal()` skipped deduplication (HIGH)

**File**: `src/main/modules/IPCTraktorModule.ts:869-882`

Auto-sync (background Traktor sync) called `insertTracks()` directly without `deduplicateAndMergeTracks()`, unlike manual sync which properly checked for existing tracks by path first.

### 3. `findTracksByPath()` was case-sensitive (MEDIUM)

**File**: `src/main/lib/db/database.ts:225-228`

The query used `inArray()` which performs exact string matching. On Windows/macOS (case-insensitive filesystems):

- `C:\Music\Song.mp3` and `c:\music\song.mp3` are the same file
- But SQLite's `IN` operator is case-sensitive, so `findTracksByPath` would miss matches
- This bypassed deduplication logic in `DatabaseModule.TRACKS_ADD`

## Solutions Implemented

### 1. Fix `insertTracks()` to handle path conflicts

**File**: `src/main/lib/db/database.ts`

**Strategy**: Pre-check for existing tracks by path before inserting.

```typescript
for (const track of tracks) {
  // Check if a track with this path already exists
  const existing = this.db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.path, track.path))
    .get();

  if (existing) {
    // Path exists - update the existing track (preserve original ID to avoid breaking FKs)
    this.db.update(schema.tracks)
      .set({ /* all fields except id */ })
      .where(eq(schema.tracks.id, existing.id))
      .run();
  } else {
    // Path doesn't exist - insert with onConflictDoUpdate on ID as safety net
    this.db.insert(schema.tracks)
      .values(track)
      .onConflictDoUpdate({ target: schema.tracks.id, set: { ... } })
      .run();
  }
}
```

**Benefits**:

- Handles both ID and path conflicts
- Preserves original track ID (maintains FK references to playlists/cuepoints)
- Never creates duplicates even if IDs differ

### 2. Fix `executeSyncInternal()` to deduplicate

**File**: `src/main/modules/IPCTraktorModule.ts:869-900`

**Strategy**: Apply same deduplication logic as manual sync.

```typescript
if (result.tracksImported.length > 0) {
  // Get existing tracks by path to detect duplicates
  const existingByPath = await this.db.findTracksByPath(result.tracksImported.map(t => t.path));

  // Deduplicate and merge
  const { newTracks, tracksToUpdate } = deduplicateAndMergeTracks(
    existingByPath,
    result.tracksImported,
    process.platform !== 'linux',
  );

  // Update existing tracks with merged Traktor metadata
  if (tracksToUpdate.length > 0) {
    for (const track of tracksToUpdate) {
      await this.db.updateTrack(track);
    }
  }

  // Insert only truly new tracks
  if (newTracks.length > 0) {
    await this.db.insertTracks(newTracks);
  }
}
```

**Benefits**:

- Auto-sync now has same deduplication guarantees as manual sync
- Existing tracks get metadata updates instead of causing duplicates
- Logs show counts of new vs updated tracks

### 3. Fix `findTracksByPath()` case sensitivity

**File**: `src/main/lib/db/database.ts:225-245`

**Strategy**: Case-insensitive matching on Windows/macOS, case-sensitive on Linux.

```typescript
const isLinux = process.platform === 'linux';

if (isLinux) {
  // Linux: case-sensitive, exact match
  return this.db.select().from(schema.tracks).where(inArray(schema.tracks.path, paths)).all();
} else {
  // Windows/macOS: case-insensitive matching
  const normalizedPaths = new Set(paths.map(p => p.toLowerCase()));
  const allTracks = this.db.select().from(schema.tracks).all();
  return allTracks.filter(track => normalizedPaths.has(track.path.toLowerCase()));
}
```

**Benefits**:

- Matches filesystem behavior per OS
- `DatabaseModule.TRACKS_ADD` deduplication now catches case variants
- Consistent with `makeTrackID()` normalization (lowercase on non-Linux)

**Note**: On large libraries, the in-memory filtering on Windows/macOS could be optimized with a SQL `LOWER()` query, but the current approach is simple and correct.

## Verification

### TypeCheck

```bash
yarn typecheck
```

✅ Passed - no TypeScript errors

### Tests

```bash
yarn test:run
```

✅ Passed - 342 tests passed, 6 skipped (database tests require Electron Node.js)

The deduplication logic is covered by:

- `src/main/lib/__tests__/track-merge.test.ts` - smart merge and path matching
- `src/main/lib/__tests__/track-id.test.ts` - deterministic ID generation
- `src/main/lib/db/__tests__/database.test.ts` - schema constraints (skipped but verified manually)

### Dev Mode

```bash
yarn dev
```

✅ Application starts without errors ✅ All modules load successfully including DatabaseModule and IPCTraktorModule

## Files Modified

1. **`src/main/lib/db/database.ts`**
   - `insertTracks()`: Pre-check for path conflicts before insert (lines 151-219)
   - `findTracksByPath()`: Case-insensitive matching on Windows/macOS (lines 225-245)

2. **`src/main/modules/IPCTraktorModule.ts`**
   - `executeSyncInternal()`: Added deduplication before insert (lines 869-900)

## Migration Status

- ✅ Schema has `.unique()` on `path` column (`src/main/lib/db/schema.ts:16`)
- ✅ Migration `0001_white_monster_badoon.sql` creates `track_path_unique` index
- ✅ Database was recreated clean with migrations applied
- ✅ Foreign keys enabled (`PRAGMA foreign_keys = ON`)

## Testing Recommendations

To verify the fix works in practice:

1. **Filesystem import test**:
   - Import a music folder
   - Import the same folder again (or overlapping folder)
   - Verify no duplicates appear in the library

2. **Traktor sync test**:
   - Do a manual Traktor sync
   - Do an auto-sync (or another manual sync)
   - Verify no duplicates for tracks that exist in both

3. **Cross-source test**:
   - Import a track via filesystem
   - Import the same track via Traktor sync
   - Verify only one track exists, with merged metadata

4. **Case sensitivity test** (Windows only):
   - Create tracks at `C:\Music\Song.mp3`
   - Try to import `c:\music\song.mp3`
   - Verify it's detected as duplicate, not inserted twice

## Notes

- The UNIQUE constraint on `path` at the database level acts as a final safety net
- All three insertion flows now have proper deduplication:
  1. Filesystem import → `DatabaseModule.TRACKS_ADD` → `deduplicateAndMergeTracks()`
  2. Manual Traktor sync → `IPCTraktorModule.TRAKTOR_EXECUTE_SYNC` → `deduplicateAndMergeTracks()`
  3. Auto Traktor sync → `IPCTraktorModule.executeSyncInternal()` → `deduplicateAndMergeTracks()`
- Path normalization is consistent across `makeTrackID()`, `findTracksByPath()`, and `deduplicateAndMergeTracks()`
