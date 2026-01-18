# Drag & Drop Performance Analysis

**Date:** 2026-01-18  
**Feature:** Playlist track reordering via drag & drop  
**Status:** 🔬 Ready for testing and measurement

---

## 📋 Test Environment

**Environment Information:**

- **OS:** [To be filled during testing]
- **Electron Version:** [To be filled]
- **AG Grid Version:** 34.3.1
- **Hardware:** [CPU/RAM to be filled]

---

## 🎯 Test Objectives

1. Measure total lag from drop to UI update
2. Identify performance bottlenecks in the drag & drop pipeline
3. Determine if lag scales with playlist size
4. Provide data-driven recommendations for optimization

---

## 🧪 Test Procedure

### Prerequisites

1. Start the application in development mode:

   ```bash
   yarn dev
   ```

2. Open DevTools Console (`Ctrl+Shift+I` or `Cmd+Option+I`)

3. Verify performance logging is enabled:

   ```javascript
   // You should see this message in console:
   // [DRAG-PERF] Performance logger initialized. Console commands available...
   ```

4. **(Optional)** Clear previous test history:
   ```javascript
   __clearDragPerfHistory();
   ```

---

### Test Cases

#### Test 1: Small Playlist (10 tracks)

**Setup:**

- Create or open a playlist with ~10 tracks
- Ensure tracks have clear titles and artists

**Procedure:**

1. Drag track #5 to position #2
2. Wait for UI to update completely
3. Copy all `[DRAG-PERF]` logs from Console
4. Repeat 3 times (to get average)

**Expected Metrics:**

- IPC call: 5-15ms
- findOnlyByID: 3-8ms
- getAll: 5-10ms
- Router revalidate: 10-30ms
- UI render: 5-10ms
- **TOTAL LAG:** 30-70ms

---

#### Test 2: Medium Playlist (50 tracks)

**Setup:**

- Create or open a playlist with ~50 tracks

**Procedure:**

1. Drag track #25 to position #10
2. Wait for UI to update completely
3. Copy all `[DRAG-PERF]` logs from Console
4. Repeat 3 times

**Expected Metrics:**

- IPC call: 10-25ms
- findOnlyByID: 8-15ms
- getAll: 10-20ms
- Router revalidate: 20-50ms
- UI render: 5-15ms
- **TOTAL LAG:** 50-120ms

---

#### Test 3: Large Playlist (200+ tracks)

**Setup:**

- Create or open a playlist with 200+ tracks
- _Note: May need to import a large library for this test_

**Procedure:**

1. Drag track #100 to position #50
2. Wait for UI to update completely
3. Copy all `[DRAG-PERF]` logs from Console
4. Repeat 3 times

**Expected Metrics:**

- IPC call: 20-40ms
- findOnlyByID: 15-30ms
- getAll: 20-40ms
- Router revalidate: 40-100ms
- UI render: 10-20ms
- **TOTAL LAG:** 100-230ms

---

#### Test 4: Rapid Consecutive Drags

**Setup:**

- Playlist with 30 tracks

**Procedure:**

1. Perform 5 drag & drop operations rapidly (one after another, ~1 second apart)
2. Observe if there's lag accumulation or concurrency issues
3. Check Console for any errors or warnings

**Expected Behavior:**

- Each drag should complete before next starts
- No race conditions or order corruption
- Consistent lag across all 5 operations

---

### Exporting Results

**Option A: Export individual session (after each drag):**

The CSV is automatically logged to Console after each drag operation. Copy it from the Console output.

**Option B: Export all history (after all tests):**

```javascript
// In Console:
__exportDragPerfHistory();

// Then copy the CSV output and save to:
// docs/aidev-notes/drag-drop-test-results-YYYY-MM-DD.csv
```

**Option C: Download as file:**

```javascript
// In Console:
__dragPerfDownload('my-test-results.csv');
```

**View summary statistics:**

```javascript
__dragPerfSummary();
```

---

## 📊 Test Results Template

### Small Playlist (10 tracks)

| Metric                                | Test 1    | Test 2    | Test 3    | Average       | % of Total |
| ------------------------------------- | --------- | --------- | --------- | ------------- | ---------- |
| **Frontend prep** (Drop → Before IPC) | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **IPC call** (Before IPC → After IPC) | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **PlaylistsAPI enter**                | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Before revalidate**                 | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: findOnlyByID**              | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: getAll**                    | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **After revalidate**                  | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **UI render** (Next frame)            | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **TOTAL LAG**                         | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | **\_\_\_ ms** | **100%**   |

---

### Medium Playlist (50 tracks)

| Metric                   | Test 1    | Test 2    | Test 3    | Average       | % of Total |
| ------------------------ | --------- | --------- | --------- | ------------- | ---------- |
| **Frontend prep**        | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **IPC call**             | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **PlaylistsAPI enter**   | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Before revalidate**    | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: findOnlyByID** | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: getAll**       | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **After revalidate**     | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **UI render**            | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **TOTAL LAG**            | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | **\_\_\_ ms** | **100%**   |

---

### Large Playlist (200+ tracks)

| Metric                   | Test 1    | Test 2    | Test 3    | Average       | % of Total |
| ------------------------ | --------- | --------- | --------- | ------------- | ---------- |
| **Frontend prep**        | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **IPC call**             | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **PlaylistsAPI enter**   | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Before revalidate**    | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: findOnlyByID** | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **Loader: getAll**       | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **After revalidate**     | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **UI render**            | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms     | \_\_\_%    |
| **TOTAL LAG**            | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | **\_\_\_ ms** | **100%**   |

---

### Scalability Analysis

| Playlist Size | Average Total Lag | Lag per Track | Notes          |
| ------------- | ----------------- | ------------- | -------------- |
| 10 tracks     | \_\_\_ ms         | \_\_\_ ms     | [Observations] |
| 50 tracks     | \_\_\_ ms         | \_\_\_ ms     | [Observations] |
| 200+ tracks   | \_\_\_ ms         | \_\_\_ ms     | [Observations] |

**Scaling Factor:** [Linear / Sub-linear / Super-linear]

---

## 🔍 Bottleneck Analysis

### Primary Bottleneck: [To be determined from data]

**Evidence:**

- Takes \_\_\_% of total time
- Scales [linearly/exponentially/not at all] with playlist size
- Measured at \_\_\_ ms average across all tests

**Impact:**

- Small playlists: **_ ms (_** % of total)
- Medium playlists: **_ ms (_** % of total)
- Large playlists: **_ ms (_** % of total)

**Root Cause:** [Analysis of why this is slow]

---

### Secondary Bottlenecks

#### Bottleneck #2: [Name]

**Metrics:**

- Average duration: \_\_\_ ms
- % of total time: \_\_\_%
- Scaling behavior: [Description]

**Impact:** [Description]

---

#### Bottleneck #3: [Name]

**Metrics:**

- Average duration: \_\_\_ ms
- % of total time: \_\_\_%
- Scaling behavior: [Description]

**Impact:** [Description]

---

## 🎯 Optimization Recommendations

### Priority 1: High Impact, Low Effort

#### Recommendation #1: [Title]

**Current Performance:**

- Current: **_ ms (_** % of total lag)
- Issue: [Description of problem]

**Proposed Solution:** [Detailed description]

**Expected Improvement:**

- Estimated reduction: -\_\_\_ ms
- New total lag: ~\_\_\_ ms
- Effort: Low / Medium / High
- Risk: Low / Medium / High

**Implementation:**

```typescript
// Example code or pseudocode
```

---

#### Recommendation #2: [Title]

**Current Performance:**

- Current: **_ ms (_** % of total lag)
- Issue: [Description of problem]

**Proposed Solution:** [Detailed description]

**Expected Improvement:**

- Estimated reduction: -\_\_\_ ms
- New total lag: ~\_\_\_ ms
- Effort: Low / Medium / High
- Risk: Low / Medium / High

---

### Priority 2: Medium Impact

#### Recommendation #3: [Title]

[Same template as above]

---

### Priority 3: Nice to Have

#### Recommendation #4: [Title]

[Same template as above]

---

## 🔬 Detailed Log Example

**Example output from a single drag operation:**

```
[DRAG-PERF] ========== SESSION START: drag-1737123456789 ==========
[DRAG-PERF] Drop event fired | +0.15ms | Total: 0.15ms
[DRAG-PERF] Track data extracted | +0.82ms | Total: 0.97ms | {"draggedTrack":"Song Name","targetTrack":"Other Song"}
[DRAG-PERF] Position calculated | +0.31ms | Total: 1.28ms | {"position":"above"}
[DRAG-PERF] Before PlaylistsAPI.reorderTracks call | +0.05ms | Total: 1.33ms
[DRAG-PERF] PlaylistsAPI.reorderTracks entered | +0.12ms | Total: 1.45ms
[DRAG-PERF] Before IPC call (db.playlists.reorderTracks) | +0.08ms | Total: 1.53ms
[DRAG-PERF] After IPC call completed | +18.45ms | Total: 19.98ms | {"playlistID":"...","tracksCount":1}
[DRAG-PERF] Before router.revalidate() | +0.11ms | Total: 20.09ms
[DRAG-PERF] PlaylistView.loader started | +0.25ms | Total: 20.34ms
[DRAG-PERF] Before db.playlists.findOnlyByID | +0.08ms | Total: 20.42ms | {"playlistID":"..."}
[DRAG-PERF] After db.playlists.findOnlyByID | +12.67ms | Total: 33.09ms | {"tracksCount":50}
[DRAG-PERF] Before db.playlists.getAll | +0.05ms | Total: 33.14ms
[DRAG-PERF] After db.playlists.getAll | +15.88ms | Total: 49.02ms | {"playlistsCount":5}
[DRAG-PERF] PlaylistView.loader finished | +0.11ms | Total: 49.13ms
[DRAG-PERF] After router.revalidate() returned | +29.45ms | Total: 49.54ms
[DRAG-PERF] After PlaylistsAPI.reorderTracks completed | +0.08ms | Total: 49.62ms
[DRAG-PERF] UI updated (next animation frame) | +5.23ms | Total: 54.85ms
[DRAG-PERF] ========== SESSION END: drag-1737123456789 | TOTAL: 54.85ms ==========
[DRAG-PERF] CSV Export (single session):
[CSV data follows...]
```

---

## 💾 Raw Data

### CSV Export

[Paste full CSV export here after completing all tests]

```csv
Session ID,Label,Duration (ms),Cumulative (ms),Total Session (ms),Metadata
[Data will be inserted here]
```

---

## 🎓 Hypotheses to Validate

### Hypothesis 1: `db.playlists.getAll()` is unnecessary

**Reasoning:**

- This method fetches ALL playlists, not just the current one
- The loader already has the current playlist from `findOnlyByID()`
- Sidebar could cache playlist list in Zustand instead of reloading

**Test:**

- Measure `getAll()` duration across different numbers of playlists
- Check if it scales linearly with total playlist count

**If confirmed:**

- **Action:** Remove `getAll()` call, use cached data
- **Expected impact:** -10 to -40ms depending on playlist count

---

### Hypothesis 2: `router.revalidate()` does full reload

**Reasoning:**

- `router.revalidate()` triggers the entire loader to run
- This fetches data from backend even though we already know the new order
- AG Grid could be updated directly without full reload

**Test:**

- Measure time between "Before router.revalidate()" and "After router.revalidate()"
- Compare to sum of loader operations

**If confirmed:**

- **Action:** Update AG Grid rows directly with `applyTransaction()` or `setRowData()`
- **Expected impact:** -20 to -80ms

---

### Hypothesis 3: IPC overhead is significant

**Reasoning:**

- Every IPC call has round-trip overhead (renderer → main → renderer)
- Serialization/deserialization of data
- Could be optimized with batching or optimistic UI

**Test:**

- Measure "Before IPC" to "After IPC" duration
- Compare to backend processing time (if we can instrument main process)

**If confirmed:**

- **Action:** Implement optimistic UI updates + background sync
- **Expected impact:** Perceived lag ~0ms, actual lag unchanged but async

---

### Hypothesis 4: UI re-render is slow for large playlists

**Reasoning:**

- AG Grid needs to re-render many rows after data changes
- React reconciliation overhead
- Could be optimized with better memoization

**Test:**

- Measure "After reorderTracks" to "UI updated" duration
- Compare across different playlist sizes

**If confirmed:**

- **Action:** Use AG Grid's `suppressAnimationFrame` or `asyncTransactionWaitMillis`
- **Expected impact:** -5 to -20ms

---

## 📈 Success Criteria

**Target Performance:**

- **Small playlists (< 50 tracks):** Total lag < 80ms (acceptable)
- **Medium playlists (50-100 tracks):** Total lag < 120ms (acceptable)
- **Large playlists (> 100 tracks):** Total lag < 200ms (acceptable)

**User Experience Goals:**

- Drag feels responsive (not frozen)
- Visual feedback is immediate (cursor, drop indicator)
- No perceived jank or stuttering
- Order changes are reflected quickly

**If targets are NOT met:** Priority should be on optimizations that reduce perceived lag (optimistic UI) over actual lag reduction.

---

## 🔧 Console Commands Reference

```javascript
// View all available commands
// (Automatically shown when app starts)

// Export all history to console as CSV
__exportDragPerfHistory();

// Download CSV file
__dragPerfDownload('my-results.csv');

// Show summary statistics
__dragPerfSummary();

// Clear all history
__clearDragPerfHistory();

// Enable/disable performance logging
__dragPerfEnable();
__dragPerfDisable();
```

---

## 📝 Testing Notes

**Tester Name:** [Your name]

**Test Date:** [YYYY-MM-DD]

**Notes During Testing:**

[Add any observations, anomalies, or issues encountered during testing]

---

## 🚀 Next Steps

**After completing tests and analysis:**

1. ✅ Fill in all measurement tables above
2. ✅ Identify primary bottleneck(s)
3. ✅ Prioritize optimization recommendations
4. ✅ Document findings and share with team
5. ✅ Implement high-priority optimizations
6. ✅ Re-test to validate improvements
7. ✅ Update this document with before/after comparisons

---

## 📚 Related Documentation

- [Playlist Drag & Drop Technical Spec](./playlist-drag-drop.md)
- [Testing Guide](./TESTING-drag-drop.md)
- [Next Steps](./NEXT-STEPS.md)
- [Performance Logger Source](../../src/renderer/src/lib/performance-logger.ts)

---

**Document Status:** 🔬 Template - Ready for data collection  
**Last Updated:** 2026-01-18  
**Version:** 1.0
