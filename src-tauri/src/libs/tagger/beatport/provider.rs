// AIDEV-NOTE: Beatport provider implementation - combines client and parser
// Implements the TrackProvider interface for the orchestrator

use super::client::{BeatportClient, BeatportError};
use super::parser;
use crate::libs::tagger::types::{ProviderSource, RawTrackData};

/// Beatport provider for searching tracks
pub struct BeatportProvider {
  client: BeatportClient,
}

impl BeatportProvider {
  /// Create new Beatport provider
  pub fn new() -> Result<Self, BeatportError> {
    Ok(Self {
      client: BeatportClient::new()?,
    })
  }

  /// Search for tracks by title and artist
  ///
  /// # Arguments
  /// * `title` - Track title to search for
  /// * `artist` - Artist name to search for
  ///
  /// # Returns
  /// Vector of raw track data from Beatport
  pub async fn search(&mut self, title: &str, artist: &str) -> Result<Vec<RawTrackData>, BeatportError> {
    // Construct search query (same as old Electron code)
    let query = if !artist.is_empty() {
      format!("{} {}", artist, title)
    } else {
      title.to_string()
    };

    // Search Beatport
    let html = self.client.search_raw(&query).await?;

    // Parse results
    let tracks = parser::parse_search_results(&html)?;

    // AIDEV-NOTE: Source is NOT set here - orchestrator adds it when creating TrackCandidate

    Ok(tracks)
  }

  /// Get provider source identifier
  pub fn source(&self) -> ProviderSource {
    ProviderSource::Beatport
  }
}

// AIDEV-NOTE: Tests for BeatportProvider
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_provider_source() {
    let provider = BeatportProvider::new().expect("Failed to create provider");
    assert_eq!(provider.source(), ProviderSource::Beatport);
  }

  #[tokio::test]
  #[ignore] // Live test - requires network
  async fn test_provider_search_live() {
    if std::env::var("RUN_LIVE_TESTS").is_err() {
      return;
    }

    let mut provider = BeatportProvider::new().expect("Failed to create provider");
    let results = provider
      .search("Strobe", "Deadmau5")
      .await
      .expect("Search failed");

    assert!(!results.is_empty(), "Should find at least one result");

    // Check first result has expected fields
    let first = &results[0];
    assert!(!first.title.is_empty(), "Title should not be empty");
    assert!(!first.artists.is_empty(), "Artists should not be empty");
    assert!(first.id.starts_with("beatport:"), "ID should have beatport: prefix");
  }

  #[test]
  fn test_search_query_construction() {
    // Test query formatting logic (synchronous, no network)
    let title = "Strobe";
    let artist = "Deadmau5";

    // With artist
    let query = format!("{} {}", artist, title);
    assert_eq!(query, "Deadmau5 Strobe");

    // Without artist
    let query_no_artist = title.to_string();
    assert_eq!(query_no_artist, "Strobe");

    // Empty artist
    let empty_artist = "";
    let query_empty = if !empty_artist.is_empty() {
      format!("{} {}", empty_artist, title)
    } else {
      title.to_string()
    };
    assert_eq!(query_empty, "Strobe");
  }
}
