// AIDEV-NOTE: Tagger module for metadata tagging from multiple providers
// Phase 5 implementation - TDD approach with unit tests and live integration tests

pub mod types;

// Re-export core types
pub use types::{ProviderSource, RawTrackData, SearchQuery, TrackCandidate, TrackCandidatesResult};
