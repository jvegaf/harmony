// AIDEV-NOTE: Playlist and PlaylistTrack models
// Matches the TypeScript interfaces in src/preload/types/harmony.ts

use crate::libs::Track;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Playlist {
  pub id: String,
  pub name: String,
  pub folder_id: Option<String>,
  #[serde(default)]
  pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct PlaylistTrack {
  pub id: String,
  pub playlist_id: String,
  pub track_id: String,
  pub order: i32,
}
