// AIDEV-NOTE: Conflict Resolver for Traktor sync - Phase 4.5
//
// Handles merge strategies when syncing Traktor data with Harmony.
//
// Three strategies:
// 1. SMART_MERGE (default): Traktor fills empty Harmony fields, Harmony wins on conflicts
// 2. TRAKTOR_WINS: Traktor data overwrites Harmony (except id/path/duration/waveform)
// 3. HARMONY_WINS: Keep all Harmony data, ignore Traktor completely
//
// Identity fields (id, path, duration, waveform_peaks) always stay with Harmony.
//
// Reference: src/main/lib/traktor/sync/conflict-resolver.ts

use log::debug;
use serde::{Deserialize, Serialize};

use crate::libs::cue_point::CuePoint;
use crate::libs::track::Track;

/// Available merge strategies for track data
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MergeStrategy {
  /// Default: Traktor data fills empty Harmony fields
  SmartMerge,
  /// Traktor data overwrites Harmony data (except id/path)
  TraktorWins,
  /// Keep all Harmony data, ignore Traktor completely
  HarmonyWins,
}

impl Default for MergeStrategy {
  fn default() -> Self {
    MergeStrategy::SmartMerge
  }
}

/// Result of a track merge operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
  /// The merged track
  pub merged: Track,
  /// Whether any fields were changed
  pub has_changes: bool,
  /// List of field names that were updated
  pub fields_updated: Vec<String>,
}

/// Available merge strategies for cue points
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CueMergeStrategy {
  /// If Harmony has cues, keep them; otherwise use Traktor's
  SmartMerge,
  /// Always replace Harmony cue points with Traktor's
  Replace,
}

impl Default for CueMergeStrategy {
  fn default() -> Self {
    CueMergeStrategy::SmartMerge
  }
}

/// Result of a cue point merge operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CueMergeResult {
  /// The merged cue points
  pub merged: Vec<CuePoint>,
  /// Whether any cue points were changed
  pub has_changes: bool,
  /// Number of cue points added
  pub added: usize,
  /// Number of cue points removed
  pub removed: usize,
}

/// Check if a string value is considered "empty"
/// (None, empty string, or whitespace-only)
fn is_string_empty(value: &Option<String>) -> bool {
  match value {
    None => true,
    Some(s) => s.trim().is_empty(),
  }
}

/// Check if an optional integer is empty (None or 0)
fn is_int_empty(value: &Option<i32>) -> bool {
  match value {
    None => true,
    Some(0) => true,
    _ => false,
  }
}

/// Merge a Traktor track into a Harmony track.
///
/// AIDEV-NOTE: Core merge logic for track data
/// - Always preserves: id, path, duration, waveform_peaks, url, added_at
/// - Mergeable fields: title, artist, album, genre, year, bpm, initial_key, rating, comment, bitrate, label
///
/// # Arguments
/// * `harmony` - The existing Harmony track
/// * `traktor` - The Traktor track data to merge
/// * `strategy` - Merge strategy (default: SMART_MERGE)
///
/// # Returns
/// MergeResult with merged track and change info
pub fn merge_track(harmony: &Track, traktor: &Track, strategy: MergeStrategy) -> MergeResult {
  // Start with a copy of Harmony track (preserve identity fields)
  let mut merged = harmony.clone();
  let mut fields_updated: Vec<String> = Vec::new();

  // HARMONY_WINS: No changes, just return Harmony as-is
  if strategy == MergeStrategy::HarmonyWins {
    return MergeResult {
      merged,
      has_changes: false,
      fields_updated,
    };
  }

  // Process each mergeable field
  // AIDEV-NOTE: Field-by-field merge logic

  // Title
  if strategy == MergeStrategy::TraktorWins {
    if !traktor.title.trim().is_empty() && harmony.title != traktor.title {
      merged.title = traktor.title.clone();
      fields_updated.push("title".to_string());
    }
  } else if harmony.title.trim().is_empty() && !traktor.title.trim().is_empty() {
    merged.title = traktor.title.clone();
    fields_updated.push("title".to_string());
  }

  // Artist
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.artist) && harmony.artist != traktor.artist {
      merged.artist = traktor.artist.clone();
      fields_updated.push("artist".to_string());
    }
  } else if is_string_empty(&harmony.artist) && !is_string_empty(&traktor.artist) {
    merged.artist = traktor.artist.clone();
    fields_updated.push("artist".to_string());
  }

  // Album
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.album) && harmony.album != traktor.album {
      merged.album = traktor.album.clone();
      fields_updated.push("album".to_string());
    }
  } else if is_string_empty(&harmony.album) && !is_string_empty(&traktor.album) {
    merged.album = traktor.album.clone();
    fields_updated.push("album".to_string());
  }

  // Genre
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.genre) && harmony.genre != traktor.genre {
      merged.genre = traktor.genre.clone();
      fields_updated.push("genre".to_string());
    }
  } else if is_string_empty(&harmony.genre) && !is_string_empty(&traktor.genre) {
    merged.genre = traktor.genre.clone();
    fields_updated.push("genre".to_string());
  }

  // Year
  if strategy == MergeStrategy::TraktorWins {
    if !is_int_empty(&traktor.year) && harmony.year != traktor.year {
      merged.year = traktor.year;
      fields_updated.push("year".to_string());
    }
  } else if is_int_empty(&harmony.year) && !is_int_empty(&traktor.year) {
    merged.year = traktor.year;
    fields_updated.push("year".to_string());
  }

  // BPM
  if strategy == MergeStrategy::TraktorWins {
    if !is_int_empty(&traktor.bpm) && harmony.bpm != traktor.bpm {
      merged.bpm = traktor.bpm;
      fields_updated.push("bpm".to_string());
    }
  } else if is_int_empty(&harmony.bpm) && !is_int_empty(&traktor.bpm) {
    merged.bpm = traktor.bpm;
    fields_updated.push("bpm".to_string());
  }

  // Initial Key
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.initial_key) && harmony.initial_key != traktor.initial_key {
      merged.initial_key = traktor.initial_key.clone();
      fields_updated.push("initial_key".to_string());
    }
  } else if is_string_empty(&harmony.initial_key) && !is_string_empty(&traktor.initial_key) {
    merged.initial_key = traktor.initial_key.clone();
    fields_updated.push("initial_key".to_string());
  }

  // Rating
  if strategy == MergeStrategy::TraktorWins {
    if traktor.rating.is_some() && harmony.rating != traktor.rating {
      merged.rating = traktor.rating.clone();
      fields_updated.push("rating".to_string());
    }
  } else if harmony.rating.is_none() && traktor.rating.is_some() {
    merged.rating = traktor.rating.clone();
    fields_updated.push("rating".to_string());
  }

  // Comment
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.comment) && harmony.comment != traktor.comment {
      merged.comment = traktor.comment.clone();
      fields_updated.push("comment".to_string());
    }
  } else if is_string_empty(&harmony.comment) && !is_string_empty(&traktor.comment) {
    merged.comment = traktor.comment.clone();
    fields_updated.push("comment".to_string());
  }

  // Bitrate
  if strategy == MergeStrategy::TraktorWins {
    if !is_int_empty(&traktor.bitrate) && harmony.bitrate != traktor.bitrate {
      merged.bitrate = traktor.bitrate;
      fields_updated.push("bitrate".to_string());
    }
  } else if is_int_empty(&harmony.bitrate) && !is_int_empty(&traktor.bitrate) {
    merged.bitrate = traktor.bitrate;
    fields_updated.push("bitrate".to_string());
  }

  // Label
  if strategy == MergeStrategy::TraktorWins {
    if !is_string_empty(&traktor.label) && harmony.label != traktor.label {
      merged.label = traktor.label.clone();
      fields_updated.push("label".to_string());
    }
  } else if is_string_empty(&harmony.label) && !is_string_empty(&traktor.label) {
    merged.label = traktor.label.clone();
    fields_updated.push("label".to_string());
  }

  debug!(
    "Track merge complete: {} fields updated with {:?} strategy",
    fields_updated.len(),
    strategy
  );

  MergeResult {
    merged,
    has_changes: !fields_updated.is_empty(),
    fields_updated,
  }
}

/// Merge cue points from Traktor into Harmony.
///
/// AIDEV-NOTE: Cue point merge logic
/// - SMART_MERGE: If Harmony has cues, keep them (no changes); otherwise use Traktor's
/// - REPLACE: Always replace Harmony cue points with Traktor's
///
/// # Arguments
/// * `harmony_cues` - Existing Harmony cue points
/// * `traktor_cues` - Traktor cue points to merge
/// * `track_id` - Track ID to assign to merged cue points
/// * `strategy` - Merge strategy (default: SMART_MERGE)
///
/// # Returns
/// CueMergeResult with merged cue points and change info
pub fn merge_cue_points(
  harmony_cues: &[CuePoint],
  traktor_cues: &[CuePoint],
  track_id: &str,
  strategy: CueMergeStrategy,
) -> CueMergeResult {
  // SMART_MERGE: Keep Harmony cues if any exist
  if strategy == CueMergeStrategy::SmartMerge && !harmony_cues.is_empty() {
    debug!(
      "Keeping {} existing Harmony cue points (SMART_MERGE)",
      harmony_cues.len()
    );
    return CueMergeResult {
      merged: harmony_cues.to_vec(),
      has_changes: false,
      added: 0,
      removed: 0,
    };
  }

  // If Harmony has no cues or REPLACE strategy, use Traktor cues
  if strategy == CueMergeStrategy::Replace || harmony_cues.is_empty() {
    // Assign correct trackId to all cue points
    let merged: Vec<CuePoint> = traktor_cues
      .iter()
      .map(|cue| CuePoint {
        id: cue.id.clone(),
        track_id: track_id.to_string(),
        cue_type: cue.cue_type,
        position_ms: cue.position_ms,
        length_ms: cue.length_ms,
        hotcue_slot: cue.hotcue_slot,
        name: cue.name.clone(),
        color: cue.color.clone(),
        order: cue.order,
      })
      .collect();

    let added = traktor_cues.len();
    let removed = if strategy == CueMergeStrategy::Replace {
      harmony_cues.len()
    } else {
      0
    };
    let has_changes = added > 0 || removed > 0;

    debug!(
      "Cue merge: {} added, {} removed (strategy: {:?})",
      added, removed, strategy
    );

    return CueMergeResult {
      merged,
      has_changes,
      added,
      removed,
    };
  }

  // Fallback (shouldn't reach here)
  CueMergeResult {
    merged: harmony_cues.to_vec(),
    has_changes: false,
    added: 0,
    removed: 0,
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::libs::cue_point::CueType;
  use crate::libs::track::TrackRating;

  #[test]
  fn test_merge_strategy_smart_merge_fills_empty_fields() {
    let harmony = Track {
      id: "track-1".to_string(),
      path: "/music/test.mp3".to_string(),
      title: "Test Track".to_string(),
      artist: None, // Empty
      album: None,  // Empty
      genre: Some("House".to_string()),
      year: None,
      duration: 180000,
      bitrate: Some(320),
      comment: None,
      bpm: None, // Empty
      initial_key: None,
      rating: None,
      label: None,
      waveform_peaks: None,
      added_at: Some(1234567890),
      url: None,
    };

    let traktor = Track {
      id: "ignored".to_string(),
      path: "/ignored/path.mp3".to_string(),
      title: "Traktor Title".to_string(),
      artist: Some("DJ Traktor".to_string()),
      album: Some("Traktor Album".to_string()),
      genre: Some("Techno".to_string()), // Different
      year: Some(2024),
      duration: 999999, // Ignored
      bitrate: Some(192),
      comment: Some("From Traktor".to_string()),
      bpm: Some(128),
      initial_key: Some("Am".to_string()),
      rating: Some(TrackRating {
        source: Some("traktor".to_string()),
        rating: 5,
      }),
      label: Some("Test Label".to_string()),
      waveform_peaks: Some(vec![0.5, 0.8]), // Ignored
      added_at: None,
      url: None,
    };

    let result = merge_track(&harmony, &traktor, MergeStrategy::SmartMerge);

    // Identity fields preserved
    assert_eq!(result.merged.id, "track-1");
    assert_eq!(result.merged.path, "/music/test.mp3");
    assert_eq!(result.merged.duration, 180000);

    // Empty fields filled from Traktor
    assert_eq!(result.merged.artist, Some("DJ Traktor".to_string()));
    assert_eq!(result.merged.album, Some("Traktor Album".to_string()));
    assert_eq!(result.merged.bpm, Some(128));
    assert_eq!(result.merged.initial_key, Some("Am".to_string()));

    // Existing Harmony fields preserved
    assert_eq!(result.merged.genre, Some("House".to_string())); // Not overwritten
    assert_eq!(result.merged.bitrate, Some(320)); // Not overwritten

    assert!(result.has_changes);
    assert!(result.fields_updated.contains(&"artist".to_string()));
    assert!(result.fields_updated.contains(&"bpm".to_string()));
  }

  #[test]
  fn test_merge_strategy_traktor_wins() {
    let harmony = Track {
      id: "track-1".to_string(),
      path: "/music/test.mp3".to_string(),
      title: "Harmony Title".to_string(),
      artist: Some("Harmony Artist".to_string()),
      album: None,
      genre: Some("House".to_string()),
      year: Some(2023),
      duration: 180000,
      bitrate: Some(320),
      comment: None,
      bpm: Some(120),
      initial_key: Some("C".to_string()),
      rating: None,
      label: None,
      waveform_peaks: None,
      added_at: Some(1234567890),
      url: None,
    };

    let traktor = Track {
      id: "ignored".to_string(),
      path: "/ignored".to_string(),
      title: "Traktor Title".to_string(),
      artist: Some("Traktor Artist".to_string()),
      album: Some("Traktor Album".to_string()),
      genre: Some("Techno".to_string()),
      year: Some(2024),
      duration: 999999,
      bitrate: Some(192),
      comment: Some("Traktor comment".to_string()),
      bpm: Some(128),
      initial_key: Some("Am".to_string()),
      rating: Some(TrackRating {
        source: Some("traktor".to_string()),
        rating: 4,
      }),
      label: None,
      waveform_peaks: None,
      added_at: None,
      url: None,
    };

    let result = merge_track(&harmony, &traktor, MergeStrategy::TraktorWins);

    // Identity preserved
    assert_eq!(result.merged.id, "track-1");
    assert_eq!(result.merged.path, "/music/test.mp3");

    // Traktor wins on all fields
    assert_eq!(result.merged.title, "Traktor Title");
    assert_eq!(result.merged.artist, Some("Traktor Artist".to_string()));
    assert_eq!(result.merged.genre, Some("Techno".to_string()));
    assert_eq!(result.merged.bpm, Some(128));

    assert!(result.has_changes);
  }

  #[test]
  fn test_merge_strategy_harmony_wins() {
    let harmony = Track {
      id: "track-1".to_string(),
      path: "/music/test.mp3".to_string(),
      title: "Keep This".to_string(),
      artist: Some("Keep Artist".to_string()),
      album: None,
      genre: None,
      year: None,
      duration: 180000,
      bitrate: Some(320),
      comment: None,
      bpm: Some(120),
      initial_key: None,
      rating: None,
      label: None,
      waveform_peaks: None,
      added_at: Some(1234567890),
      url: None,
    };

    let traktor = Track {
      id: "ignored".to_string(),
      path: "/ignored".to_string(),
      title: "Ignore This".to_string(),
      artist: Some("Ignore Artist".to_string()),
      album: Some("Ignore Album".to_string()),
      genre: Some("Ignore Genre".to_string()),
      year: Some(2024),
      duration: 999999,
      bitrate: Some(192),
      comment: None,
      bpm: Some(128),
      initial_key: Some("Am".to_string()),
      rating: None,
      label: None,
      waveform_peaks: None,
      added_at: None,
      url: None,
    };

    let result = merge_track(&harmony, &traktor, MergeStrategy::HarmonyWins);

    // Everything from harmony preserved
    assert_eq!(result.merged.title, "Keep This");
    assert_eq!(result.merged.artist, Some("Keep Artist".to_string()));
    assert_eq!(result.merged.bpm, Some(120));
    assert_eq!(result.merged.album, None);

    assert!(!result.has_changes);
    assert!(result.fields_updated.is_empty());
  }

  #[test]
  fn test_merge_cue_points_smart_keeps_existing() {
    let harmony_cues = vec![
      CuePoint {
        id: "cue-1".to_string(),
        track_id: "track-1".to_string(),
        cue_type: CueType::HotCue,
        position_ms: 1000.0,
        length_ms: None,
        hotcue_slot: Some(0),
        name: Some("Drop".to_string()),
        color: None,
        order: None,
      },
      CuePoint {
        id: "cue-2".to_string(),
        track_id: "track-1".to_string(),
        cue_type: CueType::Loop,
        position_ms: 30000.0,
        length_ms: Some(8000.0),
        hotcue_slot: None,
        name: Some("Outro".to_string()),
        color: None,
        order: None,
      },
    ];

    let traktor_cues = vec![CuePoint {
      id: "traktor-cue-1".to_string(),
      track_id: "track-1".to_string(),
      cue_type: CueType::HotCue,
      position_ms: 2000.0,
      length_ms: None,
      hotcue_slot: Some(1),
      name: Some("Build".to_string()),
      color: None,
      order: None,
    }];

    let result = merge_cue_points(
      &harmony_cues,
      &traktor_cues,
      "track-1",
      CueMergeStrategy::SmartMerge,
    );

    assert_eq!(result.merged.len(), 2); // Keep Harmony's 2 cues
    assert!(!result.has_changes);
    assert_eq!(result.added, 0);
    assert_eq!(result.removed, 0);
  }

  #[test]
  fn test_merge_cue_points_smart_uses_traktor_when_empty() {
    let harmony_cues: Vec<CuePoint> = vec![];

    let traktor_cues = vec![
      CuePoint {
        id: "traktor-cue-1".to_string(),
        track_id: "wrong-id".to_string(), // Should be replaced
        cue_type: CueType::HotCue,
        position_ms: 1500.0,
        length_ms: None,
        hotcue_slot: Some(0),
        name: Some("Intro".to_string()),
        color: None,
        order: None,
      },
      CuePoint {
        id: "traktor-cue-2".to_string(),
        track_id: "wrong-id".to_string(),
        cue_type: CueType::Loop,
        position_ms: 45000.0,
        length_ms: Some(16000.0),
        hotcue_slot: None,
        name: None,
        color: None,
        order: None,
      },
    ];

    let result = merge_cue_points(
      &harmony_cues,
      &traktor_cues,
      "correct-track-id",
      CueMergeStrategy::SmartMerge,
    );

    assert_eq!(result.merged.len(), 2);
    assert!(result.has_changes);
    assert_eq!(result.added, 2);
    assert_eq!(result.removed, 0);

    // Check trackId was corrected
    assert_eq!(result.merged[0].track_id, "correct-track-id");
    assert_eq!(result.merged[1].track_id, "correct-track-id");
  }

  #[test]
  fn test_merge_cue_points_replace() {
    let harmony_cues = vec![CuePoint {
      id: "old-cue".to_string(),
      track_id: "track-1".to_string(),
      cue_type: CueType::Load,
      position_ms: 0.0,
      length_ms: None,
      hotcue_slot: None,
      name: None,
      color: None,
      order: None,
    }];

    let traktor_cues = vec![
      CuePoint {
        id: "new-cue-1".to_string(),
        track_id: "wrong-id".to_string(),
        cue_type: CueType::HotCue,
        position_ms: 5000.0,
        length_ms: None,
        hotcue_slot: Some(0),
        name: Some("Drop".to_string()),
        color: None,
        order: None,
      },
      CuePoint {
        id: "new-cue-2".to_string(),
        track_id: "wrong-id".to_string(),
        cue_type: CueType::FadeOut,
        position_ms: 120000.0,
        length_ms: Some(4000.0),
        hotcue_slot: None,
        name: None,
        color: None,
        order: None,
      },
    ];

    let result = merge_cue_points(
      &harmony_cues,
      &traktor_cues,
      "track-1",
      CueMergeStrategy::Replace,
    );

    assert_eq!(result.merged.len(), 2);
    assert!(result.has_changes);
    assert_eq!(result.added, 2);
    assert_eq!(result.removed, 1);

    // All cues should have correct trackId
    assert!(result.merged.iter().all(|c| c.track_id == "track-1"));
  }
}
