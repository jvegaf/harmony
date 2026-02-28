// AIDEV-NOTE: Library change detection module
// Scans filesystem and compares with database to detect:
// - New audio files added by user
// - Missing files (deleted or moved outside app)

use log::info;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use walkdir::WalkDir;

use crate::libs::audio_metadata::SUPPORTED_EXTENSIONS;
use crate::libs::{Database, Result, Track};

/// Result of library change detection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryChanges {
  /// New files found in filesystem but not in database
  pub added: Vec<String>,
  /// Files in database but no longer exist on disk
  pub removed: Vec<RemovedTrack>,
}

/// Information about a removed track
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemovedTrack {
  pub id: String,
  pub path: String,
  pub title: String,
  pub artist: Option<String>,
}

/// Check if a file extension is supported for audio files
fn is_supported_audio_file(path: &Path) -> bool {
  if let Some(ext) = path.extension() {
    if let Some(ext_str) = ext.to_str() {
      let ext_lower = ext_str.to_lowercase();
      return SUPPORTED_EXTENSIONS.contains(&ext_lower.as_str());
    }
  }
  false
}

/// Recursively scan a directory for all supported audio files
pub fn scan_library_directory(dir_path: &str) -> Result<Vec<String>> {
  info!("Scanning library directory: {}", dir_path);

  let mut audio_files = Vec::new();

  for entry in WalkDir::new(dir_path)
    .follow_links(false)
    .into_iter()
    .filter_map(|e| e.ok())
  {
    let path = entry.path();

    if path.is_file() && is_supported_audio_file(path) {
      if let Some(path_str) = path.to_str() {
        audio_files.push(path_str.to_string());
      }
    }
  }

  info!("Found {} audio files in directory", audio_files.len());
  Ok(audio_files)
}

/// Check for changes in library paths compared to database
/// Detects new files and missing files
pub fn check_library_changes(db: &Database, library_paths: &[String]) -> Result<LibraryChanges> {
  info!("Checking library changes for {} paths", library_paths.len());

  // 1. Scan all library paths for audio files
  let mut files_in_filesystem = HashSet::new();
  for lib_path in library_paths {
    let files = scan_library_directory(lib_path)?;
    for file in files {
      // Normalize path (resolve to absolute, canonical if possible)
      let normalized = normalize_path(&file);
      files_in_filesystem.insert(normalized);
    }
  }

  info!(
    "Found {} total audio files in filesystem",
    files_in_filesystem.len()
  );

  // 2. Get all tracks from database
  let tracks_in_db = db.get_all_tracks()?;
  info!("Found {} tracks in database", tracks_in_db.len());

  // 3. Build map of database tracks by normalized path
  let mut db_tracks_map: HashMap<String, Track> = HashMap::new();
  for track in tracks_in_db {
    let normalized = normalize_path(&track.path);
    db_tracks_map.insert(normalized, track);
  }

  // 4. Find added files (in filesystem but not in DB)
  let mut added = Vec::new();
  for file_path in &files_in_filesystem {
    if !db_tracks_map.contains_key(file_path) {
      // Use the original case from filesystem
      added.push(file_path.clone());
    }
  }

  // 5. Find removed files (in DB but not in filesystem)
  let mut removed = Vec::new();
  for (normalized_path, track) in db_tracks_map {
    if !files_in_filesystem.contains(&normalized_path) {
      // Double-check that file really doesn't exist
      if !std::fs::metadata(&track.path).is_ok() {
        removed.push(RemovedTrack {
          id: track.id,
          path: track.path,
          title: track.title,
          artist: track.artist,
        });
      }
    }
  }

  info!(
    "Library changes: {} added, {} removed",
    added.len(),
    removed.len()
  );

  Ok(LibraryChanges { added, removed })
}

/// Normalize a file path for comparison
/// On Linux: case-sensitive, resolve to absolute path
/// On Windows/macOS: case-insensitive, lowercase
fn normalize_path(path: &str) -> String {
  let path_obj = Path::new(path);

  // Try to canonicalize (resolves symlinks, makes absolute)
  let canonical = path_obj
    .canonicalize()
    .unwrap_or_else(|_| path_obj.to_path_buf());

  // On Windows/macOS, convert to lowercase for case-insensitive comparison
  #[cfg(not(target_os = "linux"))]
  {
    canonical.to_string_lossy().to_lowercase()
  }

  // On Linux, keep original case
  #[cfg(target_os = "linux")]
  {
    canonical.to_string_lossy().to_string()
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_is_supported_audio_file() {
    assert!(is_supported_audio_file(Path::new("/path/to/song.mp3")));
    assert!(is_supported_audio_file(Path::new("/path/to/song.flac")));
    assert!(is_supported_audio_file(Path::new("/path/to/song.MP3"))); // Case insensitive

    assert!(!is_supported_audio_file(Path::new("/path/to/song.txt")));
    assert!(!is_supported_audio_file(Path::new("/path/to/README.md")));
  }

  #[test]
  fn test_normalize_path() {
    let path1 = normalize_path("/home/user/music/song.mp3");
    let path2 = normalize_path("/home/user/music/song.mp3");

    assert_eq!(path1, path2);
  }
}
