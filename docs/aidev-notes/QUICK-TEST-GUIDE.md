# Quick Testing Guide - Drag & Drop Performance

## 🚀 Start Testing (30 seconds)

```bash
cd /home/th3g3ntl3man/Code/harmony
yarn dev
```

**In DevTools Console (`Ctrl+Shift+I`):**

```javascript
__clearDragPerfHistory(); // Clear old data
```

---

## ✅ Visual Check (10 seconds)

1. Open any playlist
2. Drag any track
3. **Does it move INSTANTLY?** → ✅ Success / ❌ Fail

---

## 📊 Performance Check (30 seconds)

1. Drag 3 tracks (different directions)
2. Run:
   ```javascript
   __dragPerfSummary();
   ```

**Expected Output:**

```
Average Total Lag: ~5ms (was 189ms)
```

If you see **< 10ms** → ✅ **SUCCESS!** 🎉

If you see **> 50ms** → ❌ Something's wrong

---

## 🔍 Detailed Test (3 minutes)

### Test 1: Drag Up

- Drag track #10 → position #5
- **Check:** Track at correct position? ✅ / ❌

### Test 2: Drag Down

- Drag track #5 → position #15
- **Check:** Track at correct position? ✅ / ❌

### Test 3: Persistence

- Reload playlist (navigate away and back)
- **Check:** Order preserved? ✅ / ❌

### Test 4: Rapid Drags

- Drag 5 tracks quickly
- **Check:** All operations smooth? ✅ / ❌
- **Check:** No console errors? ✅ / ❌

---

## 📈 Export Results

```javascript
__exportDragPerfHistory();
```

Copy CSV data to spreadsheet for analysis.

---

## ❌ If Something's Wrong

**Console shows errors?**

- Copy error message
- Note exact steps to reproduce
- Report back with details

**Tracks in wrong position?**

- Note which direction (up/down)
- Note exact track numbers
- Check if order persists after reload

**Still feels laggy?**

- Run `__dragPerfSummary()`
- Share the metrics
- Check if backend sync is completing

---

## 🎯 Success Criteria

- ✅ Drag feels **instant** (no visible delay)
- ✅ Tracks appear in **correct position**
- ✅ Order **persists** after reload
- ✅ **No console errors**
- ✅ Performance logs show **< 10ms** lag

**All 5 checks pass?** → 🎉 **OPTIMIZATION SUCCESS!**

---

## 📞 Report Back

**Format:**

```
Test Results:
- Visual feel: INSTANT / LAGGY
- Average lag: ___ms
- Correct positioning: YES / NO
- Persistence: YES / NO
- Console errors: YES / NO

Overall: PASS / FAIL
```

---

## 🔗 Full Documentation

See `docs/aidev-notes/OPTIMIZATION-COMPLETE.md` for detailed implementation notes.
