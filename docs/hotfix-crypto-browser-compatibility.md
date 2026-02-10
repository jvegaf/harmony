# Hotfix: Crypto Module Browser Compatibility

## Issue Discovered

**Date**: Feb 10, 2026 (during Phase 8 testing)  
**Severity**: Critical - App wouldn't start  
**Error**: `Module "crypto" has been externalized for browser compatibility`

### Root Cause

The `makeTrackID()` function was added to `src/preload/lib/id-provider.ts`, which uses Node.js `crypto` module. However, this file is imported by **both**:

- Main process (Node.js) ✅ - crypto available
- Renderer process (browser) ❌ - crypto NOT available

The renderer imports `id-provider.ts` in `src/renderer/src/stores/PlaylistsAPI.ts` to use `makeID()` for generating random playlist IDs.

### Error Stack

```
__vite-browser-external:crypto:3 Uncaught Error: Module "crypto" has been externalized for browser compatibility.
Cannot access "crypto.createHash" in client code.
    at Object.get (__vite-browser-external:crypto:3:11)
    at id-provider.ts:2:28
```

---

## Solution

**Split the module by process context:**

1. **`src/preload/lib/id-provider.ts`** (browser-compatible)

   - Keeps `makeID()` using `uuid` library only
   - Can be imported by renderer
   - No Node.js dependencies

2. **`src/main/lib/track-id.ts`** (main process only)
   - Contains `makeTrackID()` using Node.js `crypto`
   - Only imported by main process code
   - Uses full Node.js capabilities

---

## Files Changed

### Modified

1. **`src/preload/lib/id-provider.ts`**

   - **Removed**: `makeTrackID()` function
   - **Removed**: `import { createHash } from 'crypto'`
   - **Kept**: `makeID()` function using `uuid`
   - **Added**: Comment explaining why crypto is not used

2. **`src/main/modules/IPCLibraryModule.ts`**

   - **Changed**: Import from `'../lib/track-id'` instead of `'../../preload/lib/id-provider'`

3. **`src/main/lib/traktor/mappers/track-mapper.ts`**

   - **Changed**: Import from `'../../track-id'` instead of `'../../../../preload/lib/id-provider'`

4. **`src/preload/lib/__tests__/id-provider.test.ts`**
   - **Removed**: All `makeTrackID()` tests
   - **Kept**: Only `makeID()` tests (3 tests)

### Created

5. **`src/main/lib/track-id.ts`** (NEW)

   - Contains `makeTrackID()` with full crypto implementation
   - Main process only
   - Clear documentation about Node.js requirement

6. **`src/main/lib/__tests__/track-id.test.ts`** (NEW)
   - All 11 `makeTrackID()` tests moved here
   - Tests deterministic ID generation
   - Tests platform-specific case sensitivity

---

## Test Results

### Before Fix ❌

```
Error: Module "crypto" has been externalized for browser compatibility
App crash on startup
```

### After Fix ✅

```bash
yarn typecheck:node   # ✅ Pass
yarn typecheck:web    # ✅ Pass
yarn test:run         # ✅ 342 tests pass, 6 skipped

Test breakdown:
- makeID() tests: 3 pass (preload)
- makeTrackID() tests: 11 pass (main)
- Total: 348 tests (342 pass, 6 skipped)
```

---

## Lessons Learned

### Architecture Rule

**Preload scripts shared with renderer MUST be browser-compatible:**

```
src/preload/lib/
├── id-provider.ts       ✅ Browser-compatible (uuid only)
└── ipc-channels.ts      ✅ Browser-compatible (just types)

src/main/lib/
├── track-id.ts          ✅ Node.js only (uses crypto)
└── database.ts          ✅ Node.js only (uses better-sqlite3)
```

### Guidelines

1. **If preload code is imported by renderer**: Use only browser-compatible dependencies
2. **If code needs Node.js modules**: Move to `src/main/lib/` (main process only)
3. **Test both contexts**: Always run `typecheck:node` AND `typecheck:web`

---

## Prevention

To prevent similar issues in the future:

### ESLint Rule (Proposed)

```javascript
// .eslintrc.js - Add custom rule
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "crypto",
        "importNames": ["*"],
        "message": "Don't import crypto in preload files that are used by renderer. Move to src/main/lib/ instead."
      }]
    }]
  }
}
```

### Code Review Checklist

When adding Node.js dependencies to preload:

- [ ] Is this file imported by renderer?
- [ ] Can I use a browser-compatible alternative?
- [ ] Should this be in `src/main/lib/` instead?

---

## Status

✅ **Fixed and verified**

- All tests passing
- App starts without errors
- Type checking passes for both node and web
- Ready to continue Phase 8 testing

---

**Fixed by**: AI Assistant (Claude Sonnet 4.5)  
**Date**: February 10, 2026  
**Time to fix**: 15 minutes
