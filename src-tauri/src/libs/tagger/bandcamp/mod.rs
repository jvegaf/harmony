// AIDEV-NOTE: Bandcamp provider for tagger system
// Direct HTML scraping from bandcamp.com search results

pub mod scraper;
pub mod provider;

pub use provider::BandcampProvider;
