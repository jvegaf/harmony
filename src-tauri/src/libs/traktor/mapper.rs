// AIDEV-NOTE: Traktor-to-Harmony track mapper
// Maps between Traktor NML entries and Harmony Track objects
//
// Key conversions:
// - Path: Traktor uses "/:dir/:subdir/:" format, we use system paths
// - Rating: Traktor 0-255 -> Harmony 0-5 stars
// - Bitrate: Traktor stores bps, we use kbps
// - BPM: Traktor stores float, we use rounded integer
// - Duration: Traktor stores seconds as string, we use milliseconds

use crate::libs::track::{Track, TrackRating};
use chrono::NaiveDate;
use std::path::{Path, PathBuf};

use super::nml_types::TraktorEntry;

/// Convert Traktor path format to system path
///
/// Traktor format: DIR="/:Users/:josev/:Music/:" FILE="track.mp3" VOLUME="C:"
/// Windows output:  C:\Users\josev\Music\track.mp3
/// Linux output:    /Users/josev/Music/track.mp3
///
/// This ensures Traktor imports generate the same paths as filesystem imports,
/// enabling proper deduplication via Track::generate_id()
pub fn map_traktor_path_to_system(dir: &str, file: &str, volume: Option<&str>) -> String {
  // Remove /: prefix and replace all /: with /
  let system_dir = dir.replace("/:", "/");

  // Remove trailing slash if present
  let system_dir = system_dir.trim_end_matches('/');

  // Combine with volume if present (e.g., "C:" + "/Users/..." → "C:/Users/...")
  let full_path = if let Some(vol) = volume {
    format!("{}{}/{}", vol, system_dir, file)
  } else {
    format!("{}/{}", system_dir, file)
  };

  // Normalize to OS-native path
  let path = PathBuf::from(&full_path);
  path.to_string_lossy().to_string()
}

/// Convert system path to Traktor format
///
/// Handles both Unix-style and Windows-style paths
/// Extracts Windows drive letter (e.g., "C:") to VOLUME attribute
#[allow(dead_code)]
pub fn map_system_path_to_traktor(system_path: &str) -> (String, String, String) {
  let path = Path::new(system_path);

  // Extract Windows drive letter if present
  let mut volume = String::new();
  let normalized = system_path.replace('\\', "/");

  // Check for Windows drive letter (e.g., "C:/...")
  if normalized.len() >= 2 && normalized.chars().nth(1) == Some(':') {
    volume = normalized[0..2].to_uppercase();
  }

  // Split path into directory and filename
  let file = path
    .file_name()
    .and_then(|f| f.to_str())
    .unwrap_or("")
    .to_string();

  let dir_path = path.parent().and_then(|p| p.to_str()).unwrap_or("/");

  // Convert /Users/josev/Music -> /:Users/:josev/:Music/:
  if dir_path == "/" || dir_path.is_empty() {
    return ("/:".to_string(), file, volume);
  }

  let parts: Vec<&str> = dir_path.split('/').filter(|s| !s.is_empty()).collect();
  let traktor_dir = format!("/:{}/:", parts.join("/:"));

  (traktor_dir, file, volume)
}

/// Convert Traktor rating (0-255) to Harmony rating (0-5 stars)
///
/// Traktor scale: 0, 51, 102, 153, 204, 255 for 0-5 stars
pub fn map_traktor_rating(ranking: Option<&str>) -> i32 {
  ranking
    .and_then(|r| r.parse::<i32>().ok())
    .map(|v| (v as f64 / 51.0).round() as i32)
    .unwrap_or(0)
}

/// Convert Harmony rating (0-5) to Traktor rating (0-255)
#[allow(dead_code)]
pub fn map_harmony_rating_to_traktor(stars: i32) -> String {
  (stars * 51).to_string()
}

/// Parse Traktor BPM string to integer
pub fn map_traktor_bpm(bpm: Option<&str>) -> Option<i32> {
  bpm
    .and_then(|b| b.parse::<f64>().ok())
    .map(|v| v.round() as i32)
}

/// Parse Traktor date format (YYYY/M/D) to Unix timestamp (milliseconds)
pub fn parse_traktor_date(date_str: Option<&str>) -> Option<i64> {
  date_str.and_then(|s| {
    let parts: Vec<&str> = s.split('/').collect();
    if parts.len() != 3 {
      return None;
    }

    let year = parts[0].parse::<i32>().ok()?;
    let month = parts[1].parse::<u32>().ok()?;
    let day = parts[2].parse::<u32>().ok()?;

    let date = NaiveDate::from_ymd_opt(year, month, day)?;
    Some(date.and_hms_opt(0, 0, 0)?.and_utc().timestamp_millis())
  })
}

/// Map a Traktor NML entry to a Harmony Track object
///
/// Uses Track::generate_id() for deterministic ID generation.
/// This ensures the same file always gets the same ID regardless of
/// import source (Traktor vs filesystem scanner).
pub fn map_traktor_entry_to_track(entry: &TraktorEntry) -> Track {
  let path = map_traktor_path_to_system(
    &entry.location.dir,
    &entry.location.file,
    entry.location.volume.as_deref(),
  );

  let info = entry.info.as_ref();
  let tempo = entry.tempo.as_ref();

  // Build rating object if present
  let rating = info
    .and_then(|i| i.ranking.as_deref())
    .map(|r| {
      let rating_value = map_traktor_rating(Some(r));
      if rating_value > 0 {
        Some(TrackRating {
          rating: rating_value,
          source: Some("traktor".to_string()),
        })
      } else {
        None
      }
    })
    .flatten();

  // Extract year from RELEASE_DATE
  let year = info
    .and_then(|i| i.release_date.as_deref())
    .and_then(|date_str| {
      date_str
        .split('/')
        .next()
        .and_then(|y| y.parse::<i32>().ok())
    });

  // Convert bitrate from bps to kbps
  let bitrate = info
    .and_then(|i| i.bitrate.as_deref())
    .and_then(|b| b.parse::<i32>().ok())
    .map(|bps| bps / 1000);

  // Parse duration: Traktor stores seconds, we use milliseconds
  let duration = info
    .and_then(|i| {
      // Try PLAYTIME_FLOAT first for precision, fallback to PLAYTIME
      i.playtime_float.as_deref().or(i.playtime.as_deref())
    })
    .and_then(|p| p.parse::<f64>().ok())
    .map(|seconds| (seconds * 1000.0) as i64)
    .unwrap_or(0);

  // Parse added_at from IMPORT_DATE
  let added_at = info
    .and_then(|i| i.import_date.as_deref())
    .and_then(|d| parse_traktor_date(Some(d)));

  Track {
    id: Track::generate_id(&path),
    path,
    title: entry
      .title
      .clone()
      .unwrap_or_else(|| entry.location.file.clone()),
    artist: entry.artist.clone(),
    album: entry.album.as_ref().and_then(|a| a.title.clone()),
    genre: info.and_then(|i| i.genre.clone()),
    year,
    duration,
    bitrate,
    comment: info.and_then(|i| i.comment.clone()),
    bpm: tempo.and_then(|t| map_traktor_bpm(Some(&t.bpm))),
    initial_key: info.and_then(|i| i.key.clone()), // TODO: Convert from Traktor key notation
    rating,
    label: info.and_then(|i| i.label.clone()),
    waveform_peaks: None, // Not stored in NML
    added_at,
    url: None,
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_map_traktor_path_unix() {
    let dir = "/:Users/:josev/:Music/:";
    let file = "test.mp3";
    let result = map_traktor_path_to_system(dir, file, None);

    // On Unix systems, should produce /Users/josev/Music/test.mp3
    assert!(result.contains("Users"));
    assert!(result.contains("josev"));
    assert!(result.contains("Music"));
    assert!(result.ends_with("test.mp3"));
  }

  #[test]
  fn test_map_traktor_path_windows() {
    let dir = "/:Users/:josev/:Music/:";
    let file = "test.mp3";
    let result = map_traktor_path_to_system(dir, file, Some("C:"));

    assert!(result.starts_with("C:"));
    assert!(result.contains("Users"));
    assert!(result.ends_with("test.mp3"));
  }

  #[test]
  fn test_map_traktor_rating() {
    assert_eq!(map_traktor_rating(Some("0")), 0);
    assert_eq!(map_traktor_rating(Some("51")), 1);
    assert_eq!(map_traktor_rating(Some("102")), 2);
    assert_eq!(map_traktor_rating(Some("153")), 3);
    assert_eq!(map_traktor_rating(Some("204")), 4);
    assert_eq!(map_traktor_rating(Some("255")), 5);
    assert_eq!(map_traktor_rating(None), 0);
  }

  #[test]
  fn test_map_traktor_bpm() {
    assert_eq!(map_traktor_bpm(Some("120.000000")), Some(120));
    assert_eq!(map_traktor_bpm(Some("123.456789")), Some(123));
    assert_eq!(map_traktor_bpm(Some("128.5")), Some(129));
    assert_eq!(map_traktor_bpm(None), None);
  }

  #[test]
  fn test_parse_traktor_date() {
    let timestamp = parse_traktor_date(Some("2026/1/15"));
    assert!(timestamp.is_some());

    // Verify it's a valid timestamp (somewhere in 2026)
    let ts = timestamp.unwrap();
    assert!(ts > 0);
  }

  #[test]
  fn test_map_system_path_to_traktor() {
    let (dir, file, volume) = map_system_path_to_traktor("/Users/josev/Music/test.mp3");
    assert_eq!(file, "test.mp3");
    assert!(dir.contains("Users"));
    assert!(dir.starts_with("/:"));
    assert!(dir.ends_with("/:"));
  }
}
