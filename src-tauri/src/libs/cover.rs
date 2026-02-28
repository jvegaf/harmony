// AIDEV-NOTE: Cover art extraction and caching module
// Extracts album art from audio file ID3 tags or folder images
// Supports: ID3v2 (MP3), MP4 atoms, Vorbis comments, FLAC
// Fallback: Searches for cover.jpg, folder.png, etc. in track directory

use base64::{engine::general_purpose, Engine as _};
use lofty::file::TaggedFileExt;
use log::info;
use std::path::{Path, PathBuf};

use crate::libs::Result;

/// Supported cover file extensions
const COVER_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "bmp", "gif", "webp"];

/// Common cover file names (case-insensitive)
const COVER_NAMES: &[&str] = &["album", "albumart", "folder", "cover", "front"];

/// Cover art data with format information
#[derive(Debug, Clone)]
pub struct CoverArt {
  pub data: Vec<u8>,
  pub mime_type: String,
  #[allow(dead_code)]
  pub description: Option<String>,
}

impl CoverArt {
  /// Convert cover art to base64 data URL
  pub fn to_base64_data_url(&self) -> String {
    let base64_data = general_purpose::STANDARD.encode(&self.data);
    format!("data:{};base64,{}", self.mime_type, base64_data)
  }

  /// Get file extension from MIME type
  #[allow(dead_code)]
  pub fn get_extension(&self) -> &str {
    match self.mime_type.as_str() {
      "image/png" => "png",
      "image/jpeg" => "jpg",
      "image/bmp" => "bmp",
      "image/gif" => "gif",
      "image/webp" => "webp",
      _ => "jpg", // Default fallback
    }
  }
}

/// Extract cover art from audio file ID3 tags
/// Returns the first embedded picture found
pub fn extract_cover_from_tags(file_path: &str) -> Result<Option<CoverArt>> {
  info!("Extracting cover from tags: {}", file_path);

  let tagged_file = lofty::read_from_path(file_path)?;

  // Try to get the primary tag
  let tag = tagged_file
    .primary_tag()
    .or_else(|| tagged_file.first_tag());

  if let Some(tag) = tag {
    // Get the first picture from the tag
    if let Some(picture) = tag.pictures().first() {
      // Convert MimeType to string
      let mime_type_str = picture
        .mime_type()
        .map(|mt| mt.as_str().to_string())
        .unwrap_or_else(|| "image/jpeg".to_string());

      let cover = CoverArt {
        data: picture.data().to_vec(),
        mime_type: mime_type_str,
        description: picture.description().map(|s| s.to_string()),
      };

      info!(
        "Cover found in tags: {} bytes, type: {}",
        cover.data.len(),
        cover.mime_type
      );

      return Ok(Some(cover));
    }
  }

  info!("No cover found in tags");
  Ok(None)
}

/// Search for cover image files in the directory containing the audio file
/// Looks for common names: cover.jpg, folder.png, albumart.jpg, etc.
pub fn find_cover_in_directory(file_path: &str) -> Result<Option<PathBuf>> {
  let file_path = Path::new(file_path);

  let dir = file_path.parent().ok_or_else(|| {
    crate::libs::error::HarmonyError::Custom("File has no parent directory".to_string())
  })?;

  info!("Searching for cover in directory: {}", dir.display());

  // Read directory entries
  let entries = std::fs::read_dir(dir)?;

  for entry in entries {
    let entry = entry?;
    let path = entry.path();

    if !path.is_file() {
      continue;
    }

    // Check if it's a valid cover file
    if is_valid_cover_file(&path) {
      info!("Cover found in directory: {}", path.display());
      return Ok(Some(path));
    }
  }

  info!("No cover found in directory");
  Ok(None)
}

/// Check if a file is a valid cover image based on name and extension
fn is_valid_cover_file(path: &Path) -> bool {
  // Check extension
  let extension_valid = path
    .extension()
    .and_then(|ext| ext.to_str())
    .map(|ext| COVER_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
    .unwrap_or(false);

  if !extension_valid {
    return false;
  }

  // Check filename
  let name_valid = path
    .file_stem()
    .and_then(|stem| stem.to_str())
    .map(|name| {
      let name_lower = name.to_lowercase();
      COVER_NAMES
        .iter()
        .any(|cover_name| name_lower.contains(cover_name))
    })
    .unwrap_or(false);

  name_valid
}

/// Smart cover fetch: tries ID3 tags first, then falls back to directory search
/// Returns base64 data URL if base64=true, otherwise returns file:// URL for directory covers
pub fn fetch_cover(file_path: &str, ignore_tags: bool, as_base64: bool) -> Result<Option<String>> {
  info!(
    "Fetching cover for: {} (ignore_tags={}, as_base64={})",
    file_path, ignore_tags, as_base64
  );

  // Try ID3 tags first (unless ignored)
  if !ignore_tags {
    if let Some(cover) = extract_cover_from_tags(file_path)? {
      return Ok(Some(cover.to_base64_data_url()));
    }
  }

  // Fallback to directory search
  if let Some(cover_path) = find_cover_in_directory(file_path)? {
    if as_base64 {
      // Read file and convert to base64
      let data = std::fs::read(&cover_path)?;
      let mime_type = mime_guess::from_path(&cover_path)
        .first_or_octet_stream()
        .to_string();
      let base64_data = general_purpose::STANDARD.encode(&data);
      return Ok(Some(format!("data:{};base64,{}", mime_type, base64_data)));
    } else {
      // Return file:// URL
      return Ok(Some(format!("file://{}", cover_path.display())));
    }
  }

  Ok(None)
}

/// Read an image file and return as base64 data URL
pub fn file_to_base64(file_path: &str) -> Result<String> {
  info!("Converting file to base64: {}", file_path);

  let data = std::fs::read(file_path)?;
  let mime_type = mime_guess::from_path(file_path)
    .first_or_octet_stream()
    .to_string();
  let base64_data = general_purpose::STANDARD.encode(&data);

  Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_is_valid_cover_file() {
    assert!(is_valid_cover_file(Path::new("/path/to/cover.jpg")));
    assert!(is_valid_cover_file(Path::new("/path/to/folder.png")));
    assert!(is_valid_cover_file(Path::new("/path/to/albumart.jpeg")));
    assert!(is_valid_cover_file(Path::new("/path/to/front.bmp")));
    assert!(is_valid_cover_file(Path::new("/path/to/Album.PNG"))); // Case insensitive

    assert!(!is_valid_cover_file(Path::new("/path/to/song.mp3")));
    assert!(!is_valid_cover_file(Path::new("/path/to/random.jpg")));
    assert!(!is_valid_cover_file(Path::new("/path/to/cover.txt")));
  }

  #[test]
  fn test_cover_art_base64_conversion() {
    let cover = CoverArt {
      data: vec![0x89, 0x50, 0x4E, 0x47], // PNG header
      mime_type: "image/png".to_string(),
      description: Some("Test cover".to_string()),
    };

    let data_url = cover.to_base64_data_url();
    assert!(data_url.starts_with("data:image/png;base64,"));
  }

  #[test]
  fn test_get_extension_from_mime() {
    let cover = CoverArt {
      data: vec![],
      mime_type: "image/jpeg".to_string(),
      description: None,
    };

    assert_eq!(cover.get_extension(), "jpg");

    let cover_png = CoverArt {
      data: vec![],
      mime_type: "image/png".to_string(),
      description: None,
    };

    assert_eq!(cover_png.get_extension(), "png");
  }
}
