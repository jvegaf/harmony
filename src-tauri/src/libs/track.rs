// AIDEV-NOTE: Track model and related types
// Matches the TypeScript Track interface in src/preload/types/harmony.ts
// JSON serialization for rating and waveformPeaks stored as TEXT in SQLite

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TrackRating {
  pub source: Option<String>,
  pub rating: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
  pub id: String,
  pub path: String,
  pub title: String,
  pub artist: Option<String>,
  pub album: Option<String>,
  pub genre: Option<String>,
  pub year: Option<i32>,
  pub duration: i64, // milliseconds
  pub bitrate: Option<i32>,
  pub comment: Option<String>,
  pub bpm: Option<i32>,
  pub initial_key: Option<String>,
  pub rating: Option<TrackRating>,
  pub label: Option<String>,
  pub waveform_peaks: Option<Vec<f64>>, // ~300 normalized values (0-1)
  pub added_at: Option<i64>,            // Unix timestamp in milliseconds
  pub url: Option<String>,
}

impl Track {
  /// Generate a deterministic track ID from file path
  /// Uses SHA256 hash of the lowercase absolute path
  pub fn generate_id(path: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(path.to_lowercase().as_bytes());
    format!("{:x}", hasher.finalize())
  }
}
