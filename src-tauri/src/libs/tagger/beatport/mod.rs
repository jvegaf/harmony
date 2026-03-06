// AIDEV-NOTE: Beatport provider for tagger system
// OAuth token extraction from __NEXT_DATA__, search, and result parsing

pub mod client;
pub mod parser;
pub mod provider;

pub use provider::BeatportProvider;
