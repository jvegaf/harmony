// AIDEV-NOTE: Core types for the tagger system
// Matches TypeScript types in src/types/tagger.ts for seamless IPC

use serde::{Deserialize, Serialize};

/// Provider source identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderSource {
  Beatport,
  Traxsource,
  Bandcamp,
}

impl ProviderSource {
  /// Convert to string identifier
  pub fn as_str(&self) -> &'static str {
    match self {
      ProviderSource::Beatport => "beatport",
      ProviderSource::Traxsource => "traxsource",
      ProviderSource::Bandcamp => "bandcamp",
    }
  }
}

/// Raw track data from a provider search result
/// AIDEV-NOTE: Matches old-electron RawTrackData interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawTrackData {
  /// Provider-specific track ID
  pub id: String,
  /// Track title
  pub title: String,
  /// Mix name/version (e.g., "Original Mix", "Extended Mix")
  pub mix_name: Option<String>,
  /// Artist names (can be multiple, space/comma separated)
  pub artists: Vec<String>,
  /// BPM value
  pub bpm: Option<f64>,
  /// Musical key (e.g., "Am", "8A", "G#min")
  pub key: Option<String>,
  /// Duration in seconds
  pub duration_secs: Option<u32>,
  /// URL to cover artwork image
  pub artwork_url: Option<String>,
  /// Genre/style
  pub genre: Option<String>,
  /// Record label
  pub label: Option<String>,
  /// Release date (ISO format: YYYY-MM-DD)
  pub release_date: Option<String>,
}

/// Track candidate with similarity score
/// AIDEV-NOTE: Matches TypeScript TrackCandidate type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackCandidate {
  /// Provider source
  pub source: ProviderSource,
  /// Provider-specific ID
  pub id: String,
  /// Track title
  pub title: String,
  /// Combined artist names (joined string)
  pub artists: String,
  /// Album name
  pub album: Option<String>,
  /// BPM
  pub bpm: Option<f64>,
  /// Musical key
  pub key: Option<String>,
  /// Genre
  pub genre: Option<String>,
  /// Record label
  pub label: Option<String>,
  /// Track URL on provider's website
  pub url: Option<String>,
  /// Artwork URL
  pub artwork_url: Option<String>,
  /// Mix name
  pub mix_name: Option<String>,
  /// Duration in seconds
  pub duration_secs: Option<u32>,
  /// Release date
  pub release_date: Option<String>,
  /// Similarity score (0.0 to 1.0)
  pub similarity_score: f64,
}

impl TrackCandidate {
  /// Create from RawTrackData with similarity score
  pub fn from_raw(source: ProviderSource, raw: RawTrackData, similarity_score: f64) -> Self {
    Self {
      source,
      id: raw.id,
      title: raw.title,
      artists: raw.artists.join(", "),
      album: None,
      bpm: raw.bpm,
      key: raw.key,
      genre: raw.genre,
      label: raw.label,
      url: None,
      artwork_url: raw.artwork_url,
      mix_name: raw.mix_name,
      duration_secs: raw.duration_secs,
      release_date: raw.release_date,
      similarity_score,
    }
  }
}

/// Search query for providers
#[derive(Debug, Clone)]
pub struct SearchQuery {
  pub title: String,
  pub artist: String,
}

/// Result from searching all providers for a single track
/// AIDEV-NOTE: Matches TypeScript TrackCandidatesResult
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackCandidatesResult {
  /// Local track ID in Harmony database
  pub local_track_id: String,
  /// Local track title
  pub local_title: String,
  /// Local track artist
  pub local_artist: String,
  /// Local track duration in seconds
  pub local_duration: Option<u32>,
  /// Local track filename
  pub local_filename: Option<String>,
  /// Error message if search failed
  pub error: Option<String>,
  /// List of candidates from providers (sorted by similarity)
  pub candidates: Vec<TrackCandidate>,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_provider_source_as_str() {
    assert_eq!(ProviderSource::Beatport.as_str(), "beatport");
    assert_eq!(ProviderSource::Traxsource.as_str(), "traxsource");
    assert_eq!(ProviderSource::Bandcamp.as_str(), "bandcamp");
  }

  #[test]
  fn test_provider_source_serialization() {
    let source = ProviderSource::Beatport;
    let json = serde_json::to_string(&source).unwrap();
    assert_eq!(json, r#""beatport""#);

    let deserialized: ProviderSource = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, ProviderSource::Beatport);
  }

  #[test]
  fn test_track_candidate_from_raw() {
    let raw = RawTrackData {
      id: "12345".to_string(),
      title: "Test Track".to_string(),
      mix_name: Some("Original Mix".to_string()),
      artists: vec!["Artist 1".to_string(), "Artist 2".to_string()],
      bpm: Some(128.0),
      key: Some("Am".to_string()),
      duration_secs: Some(300),
      artwork_url: Some("https://example.com/art.jpg".to_string()),
      genre: Some("House".to_string()),
      label: Some("Test Label".to_string()),
      release_date: Some("2024-01-15".to_string()),
    };

    let candidate = TrackCandidate::from_raw(ProviderSource::Beatport, raw.clone(), 0.85);

    assert_eq!(candidate.source, ProviderSource::Beatport);
    assert_eq!(candidate.id, "12345");
    assert_eq!(candidate.title, "Test Track");
    assert_eq!(candidate.artists, "Artist 1, Artist 2");
    assert_eq!(candidate.bpm, Some(128.0));
    assert_eq!(candidate.key, Some("Am".to_string()));
    assert_eq!(candidate.genre, Some("House".to_string()));
    assert_eq!(candidate.similarity_score, 0.85);
  }

  #[test]
  fn test_raw_track_data_serialization() {
    let raw = RawTrackData {
      id: "test-id".to_string(),
      title: "Test Title".to_string(),
      mix_name: None,
      artists: vec!["Artist".to_string()],
      bpm: Some(120.0),
      key: None,
      duration_secs: Some(180),
      artwork_url: None,
      genre: Some("Techno".to_string()),
      label: None,
      release_date: None,
    };

    let json = serde_json::to_string(&raw).unwrap();
    let deserialized: RawTrackData = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.id, raw.id);
    assert_eq!(deserialized.title, raw.title);
    assert_eq!(deserialized.artists, raw.artists);
    assert_eq!(deserialized.bpm, raw.bpm);
  }
}
