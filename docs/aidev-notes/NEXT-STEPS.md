# Next Steps - Playlist Drag & Drop Feature

**Status:** 🎯 Ready for Performance Testing  
**Date:** 2026-01-18 (Updated)

---

## ✅ What's Complete

1. **Core Implementation**
   - ✅ Drag & drop functionality for playlist track reordering
   - ✅ Conditional enablement based on sort state (only when sorted by `#`)
   - ✅ Visual drop indicator with above/below positioning
   - ✅ Backend persistence via existing `reorderTracks()` API
   - ✅ Single-track drag (MVP scope)
   - ✅ **NEW:** Custom drag ghost showing `🎵 {Title - Artist}`

2. **Code Quality**
   - ✅ TypeScript compilation passing (`yarn typecheck`)
   - ✅ ESLint passing (`yarn lint`)
   - ✅ Accessibility fix applied (`<section>` with aria-label)
   - ✅ All imports properly ordered per project conventions
   - ✅ Event handlers use `useCallback` for performance

3. **Performance Instrumentation** ⭐ NEW
   - ✅ Performance logger utility created (`performance-logger.ts`)
   - ✅ Detailed timing logs throughout drag & drop pipeline
   - ✅ CSV export functionality for data analysis
   - ✅ Console commands for easy testing
   - ✅ localStorage history tracking (last 50 sessions)

4. **Documentation**
   - ✅ Technical documentation: `docs/aidev-notes/playlist-drag-drop.md`
   - ✅ Testing guide: `docs/aidev-notes/TESTING-drag-drop.md`
   - ✅ **NEW:** Performance analysis template: `docs/aidev-notes/drag-drop-performance-analysis.md`
   - ✅ Index updated: `docs/aidev-notes/README.md`
   - ✅ Quick test script: `scripts/test-drag-drop.sh`

---

## 🚀 Immediate Next Steps

### Step 1: Verify Visual Improvements ✨

**NEW: Custom Drag Ghost**

The drag ghost now shows meaningful track information:

- **Before:** Generic "1 row" text
- **After:** `🎵 Song Title - Artist Name`

**To verify:**

```bash
yarn dev
```

1. Open any playlist
2. Drag any track
3. Observe the drag ghost shows track title and artist with music emoji

---

### Step 2: Performance Testing 📊

**Objective:** Measure lag from drop to UI update and identify bottlenecks

**Quick Start:**

```bash
yarn dev
```

**In DevTools Console (`Ctrl+Shift+I`):**

```javascript
// View available commands (auto-displayed on start)
// You should see:
// [DRAG-PERF] Performance logger initialized. Console commands available...

// Optional: Clear previous test data
__clearDragPerfHistory();

// Now perform drag & drop operations in the app
// Logs will automatically appear in console with detailed timing

// After testing, view summary statistics
__dragPerfSummary();

// Export all results to CSV in console
__exportDragPerfHistory();

// Or download as file
__dragPerfDownload('test-results-2026-01-18.csv');
```

**Test Procedure:**

1. **Small playlist (10 tracks):** Drag track #5 → position #2 (repeat 3x)
2. **Medium playlist (50 tracks):** Drag track #25 → position #10 (repeat 3x)
3. **Large playlist (200+ tracks):** Drag track #100 → position #50 (repeat 3x)

**For each test, note:**

- Total lag (ms)
- Which operations take the most time
- Any console errors or warnings

**Full testing procedure:** `docs/aidev-notes/drag-drop-performance-analysis.md`

---

## 📋 Expected Log Output

When you drag & drop a track, you'll see detailed logs like this:

```
[DRAG-PERF] ========== SESSION START: drag-1737123456789 ==========
[DRAG-PERF] Drop event fired | +0.15ms | Total: 0.15ms
[DRAG-PERF] Track data extracted | +0.82ms | Total: 0.97ms | {"draggedTrack":"Song","targetTrack":"Other"}
[DRAG-PERF] Position calculated | +0.31ms | Total: 1.28ms | {"position":"above"}
[DRAG-PERF] Before PlaylistsAPI.reorderTracks call | +0.05ms | Total: 1.33ms
[DRAG-PERF] PlaylistsAPI.reorderTracks entered | +0.12ms | Total: 1.45ms
[DRAG-PERF] Before IPC call (db.playlists.reorderTracks) | +0.08ms | Total: 1.53ms
[DRAG-PERF] After IPC call completed | +18.45ms | Total: 19.98ms
[DRAG-PERF] Before router.revalidate() | +0.11ms | Total: 20.09ms
[DRAG-PERF] PlaylistView.loader started | +0.25ms | Total: 20.34ms
[DRAG-PERF] Before db.playlists.findOnlyByID | +0.08ms | Total: 20.42ms
[DRAG-PERF] After db.playlists.findOnlyByID | +12.67ms | Total: 33.09ms
[DRAG-PERF] Before db.playlists.getAll | +0.05ms | Total: 33.14ms
[DRAG-PERF] After db.playlists.getAll | +15.88ms | Total: 49.02ms
[DRAG-PERF] PlaylistView.loader finished | +0.11ms | Total: 49.13ms
[DRAG-PERF] After router.revalidate() returned | +29.45ms | Total: 49.54ms
[DRAG-PERF] After PlaylistsAPI.reorderTracks completed | +0.08ms | Total: 49.62ms
[DRAG-PERF] UI updated (next animation frame) | +5.23ms | Total: 54.85ms
[DRAG-PERF] ========== SESSION END: drag-1737123456789 | TOTAL: 54.85ms ==========
```

**Key metrics to watch:**

- **IPC call duration:** Time for backend to process
- **findOnlyByID duration:** Current playlist reload time
- **getAll duration:** All playlists reload time (potentially unnecessary)
- **router.revalidate duration:** Full reload time
- **TOTAL LAG:** Drop to UI update

---

## 🎯 What We're Looking For

### Primary Questions:

1. **What's the total lag?**
   - Acceptable: < 100ms
   - Noticeable: 100-200ms
   - Problematic: > 200ms

2. **Where's the bottleneck?**
   - IPC overhead?
   - Database queries (`findOnlyByID` or `getAll`)?
   - Router revalidate?
   - UI render?

3. **Does it scale with playlist size?**
   - Linear scaling is OK
   - Exponential scaling is a problem

### Hypotheses to Validate:

**Hypothesis 1:** `db.playlists.getAll()` is unnecessary

- If this takes significant time (> 20ms), we can optimize by caching

**Hypothesis 2:** `router.revalidate()` causes full reload

- If this dominates total time, we should update AG Grid directly

**Hypothesis 3:** IPC has significant overhead

- If IPC takes > 50% of time, consider optimistic UI updates

---

## 📊 After Testing

Once you have the measurements, fill in the template:

**File:** `docs/aidev-notes/drag-drop-performance-analysis.md`

**Include:**

1. Timing tables for each playlist size
2. Identification of primary bottleneck
3. Prioritized optimization recommendations
4. Raw CSV data

Then we can discuss and implement the most impactful optimizations!

---

## 🔧 Performance Logger Commands

All commands are available in the browser Console:

```javascript
// Export history to CSV (console output)
__exportDragPerfHistory()

// Download CSV file
__dragPerfDownload(filename?)

// Show statistics summary
__dragPerfSummary()

// Clear all history
__clearDragPerfHistory()

// Enable logging (enabled by default)
__dragPerfEnable()

// Disable logging
__dragPerfDisable()
```

---

## 📁 Files Modified/Created in This Update

**Modified:**

- `src/renderer/src/components/TrackList/TrackList.tsx`
  - Added `rowDragText` callback for custom drag ghost
  - Added performance instrumentation in `onRowDragEnd`
- `src/renderer/src/stores/PlaylistsAPI.ts`
  - Added performance instrumentation in `reorderTracks`
- `src/renderer/src/views/PLaylist/PlaylistView.tsx`
  - Added performance instrumentation in loader

**Created:**

- `src/renderer/src/lib/performance-logger.ts` (~250 lines)
  - Complete performance logging system
  - CSV export functionality
  - Console commands
  - localStorage history management
- `docs/aidev-notes/drag-drop-performance-analysis.md` (~600 lines)
  - Comprehensive testing template
  - Result tables
  - Analysis guidelines
  - Optimization recommendations framework

---

## 🎉 Summary of Improvements

### Visual Enhancement ✨

- **Custom Drag Ghost:** Shows `🎵 Title - Artist` instead of generic "1 row"
- **Better UX:** Users immediately know what they're dragging

### Performance Measurement 📊

- **Detailed Logging:** Tracks every step of the drag & drop pipeline
- **CSV Export:** Easy data analysis and sharing
- **Console Tools:** Quick access to statistics and history
- **Zero Impact:** Logging can be disabled without code changes

### Next Phase Readiness 🚀

- **Data-Driven Optimization:** Know exactly where to optimize
- **Before/After Comparison:** Validate improvements objectively
- **Scalability Analysis:** Understand how it performs with large playlists

---

## 🔗 Quick Links

**Documentation:**

- [Technical Spec](./playlist-drag-drop.md)
- [Testing Guide](./TESTING-drag-drop.md)
- [Performance Analysis Template](./drag-drop-performance-analysis.md)
- [Project Guidelines](../../AGENTS.md)

**Source Files:**

- [TrackList.tsx](../../src/renderer/src/components/TrackList/TrackList.tsx)
- [PlaylistsAPI.ts](../../src/renderer/src/stores/PlaylistsAPI.ts)
- [PlaylistView.tsx](../../src/renderer/src/views/PLaylist/PlaylistView.tsx)
- [Performance Logger](../../src/renderer/src/lib/performance-logger.ts)

---

## ❓ Need Help?

**If drag ghost doesn't show custom text:**

- Verify you're in a playlist view (not library)
- Check Console for errors
- Ensure `rowDragText` is defined in `defaultColDef`

**If performance logs don't appear:**

- Open DevTools Console
- Look for `[DRAG-PERF] Performance logger initialized` message
- Try `__dragPerfEnable()` in Console
- Check `localStorage.getItem('drag-perf-enabled')`

**If measurements seem wrong:**

- Clear history and test again: `__clearDragPerfHistory()`
- Ensure no other heavy operations are running
- Close other browser tabs
- Test multiple times to get consistent averages

---

**Ready to test?** Run `yarn dev` and start measuring! 🚀

**Last Updated:** 2026-01-18  
**Version:** 2.0 (Performance Testing Phase)
