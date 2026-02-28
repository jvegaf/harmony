// AIDEV-NOTE: File system and cover art Tauri commands
// Provides commands for:
// - File operations (copy, move, delete)
// - Cover art extraction (from tags and directory)
// - Track file replacement workflow

use log::info;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

use crate::libs::{
  check_library_changes, copy_file, delete_file, fetch_cover, move_file, Database, LibraryChanges, Result, Track,
};

/// Response for batch delete operations
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
  pub succeeded: usize,
  pub failed: usize,
  pub errors: Vec<String>,
}

// ---------------------------------------------------------------------------
// File Operations Commands
// ---------------------------------------------------------------------------

/// Copy a file from source to destination
#[tauri::command]
pub async fn copy_track_file(src: String, dest: String) -> Result<()> {
  info!("Command: copy_track_file({}, {})", src, dest);
  copy_file(&src, &dest)
}

/// Move a file from source to destination
#[tauri::command]
pub async fn move_track_file(src: String, dest: String) -> Result<()> {
  info!("Command: move_track_file({}, {})", src, dest);
  move_file(&src, &dest)
}

/// Delete a single track file
#[tauri::command]
pub async fn delete_track_file(path: String) -> Result<()> {
  info!("Command: delete_track_file({})", path);
  delete_file(&path)
}

/// Delete multiple track files (batch operation)
#[tauri::command]
pub async fn delete_tracks_batch(paths: Vec<String>) -> Result<DeleteResult> {
  info!("Command: delete_tracks_batch({} files)", paths.len());

  let mut succeeded = 0;
  let mut failed = 0;
  let mut errors = Vec::new();

  for path in paths {
    match delete_file(&path) {
      Ok(_) => succeeded += 1,
      Err(e) => {
        failed += 1;
        errors.push(format!("{}: {}", path, e));
      }
    }
  }

  info!(
    "Batch delete complete: {} succeeded, {} failed",
    succeeded, failed
  );

  Ok(DeleteResult {
    succeeded,
    failed,
    errors,
  })
}

// ---------------------------------------------------------------------------
// Cover Art Commands
// ---------------------------------------------------------------------------

/// Get cover art for a track
/// Tries ID3 tags first, then searches directory for cover images
/// Returns base64 data URL
#[tauri::command]
pub async fn get_track_cover(path: String, ignore_tags: bool) -> Result<Option<String>> {
  info!("Command: get_track_cover({}, ignore_tags={})", path, ignore_tags);
  fetch_cover(&path, ignore_tags, true)
}

/// Get cover from file path (convert image file to base64)
#[tauri::command]
pub async fn get_cover_from_file(path: String) -> Result<String> {
  info!("Command: get_cover_from_file({})", path);
  crate::libs::cover::file_to_base64(&path)
}

// ---------------------------------------------------------------------------
// Track File Replacement Workflow
// ---------------------------------------------------------------------------

/// Replace a track's audio file with a new one
/// Workflow:
/// 1. Validate same extension
/// 2. Copy new file over old path
/// 3. Re-extract metadata from new file
/// 4. Update database with new metadata (preserve id, path, addedAt)
/// 5. Return updated track
#[tauri::command]
pub async fn replace_track_file(
  db: State<'_, Database>,
  track_id: String,
  track_path: String,
  new_file_path: String,
) -> Result<Track> {
  info!(
    "Command: replace_track_file(id={}, old={}, new={})",
    track_id, track_path, new_file_path
  );

  // 1. Validate same extension
  let old_ext = Path::new(&track_path)
    .extension()
    .and_then(|s| s.to_str())
    .unwrap_or("");
  let new_ext = Path::new(&new_file_path)
    .extension()
    .and_then(|s| s.to_str())
    .unwrap_or("");

  if old_ext.to_lowercase() != new_ext.to_lowercase() {
    return Err(crate::libs::HarmonyError::Custom(format!(
      "Extension mismatch: old={}, new={}. Only same extension replacement allowed.",
      old_ext, new_ext
    )));
  }

  // 2. Copy new file over old path (overwrites)
  copy_file(&new_file_path, &track_path)?;
  info!("File copied successfully");

  // 3. Re-extract metadata from new file
  let fresh_metadata = crate::libs::extract_metadata(&track_path)?;
  info!("Metadata re-extracted: duration={}ms", fresh_metadata.duration);

  // 4. Get original track to preserve addedAt
  let original_track = db
    .get_track_by_id(&track_id)?
    .ok_or_else(|| crate::libs::HarmonyError::Custom(format!("Track not found: {}", track_id)))?;

  // 5. Build updated track (preserve id, path, addedAt)
  let updated_track = Track {
    id: track_id.clone(),
    path: track_path,
    added_at: original_track.added_at, // Preserve original timestamp
    ..fresh_metadata
  };

  // 6. Update database
  db.update_track(&updated_track)?;
  info!("Database updated for track {}", track_id);

  Ok(updated_track)
}

// ---------------------------------------------------------------------------
// Library Change Detection
// ---------------------------------------------------------------------------

/// Check for changes in library paths
/// Detects new files added and tracks whose files no longer exist
#[tauri::command]
pub async fn check_library_changes_cmd(
  db: State<'_, Database>,
  library_paths: Vec<String>,
) -> Result<LibraryChanges> {
  info!(
    "Command: check_library_changes({} paths)",
    library_paths.len()
  );
  check_library_changes(&db, &library_paths)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_delete_result_serialization() {
    let result = DeleteResult {
      succeeded: 5,
      failed: 2,
      errors: vec!["file1: not found".to_string(), "file2: permission denied".to_string()],
    };

    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("succeeded"));
    assert!(json.contains("failed"));
  }
}
