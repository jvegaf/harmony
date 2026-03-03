
## Plan: Fix Toast Notifications + Tagger Provider Config

### Problem Summary

**Toasts never appear** because of 5 chained bugs:
1. Rust `import_library` never emits `library-import-progress` events (no `AppHandle`)
2. `ImportResult` type mismatch: Rust returns `{total, processed, failed}`, TS expects `{success, tracksAdded, error?}`
3. Store treats every import as failure (`result.success` is always `undefined`)
4. No fallback notification if events don't arrive
5. `importTracks` sends wrong param name (`paths` vs `filePaths`)

**Tagger providers empty** because `defaultConfig.taggerConfig.providers = []` — needs seeding with Beatport/Traxsource/Bandcamp defaults.

---

### Task 1: Add progress event emission to Rust `import_library` command

**File:** `src-tauri/src/commands/audio.rs`

**Changes:**
- Add `app: AppHandle` parameter and `use tauri::{AppHandle, Emitter};`
- Define `LibraryImportProgress` struct matching the TS type (with `step`, `processed`, `total`, `message` fields)
- Create `emit_import_progress()` helper (same pattern as `traktor.rs`)
- Emit events at each phase:
  - `scanning` — before walking directories
  - `importing` — during metadata extraction (switch from `par_iter` to chunked sequential iteration with periodic progress emission, e.g. every 50 tracks)
  - `saving` — before DB insert
  - `complete` — after successful insert
  - `error` — on failure

**Note:** Switching from `par_iter` to chunked rayon processing with an `AtomicUsize` counter, emitting progress every N files. This keeps parallelism while allowing progress updates.

---

### Task 2: Fix `ImportResult` type mismatch in frontend

**File:** `src/lib/tauri-api.ts` (line 453-454)

**Change:**
```typescript
// Before:
importLibraryFull: async (paths: string[]): Promise<{ success: boolean; tracksAdded: number; error?: string }>

// After:
importLibraryFull: async (paths: string[]): Promise<{ total: number; processed: number; failed: number }>
```

---

### Task 3: Fix store logic to handle correct `ImportResult`

**File:** `src/stores/useLibraryStore.ts` (lines 82-97)

**Change:**
```typescript
// Before:
if (!result.success) {
  logger.error('Library import failed:', result.error);
  return;
}
logger.info(`Import complete: ${result.tracksAdded} tracks added`);

// After:
logger.info(`Import complete: ${result.processed} tracks imported (${result.failed} failed)`);
```

Remove the broken `result.success` check — the Rust command throws on actual errors (caught by `catch`). A successful invoke means the import worked.

---

### Task 4: Fix `importTracks` parameter name

**File:** `src/lib/tauri-api.ts` (line 450-451)

**Change:**
```typescript
// Before:
importTracks: async (trackPaths: string[]): Promise<Track[]> =>
    invoke('scan_audio_files_batch', { paths: trackPaths }),

// After:
importTracks: async (trackPaths: string[]): Promise<Track[]> =>
    invoke('scan_audio_files_batch', { filePaths: trackPaths }),
```

The Rust command declares `file_paths: Vec<String>`, which Tauri converts to `filePaths` in JS.

---

### Task 5: Seed tagger provider defaults

**File:** `src/lib/tauri-api.ts` (lines 112-114)

**Change:**
```typescript
// Before:
taggerConfig: {
  providers: [],
},

// After:
taggerConfig: {
  providers: [
    { name: 'beatport', displayName: 'Beatport', enabled: true, priority: 0, maxResults: 10 },
    { name: 'traxsource', displayName: 'Traxsource', enabled: true, priority: 1, maxResults: 10 },
    { name: 'bandcamp', displayName: 'Bandcamp', enabled: true, priority: 2, maxResults: 10 },
  ],
},
```

**File:** `src/views/Settings/SettingsTagger.tsx` (lines 151-158)

Also update the `useEffect` to always set providers (even from defaults):
```typescript
// Before:
if (taggerConfig?.providers?.length) {
  setProviders(taggerConfig.providers);
}

// After:
if (taggerConfig?.providers) {
  setProviders(taggerConfig.providers);
}
```

**Note:** This makes the provider cards visible in Settings. The tagger backend is still stubbed — the cards will show but searching won't return results until the Rust tagger is implemented. This is acceptable and expected (documented as "Known Limitation").

---

### Task 6: Clean up remaining duplicates in `utils-id3.ts`

**File:** `src/lib/utils/utils-id3.ts`

Remove `Sanitize`, `GetStringTokens`, and `GetTokens` — they are exact duplicates of functions now in `utils.ts` and are **not imported by anyone**. Only keep `stripAccents` (which IS used by `useLibraryStore.ts`).

---

### Task 7: Update test setup mock

**File:** `src/__tests__/setup.ts` (around line where `importLibraryFull` is mocked)

Update mock return type to match the new `ImportResult`:
```typescript
// Before:
importLibraryFull: vi.fn().mockResolvedValue({ success: true, tracksAdded: 0 }),

// After:
importLibraryFull: vi.fn().mockResolvedValue({ total: 0, processed: 0, failed: 0 }),
```

---

### Task 8: Verify

- `cargo check` — Rust compiles
- `pnpm run typecheck` — No TS errors
- `pnpm run lint` — No lint errors
- `pnpm run test:run` — Tests pass

---

### Files Modified Summary

| File | Changes |
|------|---------|
| `src-tauri/src/commands/audio.rs` | Add `AppHandle`, emit progress events, add `LibraryImportProgress` struct |
| `src/lib/tauri-api.ts` | Fix `ImportResult` type, fix `importTracks` param, seed tagger providers |
| `src/stores/useLibraryStore.ts` | Fix result handling logic |
| `src/views/Settings/SettingsTagger.tsx` | Fix provider loading condition |
| `src/lib/utils/utils-id3.ts` | Remove unused duplicate functions |
| `src/__tests__/setup.ts` | Update mock return type |

### Out of Scope (documented known limitations)
- Implementing the full tagger backend in Rust (Beatport/Traxsource/Bandcamp API clients)
- Audio analysis progress events (separate task)


---

# Plan Feedback

I've reviewed this plan and have 1 piece of feedback:

## 1. General feedback about the plan
> he copiado el proyecto de elecftron en la carpeta old-electron, usala como referencia  e implementa los taggers de beatport, traxsource y bandcamp

---
