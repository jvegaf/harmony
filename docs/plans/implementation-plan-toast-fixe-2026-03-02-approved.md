
# Implementation Plan: Toast Fixes + Tagger Backend (TDD)

---

## Part A: Fix Toast Notifications (5 chained bugs — no TDD, straight fixes)

### Task A1: Fix Rust `import_library` — add AppHandle + progress events
**File:** `src-tauri/src/commands/audio.rs`
- Add `app: AppHandle` parameter + `use tauri::{AppHandle, Emitter};`
- Emit `"library-import-progress"` events during scanning/extraction/insertion
- Add `success: bool` and `tracks_added: usize` to `ImportResult` struct

### Task A2: Fix `ImportResult` type in frontend
**File:** `src/lib/tauri-api.ts` (lines 453-454)
- Update `importLibraryFull` return type to `{ total: number; processed: number; failed: number; success: boolean; tracksAdded: number }`

### Task A3: Fix store logic treating imports as failures
**File:** `src/stores/useLibraryStore.ts`
- Fix the `!result.success` check + add `notifications.show()` fallback for direct feedback

### Task A4: Fix `importTracks` param name mismatch
**File:** `src/lib/tauri-api.ts` (line 450-451)
- `{ paths: trackPaths }` → `{ filePaths: trackPaths }`

### Task A5: Clean up utils-id3.ts duplicates
**File:** `src/lib/utils/utils-id3.ts`
- Remove duplicate `Sanitize`, `GetStringTokens`, `GetTokens`; keep only `stripAccents`

### Task A6: Update test setup mock
**File:** `src/__tests__/setup.ts`
- Update `importLibraryFull` mock return shape

---

## Part B: Seed Tagger Provider Defaults

### Task B1: Fix TaggerProviderConfig type + seed defaults
**Files:**
- `src/types/tagger.ts` — Add `displayName`, `maxResults`; remove `priority`, `apiKey`, index signature
- `src/lib/tauri-api.ts` (line 112-114) — Seed 3 default providers:
  ```ts
  providers: [
    { name: 'beatport', displayName: 'Beatport', enabled: true, maxResults: 10 },
    { name: 'traxsource', displayName: 'Traxsource', enabled: true, maxResults: 10 },
    { name: 'bandcamp', displayName: 'Bandcamp', enabled: true, maxResults: 10 },
  ]
  ```

---

## Part C: Tagger Backend in Rust — TDD Approach

### Testing Strategy

**Two tiers of tests:**

1. **Unit tests (mocked fixtures)** — Run in CI, fast, deterministic
   - Recorded HTML/JSON fixtures stored in `src-tauri/src/libs/tagger/testdata/`
   - Provider clients accept a mock HTTP function (trait-based injection) so tests use fixture data
   - Scoring, orchestrator, and parser logic tested purely without network

2. **Live integration tests** — Gated behind `#[ignore]` + env var `RUN_LIVE_TESTS=1`
   - Actually hit Beatport, Traxsource, Bandcamp
   - Run manually for validation, not in CI
   - Marked with `#[tokio::test]` + `#[ignore]`

**TDD cycle per module:** Write failing tests first → implement minimal code to pass → refactor

---

### Task C1: Add Rust dependencies
**File:** `src-tauri/Cargo.toml`
- Add `strsim = "0.11"` (Levenshtein distance)
- Add `tokio-test = "0.4"` to `[dev-dependencies]`
- `reqwest` and `scraper` already present

### Task C2: Types module (TDD)
**File:** `src-tauri/src/libs/tagger/types.rs`

**Tests first:**
- `test_provider_source_serializes_lowercase` — `Beatport` → `"beatport"`
- `test_raw_track_data_optional_fields` — construct with only required fields
- `test_track_candidate_format_id` / `test_track_candidate_parse_id`

**Then implement:**
- `ProviderSource` enum (Beatport, Traxsource, Bandcamp) with serde lowercase rename
- `RawTrackData` struct
- `TrackCandidate` struct  
- `TrackCandidatesResult`, `TrackSelection`, `TaggerProviderConfig`, `TagCandidatesProgress`
- `TrackProvider` async trait

### Task C3: Scoring module (TDD)
**File:** `src-tauri/src/libs/tagger/scoring.rs`

**Tests first (red phase):**
- `test_normalize_string_basic` — `"Héllo  World!"` → `"hllo world"`
- `test_normalize_string_empty` — empty/null → `""`
- `test_levenshtein_exact_match` — `"hello"` vs `"hello"` → `1.0`
- `test_levenshtein_completely_different` — `"abc"` vs `"xyz"` → low score
- `test_levenshtein_typo` — `"deadmau5"` vs `"deadmaus"` → high score (~0.87)
- `test_hybrid_similarity_word_reorder` — `"strobe deadmau5"` vs `"deadmau5 strobe"` → ~1.0
- `test_hybrid_similarity_with_typos` — `"hello world"` vs `"helo wrld"` → ~0.8
- `test_duration_score_exact` — diff ≤ 5s → 1.0
- `test_duration_score_acceptable` — diff ≤ 15s → 0.8
- `test_duration_score_different_edit` — diff ≤ 30s → 0.5
- `test_duration_score_very_different` — diff > 30s → 0.2
- `test_duration_score_missing` — None → 0.7
- `test_unified_scorer_perfect_match` — exact title + artist + duration → ~1.0
- `test_unified_scorer_weights_sum` — weights must sum to 1.0

**Then implement:**
- `normalize_string()`, `levenshtein_similarity()` (using `strsim`), `hybrid_text_similarity()`, `calculate_duration_score()`, `UnifiedScorer`

### Task C4: Orchestrator (TDD)
**File:** `src-tauri/src/libs/tagger/orchestrator.rs`

**Tests first:**
- `test_score_and_rank_filters_below_min_score` — results below 0.3 excluded
- `test_score_and_rank_limits_max_candidates` — returns at most 4
- `test_score_and_rank_sorts_by_score_desc` — highest first
- `test_score_and_rank_tiebreak_by_provider_priority` — within 0.01 tolerance, higher-priority provider wins
- `test_find_candidates_handles_provider_failure` — one provider errors, others still return results
- `test_find_candidates_empty_results` — all providers return nothing → empty Vec

**Then implement:**
- `ProviderOrchestrator` with `find_candidates()` and `score_and_rank()`
- Uses `tokio::spawn` / `futures::join_all` for parallel provider search

### Task C5: Beatport provider (TDD)
**Files:**
- `src-tauri/src/libs/tagger/beatport/client.rs`
- `src-tauri/src/libs/tagger/beatport/provider.rs`
- `src-tauri/src/libs/tagger/testdata/beatport_search.html` (fixture)
- `src-tauri/src/libs/tagger/testdata/beatport_track_api.json` (fixture)

**Tests first (mocked):**
- `test_extract_token_from_html` — parse fixture HTML → extract access_token from `__NEXT_DATA__`
- `test_parse_search_results` — parse fixture HTML → Vec of track structs with correct fields
- `test_parse_api_track` — parse fixture JSON → BeatportTrack with artists, key, genre, label
- `test_beatport_provider_search_maps_to_raw` — provider.search() returns `Vec<RawTrackData>` with correct field mapping
- `test_beatport_handles_empty_results` — empty search → empty Vec
- `test_beatport_handles_rate_limit` — HTTP 429 → appropriate error

**Tests (live, #[ignore]):**
- `test_live_beatport_search` — searches "deadmau5 strobe", expects results
- `test_live_beatport_get_track` — fetches known track ID, validates fields

**Then implement:**
- `BeatportClient` with injectable HTTP (trait `HttpClient` or closure) for testability
- OAuth token extraction from `__NEXT_DATA__`
- Search HTML parsing + API v4 track detail fetching
- `BeatportProvider` implementing `TrackProvider`

### Task C6: Traxsource provider (TDD)
**Files:**
- `src-tauri/src/libs/tagger/traxsource/scraper.rs`
- `src-tauri/src/libs/tagger/traxsource/provider.rs`
- `src-tauri/src/libs/tagger/testdata/traxsource_search.html` (fixture)
- `src-tauri/src/libs/tagger/testdata/traxsource_track.html` (fixture)

**Tests first (mocked):**
- `test_parse_search_results` — fixture HTML → Vec of TXTrack with title, artists, bpm, key, duration, label, genre
- `test_parse_duration_mmss` — `"5:57"` → `357`
- `test_parse_duration_hmmss` — `"1:05:30"` → `3930`
- `test_parse_key_bpm` — `"G#min\n129"` → key=`"G#min"`, bpm=`129`
- `test_extend_track_album_art` — fixture track page HTML → album + artwork URL
- `test_traxsource_provider_maps_to_raw` — correct RawTrackData mapping
- `test_traxsource_handles_empty_search` — empty `#searchTrackList` → empty Vec

**Tests (live, #[ignore]):**
- `test_live_traxsource_search` — searches known track, expects results
- `test_live_traxsource_extend` — extends a result, checks album/art

**Then implement:**
- `TraxsourceScraper` with `reqwest::Client` + `scraper` crate for HTML parsing
- Duration/date/key-bpm parsing helpers
- `TraxsourceProvider` implementing `TrackProvider`

### Task C7: Bandcamp provider (TDD)
**Files:**
- `src-tauri/src/libs/tagger/bandcamp/client.rs`
- `src-tauri/src/libs/tagger/bandcamp/provider.rs`
- `src-tauri/src/libs/tagger/testdata/bandcamp_search.html` (fixture)
- `src-tauri/src/libs/tagger/testdata/bandcamp_track.html` (fixture)

**Tests first (mocked):**
- `test_parse_search_results` — fixture HTML → Vec with name, artist, album, URL, image
- `test_parse_track_info` — fixture track page → name, artist, album, label, duration, image, release_date
- `test_bandcamp_no_bpm_no_key` — both fields always None
- `test_genre_from_tags` — `"electronic, ambient"` → genre = `"electronic"`
- `test_bandcamp_provider_maps_to_raw` — correct RawTrackData mapping (bpm/key = None)
- `test_bandcamp_uses_url_as_id` — ID is the full track URL

**Tests (live, #[ignore]):**
- `test_live_bandcamp_search` — searches known query, expects results
- `test_live_bandcamp_track_info` — fetches known track URL

**Then implement:**
- `BandcampClient` — HTML scraping for search page + track page
- No npm library — direct scraping of `bandcamp.com/search` and track pages
- `BandcampProvider` implementing `TrackProvider`

### Task C8: Wire up module tree
**Files:**
- `src-tauri/src/libs/tagger/mod.rs` — submodule declarations + re-exports
- `src-tauri/src/libs/mod.rs` — add `pub mod tagger;`

### Task C9: Tauri commands for tagger
**File:** `src-tauri/src/commands/tagger.rs` (new)

**Tests first:**
- Test helper: verify command serialization/deserialization of args and return types

**Commands:**
- `find_tag_candidates(tracks, provider_configs, app: AppHandle) -> Vec<TrackCandidatesResult>`
- `get_track_details(source, track_id) -> RawTrackData`
- `fix_tags(track) -> Track` (single-track fix via Traxsource)

**Registration:**
- `src-tauri/src/commands/mod.rs` — add `pub mod tagger;`
- `src-tauri/src/lib.rs` — register in `invoke_handler`

### Task C10: Wire frontend stubs to real commands
**File:** `src/lib/tauri-api.ts`
- `fixTags` → `invoke('fix_tags', { track })`
- `findTagCandidates` → `invoke('find_tag_candidates', { tracks, providerConfigs })`
- `onTagCandidatesProgress` → `listen('tag-candidates-progress', callback)`
- `applyTagSelections` → use `get_track_details` + metadata write
- `findSimilars` → keep as stub (lower priority)

---

## File Structure (New Rust Files)

```
src-tauri/src/libs/tagger/
├── mod.rs                 # Module declarations + re-exports
├── types.rs               # All tagger types, enums, traits
├── scoring.rs             # Similarity algorithms + UnifiedScorer
├── orchestrator.rs        # Multi-provider parallel search + rank
├── beatport/
│   ├── mod.rs
│   ├── client.rs          # HTTP client: OAuth, search, API v4
│   └── provider.rs        # TrackProvider impl
├── traxsource/
│   ├── mod.rs
│   ├── scraper.rs         # HTML scraper for search + extend
│   └── provider.rs        # TrackProvider impl
├── bandcamp/
│   ├── mod.rs
│   ├── client.rs          # HTML scraper for search + track info
│   └── provider.rs        # TrackProvider impl
└── testdata/
    ├── beatport_search.html
    ├── beatport_track_api.json
    ├── traxsource_search.html
    ├── traxsource_track.html
    ├── bandcamp_search.html
    └── bandcamp_track.html
```

## Implementation Order

1. **A1–A6** — Toast fixes (straight implementation)
2. **B1** — Seed tagger provider defaults
3. **C1** — Cargo.toml deps
4. **C2** — Types (TDD: tests → impl)
5. **C3** — Scoring (TDD: tests → impl)
6. **C4** — Orchestrator (TDD: tests → impl)
7. **C5** — Beatport (TDD: capture fixtures → write tests → impl)
8. **C6** — Traxsource (TDD: capture fixtures → write tests → impl)
9. **C7** — Bandcamp (TDD: capture fixtures → write tests → impl)
10. **C8** — Module wiring
11. **C9** — Tauri commands (TDD: tests → impl)
12. **C10** — Frontend wiring

## Test Execution

```bash
# All unit tests (mocked, fast)
cargo test --lib -p harmony

# Single module
cargo test --lib -p harmony tagger::scoring

# Live integration tests (manual, hits real APIs)
RUN_LIVE_TESTS=1 cargo test --lib -p harmony tagger -- --ignored

# Frontend tests
pnpm test:run
```

## Estimated Scope
- ~15 new Rust source files + 6 test fixture files
- ~80+ unit tests (mocked) + ~6-8 live integration tests (#[ignore])
- ~1500-2000 lines new Rust code + ~500-700 lines tests
- ~50-100 lines modified TypeScript
- All files include AIDEV-NOTE comments
