// AIDEV-NOTE: Tauri commands - IPC handlers exposed to the frontend
// Replaces ipcMain.handle() calls from Electron

pub mod audio;
pub mod audio_analysis;
pub mod cue_points;
pub mod files;
pub mod folders;
pub mod playlists;
pub mod tracks;
pub mod traktor;

// Re-export all commands for easy registration
pub use audio::*;
pub use audio_analysis::*;
pub use cue_points::*;
pub use files::*;
pub use folders::*;
pub use playlists::*;
pub use tracks::*;
pub use traktor::*;
