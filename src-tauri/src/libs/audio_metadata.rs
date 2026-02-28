// AIDEV-NOTE: Audio metadata extraction module
// Replaces music-metadata (Node.js) with lofty (Rust)
// Reads ID3 tags, Vorbis comments, MP4 atoms, etc.

use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::prelude::{Accessor, ItemKey};
use lofty::tag::TagExt;
use log::info;
use std::path::Path;

use crate::libs::{HarmonyError, Result, Track, TrackRating};

/// Supported audio file extensions
pub const SUPPORTED_EXTENSIONS: &[&str] = &[
  // MP3 / MP4
  "mp3", "mp4", "aac", "m4a", "3gp", "wav", // Opus
  "ogg", "ogv", "ogm", "opus", // FLAC
  "flac", // Web media
  "webm",
];

/// Check if a file extension is supported
pub fn is_supported_extension(path: &str) -> bool {
  if let Some(ext) = Path::new(path).extension() {
    if let Some(ext_str) = ext.to_str() {
      return SUPPORTED_EXTENSIONS.contains(&ext_str.to_lowercase().as_str());
    }
  }
  false
}

/// Extract audio metadata from a file
pub fn extract_metadata(file_path: &str) -> Result<Track> {
  info!("Extracting metadata from: {}", file_path);

  // Parse audio file with lofty
  let tagged_file = lofty::read_from_path(file_path)?;

  // Get the primary tag
  let tag = tagged_file
    .primary_tag()
    .or_else(|| tagged_file.first_tag());

  // Get audio properties (duration, bitrate, sample rate, etc.)
  let properties = tagged_file.properties();

  // Extract basic metadata
  let title = tag
    .and_then(|t| t.title())
    .map(|s| s.to_string())
    .unwrap_or_else(|| {
      // Use filename without extension as fallback
      Path::new(file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string()
    });

  let artist = tag.and_then(|t| t.artist()).map(|s| s.to_string());

  let album = tag.and_then(|t| t.album()).map(|s| s.to_string());

  let genre = tag.and_then(|t| t.genre()).map(|s| s.to_string());

  let year = tag.and_then(|t| t.year()).map(|y| y as i32);

  // Duration in seconds from lofty, convert to milliseconds for Track
  let duration_seconds = properties.duration().as_secs_f64();
  let duration_ms = (duration_seconds * 1000.0) as i64;

  // Bitrate in kbps
  let bitrate = properties
    .audio_bitrate()
    .or_else(|| properties.overall_bitrate())
    .map(|b| (b / 1000) as i32);

  // Comment
  let comment = tag.and_then(|t| t.comment()).map(|s| s.to_string());

  // BPM, initial key, label, URL, rating - these are in extended metadata
  // For lofty 0.21, we need to access items directly
  let bpm = tag.and_then(|t| {
    t.items()
      .find(|item| matches!(item.key(), &ItemKey::Bpm))
      .and_then(|item| item.value().text().and_then(|s| s.parse::<i32>().ok()))
  });

  let initial_key = tag.and_then(|t| {
    t.items()
      .find(|item| matches!(item.key(), &ItemKey::InitialKey))
      .and_then(|item| item.value().text().map(|s| s.to_string()))
  });

  let label = tag.and_then(|t| {
    t.items()
      .find(|item| matches!(item.key(), &ItemKey::Label))
      .and_then(|item| item.value().text().map(|s| s.to_string()))
  });

  // AIDEV-NOTE: URL field - lofty doesn't have a generic Url key
  // Using AudioFileUrl as the most appropriate variant for DJ music files
  let url = tag.and_then(|t| {
    t.items()
      .find(|item| matches!(item.key(), &ItemKey::AudioFileUrl))
      .and_then(|item| item.value().text().map(|s| s.to_string()))
  });

  // Rating - try POPM (Popularimeter) for MP3
  let rating = tag.and_then(|t| {
    t.items()
      .find(|item| matches!(item.key(), &ItemKey::Popularimeter))
      .and_then(|item| item.value().text().and_then(|s| s.parse::<i32>().ok()))
      .map(|rating_value| {
        // Convert POPM (0-255) to 0-5 scale
        let normalized = (rating_value as f64 / 255.0 * 5.0).round() as i32;
        TrackRating {
          rating: normalized.clamp(0, 5),
          source: Some("file".to_string()),
        }
      })
  });

  // Generate track ID from path
  let track_id = Track::generate_id(file_path);

  let track = Track {
    id: track_id,
    path: file_path.to_string(),
    title,
    artist,
    album,
    genre,
    year,
    duration: duration_ms,
    bitrate,
    comment,
    bpm,
    initial_key,
    rating,
    label,
    waveform_peaks: None,
    added_at: Some(chrono::Utc::now().timestamp_millis()),
    url,
  };

  info!(
    "Extracted metadata: {} - {} ({}s)",
    track.artist.as_deref().unwrap_or("Unknown"),
    track.title,
    duration_seconds
  );

  Ok(track)
}

/// Write metadata back to audio file
pub fn write_metadata(file_path: &str, track: &Track) -> Result<()> {
  info!("Writing metadata to: {}", file_path);

  let mut tagged_file = lofty::read_from_path(file_path)?;

  // Get the primary tag (or error if none exists)
  let tag = tagged_file
    .primary_tag_mut()
    .ok_or_else(|| HarmonyError::Custom(format!("No writable tag found in file: {}", file_path)))?;

  // Set basic metadata
  tag.set_title(track.title.clone());

  if let Some(artist) = &track.artist {
    tag.set_artist(artist.clone());
  }

  if let Some(album) = &track.album {
    tag.set_album(album.clone());
  }

  if let Some(genre) = &track.genre {
    tag.set_genre(genre.clone());
  }

  if let Some(year) = track.year {
    tag.set_year(year as u32);
  }

  if let Some(comment) = &track.comment {
    tag.set_comment(comment.clone());
  }

  // Set extended metadata
  if let Some(bpm) = track.bpm {
    tag.insert_text(ItemKey::Bpm, bpm.to_string());
  }

  if let Some(key) = &track.initial_key {
    tag.insert_text(ItemKey::InitialKey, key.clone());
  }

  if let Some(label) = &track.label {
    tag.insert_text(ItemKey::Label, label.clone());
  }

  if let Some(url) = &track.url {
    tag.insert_text(ItemKey::AudioFileUrl, url.clone());
  }

  // Set rating (convert 0-5 to 0-255 for POPM)
  if let Some(rating) = &track.rating {
    let popm_value = ((rating.rating as f64 / 5.0) * 255.0).round() as i32;
    tag.insert_text(ItemKey::Popularimeter, popm_value.to_string());
  }

  // Save changes to file with default write options
  tag.save_to_path(file_path, WriteOptions::default())?;

  info!("Metadata written successfully to: {}", file_path);

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_supported_extension() {
    assert!(is_supported_extension("/path/to/song.mp3"));
    assert!(is_supported_extension("/path/to/song.MP3"));
    assert!(is_supported_extension("/path/to/song.flac"));
    assert!(!is_supported_extension("/path/to/song.txt"));
    assert!(!is_supported_extension("/path/to/song"));
  }
}
