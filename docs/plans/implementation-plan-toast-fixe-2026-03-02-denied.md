
# Implementation Plan: Toast Fixes + Tagger Backend

## Part A: Fix Toast Notifications (5 chained bugs)

### Task A1: Fix Rust `import_library` command — add AppHandle + progress events
**File:** `src-tauri/src/commands/audio.rs`
**Changes:**
- Add `AppHandle` parameter to `import_library` command signature
- Add `use tauri::{AppHandle, Emitter};`
- Emit `"library-import-progress"` events during scanning, metadata extraction, and DB insertion phases
- Follow the pattern from `src-tauri/src/commands/traktor.rs` (emit_progress helper)
- Change `ImportResult` struct to include `success: bool` and `tracks_added: usize` fields (matching what frontend expects)

### Task A2: Fix `ImportResult` type mismatch in frontend
**File:** `src/lib/tauri-api.ts` (lines 453-454)
**Changes:**
- Update `importLibraryFull` return type to match the new Rust `ImportResult` struct fields
- The Rust struct with `#[serde(rename_all = "camelCase")]` will serialize to `{ total, processed, failed, success, tracksAdded }`

### Task A3: Fix store logic treating imports as failures
**File:** `src/stores/useLibraryStore.ts` (lines ~85-107)
**Changes:**
- Fix the `!result.success` check that always evaluates to `true`
- Add fallback `notifications.show()` call for direct toast feedback on import completion
- Ensure library path gets saved to config on success

### Task A4: Fix `importTracks` parameter name mismatch
**File:** `src/lib/tauri-api.ts` (line 450-451)
**Changes:**
- Change `{ paths: trackPaths }` to `{ filePaths: trackPaths }` to match Rust command's expected parameter name

### Task A5: Clean up duplicate utility functions
**File:** `src/lib/utils/utils-id3.ts`
**Changes:**
- Remove duplicate `Sanitize`, `GetStringTokens`, `GetTokens` functions that are identical to those in `utils.ts`
- Keep only `stripAccents` (the only function actually imported from this file)

### Task A6: Update test setup mock
**File:** `src/__tests__/setup.ts`
**Changes:**
- Update the mock for `importLibraryFull` to return the corrected `ImportResult` shape

---

## Part B: Seed Tagger Provider Defaults

### Task B1: Fix TaggerProviderConfig type + seed defaults
**Files:**
- `src/types/tagger.ts` — Add `displayName` and `maxResults` fields to `TaggerProviderConfig` (matching what `SettingsTagger.tsx` already expects); remove `priority` and `apiKey` fields; remove `[key: string]: any` index signature
- `src/lib/tauri-api.ts` (line 112-114) — Change `providers: []` to seed 3 default providers:
  ```
  providers: [
    { name: 'beatport', displayName: 'Beatport', enabled: true, maxResults: 10 },
    { name: 'traxsource', displayName: 'Traxsource', enabled: true, maxResults: 10 },
    { name: 'bandcamp', displayName: 'Bandcamp', enabled: true, maxResults: 10 },
  ]
  ```
- `src/views/Settings/SettingsTagger.tsx` (line 154) — No change needed; once defaults are seeded, `providers.length` will be 3 and the UI will render correctly

---

## Part C: Implement Tagger Backend in Rust

### Architecture Overview

A new `src-tauri/src/libs/tagger/` module tree will be created:

```
src-tauri/src/libs/tagger/
├── mod.rs            # Module declarations + re-exports
├── types.rs          # RawTrackData, ProviderSource, TaggerConfig, TrackCandidate, etc.
├── scoring.rs        # Levenshtein, hybrid text similarity, duration scoring, UnifiedScorer
├── orchestrator.rs   # Multi-provider orchestrator: parallel search + score & rank
├── beatport/
│   ├── mod.rs        # re-exports
│   ├── client.rs     # HTTP client: OAuth token from HTML, search, getTrack API v4
│   └── provider.rs   # TrackProvider impl for Beatport
├── traxsource/
│   ├── mod.rs        # re-exports
│   ├── scraper.rs    # HTML scraper: search + extend track
│   └── provider.rs   # TrackProvider impl for Traxsource
└── bandcamp/
    ├── mod.rs        # re-exports
    ├── client.rs     # Bandcamp search + track info (HTML scraping, no npm library)
    └── provider.rs   # TrackProvider impl for Bandcamp
```

### Task C1: Add Rust dependencies to Cargo.toml
**File:** `src-tauri/Cargo.toml`
**Changes:**
- `reqwest` already present with `json` feature — add `cookies` feature for Beatport OAuth
- `scraper` already present — no change needed
- Add `strsim = "0.11"` for Levenshtein distance (battle-tested crate, avoids manual impl)
- Add `regex = "1"` for HTML parsing helpers (if not already present)

### Task C2: Implement types module
**File:** `src-tauri/src/libs/tagger/types.rs`
**Structs/Enums:**
- `ProviderSource` enum: `Beatport`, `Traxsource`, `Bandcamp` (with serde rename to lowercase)
- `RawTrackData` struct: `id, title, mix_name?, artists: Vec<String>, bpm?, key?, duration_secs?, artwork_url?, genre?, label?, release_date?`
- `TrackCandidate` struct: same fields as frontend type + `source: ProviderSource, similarity_score: f64`
- `TrackCandidatesResult` struct: `local_track_id, local_title, local_artist, local_duration?, local_filename?, candidates: Vec<TrackCandidate>, error?`
- `TrackSelection` struct: `local_track_id, selected_candidate_id?`
- `TaggerProviderConfig` struct: `name: ProviderSource, display_name, enabled, max_results`
- `TagCandidatesProgress` struct: `processed, total, current_track_title`
- `TrackProvider` trait: `fn name() -> ProviderSource` + `async fn search(title, artist) -> Result<Vec<RawTrackData>>`

### Task C3: Implement scoring module
**File:** `src-tauri/src/libs/tagger/scoring.rs`
**Functions (porting from old-electron scoring/utils.ts + scoring/scorer.ts):**
- `normalize_string(s: &str) -> String` — lowercase + alphanumeric + whitespace only
- `levenshtein_similarity(a: &str, b: &str) -> f64` — using `strsim::normalized_levenshtein`
- `hybrid_text_similarity(query: &str, candidate: &str) -> f64` — word-by-word Levenshtein, average of best matches
- `calculate_duration_score(local: Option<f64>, remote: Option<f64>) -> f64` — step function (5s=1.0, 15s=0.8, 30s=0.5, else=0.2, neutral=0.7)
- `UnifiedScorer` struct with weights (0.5 title, 0.3 artist, 0.2 duration) and `calculate()` method

### Task C4: Implement orchestrator
**File:** `src-tauri/src/libs/tagger/orchestrator.rs`
**Logic (porting from old-electron providers/orchestrator.ts):**
- `ProviderOrchestrator` struct holding `Vec<Box<dyn TrackProvider>>`, config (max_candidates=4, min_score=0.3, provider_priority)
- `find_candidates(title, artist, duration?) -> Vec<TrackCandidate>` — searches all providers in parallel via `tokio::join!` / `futures::join_all`, collects results, scores with UnifiedScorer, sorts with tie-breaking by provider priority (within 0.01 tolerance), returns top N
- `score_and_rank(raw_results, title, artist, duration?) -> Vec<TrackCandidate>` — extracted scoring logic for reuse

### Task C5: Implement Beatport provider
**Files:** `src-tauri/src/libs/tagger/beatport/client.rs`, `beatport/provider.rs`
**Beatport Client (porting from old-electron beatport/client/client.ts):**
- `BeatportClient` struct with `reqwest::Client`, cached `OAuth` token
- `get_token()` — fetches `https://www.beatport.com/search/tracks?q=test`, parses HTML with `scraper` crate, extracts `__NEXT_DATA__` script, parses JSON for `props.pageProps.anonSession.access_token`
- `search(title, artist)` — builds query URL, fetches HTML with Bearer token, parses `__NEXT_DATA__` for track results array
- `get_track(track_id)` — calls Beatport API v4: `https://api.beatport.com/v4/catalog/tracks/{id}/` with Bearer token
- Rate limiting: track last 429 timestamp, add delay
- User-Agent: Chrome-like header

**Beatport Provider:**
- Implements `TrackProvider` trait
- `search()` calls client.search(), maps results to `RawTrackData`

### Task C6: Implement Traxsource provider
**Files:** `src-tauri/src/libs/tagger/traxsource/scraper.rs`, `traxsource/provider.rs`
**Traxsource Scraper (porting from old-electron traxsource/traxsource.ts):**
- `TraxsourceScraper` struct with `reqwest::Client`
- `search_tracks(title, artist)` — fetches `https://www.traxsource.com/search?term={query}`, parses HTML for `#searchTrackList .trk-row` elements, extracts: title, version, duration, artists, label, key, bpm, genre, release_date, thumbnail, URL, track_id
- `extend_track(track)` — fetches track page for album info + album page for high-res artwork
- Duration parsing: `"5:57"` → 357 seconds
- Browser-like headers (User-Agent, Referer, etc.)

**Traxsource Provider:**
- Implements `TrackProvider` trait
- `search()` calls scraper.search_tracks(), maps to `RawTrackData`

### Task C7: Implement Bandcamp provider
**Files:** `src-tauri/src/libs/tagger/bandcamp/client.rs`, `bandcamp/provider.rs`
**Bandcamp Client (porting from old-electron bandcamp/client.ts):**
- NOTE: The old code used `bandcamp-fetch` npm library. In Rust, we need to scrape Bandcamp directly.
- `BandcampClient` struct with `reqwest::Client`
- `search_tracks(query)` — fetches `https://bandcamp.com/search?q={query}&item_type=t`, parses HTML results for track name, artist, album, URL, image URL, tags
- `get_track_info(track_url)` — fetches track page, parses embedded JSON-LD or `data-tralbum` script for: name, artist, album, label, duration, image, release date
- No BPM or Key from Bandcamp (by design)

**Bandcamp Provider:**
- Implements `TrackProvider` trait
- `search()` calls client.search_tracks(), maps to `RawTrackData` (no bpm/key)

### Task C8: Wire up module tree + register in libs/mod.rs
**Files:**
- `src-tauri/src/libs/tagger/mod.rs` — declare submodules, re-export key types
- `src-tauri/src/libs/mod.rs` — add `pub mod tagger;`

### Task C9: Create Tauri commands for tagger
**File:** `src-tauri/src/commands/tagger.rs` (new)
**Commands:**
- `find_tag_candidates(tracks: Vec<Track>, provider_configs: Vec<TaggerProviderConfig>, app: AppHandle) -> Vec<TrackCandidatesResult>`
  - Creates providers based on enabled configs
  - Creates orchestrator with provider priority from config order
  - Iterates tracks, calls orchestrator.find_candidates() for each
  - Emits `"tag-candidates-progress"` events via AppHandle
  - Returns all TrackCandidatesResult
- `get_track_details(source: ProviderSource, track_id: String) -> RawTrackData`
  - Dispatches to appropriate provider's detail-fetch method
  - Used during "apply" phase for Beatport (API v4) and Traxsource (extend) and Bandcamp (full info)
- `fix_tags(track: Track) -> Track`
  - Quick single-track fix using Traxsource (same as old FixTags)

**File:** `src-tauri/src/commands/mod.rs` — add `pub mod tagger;` + re-export
**File:** `src-tauri/src/lib.rs` — register new commands in `invoke_handler`

### Task C10: Wire up frontend API stubs to real Tauri commands
**File:** `src/lib/tauri-api.ts`
**Changes:**
- `fixTags` → `invoke('fix_tags', { track })`
- `findTagCandidates` → `invoke('find_tag_candidates', { tracks, providerConfigs })` (read providerConfigs from config store)
- `applyTagSelections` → implement using `get_track_details` + local metadata update
- `onTagCandidatesProgress` → `listen('tag-candidates-progress', callback)`
- `findSimilars` → stub for now (Beatport recommendations API, lower priority)

---

## Implementation Order

1. **A1-A6** (Toast fixes) — Quick wins, immediately testable
2. **B1** (Seed tagger defaults) — Makes Settings > Tagger UI work
3. **C1** (Cargo.toml deps)
4. **C2** (Types) → **C3** (Scoring) → **C4** (Orchestrator) — Core infrastructure
5. **C5** (Beatport) → **C6** (Traxsource) → **C7** (Bandcamp) — Providers in priority order
6. **C8** (Module wiring) → **C9** (Tauri commands) → **C10** (Frontend wiring)

## Estimated Scope
- ~15 new Rust files under `src-tauri/src/libs/tagger/`
- ~5 modified frontend files
- ~1500-2000 lines of new Rust code
- ~50-100 lines of modified TypeScript
- All changes include AIDEV-NOTE comments per project convention

## Risk Assessment
- **Beatport OAuth**: Their `__NEXT_DATA__` structure may have changed since the old Electron code. Will need runtime testing.
- **Bandcamp scraping**: Old code used `bandcamp-fetch` npm library. Rust implementation scrapes directly — HTML structure may need adjustment.
- **Rate limiting**: All providers need respectful request timing. Built into the client implementations.


---

# Plan Feedback

I've reviewed this plan and have 1 piece of feedback:

## 1. General feedback about the plan
> /execute                     
Execute a specific implementation plan. Provide a plan file as the argument to this command. It's very important this command runs in a new session.
 la implementacion de los tag provider la haremos mediante TDD para garantizar que funciona bien

---
