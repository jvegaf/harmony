// AIDEV-NOTE: Cue Mapper for Traktor <-> Harmony conversion - Phase 4.5
//
// Maps between Traktor CUE_V2 entries and Harmony CuePoint objects.
//
// Traktor cue types (TYPE field):
// - 0 = Hot Cue (jump marker)
// - 1 = Fade-in
// - 2 = Fade-out
// - 3 = Load (default position)
// - 4 = Grid (beatgrid marker, contains BPM in GRID.BPM)
// - 5 = Loop (has length)
//
// Positions are in milliseconds in both systems.
//
// Reference: src/main/lib/traktor/mappers/cue-mapper.ts

use log::warn;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use crate::libs::cue_point::{CuePoint, CueType};
use crate::libs::traktor::nml_types::TraktorCue;

/// Map Traktor TYPE string to Harmony CueType.
///
/// # Arguments
/// * `type_str` - Traktor TYPE value ("0"-"5")
///
/// # Returns
/// Harmony CueType
pub fn map_traktor_cue_type(type_str: &str) -> CueType {
  match type_str {
    "0" => CueType::HotCue,
    "1" => CueType::FadeIn,
    "2" => CueType::FadeOut,
    "3" => CueType::Load,
    "4" => CueType::Grid,
    "5" => CueType::Loop,
    _ => {
      warn!(
        "Unknown Traktor cue TYPE '{}', defaulting to HotCue",
        type_str
      );
      CueType::HotCue
    }
  }
}

/// Map Harmony CueType to Traktor TYPE string.
///
/// # Arguments
/// * `cue_type` - Harmony CueType
///
/// # Returns
/// Traktor TYPE value
#[allow(dead_code)]
pub fn map_harmony_cue_type(cue_type: CueType) -> String {
  match cue_type {
    CueType::HotCue => "0".to_string(),
    CueType::FadeIn => "1".to_string(),
    CueType::FadeOut => "2".to_string(),
    CueType::Load => "3".to_string(),
    CueType::Grid => "4".to_string(),
    CueType::Loop => "5".to_string(),
  }
}

/// Generate a deterministic unique ID for a cue point.
///
/// AIDEV-NOTE: Uses hash of trackId + position + type + hotcueSlot
/// This ensures uniqueness even when multiple cues exist at the same position
///
/// # Arguments
/// * `track_id` - Parent track ID
/// * `position_ms` - Position in milliseconds
/// * `cue_type` - Cue type
/// * `hotcue_slot` - Optional hotcue slot number
///
/// # Returns
/// Unique cue ID (format: "cue-{hash}")
pub fn generate_cue_id(
  track_id: &str,
  position_ms: f64,
  cue_type: CueType,
  hotcue_slot: Option<i32>,
) -> String {
  let mut hasher = DefaultHasher::new();

  // Hash components
  track_id.hash(&mut hasher);
  position_ms.to_bits().hash(&mut hasher); // Use bits for deterministic hashing of floats
  cue_type.as_str().hash(&mut hasher);

  if let Some(slot) = hotcue_slot {
    slot.hash(&mut hasher);
  } else {
    "none".hash(&mut hasher);
  }

  let hash = hasher.finish();
  format!("cue-{:x}", hash) // Hexadecimal hash
}

/// Map a single Traktor CUE_V2 to a Harmony CuePoint.
///
/// AIDEV-NOTE: Core conversion logic from Traktor to Harmony format
/// - Converts TYPE to CueType enum
/// - Parses START (position in ms)
/// - Parses LEN (loop length in ms)
/// - Handles HOTCUE slot numbers
/// - Preserves GRID.BPM for TYPE=4 (grid markers)
///
/// # Arguments
/// * `traktor_cue` - Traktor cue data
/// * `track_id` - Parent track ID
///
/// # Returns
/// Harmony CuePoint
pub fn map_traktor_cue_to_harmony(traktor_cue: &TraktorCue, track_id: &str) -> CuePoint {
  let cue_type = map_traktor_cue_type(&traktor_cue.cue_type);

  // Parse position (start field is in milliseconds as string)
  let position_ms = traktor_cue.start.parse::<f64>().unwrap_or_else(|_| {
    warn!(
      "Invalid start value '{}', defaulting to 0.0",
      traktor_cue.start
    );
    0.0
  });

  // Parse hotcue slot early for ID generation
  let hotcue_slot = traktor_cue.hotcue.as_ref().and_then(|h| {
    h.parse::<i32>().ok().or_else(|| {
      warn!("Invalid hotcue value '{}'", h);
      None
    })
  });

  // Generate unique ID
  let id = generate_cue_id(track_id, position_ms, cue_type, hotcue_slot);

  let mut cue = CuePoint {
    id,
    track_id: track_id.to_string(),
    cue_type,
    position_ms,
    length_ms: None,
    hotcue_slot,
    name: None,
    color: None,
    order: None,
  };

  // Optional: Name (skip "n.n." which is Traktor's placeholder)
  if let Some(name) = &traktor_cue.name {
    if name != "n.n." && !name.trim().is_empty() {
      cue.name = Some(name.clone());
    }
  }

  // Optional: Length (for loops, TYPE=5)
  if let Some(len_str) = &traktor_cue.len {
    if let Ok(length) = len_str.parse::<f64>() {
      if length > 0.0 {
        cue.length_ms = Some(length);
      }
    }
  }

  // Optional: Display order
  if let Some(order_str) = &traktor_cue.displ_order {
    if let Ok(order) = order_str.parse::<i32>() {
      cue.order = Some(order);
    }
  }

  // CRITICAL: Preserve GRID.BPM for grid cues (TYPE=4)
  // This is essential for beatgrid precision in Traktor round-trips
  // Note: Harmony CuePoint doesn't have a gridBpm field yet, so we store it in name
  // TODO: Add gridBpm field to CuePoint struct if needed
  if cue_type == CueType::Grid {
    if let Some(grid) = &traktor_cue.grid {
      // Store BPM in name for now (format: "Grid {bpm}")
      cue.name = Some(format!("Grid {}", grid.bpm));
    }
  }

  cue
}

/// Map Traktor CUE_V2 data (single or array) to Harmony CuePoints.
///
/// # Arguments
/// * `cue_data` - Traktor CUE_V2 (single cue, array, or None)
/// * `track_id` - Parent track ID
///
/// # Returns
/// Vec of Harmony CuePoints
pub fn map_traktor_cues_to_harmony(
  cue_data: Option<&Vec<TraktorCue>>,
  track_id: &str,
) -> Vec<CuePoint> {
  match cue_data {
    None => vec![],
    Some(cues) => cues
      .iter()
      .map(|cue| map_traktor_cue_to_harmony(cue, track_id))
      .collect(),
  }
}

/// Map a Harmony CuePoint to Traktor CUE_V2 format.
///
/// AIDEV-NOTE: Reverse conversion from Harmony to Traktor
/// - Formats position with 6 decimal places (Traktor format)
/// - Preserves grid BPM if stored in name (format: "Grid {bpm}")
///
/// # Arguments
/// * `cue` - Harmony CuePoint
///
/// # Returns
/// Traktor CUE_V2 data
#[allow(dead_code)]
pub fn map_harmony_cue_to_traktor(cue: &CuePoint) -> TraktorCue {
  // Format position with 6 decimal places to match Traktor format
  let format_position = |ms: f64| -> String { format!("{:.6}", ms) };

  let mut traktor = TraktorCue {
    cue_type: map_harmony_cue_type(cue.cue_type),
    start: format_position(cue.position_ms),
    len: cue.length_ms.map(format_position),
    repeats: Some("-1".to_string()),
    hotcue: cue.hotcue_slot.map(|s| s.to_string()),
    name: cue.name.clone(),
    displ_order: cue.order.map(|o| o.to_string()),
    grid: None,
  };

  // Restore GRID element for grid cues (TYPE=4)
  // Extract BPM from name if present (format: "Grid {bpm}")
  if cue.cue_type == CueType::Grid {
    if let Some(name) = &cue.name {
      if let Some(bpm_str) = name.strip_prefix("Grid ") {
        traktor.grid = Some(crate::libs::traktor::nml_types::TraktorGrid {
          bpm: bpm_str.to_string(),
        });
      }
    }
  }

  traktor
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_map_traktor_cue_type() {
    assert_eq!(map_traktor_cue_type("0"), CueType::HotCue);
    assert_eq!(map_traktor_cue_type("1"), CueType::FadeIn);
    assert_eq!(map_traktor_cue_type("2"), CueType::FadeOut);
    assert_eq!(map_traktor_cue_type("3"), CueType::Load);
    assert_eq!(map_traktor_cue_type("4"), CueType::Grid);
    assert_eq!(map_traktor_cue_type("5"), CueType::Loop);
    assert_eq!(map_traktor_cue_type("99"), CueType::HotCue); // Unknown -> HotCue
  }

  #[test]
  fn test_map_harmony_cue_type() {
    assert_eq!(map_harmony_cue_type(CueType::HotCue), "0");
    assert_eq!(map_harmony_cue_type(CueType::FadeIn), "1");
    assert_eq!(map_harmony_cue_type(CueType::FadeOut), "2");
    assert_eq!(map_harmony_cue_type(CueType::Load), "3");
    assert_eq!(map_harmony_cue_type(CueType::Grid), "4");
    assert_eq!(map_harmony_cue_type(CueType::Loop), "5");
  }

  #[test]
  fn test_generate_cue_id_deterministic() {
    let id1 = generate_cue_id("track-1", 1000.0, CueType::HotCue, Some(0));
    let id2 = generate_cue_id("track-1", 1000.0, CueType::HotCue, Some(0));
    assert_eq!(id1, id2); // Same inputs = same ID

    let id3 = generate_cue_id("track-1", 1000.0, CueType::HotCue, Some(1));
    assert_ne!(id1, id3); // Different hotcue slot = different ID
  }

  #[test]
  fn test_map_traktor_cue_to_harmony_hot_cue() {
    let traktor_cue = TraktorCue {
      cue_type: "0".to_string(),
      start: "5000.123456".to_string(),
      len: None,
      repeats: Some("-1".to_string()),
      hotcue: Some("2".to_string()),
      name: Some("Drop".to_string()),
      displ_order: Some("1".to_string()),
      grid: None,
    };

    let harmony_cue = map_traktor_cue_to_harmony(&traktor_cue, "track-123");

    assert_eq!(harmony_cue.track_id, "track-123");
    assert_eq!(harmony_cue.cue_type, CueType::HotCue);
    assert_eq!(harmony_cue.position_ms, 5000.123456);
    assert_eq!(harmony_cue.hotcue_slot, Some(2));
    assert_eq!(harmony_cue.name, Some("Drop".to_string()));
    assert_eq!(harmony_cue.order, Some(1));
    assert_eq!(harmony_cue.length_ms, None);
  }

  #[test]
  fn test_map_traktor_cue_to_harmony_loop() {
    let traktor_cue = TraktorCue {
      cue_type: "5".to_string(),
      start: "30000.0".to_string(),
      len: Some("8000.0".to_string()),
      repeats: Some("-1".to_string()),
      hotcue: None,
      name: Some("Outro Loop".to_string()),
      displ_order: None,
      grid: None,
    };

    let harmony_cue = map_traktor_cue_to_harmony(&traktor_cue, "track-456");

    assert_eq!(harmony_cue.cue_type, CueType::Loop);
    assert_eq!(harmony_cue.position_ms, 30000.0);
    assert_eq!(harmony_cue.length_ms, Some(8000.0));
    assert_eq!(harmony_cue.name, Some("Outro Loop".to_string()));
  }

  #[test]
  fn test_map_traktor_cue_to_harmony_grid_with_bpm() {
    let traktor_cue = TraktorCue {
      cue_type: "4".to_string(),
      start: "0.0".to_string(),
      len: None,
      repeats: None,
      hotcue: None,
      name: Some("AutoGrid".to_string()),
      displ_order: None,
      grid: Some(crate::libs::traktor::nml_types::TraktorGrid {
        bpm: "128.00".to_string(),
      }),
    };

    let harmony_cue = map_traktor_cue_to_harmony(&traktor_cue, "track-789");

    assert_eq!(harmony_cue.cue_type, CueType::Grid);
    assert_eq!(harmony_cue.position_ms, 0.0);
    // BPM stored in name
    assert_eq!(harmony_cue.name, Some("Grid 128.00".to_string()));
  }

  #[test]
  fn test_map_traktor_cues_to_harmony_empty() {
    let cues = map_traktor_cues_to_harmony(None, "track-1");
    assert_eq!(cues.len(), 0);
  }

  #[test]
  fn test_map_traktor_cues_to_harmony_multiple() {
    let traktor_cues = vec![
      TraktorCue {
        cue_type: "0".to_string(),
        start: "1000.0".to_string(),
        len: None,
        repeats: None,
        hotcue: Some("0".to_string()),
        name: Some("Intro".to_string()),
        displ_order: None,
        grid: None,
      },
      TraktorCue {
        cue_type: "5".to_string(),
        start: "60000.0".to_string(),
        len: Some("16000.0".to_string()),
        repeats: None,
        hotcue: None,
        name: Some("Break Loop".to_string()),
        displ_order: None,
        grid: None,
      },
    ];

    let harmony_cues = map_traktor_cues_to_harmony(Some(&traktor_cues), "track-xyz");

    assert_eq!(harmony_cues.len(), 2);
    assert_eq!(harmony_cues[0].cue_type, CueType::HotCue);
    assert_eq!(harmony_cues[0].position_ms, 1000.0);
    assert_eq!(harmony_cues[1].cue_type, CueType::Loop);
    assert_eq!(harmony_cues[1].length_ms, Some(16000.0));
  }

  #[test]
  fn test_map_harmony_cue_to_traktor_hot_cue() {
    let harmony_cue = CuePoint {
      id: "cue-abc".to_string(),
      track_id: "track-1".to_string(),
      cue_type: CueType::HotCue,
      position_ms: 2500.5,
      length_ms: None,
      hotcue_slot: Some(1),
      name: Some("Build".to_string()),
      color: None,
      order: Some(2),
    };

    let traktor_cue = map_harmony_cue_to_traktor(&harmony_cue);

    assert_eq!(traktor_cue.cue_type, "0");
    assert_eq!(traktor_cue.start, "2500.500000");
    assert_eq!(traktor_cue.hotcue, Some("1".to_string()));
    assert_eq!(traktor_cue.name, Some("Build".to_string()));
    assert_eq!(traktor_cue.displ_order, Some("2".to_string()));
  }

  #[test]
  fn test_map_harmony_cue_to_traktor_loop() {
    let harmony_cue = CuePoint {
      id: "cue-def".to_string(),
      track_id: "track-2".to_string(),
      cue_type: CueType::Loop,
      position_ms: 45000.0,
      length_ms: Some(8000.0),
      hotcue_slot: None,
      name: Some("Breakdown".to_string()),
      color: None,
      order: None,
    };

    let traktor_cue = map_harmony_cue_to_traktor(&harmony_cue);

    assert_eq!(traktor_cue.cue_type, "5");
    assert_eq!(traktor_cue.start, "45000.000000");
    assert_eq!(traktor_cue.len, Some("8000.000000".to_string()));
    assert_eq!(traktor_cue.hotcue, None);
  }

  #[test]
  fn test_map_harmony_cue_to_traktor_grid_with_bpm() {
    let harmony_cue = CuePoint {
      id: "cue-grid".to_string(),
      track_id: "track-3".to_string(),
      cue_type: CueType::Grid,
      position_ms: 0.0,
      length_ms: None,
      hotcue_slot: None,
      name: Some("Grid 130.50".to_string()), // BPM encoded in name
      color: None,
      order: None,
    };

    let traktor_cue = map_harmony_cue_to_traktor(&harmony_cue);

    assert_eq!(traktor_cue.cue_type, "4");
    assert_eq!(traktor_cue.start, "0.000000");
    assert!(traktor_cue.grid.is_some());
    assert_eq!(traktor_cue.grid.unwrap().bpm, "130.50".to_string());
  }

  #[test]
  fn test_roundtrip_conversion() {
    // Traktor -> Harmony -> Traktor should preserve data
    let original_traktor = TraktorCue {
      cue_type: "0".to_string(),
      start: "12345.678900".to_string(),
      len: None,
      repeats: Some("-1".to_string()),
      hotcue: Some("3".to_string()),
      name: Some("Test Cue".to_string()),
      displ_order: Some("5".to_string()),
      grid: None,
    };

    let harmony = map_traktor_cue_to_harmony(&original_traktor, "track-roundtrip");
    let back_to_traktor = map_harmony_cue_to_traktor(&harmony);

    assert_eq!(back_to_traktor.cue_type, "0");
    assert_eq!(back_to_traktor.hotcue, Some("3".to_string()));
    assert_eq!(back_to_traktor.name, Some("Test Cue".to_string()));
    assert_eq!(back_to_traktor.displ_order, Some("5".to_string()));
    // Position might have slight rounding but should be very close
    let original_pos: f64 = original_traktor.start.parse().unwrap();
    let roundtrip_pos: f64 = back_to_traktor.start.parse().unwrap();
    assert!((original_pos - roundtrip_pos).abs() < 0.001);
  }
}
