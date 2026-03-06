// AIDEV-NOTE: Tagger module for metadata tagging from multiple providers
// Phase 5 implementation - TDD approach with unit tests and live integration tests

pub mod bandcamp;
pub mod beatport;
pub mod orchestrator;
pub mod scoring;
pub mod traxsource;
pub mod types;

// Re-export core types and orchestrator
pub use orchestrator::Orchestrator;
pub use types::{ProviderSource, TrackCandidatesResult};

// Re-export providers for use in Tauri commands
pub use bandcamp::BandcampProvider;
pub use beatport::BeatportProvider;
pub use traxsource::TraxsourceProvider;
