// AIDEV-NOTE: File system operations module
// Provides safe file operations: copy, move, delete
// Used for track file management and library operations

use log::{info, warn};
use std::fs;
use std::path::{Path, PathBuf};

use crate::libs::Result;

/// Copy a file from source to destination
/// Creates parent directories if they don't exist
pub fn copy_file(src: &str, dest: &str) -> Result<()> {
  info!("Copying file: {} -> {}", src, dest);

  let src_path = Path::new(src);
  let dest_path = Path::new(dest);

  // Ensure source exists
  if !src_path.exists() {
    return Err(crate::libs::error::HarmonyError::Custom(format!(
      "Source file does not exist: {}",
      src
    )));
  }

  // Create parent directory if it doesn't exist
  if let Some(parent) = dest_path.parent() {
    if !parent.exists() {
      fs::create_dir_all(parent)?;
      info!("Created parent directory: {}", parent.display());
    }
  }

  // Copy the file
  fs::copy(src_path, dest_path)?;

  info!("File copied successfully");
  Ok(())
}

/// Move a file from source to destination
/// Attempts to use rename (fast), falls back to copy+delete if on different filesystem
pub fn move_file(src: &str, dest: &str) -> Result<()> {
  info!("Moving file: {} -> {}", src, dest);

  let src_path = Path::new(src);
  let dest_path = Path::new(dest);

  // Ensure source exists
  if !src_path.exists() {
    return Err(crate::libs::error::HarmonyError::Custom(format!(
      "Source file does not exist: {}",
      src
    )));
  }

  // Create parent directory if it doesn't exist
  if let Some(parent) = dest_path.parent() {
    if !parent.exists() {
      fs::create_dir_all(parent)?;
      info!("Created parent directory: {}", parent.display());
    }
  }

  // Try rename first (fast, atomic if on same filesystem)
  match fs::rename(src_path, dest_path) {
    Ok(_) => {
      info!("File moved successfully (rename)");
      Ok(())
    }
    Err(_) => {
      // Rename failed (probably different filesystem), fallback to copy+delete
      warn!("Rename failed, falling back to copy+delete");
      fs::copy(src_path, dest_path)?;
      fs::remove_file(src_path)?;
      info!("File moved successfully (copy+delete)");
      Ok(())
    }
  }
}

/// Delete a file
/// Returns error if file doesn't exist or deletion fails
pub fn delete_file(path: &str) -> Result<()> {
  info!("Deleting file: {}", path);

  let file_path = Path::new(path);

  // Check if file exists
  if !file_path.exists() {
    return Err(crate::libs::error::HarmonyError::Custom(format!(
      "File does not exist: {}",
      path
    )));
  }

  // Delete the file
  fs::remove_file(file_path)?;

  info!("File deleted successfully");
  Ok(())
}

/// Get file size in bytes
#[allow(dead_code)]
pub fn get_file_size(path: &str) -> Result<u64> {
  let metadata = fs::metadata(path)?;
  Ok(metadata.len())
}

/// Check if a file exists
#[allow(dead_code)]
pub fn file_exists(path: &str) -> bool {
  Path::new(path).exists()
}

/// Get the parent directory of a file path
#[allow(dead_code)]
pub fn get_parent_dir(path: &str) -> Option<PathBuf> {
  Path::new(path).parent().map(|p| p.to_path_buf())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs::File;
  use std::io::Write;
  use tempfile::tempdir;

  #[test]
  fn test_copy_file() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("source.txt");
    let dest = dir.path().join("dest.txt");

    // Create source file
    let mut file = File::create(&src).unwrap();
    file.write_all(b"test content").unwrap();

    // Copy file
    copy_file(src.to_str().unwrap(), dest.to_str().unwrap()).unwrap();

    // Verify destination exists
    assert!(dest.exists());
    assert_eq!(fs::read_to_string(dest).unwrap(), "test content");
  }

  #[test]
  fn test_move_file() {
    let dir = tempdir().unwrap();
    let src = dir.path().join("source.txt");
    let dest = dir.path().join("moved.txt");

    // Create source file
    let mut file = File::create(&src).unwrap();
    file.write_all(b"test content").unwrap();

    // Move file
    move_file(src.to_str().unwrap(), dest.to_str().unwrap()).unwrap();

    // Verify source no longer exists and destination does
    assert!(!src.exists());
    assert!(dest.exists());
    assert_eq!(fs::read_to_string(dest).unwrap(), "test content");
  }

  #[test]
  fn test_delete_file() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("delete_me.txt");

    // Create file
    File::create(&file_path).unwrap();
    assert!(file_path.exists());

    // Delete file
    delete_file(file_path.to_str().unwrap()).unwrap();

    // Verify file no longer exists
    assert!(!file_path.exists());
  }

  #[test]
  fn test_file_exists() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("exists.txt");

    assert!(!file_exists(file_path.to_str().unwrap()));

    File::create(&file_path).unwrap();

    assert!(file_exists(file_path.to_str().unwrap()));
  }
}
