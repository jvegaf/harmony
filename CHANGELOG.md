# Changelog

All notable changes to Harmony will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.31.0] - 2026-05-05

### 🐛 Fixed

- **Playlist Track Removal/Reordering**: Fixed a bug where removing or reordering tracks from a playlist wouldn't work correctly because tracks were being compared by object reference instead of their unique IDs. Removing tracks from the context menu now updates the playlist instantly.

## [0.30.0] - 2026-05-05

### ✨ Added

- **Preparation Mode Improvements**: Added the ability to choose the source of tracks for Preparation Mode (Entire Library or a specific playlist).
- **Dynamic Preparation Playlists**: Preparation Mode now creates playlists with unique dynamic identifiers (`preparation_<iso_date_time>`). This prevents overwriting previous preparation sets if the user renames the playlist.
- **Justfile Support**: Added a `justfile` for Windows compatibility, providing the same automation targets as the existing Linux `Makefile`.

### ✨ Added

- **Library import progress toast:** Selecting a music collection folder now shows a live Mantine notification with an animated progress bar, track counter (`X / Y (Z%)`), and phase labels (Scanning → Importing → Saving). The toast auto-closes with a green success message on completion or a red error message on failure.
- `LibraryImportProgress` type exported from `@preload/types/harmony` for strongly-typed IPC progress events.

### ⚡ Performance

- Main process now emits per-track `LIBRARY_IMPORT_PROGRESS` IPC events during metadata scanning (throttled to every 10 tracks, or every track for libraries < 50 files), enabling smooth real-time progress reporting without saturating the IPC channel.

---

## [0.17.0] - 2026-01-18

### ✨ Added

- Custom drag ghost showing track title and artist with emoji (🎵 Title - Artist) during playlist reordering

### 🐛 Fixed

- **CRITICAL:** Fixed playlist TrackList not updating when switching between playlists
- **MAJOR:** Fixed playlist drag & drop taking 17+ seconds to update UI - now instant (~9ms)
- Fixed drag ghost showing generic "1 Row" text instead of track information

### ⚡ Performance

- Playlist drag & drop performance improved by 99.95% (from 17000ms to ~9ms perceived lag)
- Immediate UI update on drag & drop with background backend synchronization
- Backend processing now fire-and-forget (non-blocking)

### 🔧 Technical Changes

- Implemented manual state update strategy for drag & drop using React state
- Moved `rowDragText` configuration to `defaultColDef` for compatibility with `rowDragEntireRow`
- Added `useEffect` hook to synchronize TrackList `rowData` when playlist changes
- Refactored `onRowDragEnd` handler to update state immediately using array `splice()`
- Backend sync now happens asynchronously without blocking UI

### 📝 Documentation

- Added comprehensive performance analysis documentation
- Created detailed implementation guides for drag & drop optimization
- Added quick testing guides for developers

---

## [0.16.0] - Previous Release

(Earlier changelog entries to be added)

---

[0.17.0]: https://github.com/jvegaf/Harmony/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/jvegaf/Harmony/releases/tag/v0.16.0
