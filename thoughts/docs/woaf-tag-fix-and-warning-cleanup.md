---
date: 2026-03-07T01:05:00+01:00
git_commit: d5eeb9ee2bb27b57d6575a9a017deac375163ded
branch: dev/tauri
repository: harmony
topic: 'WOAF ID3v2 tag extraction fix and Rust warning cleanup'
tags: [docs, audio-metadata, id3v2, woaf, lofty, testing, code-quality]
session_type: fix
last_updated: 2026-03-07T01:05:00+01:00
---

# WOAF Tag Extraction Fix — Documentation

## Overview

Fixed a bug where the WOAF (Official Audio File URL) ID3v2 tag was not being extracted during music import. The root cause was incorrect handling of ID3v2 URL frames (W\*\*\* type) in the lofty crate, which stores them as `ItemValue::Locator` rather than `ItemValue::Text`. Additionally cleaned up all Rust compiler warnings across the tagger module to achieve a clean build.

## What Changed

### Audio Metadata (`src-tauri/src/libs/audio_metadata.rs`)

**Lines 105-117** — Fixed WOAF reading:

```rust
// AIDEV-NOTE: URL frames (WOAF, WOAR, etc.) are stored as ItemValue::Locator in lofty,
// not ItemValue::Text. Fall back to .text() for robustness in case some files use text frames.
let url = tag
    .get(&ItemKey::AudioFileUrl)
    .and_then(|item| item.value().locator().or_else(|| item.value().text()))
    .map(|s| s.to_string());
```

**Lines 224-233** — Fixed WOAF writing:

```rust
// AIDEV-NOTE: Must use ItemValue::Locator for URL frames, not insert_text().
// insert_text() creates ItemValue::Text which writes the wrong frame type.
if let Some(url) = &track.url {
    tag.insert(TagItem::new(
        ItemKey::AudioFileUrl,
        ItemValue::Locator(url.clone()),
    ));
}
```

**Lines 260-374** — Added 3 comprehensive tests:

- `test_extract_metadata_reads_woaf_url` — Verifies WOAF reading from sample.mp3
- `test_extract_metadata_basic_fields` — Verifies all metadata fields including WOAF, BPM, key
- `test_write_and_read_url_roundtrip` — Verifies write/read cycle preserves WOAF correctly

All tests passing (4/4 total in module).

### Test Data (`src-tauri/testdata/sample.mp3`)

Added 15.8 MB sample MP3 file with:

- WOAF tag: `https://www.beatport.com/track/cant-stop/23100405`
- BPM: 127
- Key: 11d
- Format: ID3v2.3

### Warning Cleanup (14 files)

**Removed unused imports:**

- `src-tauri/src/libs/artwork.rs` — `std::fs`, `AudioFile`
- `src-tauri/src/libs/tagger/beatport/mod.rs` — `BeatportClient`
- `src-tauri/src/libs/tagger/mod.rs` — `OrchestratorConfig`, `RawTrackData`, `SearchQuery`, `TrackCandidate`
- `src-tauri/src/commands/tagger.rs` — `Track`

**Prefixed unused variables:**

- `src-tauri/src/libs/tagger/traxsource/scraper.rs:159` — `url` → `_url`
- `src-tauri/src/libs/traktor/mapper.rs:266` — `volume` → `_volume`

**Added `#[allow(dead_code)]` to public API methods not yet used:**

- Provider `source()` methods (Beatport, Bandcamp, Traxsource)
- `OrchestratorConfig::new()`, `with_priority()`, `validate()`
- `Orchestrator::with_config()`
- `ScoringWeights::validate()`, `UnifiedScorer::new()`
- `TraxsourceScraper::extend_track()`, `extract_album_data()`
- `BeatportError::TrackNotFound` variant
- `OAuthToken.token_type` field
- `SearchQuery` struct

---

## Technical Background

### ID3v2 Frame Types in Lofty

The lofty crate categorizes ID3v2 frames by content type:

| Frame Type    | ID3v2 Prefix               | Lofty ItemValue      | Access Method |
| ------------- | -------------------------- | -------------------- | ------------- |
| Text frames   | T\*\*\* (e.g., TIT2, TBPM) | `ItemValue::Text`    | `.text()`     |
| URL frames    | W\*\*\* (e.g., WOAF, WOAR) | `ItemValue::Locator` | `.locator()`  |
| Binary frames | — (e.g., POPM)             | `ItemValue::Binary`  | `.binary()`   |

**WOAF** (Official Audio File Webpage) is a **URL frame**, stored as `ItemValue::Locator`.

### Harmony Usage

In Harmony:

- **Field:** `Track.url` (TypeScript) / `track.url` (SQLite column)
- **Purpose:** Stores the official track page URL from Beatport, Traxsource, or Bandcamp
- **Used by:** Tagger system to populate URL when tagging tracks

---

## API Reference

### `extract_metadata(path: &Path) -> Result<TrackMetadata, String>`

Extracts audio metadata from a file, including ID3v2 tags.

**Changes:**

- Now correctly reads WOAF URL frames using `.locator()`
- Falls back to `.text()` for robustness

**Returns:** `TrackMetadata` struct with `url: Option<String>` field populated from WOAF tag.

### `write_metadata_to_file(file_path: &Path, track: &Track) -> Result<(), String>`

Writes track metadata to a file, including WOAF tag.

**Changes:**

- Now writes WOAF as `ItemValue::Locator` (proper URL frame type)
- Previously used `insert_text()` which created incorrect frame type

---

## Testing

### Automated Tests

```bash
cd src-tauri
cargo test --lib audio_metadata::tests
```

**Expected output:**

```
running 4 tests
test libs::audio_metadata::tests::test_extract_metadata_basic_fields ... ok
test libs::audio_metadata::tests::test_extract_metadata_reads_woaf_url ... ok
test libs::audio_metadata::tests::test_write_and_read_url_roundtrip ... ok
test libs::audio_metadata::tests::test_extract_metadata ... ok

test result: ok. 4 passed; 0 failed
```

### Manual Verification

1. **Import a track with WOAF tag:**

   ```bash
   # Copy testdata/sample.mp3 to a test folder
   # Import via Harmony UI
   # Check that track.url field is populated in database
   ```

2. **Write WOAF tag to a file:**

   ```bash
   # Update track URL in Harmony UI
   # Export/save metadata
   # Verify WOAF frame exists with `ffprobe` or `id3v2 -l`
   ```

3. **Verify no warnings:**
   ```bash
   cd src-tauri
   cargo build --lib
   # Should show 0 warnings
   ```

---

## Known Limitations & Edge Cases

- **Fallback behavior:** Code falls back to `.text()` if `.locator()` is None, for robustness with malformed tags
- **Other URL frames:** Fix only addresses WOAF; other URL frames (WOAR, WPUB, etc.) not currently used by Harmony
- **ID3v2 version:** Sample file uses ID3v2.3; behavior consistent across ID3v2.3/2.4

---

## References

- Plan: `C:\Users\josev\.plannotator\plans\plan-2026-03-06-approved.md`
- Commit: `d5eeb9e` on branch `dev/tauri`
- Related code:
  - `src-tauri/src/libs/audio_metadata.rs:105-117` (reading)
  - `src-tauri/src/libs/audio_metadata.rs:224-233` (writing)
  - `src-tauri/src/libs/audio_metadata.rs:260-374` (tests)
- Lofty documentation: https://docs.rs/lofty/0.21/lofty/
