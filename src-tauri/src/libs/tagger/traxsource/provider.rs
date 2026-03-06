// AIDEV-NOTE: Traxsource provider implementation - wraps scraper

use super::scraper::{TraxsourceScraper, TraxsourceError};
use crate::libs::tagger::types::{ProviderSource, RawTrackData};

/// Traxsource provider for searching tracks
pub struct TraxsourceProvider {
  scraper: TraxsourceScraper,
}

impl TraxsourceProvider {
  /// Create new Traxsource provider
  pub fn new() -> Result<Self, TraxsourceError> {
    Ok(Self {
      scraper: TraxsourceScraper::new()?,
    })
  }

  /// Search for tracks by title and artist
  ///
  /// # Arguments
  /// * `title` - Track title to search for
  /// * `artist` - Artist name to search for
  ///
  /// # Returns
  /// Vector of raw track data from Traxsource
  pub async fn search(&self, title: &str, artist: &str) -> Result<Vec<RawTrackData>, TraxsourceError> {
    self.scraper.search(title, artist).await
  }

  /// Get provider source identifier
  #[allow(dead_code)]
  pub fn source(&self) -> ProviderSource {
    ProviderSource::Traxsource
  }
}

// AIDEV-NOTE: Tests for TraxsourceProvider
#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_provider_source() {
    let provider = TraxsourceProvider::new().expect("Failed to create provider");
    assert_eq!(provider.source(), ProviderSource::Traxsource);
  }

  #[tokio::test]
  #[ignore] // Live test - requires network
  async fn test_provider_search_live() {
    if std::env::var("RUN_LIVE_TESTS").is_err() {
      return;
    }

    let provider = TraxsourceProvider::new().expect("Failed to create provider");
    let results = provider
      .search("Strobe", "Deadmau5")
      .await
      .expect("Search failed");

    assert!(!results.is_empty(), "Should find at least one result");

    // Check first result has expected fields
    let first = &results[0];
    assert!(!first.title.is_empty(), "Title should not be empty");
    assert!(!first.artists.is_empty(), "Artists should not be empty");
    assert!(first.id.starts_with("traxsource:"), "ID should have traxsource: prefix");
  }
}
