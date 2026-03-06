// AIDEV-NOTE: Audio metadata extraction module
// Replaces music-metadata (Node.js) with lofty (Rust)
// Reads ID3 tags, Vorbis comments, MP4 atoms, etc.

use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::prelude::{Accessor, ItemKey};
use lofty::tag::{ItemValue, TagExt, TagItem};
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

    // AIDEV-NOTE: audio_bitrate() already returns kbps, no conversion needed
    let bitrate = properties
        .audio_bitrate()
        .or_else(|| properties.overall_bitrate())
        .map(|b| b as i32);

    // Comment
    let comment = tag.and_then(|t| t.comment()).map(|s| s.to_string());

    // BPM, initial key, label, URL, rating - these are in extended metadata
    // For lofty 0.21, we need to access items directly
    // AIDEV-NOTE: ID3v2 uses TBPM (IntegerBpm), other formats may use Bpm (decimal)
    let bpm = tag.and_then(|t| {
        t.items()
            .find(|item| matches!(item.key(), &ItemKey::IntegerBpm))
            .or_else(|| t.items().find(|item| matches!(item.key(), &ItemKey::Bpm)))
            .and_then(|item| item.value().text().and_then(|s| s.parse::<f64>().ok()))
            .map(|v| v.round() as i32)
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

    // AIDEV-NOTE: WOAF is a URL frame (W*** type), lofty stores it as ItemValue::Locator, not Text
    // AudioFileUrl maps to ID3v2.4 WOAF frame
    let url = tag.and_then(|t| {
        t.items()
            .find(|item| matches!(item.key(), &ItemKey::AudioFileUrl))
            .and_then(|item| {
                // URL frames are ItemValue::Locator, not Text
                item.value()
                    .locator()
                    .or_else(|| item.value().text())
                    .map(|s| s.to_string())
            })
    });

    // AIDEV-NOTE: POPM (Popularimeter) frame has binary structure:
    // - Email (null-terminated string)
    // - Rating (1 byte: 0-255)
    // - Counter (4+ bytes, optional)
    let rating = tag.and_then(|t| {
        t.items()
            .find(|item| matches!(item.key(), &ItemKey::Popularimeter))
            .and_then(|item| {
                // POPM is stored as binary data, not text
                item.value().binary().and_then(|data| {
                    // Find null terminator (end of email)
                    let null_pos = data.iter().position(|&b| b == 0)?;
                    // Rating byte is right after null terminator
                    if data.len() > null_pos + 1 {
                        Some(data[null_pos + 1])
                    } else {
                        None
                    }
                })
            })
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
    let tag = tagged_file.primary_tag_mut().ok_or_else(|| {
        HarmonyError::Custom(format!("No writable tag found in file: {}", file_path))
    })?;

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
    // AIDEV-NOTE: Use IntegerBpm for ID3v2 compatibility (TBPM frame)
    if let Some(bpm) = track.bpm {
        tag.insert_text(ItemKey::IntegerBpm, bpm.to_string());
    }

    if let Some(key) = &track.initial_key {
        tag.insert_text(ItemKey::InitialKey, key.clone());
    }

    if let Some(label) = &track.label {
        tag.insert_text(ItemKey::Label, label.clone());
    }

    // AIDEV-NOTE: WOAF is a URL frame - must use ItemValue::Locator, not Text
    // insert_text creates ItemValue::Text which maps to T-type frames
    // URL frames (W*** type) require ItemValue::Locator
    if let Some(url) = &track.url {
        tag.remove_key(&ItemKey::AudioFileUrl);
        tag.push_unchecked(TagItem::new(
            ItemKey::AudioFileUrl,
            ItemValue::Locator(url.clone()),
        ));
    }

    // AIDEV-NOTE: Set rating as POPM binary frame structure:
    // - Email (null-terminated, use empty string for compatibility)
    // - Rating byte (0-255)
    // - Counter (optional, omitted here)
    if let Some(rating) = &track.rating {
        let popm_value = ((rating.rating as f64 / 5.0) * 255.0).round() as u8;
        // Create POPM binary data: empty email + null + rating byte
        let mut popm_data = vec![0u8]; // Empty email with null terminator
        popm_data.push(popm_value); // Rating byte

        // Remove existing Popularimeter items first
        tag.remove_key(&ItemKey::Popularimeter);
        // Insert new POPM item
        tag.push_unchecked(TagItem::new(
            ItemKey::Popularimeter,
            ItemValue::Binary(popm_data),
        ));
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

    #[test]
    fn test_extract_metadata_reads_woaf_url() {
        // Test that WOAF (Official Audio File URL) is correctly read from ID3v2 tags
        let test_file = "testdata/sample.mp3";
        let track = extract_metadata(test_file).expect("Failed to extract metadata");

        // Verify WOAF URL is read correctly
        assert_eq!(
            track.url,
            Some("https://www.beatport.com/track/cant-stop/23100405".to_string()),
            "WOAF tag should be read as track.url"
        );

        // Also verify other basic fields to ensure extraction works
        assert!(!track.title.is_empty(), "Title should be present");
        assert!(track.duration > 0, "Duration should be positive");
    }

    #[test]
    fn test_extract_metadata_basic_fields() {
        // Test that all basic metadata fields are correctly extracted
        let test_file = "testdata/sample.mp3";
        let track = extract_metadata(test_file).expect("Failed to extract metadata");

        // Basic text fields
        assert!(!track.title.is_empty(), "Title should be present");
        assert!(track.artist.is_some(), "Artist should be present");
        assert!(track.album.is_some(), "Album should be present");
        assert!(track.genre.is_some(), "Genre should be present");

        // Extended metadata
        assert!(track.bpm.is_some(), "BPM should be present");
        assert_eq!(track.bpm, Some(127), "BPM should be 127");
        assert!(track.initial_key.is_some(), "Initial key should be present");
        assert_eq!(
            track.initial_key,
            Some("11d".to_string()),
            "Initial key should be 11d"
        );

        // Audio properties
        assert!(track.duration > 0, "Duration should be positive");
        assert!(track.bitrate.is_some(), "Bitrate should be present");

        // WOAF URL
        assert!(track.url.is_some(), "URL (WOAF) should be present");
        assert!(
            track
                .url
                .as_ref()
                .unwrap()
                .contains("beatport.com/track/cant-stop"),
            "URL should point to Beatport track"
        );
    }

    #[test]
    fn test_write_and_read_url_roundtrip() {
        use std::fs;

        // Create a temp copy of the test file
        let test_file = "testdata/sample.mp3";
        let temp_file = "testdata/sample_temp.mp3";

        // Copy test file to temp
        fs::copy(test_file, temp_file).expect("Failed to copy test file");

        // Read original metadata
        let mut track = extract_metadata(temp_file).expect("Failed to extract metadata");

        // Modify URL
        let new_url = "https://example.com/test-track-12345";
        track.url = Some(new_url.to_string());

        // Write metadata back
        write_metadata(temp_file, &track).expect("Failed to write metadata");

        // Read again and verify URL roundtrip
        let track_after =
            extract_metadata(temp_file).expect("Failed to extract metadata after write");

        assert_eq!(
            track_after.url,
            Some(new_url.to_string()),
            "URL should roundtrip correctly through write/read cycle"
        );

        // Verify other fields are preserved
        assert_eq!(track_after.title, track.title, "Title should be preserved");
        assert_eq!(
            track_after.artist, track.artist,
            "Artist should be preserved"
        );
        assert_eq!(track_after.bpm, track.bpm, "BPM should be preserved");

        // Clean up temp file
        fs::remove_file(temp_file).expect("Failed to remove temp file");
    }
}
