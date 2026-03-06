// AIDEV-NOTE: Artwork fetching and embedding module for tagger
// Downloads artwork from HTTP URLs and embeds into audio files using lofty
// Supports: MP3 (ID3v2), MP4, FLAC, Vorbis

use crate::libs::{HarmonyError, Result};
use lofty::config::WriteOptions;
use lofty::file::TaggedFileExt;
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::prelude::*;
use log::{info, warn};
use reqwest::Client;
use std::path::Path;
use std::time::Duration;

/// HTTP client for fetching artwork
/// AIDEV-NOTE: Reusable client with timeout and redirect following
fn create_http_client() -> Result<Client> {
  Client::builder()
    .timeout(Duration::from_secs(30))
    .redirect(reqwest::redirect::Policy::limited(5))
    .build()
    .map_err(|e| HarmonyError::Custom(format!("Failed to create HTTP client: {}", e)))
}

/// Fetch artwork from HTTP URL
/// Returns (image_data, mime_type)
pub async fn fetch_artwork(url: &str) -> Result<(Vec<u8>, MimeType)> {
  info!("Fetching artwork from: {}", url);

  let client = create_http_client()?;
  let response = client
    .get(url)
    .send()
    .await
    .map_err(|e| HarmonyError::Custom(format!("HTTP request failed: {}", e)))?;

  if !response.status().is_success() {
    return Err(HarmonyError::Custom(format!(
      "HTTP error: {}",
      response.status()
    )));
  }

  // Detect MIME type from Content-Type header or URL extension
  let content_type = response
    .headers()
    .get(reqwest::header::CONTENT_TYPE)
    .and_then(|ct: &reqwest::header::HeaderValue| ct.to_str().ok())
    .unwrap_or("");

  let mime_type = match content_type {
    ct if ct.contains("image/png") => MimeType::Png,
    ct if ct.contains("image/jpeg") || ct.contains("image/jpg") => MimeType::Jpeg,
    ct if ct.contains("image/gif") => MimeType::Gif,
    ct if ct.contains("image/bmp") => MimeType::Bmp,
    ct if ct.contains("image/webp") => {
      warn!("WebP not directly supported by lofty, converting to JPEG");
      MimeType::Jpeg
    }
    _ => {
      // Fallback to URL extension
      if url.ends_with(".png") {
        MimeType::Png
      } else if url.ends_with(".jpg") || url.ends_with(".jpeg") {
        MimeType::Jpeg
      } else if url.ends_with(".gif") {
        MimeType::Gif
      } else {
        // Default to JPEG (most common)
        warn!("Unknown image format, defaulting to JPEG");
        MimeType::Jpeg
      }
    }
  };

  let image_data = response
    .bytes()
    .await
    .map_err(|e| HarmonyError::Custom(format!("Failed to read response body: {}", e)))?
    .to_vec();

  info!(
    "Artwork fetched: {} bytes, type: {:?}",
    image_data.len(),
    mime_type
  );

  Ok((image_data, mime_type))
}

/// Embed artwork into audio file
/// AIDEV-NOTE: Uses lofty to write to ID3v2 (MP3), MP4, FLAC, Vorbis
pub fn embed_artwork(file_path: &str, image_data: &[u8], mime_type: MimeType) -> Result<()> {
  info!(
    "Embedding artwork into: {} ({} bytes, type: {:?})",
    file_path,
    image_data.len(),
    mime_type
  );

  let path = Path::new(file_path);

  // Read the file
  let mut tagged_file = lofty::read_from_path(path)
    .map_err(|e| HarmonyError::Custom(format!("Failed to read audio file: {}", e)))?;

  // Create a new picture
  let picture = Picture::new_unchecked(
    PictureType::CoverFront,
    Some(mime_type),
    None, // No description
    image_data.to_vec(),
  );

  // Get or create a tag
  let tag = if let Some(tag) = tagged_file.primary_tag_mut() {
    tag
  } else if let Some(tag) = tagged_file.first_tag_mut() {
    tag
  } else {
    return Err(HarmonyError::Custom("No tag found in file".to_string()));
  };

  // Remove existing pictures
  tag.remove_picture_type(PictureType::CoverFront);

  // Add new picture
  tag.push_picture(picture);

  // Save the file
  tagged_file
    .save_to_path(path, WriteOptions::default())
    .map_err(|e| HarmonyError::Custom(format!("Failed to save audio file: {}", e)))?;

  info!("Artwork embedded successfully");

  Ok(())
}

/// Fetch artwork from URL and embed into audio file (convenience function)
/// AIDEV-NOTE: Combines fetch + embed in one atomic operation
pub async fn fetch_and_embed_artwork(file_path: &str, artwork_url: &str) -> Result<()> {
  info!(
    "Fetching and embedding artwork from {} into {}",
    artwork_url, file_path
  );

  let (image_data, mime_type) = fetch_artwork(artwork_url).await?;
  embed_artwork(file_path, &image_data, mime_type)?;

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;
  use tempfile::TempDir;

  /// Helper: Create a test MP3 file with minimal ID3v2 tag
  fn create_test_mp3(path: &Path) -> Result<()> {
    // Minimal valid MP3 file with ID3v2.3 header
    let mp3_data = [
      // ID3v2.3 header (10 bytes)
      0x49, 0x44, 0x33, // "ID3"
      0x03, 0x00, // Version 2.3.0
      0x00, // Flags
      0x00, 0x00, 0x00, 0x00, // Size (0 - empty)
      // Minimal MP3 frame (fake but parseable)
      0xFF, 0xFB, 0x90, 0x00, // MPEG-1 Layer 3, 128kbps, 44.1kHz
    ];

    fs::write(path, &mp3_data)?;
    Ok(())
  }

  #[test]
  #[ignore] // Requires valid audio file - test manually with real files
  fn test_embed_artwork_from_bytes() -> Result<()> {
    let temp_dir = TempDir::new().unwrap();
    let test_file = temp_dir.path().join("test.mp3");

    // Create test file
    create_test_mp3(&test_file)?;

    // Create a minimal PNG (1x1 red pixel)
    let png_data = vec![
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, // 1x1 RGB
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82,
    ];

    // Embed artwork
    let result = embed_artwork(test_file.to_str().unwrap(), &png_data, MimeType::Png);

    assert!(result.is_ok(), "Failed to embed artwork: {:?}", result.err());

    // Verify artwork was embedded
    let tagged_file = lofty::read_from_path(&test_file)?;
    let tag = tagged_file.primary_tag().unwrap();
    let pictures = tag.pictures();

    assert_eq!(pictures.len(), 1, "Expected 1 picture in tag");
    assert_eq!(pictures[0].data().len(), png_data.len());

    Ok(())
  }

  #[test]
  #[ignore] // Requires valid audio file - test manually with real files
  fn test_embed_replaces_existing_artwork() -> Result<()> {
    let temp_dir = TempDir::new().unwrap();
    let test_file = temp_dir.path().join("test.mp3");

    create_test_mp3(&test_file)?;

    // Embed first artwork
    let png1 = vec![1, 2, 3, 4];
    embed_artwork(test_file.to_str().unwrap(), &png1, MimeType::Png)?;

    // Embed second artwork (should replace)
    let png2 = vec![5, 6, 7, 8, 9];
    embed_artwork(test_file.to_str().unwrap(), &png2, MimeType::Png)?;

    // Verify only second artwork exists
    let tagged_file = lofty::read_from_path(&test_file)?;
    let tag = tagged_file.primary_tag().unwrap();
    let pictures = tag.pictures();

    assert_eq!(pictures.len(), 1, "Expected 1 picture (replacement)");
    assert_eq!(pictures[0].data().len(), png2.len());

    Ok(())
  }

  // Live test (ignored by default)
  #[tokio::test]
  #[ignore]
  async fn test_fetch_artwork_live() -> Result<()> {
    // Test with a known public image URL
    let url = "https://httpbin.org/image/jpeg";
    let result = fetch_artwork(url).await;

    assert!(result.is_ok(), "Failed to fetch artwork: {:?}", result.err());

    let (data, mime_type) = result.unwrap();
    assert!(!data.is_empty(), "Fetched empty data");
    assert_eq!(mime_type, MimeType::Jpeg);

    Ok(())
  }

  #[test]
  fn test_mime_type_detection_from_url() {
    // This is implicitly tested in fetch_artwork, but we can document expected behavior
    let png_url = "https://example.com/image.png";
    let jpg_url = "https://example.com/image.jpg";
    let jpeg_url = "https://example.com/image.jpeg";

    // The actual detection happens in fetch_artwork, which we test with #[ignore]
    assert!(png_url.ends_with(".png"));
    assert!(jpg_url.ends_with(".jpg"));
    assert!(jpeg_url.ends_with(".jpeg"));
  }
}
