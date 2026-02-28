// AIDEV-NOTE: Library modules for Harmony backend
// Contains all domain models and database logic

pub mod audio_analysis;
pub mod audio_metadata;
pub mod cover;
pub mod cue_point;
pub mod database;
pub mod error;
pub mod file_ops;
pub mod folder;
pub mod library_changes;
pub mod playlist;
pub mod track;
pub mod traktor;

// Re-export commonly used types
pub use audio_analysis::{
  analyze_audio, analyze_audio_batch, AudioAnalysisOptions, AudioAnalysisResult,
};
pub use audio_metadata::{extract_metadata, is_supported_extension, write_metadata};
pub use cover::fetch_cover;
pub use cue_point::CuePoint;
pub use database::Database;
pub use error::{HarmonyError, Result};
pub use file_ops::{copy_file, delete_file, move_file};
pub use folder::Folder;
pub use library_changes::{check_library_changes, LibraryChanges};
pub use playlist::Playlist;
pub use track::{Track, TrackRating};
