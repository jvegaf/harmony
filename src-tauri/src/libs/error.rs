// AIDEV-NOTE: Unified error type for Harmony backend
// Uses thiserror for clean error definitions and automatic trait implementations

use thiserror::Error;

#[derive(Error, Debug)]
pub enum HarmonyError {
  #[error("Database error: {0}")]
  Database(#[from] rusqlite::Error),

  #[error("IO error: {0}")]
  Io(#[from] std::io::Error),

  #[error("JSON serialization error: {0}")]
  Json(#[from] serde_json::Error),

  #[error("Audio metadata error: {0}")]
  Lofty(#[from] lofty::error::LoftyError),

  #[error("HTTP request error: {0}")]
  Http(#[from] reqwest::Error),

  #[error("XML parsing error: {0}")]
  Xml(String),

  #[allow(dead_code)]
  #[error("Track not found: {0}")]
  TrackNotFound(String),

  #[allow(dead_code)]
  #[error("Playlist not found: {0}")]
  PlaylistNotFound(String),

  #[allow(dead_code)]
  #[error("Invalid path: {0}")]
  InvalidPath(String),

  #[error("{0}")]
  Custom(String),
}

// Allow HarmonyError to be used in Tauri commands
impl serde::Serialize for HarmonyError {
  fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
  where
    S: serde::ser::Serializer,
  {
    serializer.serialize_str(&format!("{}", self))
  }
}

pub type Result<T> = std::result::Result<T, HarmonyError>;
