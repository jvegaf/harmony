// AIDEV-NOTE: Traktor integration module - Phase 4 & 4.5
// Provides NML parsing and synchronization with Traktor DJ software
//
// Modules:
// - nml_types: Type definitions for Traktor NML format
// - nml_parser: XML parsing logic
// - mapper: Track conversion (Traktor <-> Harmony)
// - conflict_resolver: Merge strategies for sync (Phase 4.5)
// - cue_mapper: Cue point conversion (Traktor <-> Harmony) (Phase 4.5)
// - playlist_sync: Playlist extraction and conversion (Phase 4.5)

pub mod conflict_resolver;
pub mod cue_mapper;
pub mod mapper;
pub mod nml_parser;
pub mod nml_types;
pub mod playlist_sync;

pub use mapper::map_traktor_entry_to_track;
pub use nml_parser::TraktorNMLParser;
