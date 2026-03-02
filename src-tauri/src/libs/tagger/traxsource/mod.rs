// AIDEV-NOTE: Traxsource provider for tagger system
// HTML scraping from traxsource.com search results and track pages

pub mod scraper;
pub mod provider;

pub use provider::TraxsourceProvider;
