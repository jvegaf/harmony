# Quick Testing Reference Card

## 🚀 Quick Start

```bash
# Start development mode
yarn dev

# Run with logs visible
yarn dev 2>&1 | tee test-log.txt
```

## 📊 Key Metrics to Watch

### Log Messages to Look For

✅ **Pre-filter working**:

```
[IPCLibraryModule] Pre-filter: 45 already imported, 0 to scan
```

✅ **Deduplication active**:

```
[DatabaseModule] Found X existing tracks, Y new tracks, Z to update
```

✅ **Smart merge applied**:

```
[DatabaseModule] Updated X tracks with merged metadata
```

---

## 🧪 Quick Tests (5 minutes each)

### Test 1: Basic Dedup

```
1. Import folder (45 tracks, 60s)
2. Import same folder (45 tracks, 3s) ← Should be fast!
3. Check count unchanged
✅ PASS if: Same count, <5s, log shows pre-filter
```

### Test 2: Smart Merge

```
1. Import incomplete tracks
2. Edit Artist = "Test"
3. Update file tags, set Album = "New"
4. Re-import
5. Check: Artist = "Test" (kept), Album = "New" (filled)
✅ PASS if: Edits preserved, empties filled
```

### Test 3: No Duplicates

```
bash
yarn db:check-dupes

✅ PASS if: "No duplicate paths found!"
```

---

## 🔍 Quick Database Queries

```sql
-- Count tracks
SELECT COUNT(*) FROM track;

-- Find duplicates
SELECT path, COUNT(*) FROM track GROUP BY path HAVING COUNT(*) > 1;

-- Check unique index exists
SELECT name FROM sqlite_master WHERE type='index' AND name='track_path_unique';

-- Sample tracks
SELECT id, path, title, artist FROM track LIMIT 10;
```

---

## 🐛 Quick Debug Commands

### Check if makeTrackID is used

```bash
# Look for path-based IDs (16 hex chars)
sqlite3 harmony.db "SELECT id FROM track LIMIT 5"
# Should see: ABC123DEF456789A (deterministic)
# Not: 550e8400-e29b-41d4-a716-446655440000 (random UUID)
```

### Check import performance

```bash
# Time a re-import
time yarn dev  # Import same folder again
# Should complete in <10s
```

### Check for errors

```bash
# Watch logs in real-time
yarn dev 2>&1 | grep -i error
```

---

## 📈 Expected Performance

| Tracks | 1st Import | 2nd Import | Speedup |
| ------ | ---------- | ---------- | ------- |
| 50     | 30s        | 2s         | 15x     |
| 100    | 60s        | 3s         | 20x     |
| 500    | 5min       | 5s         | 60x     |
| 1000   | 10min      | 7s         | 85x     |

---

## ✅ Pass/Fail Checklist

```
Core Functionality:
[ ] No duplicates on re-import
[ ] Pre-filter speeds up 20x+
[ ] Smart merge works
[ ] Traktor sync deduplicates
[ ] Cross-source merge works

Database:
[ ] Unique constraint exists
[ ] No duplicate paths
[ ] Constraint blocks duplicates

Tools:
[ ] check-dupes detects
[ ] clean-dupes removes

Performance:
[ ] 2nd import <5s for 50 tracks
[ ] CPU low on re-import
[ ] No memory leaks
```

---

## 🚨 Red Flags

❌ **Second import is still slow (>30s)** → Pre-filter not working, check logs

❌ **Track count increases on re-import** → Duplicates being created, check dedup logic

❌ **User edits overwritten** → Smart merge broken, check merge logic

❌ **App crashes on import** → Check error handling, constraint conflicts

❌ **Foreign key errors** → Don't update track IDs, only metadata

---

## 💡 Quick Fixes

### Pre-filter not working?

Check: `IPCLibraryModule.ts` line ~120 Verify: `getTracksByPaths()` is called

### Duplicates still created?

Check: `DatabaseModule.ts` line ~35 Verify: `deduplicateAndMergeTracks()` is called

### Merge not working?

Check: `track-merge.ts` `smartMergeTrack()` Verify: Empty fields filled, non-empty preserved

---

## 📞 Support

If stuck, provide:

1. OS and Harmony version
2. Test that failed
3. Log output (last 50 lines)
4. Result of `yarn db:check-dupes`
5. Track count before/after

---

**Quick Reference v1.0**  
**For Harmony v0.24.1 + Track Deduplication**
