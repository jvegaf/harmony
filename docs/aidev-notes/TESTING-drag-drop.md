# Manual Testing Checklist: Playlist Drag & Drop

**Feature:** Track reordering via drag & drop in playlist view  
**Implementation Date:** 2026-01-18  
**Status:** Ready for manual testing  
**Estimated Testing Time:** 15-20 minutes

---

## Prerequisites

```bash
# Ensure dependencies are installed
yarn

# Start development mode
yarn dev
```

**Browser DevTools:** Open with `Ctrl+Shift+I` (Linux/Windows) or `Cmd+Option+I` (Mac)

---

## Test Suite

### ✅ Test 1: Basic Drag & Drop Functionality

**Objective:** Verify basic drag and drop works correctly

**Steps:**

1. Create or open a playlist with at least 5 tracks
2. Ensure playlist is sorted by order column (`#`) — click `#` header if needed
3. Hover over any track row → cursor should change to `grab` (`cursor: grab`)
4. Click and hold on a track in the middle (e.g., track #3)
5. Drag upward slowly

**Expected Results:**

- ✅ Cursor changes to `grabbing` during drag
- ✅ Horizontal line indicator appears above/below hovered row
- ✅ Line color: semi-transparent gray (`rgba(0, 0, 0, 0.2)`)
- ✅ Line follows mouse smoothly

**Steps (continued):** 6. Drop the track above track #2 7. Observe the grid update

**Expected Results:**

- ✅ Track #3 moves to position #2
- ✅ Other tracks shift down automatically
- ✅ No page reload/flash
- ✅ Order changes instantly

**Console Check:**

```javascript
// Look for these log messages (open Console tab):
[TrackList] Row drag ended - dragged track: {...}
[TrackList] Drop position: above/below
[TrackList] Reordering tracks in playlist
```

**Database Verification:** 8. Close the app completely (`Ctrl+Q` or close window) 9. Restart with `yarn dev` 10. Open the same playlist

**Expected Results:**

- ✅ Track order is preserved exactly as you left it
- ✅ No reset to original order

---

### ✅ Test 2: Conditional Drag Enablement

**Objective:** Verify drag is disabled when sorting by non-order columns

**Steps:**

1. Open a playlist (sorted by `#`)
2. Hover over a track → cursor should be `grab`
3. Click the "Title" column header to sort alphabetically
4. Hover over a track

**Expected Results:**

- ✅ Cursor remains normal (pointer/default)
- ✅ No drag cursor (`grab`)
- ✅ Clicking and dragging does nothing

**Console Check:**

```javascript
// Should see:
[TrackList] Sort changed
[TrackList] Drag enabled: false
```

**Steps (continued):** 5. Click the `#` column header to restore order sorting 6. Hover over a track

**Expected Results:**

- ✅ Cursor changes back to `grab`
- ✅ Drag is re-enabled

**Console Check:**

```javascript
// Should see:
[TrackList] Sort changed
[TrackList] Drag enabled: true
```

**Test Other Columns:** 7. Test disabling with these columns:

- Artist
- Album
- Duration
- Genre (if present)

**Expected Results:**

- ✅ Drag disabled for ALL non-order column sorts
- ✅ Drag re-enabled when returning to `#` sort
- ✅ Drag re-enabled when clearing sort (click `#` twice)

---

### ✅ Test 3: Visual Feedback Accuracy

**Objective:** Verify drop indicator shows correct position

**Setup:**

```
Initial order:
#1 Track A
#2 Track B
#3 Track C
#4 Track D
#5 Track E
```

**Test 3.1: Drop Above**

**Steps:**

1. Drag Track E (#5)
2. Hover near the top edge of Track B (#2) — stay in upper half of row
3. Observe indicator line position

**Expected Results:**

- ✅ Horizontal line appears **above** Track B
- ✅ Line is positioned at top edge of Track B row
- ✅ Visual gap between Track A and line

**Steps (continued):** 4. Release mouse (drop)

**Expected Results:**

- ✅ Track E moves to position #2
- ✅ Order becomes: A, E, B, C, D

---

**Test 3.2: Drop Below**

**Steps:**

1. Undo previous by moving Track E back to #5 manually
2. Drag Track A (#1)
3. Hover near the bottom edge of Track D (#4) — stay in lower half of row
4. Observe indicator line position

**Expected Results:**

- ✅ Horizontal line appears **below** Track D
- ✅ Line is positioned at bottom edge of Track D row
- ✅ Visual gap between Track D and Track E

**Steps (continued):** 5. Release mouse (drop)

**Expected Results:**

- ✅ Track A moves between Track D and Track E
- ✅ Order becomes: B, C, D, A, E

---

**Test 3.3: Boundary Precision**

**Steps:**

1. Drag any track
2. Hover over target row and move mouse slowly from top edge to bottom edge
3. Watch indicator line switch from "above" to "below"

**Expected Results:**

- ✅ Indicator switches at approximately 50% mark of row height
- ✅ No flickering or jitter during transition
- ✅ Line position is always clear and unambiguous

---

### ✅ Test 4: Edge Cases

**Test 4.1: Drag Track Onto Itself**

**Steps:**

1. Drag Track C (#3)
2. Drop it at its own current position (above or below Track C)

**Expected Results:**

- ✅ No visible change in order
- ✅ No unnecessary API call (check Console)
- ✅ No errors logged

---

**Test 4.2: Cancel Drag with ESC**

**Steps:**

1. Start dragging Track B (#2)
2. Move it toward a different position
3. Press `ESC` key before releasing mouse

**Expected Results:**

- ✅ Drag cancels immediately
- ✅ Indicator line disappears
- ✅ No order change occurs
- ✅ Console logs: `[TrackList] Row drag cancelled`

---

**Test 4.3: Drag Outside Grid Boundaries**

**Steps:**

1. Start dragging Track D (#4)
2. Move cursor outside the grid area (above header or below last row)
3. Release mouse

**Expected Results:**

- ✅ Drag cancels (or completes harmlessly)
- ✅ Indicator line disappears
- ✅ Console logs: `[TrackList] Row drag left grid area`
- ✅ No crashes or errors

---

**Test 4.4: Single-Track Playlist**

**Steps:**

1. Create a new playlist with only 1 track
2. Try to drag the track

**Expected Results:**

- ✅ Drag cursor appears (`grab`)
- ✅ Can drag, but no meaningful position change
- ✅ No errors logged

---

**Test 4.5: Large Playlist (Performance)**

**Steps:**

1. Create or find a playlist with 100+ tracks
2. Scroll to middle of playlist
3. Drag a track from position #50 to position #10

**Expected Results:**

- ✅ Drag starts smoothly (no lag)
- ✅ Indicator line renders without delay
- ✅ Drop completes within 1-2 seconds
- ✅ Grid updates without freezing
- ✅ Scrolling remains smooth after operation

---

### ✅ Test 5: Multi-Selection Behavior (Current Limitation)

**Objective:** Verify single-track drag limitation

**Steps:**

1. Open a playlist
2. Select multiple tracks using `Ctrl+Click` or `Shift+Click`
3. Try to drag one of the selected tracks

**Expected Results:**

- ✅ Only the clicked track drags (single-track only)
- ✅ Selection may clear (acceptable for MVP)
- ✅ No errors in console

**Note:** Multi-track drag is a future enhancement (see roadmap in `playlist-drag-drop.md`)

---

### ✅ Test 6: Library View (Should NOT Support Drag)

**Objective:** Verify drag is disabled in library view

**Steps:**

1. Navigate to Library view (not a playlist)
2. Ensure tracks are visible in grid
3. Hover over any track

**Expected Results:**

- ✅ Cursor remains normal (NOT `grab`)
- ✅ No drag functionality available
- ✅ Console logs: `[TrackList] Drag enabled: false` (if sort changes)

---

### ✅ Test 7: Error Handling

**Test 7.1: Backend Failure Simulation**

**Manual Test (requires code modification):**

1. Temporarily break backend by commenting out the reorder method in `DatabaseModule.ts`
2. Try to drag and drop a track
3. Check Console for error messages

**Expected Results:**

- ✅ Error logged: "Failed to reorder tracks in playlist"
- ✅ Grid reverts to original order (or shows error notification)
- ✅ App does not crash

**Restore code after test**

---

**Test 7.2: Rapid Successive Drags**

**Steps:**

1. Drag Track A to position #5 → release
2. Immediately drag Track B to position #1 → release
3. Immediately drag Track C to position #3 → release
4. Do this within ~3 seconds

**Expected Results:**

- ✅ All drags complete successfully
- ✅ Final order reflects all three operations
- ✅ No race conditions or order corruption
- ✅ Console logs show 3 separate reorder calls

---

## Console Error Checks

### Throughout all tests, monitor Console for:

**❌ Should NOT see:**

- `TypeError: Cannot read property ...`
- `Uncaught (in promise) ...`
- `AG Grid: Invalid column state ...`
- `Database connection error ...`
- `IPC handler not found ...`

**✅ Should see (normal logs):**

- `[TrackList] Grid ready, drag enabled: true/false`
- `[TrackList] Sort changed`
- `[TrackList] Drag enabled: true/false`
- `[TrackList] Row drag ended - dragged track: {...}`
- `[TrackList] Drop position: above/below`
- `[TrackList] Reordering tracks in playlist`

---

## Network/IPC Monitor

**Open Electron DevTools → Application → IPC**

(If IPC tab not available, monitor Console for IPC messages)

**During a successful drag & drop, expect to see:**

```
IPC: renderer → main
Channel: db:playlists:reorderTracks
Payload: {
  playlistID: "...",
  tracks: [...],
  targetTrackId: "...",
  position: "above" | "below"
}

IPC: main → renderer
Response: { success: true } or { success: false, error: "..." }
```

---

## Performance Metrics

### Acceptable Performance Targets:

| Metric             | Target         | Critical Threshold |
| ------------------ | -------------- | ------------------ |
| Drag start latency | < 50ms         | < 200ms            |
| Indicator render   | < 16ms (60fps) | < 33ms (30fps)     |
| Drop completion    | < 500ms        | < 2000ms           |
| Database persist   | < 1000ms       | < 3000ms           |
| Grid re-render     | < 100ms        | < 500ms            |

**How to measure:**

1. Open DevTools → Performance tab
2. Start recording
3. Perform a drag & drop operation
4. Stop recording and analyze timeline

**Red flags:**

- Long tasks > 100ms
- Frame drops during drag
- Memory leaks (increasing heap size)

---

## Regression Checks

### Ensure existing functionality still works:

- ✅ Playlist creation/deletion
- ✅ Adding tracks to playlist
- ✅ Removing tracks from playlist
- ✅ Sorting by any column
- ✅ Searching/filtering tracks
- ✅ Double-click to play track
- ✅ Context menu (right-click)
- ✅ Keyboard navigation (arrow keys)

---

## Test Results Template

```markdown
## Test Results: Playlist Drag & Drop

**Tester:** [Your Name] **Date:** [YYYY-MM-DD] **Environment:**

- OS: [Linux/Windows/Mac]
- Electron Version: [from yarn dev output]
- AG Grid Version: 34.3.1

### Test Summary

| Test # | Test Name              | Status            | Notes |
| ------ | ---------------------- | ----------------- | ----- |
| 1      | Basic Drag & Drop      | ✅ PASS / ❌ FAIL | ...   |
| 2      | Conditional Enablement | ✅ PASS / ❌ FAIL | ...   |
| 3.1    | Drop Above             | ✅ PASS / ❌ FAIL | ...   |
| 3.2    | Drop Below             | ✅ PASS / ❌ FAIL | ...   |
| 3.3    | Boundary Precision     | ✅ PASS / ❌ FAIL | ...   |
| 4.1    | Drag Onto Itself       | ✅ PASS / ❌ FAIL | ...   |
| 4.2    | Cancel with ESC        | ✅ PASS / ❌ FAIL | ...   |
| 4.3    | Drag Outside Grid      | ✅ PASS / ❌ FAIL | ...   |
| 4.4    | Single-Track Playlist  | ✅ PASS / ❌ FAIL | ...   |
| 4.5    | Large Playlist (100+)  | ✅ PASS / ❌ FAIL | ...   |
| 5      | Multi-Selection Limit  | ✅ PASS / ❌ FAIL | ...   |
| 6      | Library View Disabled  | ✅ PASS / ❌ FAIL | ...   |
| 7.2    | Rapid Successive Drags | ✅ PASS / ❌ FAIL | ...   |

### Bugs Found

1. **[Bug Title]**
   - **Severity:** Critical / High / Medium / Low
   - **Steps to Reproduce:** ...
   - **Expected:** ...
   - **Actual:** ...
   - **Screenshots/Logs:** ...

### Performance Notes

- Drag start latency: ~XX ms
- Drop completion time: ~XXX ms
- Grid re-render time: ~XX ms
- Any frame drops: Yes/No

### Console Errors

[Paste any unexpected errors here]

### Recommendations

- [Any suggestions for improvements or fixes]

### Overall Status

**Ready for Production:** ✅ YES / ❌ NO (needs fixes) / ⚠️ CONDITIONAL (document issues)

**Blocker Issues:** [List any critical bugs that prevent release]
```

---

## Quick Sanity Check (2 minutes)

**If short on time, run this minimal test:**

1. ✅ Open any playlist
2. ✅ Drag track #3 to position #1 → verify it moves
3. ✅ Sort by Title → verify drag cursor disappears
4. ✅ Sort by # → verify drag cursor returns
5. ✅ Restart app → verify order persisted
6. ✅ Check Console for any red errors

**If all 6 pass:** Feature is likely working correctly  
**If any fail:** Run full test suite above

---

## Troubleshooting

### Issue: Drag cursor not appearing

**Possible causes:**

1. `isDragEnabled` state not updating
2. AG Grid props not reactive
3. CSS `cursor: grab` not applied

**Debug steps:**

```javascript
// In Console, after grid loads:
window.__agGrid = gridApi; // Add this in TrackList.tsx for debugging

// Then check:
window.__agGrid.getColumn('playlistOrder').getSort(); // Should be 'asc' or null
```

---

### Issue: Drop indicator line not showing

**Possible causes:**

1. `onRowDragMove` not firing
2. CSS not loaded
3. Z-index conflict

**Debug steps:**

- Check Console for `[TrackList] Row drag move` logs
- Inspect DOM for `.ag-row-drag-indicator` element
- Check computed styles in DevTools

---

### Issue: Order not persisting

**Possible causes:**

1. IPC handler not responding
2. Database write failure
3. Router not revalidating

**Debug steps:**

- Check Console for `[Database] Reordering tracks` log
- Open SQLite database file manually:
  ```bash
  sqlite3 ~/.config/harmony/database/harmony.db
  SELECT * FROM playlist_track WHERE playlistId = '[YOUR_PLAYLIST_ID]' ORDER BY "order";
  ```
- Verify `order` column values are sequential

---

### Issue: Performance lag with large playlists

**Possible causes:**

1. AG Grid not virtualized
2. Too many DOM updates
3. Database query inefficiency

**Debug steps:**

- Open Performance tab during drag
- Look for long tasks > 100ms
- Check database query time in main process logs

---

## Next Steps After Testing

### If ALL tests pass:

1. ✅ Update `docs/aidev-notes/playlist-drag-drop.md` → Status: "Production Ready"
2. ✅ Create git commit:
   ```bash
   git add -A
   git commit -m "feat: add playlist track reordering via drag & drop [AI]"
   ```
3. ✅ Consider adding unit tests (optional)
4. ✅ Plan next enhancement (multi-track drag?)

### If bugs found:

1. ❌ Document bugs in issue tracker or TODO
2. 🔧 Prioritize fixes (critical → high → medium → low)
3. 🔧 Fix bugs in order of priority
4. 🔄 Re-run test suite after fixes

### If performance issues:

1. 📊 Profile with DevTools Performance tab
2. 🔧 Optimize hot paths
3. 🔧 Consider debouncing/throttling
4. 🔄 Re-test performance benchmarks

---

## Automated Testing TODO (Future)

**Currently:** Manual testing only  
**Future:** Add automated tests with Vitest + Testing Library

**Test file to create:** `src/renderer/src/components/TrackList/TrackList.test.tsx`

**Coverage targets:**

- ✅ Drag enabled when sorted by order column
- ✅ Drag disabled when sorted by other columns
- ✅ Drop position calculation (above/below logic)
- ✅ Backend API call with correct parameters
- ✅ Error handling when backend fails

**Estimated effort:** 4-6 hours

---

**End of Testing Checklist**
