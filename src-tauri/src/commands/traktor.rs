// AIDEV-NOTE: Traktor sync commands for Tauri
// Provides Traktor NML parsing and synchronization
// Replaces IPCTraktorModule from Electron

use crate::libs::traktor::{
  conflict_resolver::{merge_cue_points, merge_track, CueMergeStrategy, MergeStrategy},
  cue_mapper::map_traktor_cues_to_harmony,
  map_traktor_entry_to_track,
  playlist_sync::{convert_to_harmony_playlist, extract_playlists_from_traktor},
  TraktorNMLParser,
};
use crate::libs::{Database, Result, Track};
use log::{debug, info, warn};
use serde::Serialize;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

/// Result of parsing a Traktor NML file
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseNMLResult {
  pub tracks: Vec<Track>,
  pub track_count: usize,
  pub version: String,
}

/// Basic sync statistics (legacy compatibility)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct SyncStats {
  pub tracks_matched: usize,
  pub tracks_imported: usize,
  pub tracks_updated: usize,
  pub tracks_skipped: usize,
}

/// Enhanced sync statistics with detailed information
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnhancedSyncStats {
  /// Merge strategy used
  pub strategy: String,
  /// Total tracks processed
  pub tracks_processed: usize,
  /// Tracks matched between Traktor and Harmony
  pub tracks_matched: usize,
  /// Tracks imported from Traktor (new)
  pub tracks_imported: usize,
  /// Tracks updated (metadata changed)
  pub tracks_updated: usize,
  /// Tracks skipped (no changes)
  pub tracks_skipped: usize,
  /// Count of each field that was updated
  pub fields_updated: HashMap<String, usize>,
  /// Total cue points added/updated
  pub cue_points_synced: usize,
  /// Playlists imported from Traktor
  pub playlists_imported: usize,
  /// Playlist tracks linked
  pub playlist_tracks_linked: usize,
}

/// Progress event payload for sync operations
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProgress {
  /// Current phase of sync
  pub phase: String,
  /// Progress percentage (0.0 to 100.0)
  pub progress: f64,
  /// Current item being processed
  pub current: usize,
  /// Total items to process
  pub total: usize,
  /// Status message
  pub message: String,
}

/// Parse a Traktor NML file and return tracks
#[tauri::command]
pub async fn parse_traktor_nml(nml_path: String) -> Result<ParseNMLResult> {
  info!("Command: parse_traktor_nml - path: {}", nml_path);

  let parser = TraktorNMLParser::new();
  let nml = parser.parse(&nml_path)?;

  // Convert Traktor entries to Harmony tracks
  let tracks: Vec<Track> = nml
    .nml
    .collection
    .entry
    .iter()
    .map(map_traktor_entry_to_track)
    .collect();

  Ok(ParseNMLResult {
    track_count: tracks.len(),
    version: nml.nml.version.clone(),
    tracks,
  })
}

/// Sync Traktor NML tracks with Harmony database (ENHANCED - Phase 4.5)
///
/// This implements advanced sync with merge strategies, cue points, and playlists:
/// 1. Parse Traktor NML file (tracks, cue points, playlists)
/// 2. Match tracks by file path
/// 3. Merge track metadata using specified strategy
/// 4. Sync cue points for each track
/// 5. Import playlists with folder hierarchy
/// 6. Emit progress events during sync
///
/// AIDEV-NOTE: Enhanced version with full feature parity to Electron
/// - Supports SMART_MERGE, TRAKTOR_WINS, HARMONY_WINS strategies
/// - Syncs cue points (all 6 types: HotCue, FadeIn, FadeOut, Load, Grid, Loop)
/// - Imports playlists with folder hierarchy preservation
/// - Emits progress events for UI updates
///
/// # Arguments
/// * `app` - Tauri app handle for emitting progress events
/// * `db` - Database state
/// * `nml_path` - Path to Traktor collection.nml file
/// * `strategy` - Merge strategy: "SMART_MERGE" (default), "TRAKTOR_WINS", "HARMONY_WINS"
/// * `cue_strategy` - Cue merge strategy: "SMART_MERGE" (default), "REPLACE"
/// * `sync_playlists` - Whether to import playlists (default: true)
///
/// # Returns
/// EnhancedSyncStats with detailed sync results
#[tauri::command]
pub async fn sync_traktor_nml(
  app: AppHandle,
  db: State<'_, Database>,
  nml_path: String,
  strategy: Option<String>,
  cue_strategy: Option<String>,
  sync_playlists: Option<bool>,
) -> Result<EnhancedSyncStats> {
  info!("Command: sync_traktor_nml - path: {}", nml_path);
  info!(
    "  Strategy: {}, Cue: {}, Playlists: {}",
    strategy.as_ref().unwrap_or(&"SMART_MERGE".to_string()),
    cue_strategy
      .as_ref()
      .unwrap_or(&"SMART_MERGE".to_string()),
    sync_playlists.unwrap_or(true)
  );

  // Parse merge strategies
  let merge_strategy = match strategy.as_deref() {
    Some("TRAKTOR_WINS") => MergeStrategy::TraktorWins,
    Some("HARMONY_WINS") => MergeStrategy::HarmonyWins,
    _ => MergeStrategy::SmartMerge,
  };

  let cue_merge_strategy = match cue_strategy.as_deref() {
    Some("REPLACE") => CueMergeStrategy::Replace,
    _ => CueMergeStrategy::SmartMerge,
  };

  let should_sync_playlists = sync_playlists.unwrap_or(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1: Parse NML file
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Parsing NML",
    0.0,
    0,
    1,
    "Reading Traktor collection.nml...",
  );

  let parser = TraktorNMLParser::new();
  let nml = parser.parse(&nml_path)?;

  info!("Parsed {} tracks from Traktor NML", nml.nml.collection.entry.len());

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2: Convert Traktor entries to Harmony tracks and extract cue points
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Processing Tracks",
    5.0,
    0,
    nml.nml.collection.entry.len(),
    "Converting Traktor data...",
  );

  let mut traktor_tracks: Vec<Track> = Vec::new();
  let mut traktor_cues_by_path: HashMap<String, Vec<crate::libs::cue_point::CuePoint>> =
    HashMap::new();

  for (idx, entry) in nml.nml.collection.entry.iter().enumerate() {
    let track = map_traktor_entry_to_track(entry);

    // Extract cue points for this track (cue_v2 is a Vec, not Option<Vec>)
    let cue_points = if !entry.cue_v2.is_empty() {
      map_traktor_cues_to_harmony(Some(&entry.cue_v2), &track.id)
    } else {
      Vec::new()
    };

    if !cue_points.is_empty() {
      traktor_cues_by_path.insert(track.path.clone(), cue_points);
    }

    traktor_tracks.push(track);

    if idx % 100 == 0 {
      emit_progress(
        &app,
        "Processing Tracks",
        5.0 + (idx as f64 / nml.nml.collection.entry.len() as f64) * 15.0,
        idx,
        nml.nml.collection.entry.len(),
        format!("Processed {}/{} tracks", idx, nml.nml.collection.entry.len()),
      );
    }
  }

  debug!(
    "Extracted {} cue points from {} tracks",
    traktor_cues_by_path.values().map(|v| v.len()).sum::<usize>(),
    traktor_cues_by_path.len()
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3: Match tracks by path
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Matching Tracks",
    20.0,
    0,
    1,
    "Matching tracks by file path...",
  );

  let existing_tracks = db.get_all_tracks()?;
  let existing_by_path: HashMap<String, &Track> = existing_tracks
    .iter()
    .map(|t| (t.path.clone(), t))
    .collect();

  info!(
    "Matching {} Traktor tracks against {} Harmony tracks",
    traktor_tracks.len(),
    existing_tracks.len()
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 4: Merge metadata and cue points
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Merging Metadata",
    25.0,
    0,
    traktor_tracks.len(),
    "Merging track metadata and cue points...",
  );

  let mut tracks_to_import = Vec::new();
  let mut tracks_to_update = Vec::new();
  let mut cues_to_save = Vec::new();
  let mut fields_updated: HashMap<String, usize> = HashMap::new();

  let mut stats = EnhancedSyncStats {
    strategy: format!("{:?}", merge_strategy),
    tracks_processed: 0,
    tracks_matched: 0,
    tracks_imported: 0,
    tracks_updated: 0,
    tracks_skipped: 0,
    fields_updated: HashMap::new(),
    cue_points_synced: 0,
    playlists_imported: 0,
    playlist_tracks_linked: 0,
  };

  for (idx, traktor_track) in traktor_tracks.iter().enumerate() {
    stats.tracks_processed += 1;

    if let Some(existing_track) = existing_by_path.get(&traktor_track.path) {
      // Track exists - merge metadata
      stats.tracks_matched += 1;

      let merge_result = merge_track(existing_track, traktor_track, merge_strategy);

      if merge_result.has_changes {
        tracks_to_update.push(merge_result.merged.clone());
        stats.tracks_updated += 1;

        // Count field updates
        for field in &merge_result.fields_updated {
          *fields_updated.entry(field.clone()).or_insert(0) += 1;
        }
      } else {
        stats.tracks_skipped += 1;
      }

      // Merge cue points
      let existing_cues = db.get_cue_points_for_track(&existing_track.id)?;
      let traktor_cues = traktor_cues_by_path
        .get(&traktor_track.path)
        .cloned()
        .unwrap_or_default();

      let cue_merge_result =
        merge_cue_points(&existing_cues, &traktor_cues, &existing_track.id, cue_merge_strategy);

      if cue_merge_result.has_changes {
        cues_to_save.extend(cue_merge_result.merged);
        stats.cue_points_synced += cue_merge_result.added;
      }
    } else {
      // New track - import it
      tracks_to_import.push(traktor_track.clone());

      // Also prepare cue points for this new track
      if let Some(cues) = traktor_cues_by_path.get(&traktor_track.path) {
        cues_to_save.extend(cues.clone());
        stats.cue_points_synced += cues.len();
      }
    }

    if idx % 50 == 0 {
      emit_progress(
        &app,
        "Merging Metadata",
        25.0 + (idx as f64 / traktor_tracks.len() as f64) * 30.0,
        idx,
        traktor_tracks.len(),
        format!("Merged {}/{} tracks", idx, traktor_tracks.len()),
      );
    }
  }

  stats.fields_updated = fields_updated;

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 5: Save tracks to database
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Saving Tracks",
    55.0,
    0,
    tracks_to_import.len() + tracks_to_update.len(),
    "Saving tracks to database...",
  );

  if !tracks_to_import.is_empty() {
    info!("Importing {} new tracks from Traktor", tracks_to_import.len());
    db.insert_tracks(&tracks_to_import)?;
    stats.tracks_imported = tracks_to_import.len();
  }

  for (idx, track) in tracks_to_update.iter().enumerate() {
    db.update_track(track)?;

    if idx % 50 == 0 {
      emit_progress(
        &app,
        "Saving Tracks",
        55.0 + (idx as f64 / tracks_to_update.len() as f64) * 10.0,
        idx,
        tracks_to_update.len(),
        format!("Saved {}/{} updated tracks", idx, tracks_to_update.len()),
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 6: Save cue points
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(
    &app,
    "Syncing Cue Points",
    65.0,
    0,
    cues_to_save.len(),
    "Saving cue points...",
  );

  if !cues_to_save.is_empty() {
    info!("Saving {} cue points", cues_to_save.len());
    db.save_cue_points(&cues_to_save)?;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 7: Sync playlists (if enabled)
  // ═══════════════════════════════════════════════════════════════════════════
  if should_sync_playlists {
    if let Some(playlists_root) = &nml.nml.playlists {
      emit_progress(
        &app,
        "Syncing Playlists",
        75.0,
        0,
        1,
        "Extracting playlists from Traktor...",
      );

      let imported_playlists = extract_playlists_from_traktor(&playlists_root.node);
      info!("Extracted {} playlists from Traktor", imported_playlists.len());

      // Get all tracks for path-to-ID mapping
      let all_tracks = db.get_all_tracks()?;
      let track_id_by_path: HashMap<String, String> = all_tracks
        .iter()
        .map(|t| (t.path.clone(), t.id.clone()))
        .collect();

      for (idx, imported) in imported_playlists.iter().enumerate() {
        // Convert to Harmony playlist
        let playlist = convert_to_harmony_playlist(imported);

        // Create or update playlist
        if db.get_playlist_by_id(&playlist.id)?.is_some() {
          db.update_playlist(&playlist)?;
        } else {
          db.create_playlist(&playlist)?;
          stats.playlists_imported += 1;
        }

        // Map track paths to track IDs
        let track_ids: Vec<String> = imported
          .track_paths
          .iter()
          .filter_map(|path| track_id_by_path.get(path).cloned())
          .collect();

        if track_ids.len() < imported.track_paths.len() {
          warn!(
            "Playlist '{}': {} tracks not found in database (out of {})",
            imported.name,
            imported.track_paths.len() - track_ids.len(),
            imported.track_paths.len()
          );
        }

        // Set playlist tracks
        if !track_ids.is_empty() {
          db.set_playlist_tracks(&playlist.id, &track_ids)?;
          stats.playlist_tracks_linked += track_ids.len();
        }

        if idx % 10 == 0 {
          emit_progress(
            &app,
            "Syncing Playlists",
            75.0 + (idx as f64 / imported_playlists.len() as f64) * 20.0,
            idx,
            imported_playlists.len(),
            format!("Synced {}/{} playlists", idx, imported_playlists.len()),
          );
        }
      }
    } else {
      info!("No playlists found in Traktor NML");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 8: Complete
  // ═══════════════════════════════════════════════════════════════════════════
  emit_progress(&app, "Complete", 100.0, 1, 1, "Sync completed successfully!");

  info!(
    "Sync complete: {} processed, {} matched, {} imported, {} updated, {} skipped",
    stats.tracks_processed,
    stats.tracks_matched,
    stats.tracks_imported,
    stats.tracks_updated,
    stats.tracks_skipped
  );
  info!(
    "Cue points: {} synced, Playlists: {} imported with {} tracks",
    stats.cue_points_synced, stats.playlists_imported, stats.playlist_tracks_linked
  );

  Ok(stats)
}

/// Helper function to emit progress events
///
/// AIDEV-NOTE: Emits "traktor-sync-progress" event to frontend
/// Uses Tauri's event system for real-time progress updates
fn emit_progress(
  app: &AppHandle,
  phase: &str,
  progress: f64,
  current: usize,
  total: usize,
  message: impl Into<String>,
) {
  let payload = SyncProgress {
    phase: phase.to_string(),
    progress,
    current,
    total,
    message: message.into(),
  };

  // Use emit with window target (None = all windows)
  if let Err(e) = app.emit("traktor-sync-progress", &payload) {
    warn!("Failed to emit progress event: {}", e);
  }
}

// AIDEV-NOTE: Phase 4.5 enhancements COMPLETED!
//
// ✅ Advanced merge strategies: SMART_MERGE, TRAKTOR_WINS, HARMONY_WINS
// ✅ Cue point syncing: All 6 cue types supported (HotCue, FadeIn, FadeOut, Load, Grid, Loop)
// ✅ Playlist syncing: Full hierarchy preservation with folder paths
// ✅ Progress reporting: Real-time events via "traktor-sync-progress"
//
// Future enhancements (Phase 5+):
// - Conflict resolution UI: Preview changes before applying
// - Per-field merge strategy selection in UI
// - Side-by-side metadata diff viewer
