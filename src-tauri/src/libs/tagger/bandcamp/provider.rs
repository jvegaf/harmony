// AIDEV-NOTE: Bandcamp provider implementation - wraps scraper

use super::scraper::{BandcampScraper, BandcampError};
use crate::libs::tagger::types::{ProviderSource, RawTrackData};

/// Bandcamp provider for searching tracks
pub struct BandcampProvider {
  scraper: BandcampScraper,
}

impl BandcampProvider {
  /// Create new Bandcamp provider
  pub fn new() -> Result<Self, BandcampError> {
    Ok(Self {
      scraper: BandcampScraper::new()?,
    })
  }

  /// Search for tracks by title and artist
  ///
  /// # Arguments
  /// * `title` - Track title to search for
  /// * `artist` - Artist name to search for
  ///
  /// # Returns
  /// Vector of raw track data from Bandcamp
  /// NOTE: Bandcamp does NOT provide BPM or Key
  pub async fn search(&self, title: &str, artist: &str) -> Result<Vec<RawTrackData>, BandcampError> {
    self.scraper.search(title, artist).await
  }

  /// Get provider source identifier
  pub fn source(&self) -> ProviderSource {
    ProviderSource::Bandcamp
  }
}

// AIDEV-NOTE: Tests for BandcampProvider
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_provider_source() {
    let provider = BandcampProvider::new().expect("Failed to create provider");
    assert_eq!(provider.source(), ProviderSource::Bandcamp);
  }

  #[tokio::test]
  #[ignore] // Live test - requires network
  async fn test_provider_search_live() {
    if std::env::var("RUN_LIVE_TESTS").is_err() {
      return;
    }

    let provider = BandcampProvider::new().expect("Failed to create provider");
    let results = provider
      .search("Strobe", "Deadmau5")
      .await
      .expect("Search failed");

    assert!(!results.is_empty(), "Should find at least one result");

    // Check first result has expected fields
    let first = &results[0];
    assert!(!first.title.is_empty(), "Title should not be empty");
    assert!(!first.artists.is_empty(), "Artists should not be empty");
    assert!(first.id.starts_with("bandcamp:"), "ID should have bandcamp: prefix");
    
    // AIDEV-NOTE: Bandcamp does NOT provide BPM or Key (by design)
    assert!(first.bpm.is_none(), "Bandcamp should not have BPM");
    assert!(first.key.is_none(), "Bandcamp should not have Key");
  }
}
