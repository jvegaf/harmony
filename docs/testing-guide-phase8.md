# Phase 8: Manual Testing Guide

## Setup

### 1. Start Development Environment

```bash
# Build the application
yarn build

# Start in development mode
yarn dev
```

The app will open with hot-reload enabled. Keep the terminal visible to monitor logs.

### 2. Create a Test Database

**Option A: Start Fresh**

- Delete existing database (backup first!):
  - Windows: `%APPDATA%\harmony\database\harmony.db`
  - macOS: `~/Library/Application Support/harmony/database/harmony.db`
  - Linux: `~/.config/harmony/database/harmony.db`

**Option B: Use Separate Test Profile**

- Electron will create a new database automatically on first launch

### 3. Prepare Test Files

Create a test music folder with:

- 20-50 audio files (MP3, FLAC, WAV, etc.)
- Some with metadata, some without
- Mix of complete and incomplete tags

---

## Test Suite

## ✅ Test 1: Filesystem Import Deduplication

**Goal**: Verify that re-importing the same folder doesn't create duplicates.

### Steps

1. **First Import**:
   - Open Harmony
   - Navigate to Library/Import
   - Select your test music folder
   - Click "Import Tracks"
   - **Watch the logs**: Note the scanning/import time
   - **Record**: Number of tracks imported (e.g., "45 tracks imported")

2. **Verify Import**:
   - Check the library view - all tracks should appear
   - Note track count in UI
   - Open a few tracks and check metadata

3. **Second Import (Same Folder)**:
   - Select the SAME folder again
   - Click "Import Tracks"
   - **Watch the logs** for:
     ```
     [IPCLibraryModule] Pre-filter: 45 already imported, 0 to scan
     ```
   - Import should complete almost instantly (< 5 seconds)

4. **Verify No Duplicates**:
   - Check track count - should be SAME as before (45)
   - Search for a specific track - should appear only once
   - Verify no duplicate entries

### ✅ Pass Criteria

- [ ] Second import completes in < 5 seconds (pre-filter working)
- [ ] Log shows "X already imported, 0 to scan"
- [ ] Track count unchanged
- [ ] No duplicate tracks visible in library
- [ ] No duplicate paths in database (run `yarn db:check-dupes` to verify)

### 🐛 If Failed

- Check logs for errors
- Verify `makeTrackID()` is being used (search logs for "track-")
- Run `yarn db:check-dupes` to see actual duplicates
- Share logs and error messages

---

## ✅ Test 2: Metadata Smart Merge

**Goal**: Verify that re-importing fills missing metadata without overwriting existing data.

### Steps

1. **First Import**:
   - Import tracks with incomplete metadata (no artist, missing album, etc.)
   - Record which tracks have missing fields

2. **Manually Edit Metadata**:
   - Select a track with missing artist
   - Edit and add: Artist = "Test Artist", Genre = "Test Genre"
   - Save changes

3. **Update File Tags**:
   - Using an external tool (MP3Tag, Kid3, etc.):
     - Add/update metadata for the SAME file
     - Set: Artist = "Different Artist", Album = "New Album"
     - Leave Genre empty in file

4. **Re-import Folder**:
   - Import the same folder again
   - Should be very fast (pre-filter)

5. **Verify Smart Merge**:
   - Open the track you edited
   - **Expected results**:
     - Artist: "Test Artist" (your edit preserved)
     - Genre: "Test Genre" (your edit preserved)
     - Album: "New Album" (filled from file because it was empty)

### ✅ Pass Criteria

- [ ] Manual edits (Artist, Genre) are preserved
- [ ] Empty fields (Album) are filled from file metadata
- [ ] No data loss or unexpected overwrites
- [ ] Log shows "Pre-filter: X already imported, 0 to scan"

### 🐛 If Failed

- Check `smartMergeTrack()` logic in `track-merge.ts`
- Verify `deduplicateAndMergeTracks()` is being called
- Share specific field values (before/after)

---

## ✅ Test 3: Traktor Sync Deduplication

**Goal**: Verify Traktor sync doesn't create duplicates and merges metadata correctly.

### Prerequisites

- Have Traktor Pro installed
- Have a Traktor collection with some tracks
- At least a few tracks should overlap with your Harmony library

### Steps

1. **Import from Filesystem**:
   - Import your test music folder into Harmony
   - Record track count (e.g., 45 tracks)

2. **Add Same Tracks to Traktor**:
   - Open Traktor Pro
   - Import the SAME music folder
   - Add metadata in Traktor:
     - Set BPM values
     - Add cue points
     - Set musical key
   - Save Traktor collection

3. **Sync Harmony with Traktor**:
   - In Harmony, go to Traktor Sync
   - Click "Sync Collection" or similar
   - **Watch logs** for deduplication messages

4. **Verify Smart Merge**:
   - Track count should be SAME (45)
   - Open tracks that exist in both sources
   - **Expected**:
     - BPM filled from Traktor
     - Cue points imported from Traktor
     - Musical key filled from Traktor
     - Original metadata from filesystem preserved

### ✅ Pass Criteria

- [ ] Track count unchanged after sync
- [ ] Traktor metadata (BPM, key, cues) merged into existing tracks
- [ ] Filesystem metadata preserved
- [ ] No duplicate tracks created
- [ ] Run `yarn db:check-dupes` - should report 0 duplicates

### 🐛 If Failed

- Check `IPCTraktorModule.ts` around line 389-420
- Verify `deduplicateAndMergeTracks()` is called with `caseInsensitive: true`
- Check if Traktor paths match filesystem paths (case issues?)

---

## ✅ Test 4: Cross-Source Merge (Filesystem → Traktor)

**Goal**: Verify that importing from filesystem first, then Traktor, merges correctly.

### Steps

1. **Start Fresh**:
   - Delete Harmony database
   - Launch Harmony (creates new empty DB)

2. **Prepare Traktor Collection**:
   - In Traktor, have tracks with:
     - BPM: 128
     - Key: Am
     - Cue point at 30s
     - Rating: 5 stars

3. **Import Filesystem FIRST**:
   - Import music folder to Harmony
   - Tracks should have:
     - Artist, Title, Album (from file tags)
     - No BPM, no key, no cue points

4. **Sync with Traktor SECOND**:
   - Sync Harmony with Traktor
   - Watch for deduplication logs

5. **Verify Combined Metadata**:
   - Open a track that exists in both sources
   - **Expected**:
     - Artist, Title, Album: From filesystem
     - BPM, Key: From Traktor
     - Cue points: From Traktor
     - All fields filled, nothing overwritten

### ✅ Pass Criteria

- [ ] Metadata from both sources combined
- [ ] No duplicates created
- [ ] BPM and key filled from Traktor
- [ ] File metadata (artist, title, album) preserved
- [ ] Cue points imported from Traktor

---

## ✅ Test 5: Pre-Filter Performance

**Goal**: Measure and verify performance improvement from pre-filtering.

### Steps

1. **First Import (Cold)**:
   - Start with empty database
   - Import folder with 100+ tracks
   - **Record time**: e.g., "180 seconds"
   - Note log messages about scanning

2. **Second Import (Warm)**:
   - Import the SAME folder again
   - **Record time**: e.g., "5 seconds"
   - **Watch logs** for:
     ```
     Pre-filter: 100 already imported, 0 to scan
     ```

3. **Calculate Speedup**:
   - Speedup = (First Import Time) / (Second Import Time)
   - **Expected**: 20x-100x faster

### ✅ Pass Criteria

- [ ] Second import is dramatically faster (> 20x)
- [ ] Log shows "X already imported, 0 to scan"
- [ ] No metadata scanning on second import
- [ ] CPU usage low during second import

### 📊 Expected Results

| Tracks | First Import | Second Import | Speedup |
| ------ | ------------ | ------------- | ------- |
| 50     | 30s          | 2s            | 15x     |
| 100    | 60s          | 3s            | 20x     |
| 500    | 300s (5m)    | 5s            | 60x     |
| 1000   | 600s (10m)   | 7s            | 85x     |

---

## ✅ Test 6: Helper Scripts

**Goal**: Verify database maintenance scripts work correctly.

### Test 6a: Check for Duplicates

```bash
# Check default database
yarn db:check-dupes

# Check specific database
yarn db:check-dupes "C:\Users\YourName\custom-harmony.db"
```

**Expected Output (No Duplicates)**:

```
Checking database: C:\Users\...\harmony.db

✅ No duplicate paths found! Safe to apply unique constraint migration.
```

**Expected Output (With Duplicates)**:

```
⚠️  Found 3 duplicate path(s):

1. Path: /music/track1.mp3
   Count: 2
   IDs: abc123, def456

...

📊 Statistics:
   Total tracks: 100
   Duplicate entries: 6
   Unique paths: 97
   Duplicates to remove: 3
```

### Test 6b: Cleanup Duplicates (Dry Run)

```bash
# Preview what would be done
yarn db:clean-dupes -- --dry-run
```

**Expected**: Shows merge preview without making changes.

### Test 6c: Cleanup Duplicates (Real)

**Only if duplicates exist**:

```bash
# Backup created automatically
yarn db:clean-dupes
```

**Expected**:

- Backup created: `harmony.db.backup-<timestamp>`
- Duplicates merged and removed
- Database ready for unique constraint

### ✅ Pass Criteria

- [ ] `check-dupes` detects duplicates correctly
- [ ] `clean-dupes --dry-run` shows preview
- [ ] `clean-dupes` creates backup
- [ ] After cleanup, `check-dupes` reports 0 duplicates
- [ ] Merged metadata is correct (best from both)

---

## ✅ Test 7: Database Constraint Enforcement

**Goal**: Verify the UNIQUE constraint prevents duplicates at DB level.

### Steps

1. **Verify Migration Applied**:
   - Check migration status:
     ```bash
     # In SQLite viewer or CLI
     SELECT name FROM sqlite_master WHERE type='index' AND name='track_path_unique';
     ```
   - Should return: `track_path_unique`

2. **Attempt Manual Duplicate Insert** (requires SQLite CLI):

   ```sql
   -- This should FAIL with UNIQUE constraint error
   INSERT INTO track (id, path, title, duration)
   VALUES ('test-id-999', '/music/existing-track.mp3', 'Duplicate', 180);
   ```

   **Expected**: Error: "UNIQUE constraint failed: track.path"

3. **Verify Application Handles Gracefully**:
   - Application should not crash if insert fails
   - Logs should show error handling
   - UI should remain responsive

### ✅ Pass Criteria

- [ ] Migration created unique index on path
- [ ] Manual duplicate insert fails with constraint error
- [ ] Application handles constraint errors gracefully
- [ ] No crashes or data corruption

---

## ✅ Test 8: Edge Cases

### Test 8a: Case Sensitivity

**Windows/macOS** (case-insensitive):

- Import: `/music/Track.mp3`
- Try to import: `/music/track.mp3` (different case)
- **Expected**: Treated as same file, no duplicate

**Linux** (case-sensitive):

- Import: `/music/Track.mp3`
- Import: `/music/track.mp3` (different case)
- **Expected**: Treated as different files

### Test 8b: Special Characters in Path

Test with paths containing:

- Spaces: `My Music/Track 01.mp3`
- Unicode: `音楽/曲.mp3`
- Special chars: `Music!/Track (Remix).mp3`

**Expected**: All handled correctly, no crashes.

### Test 8c: Symbolic Links

- Create symlink to music folder
- Import from original path
- Try to import from symlink path
- **Expected**: May create duplicates (symlinks resolve differently)
- **Note**: Document this limitation

### Test 8d: Very Long Paths

- Test with paths > 260 characters (Windows MAX_PATH)
- **Expected**: Handle gracefully or show error

### ✅ Pass Criteria

- [ ] Case sensitivity follows OS conventions
- [ ] Special characters in paths handled correctly
- [ ] No crashes with edge case paths
- [ ] Known limitations documented

---

## Final Verification Checklist

### Core Functionality

- [ ] Filesystem import deduplication works
- [ ] Traktor sync deduplication works
- [ ] Cross-source merge works correctly
- [ ] Pre-filter provides 20x+ speedup
- [ ] Smart merge preserves user edits
- [ ] Smart merge fills empty fields

### Database

- [ ] Unique constraint migration applied
- [ ] No duplicate paths in database
- [ ] Constraint prevents manual duplicates
- [ ] Application handles constraint errors gracefully

### Tooling

- [ ] `yarn db:check-dupes` detects duplicates
- [ ] `yarn db:clean-dupes` merges and removes duplicates
- [ ] Automatic backup created before cleanup

### Performance

- [ ] Second import is 20x+ faster than first
- [ ] CPU usage low on re-imports
- [ ] Memory usage stable
- [ ] No UI lag during operations

### Edge Cases

- [ ] Case sensitivity works per OS
- [ ] Special characters handled
- [ ] Long paths handled
- [ ] Symlinks limitation documented

---

## Reporting Results

### Format

For each test, report:

```
## Test X: [Test Name]

Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

Details:
- First import: 45 tracks in 60s
- Second import: 45 tracks in 3s (20x faster)
- Log shows: "Pre-filter: 45 already imported, 0 to scan"
- No duplicates found in database

Issues: None / [Describe issues]

Logs: [Paste relevant log snippets]
```

### Key Metrics to Report

1. **Track count**: Before/after imports
2. **Import time**: First vs second import
3. **Speedup**: Calculated improvement ratio
4. **Duplicates**: Count from `db:check-dupes`
5. **Errors**: Any errors or warnings in logs

---

## Troubleshooting

### Issue: Second import still slow

**Possible causes**:

- Pre-filter not working
- `getTracksByPaths()` slow query
- Path normalization not matching

**Debug**:

```javascript
// Check logs for:
'Pre-filter: X already imported, Y to scan';

// If Y > 0 when it should be 0, paths aren't matching
```

### Issue: Duplicates still created

**Possible causes**:

- `deduplicateAndMergeTracks()` not called
- Path normalization differs between sources
- Case sensitivity mismatch

**Debug**:

```bash
# Check actual database
yarn db:check-dupes

# Examine paths
sqlite3 harmony.db "SELECT id, path FROM track WHERE path LIKE '%trackname%'"
```

### Issue: Metadata overwritten

**Possible causes**:

- `smartMergeTrack()` logic incorrect
- Update happening instead of merge

**Debug**:

- Check `tracksToUpdate` array before `updateTrack()`
- Verify `smartMergeTrack()` returns correct `hasChanges`

### Issue: Constraint error on insert

**Expected behavior**: Application should handle gracefully.

**If crashes**:

- Check error handling in `insertTracks()`
- Verify `onConflictDoUpdate` is working
- May need try-catch wrapper

---

## Success Criteria

The implementation is considered **production-ready** if:

1. ✅ All 8 core tests pass
2. ✅ No duplicates created in normal usage
3. ✅ Performance improvement > 20x on re-imports
4. ✅ No data loss or unwanted overwrites
5. ✅ Helper scripts work correctly
6. ✅ Edge cases handled gracefully (or documented)
7. ✅ No crashes or critical errors

---

## Next Steps After Testing

### If All Tests Pass ✅

1. Update version number in `package.json`
2. Write release notes highlighting:
   - "90x faster re-imports"
   - "Automatic duplicate prevention"
   - "Smart metadata merge"
3. Create git commit with all changes
4. Tag release: `git tag v0.25.0`
5. Build production release: `yarn release`

### If Tests Fail ❌

1. Document failures in detail
2. Create bug fixes for each issue
3. Re-run failed tests
4. Repeat until all pass

---

**Testing Started**: [Date/Time]  
**Tested By**: [Your Name]  
**Harmony Version**: 0.24.1 + deduplication  
**OS**: [Windows/macOS/Linux]
