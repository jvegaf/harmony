// AIDEV-NOTE: Track-related Tauri commands
// Exposes database CRUD operations to the frontend

use tauri::State;
use crate::libs::{Database, Track, Result};

#[tauri::command]
pub async fn get_all_tracks(db: State<'_, Database>) -> Result<Vec<Track>> {
    db.get_all_tracks()
}

#[tauri::command]
pub async fn get_track_by_id(db: State<'_, Database>, track_id: String) -> Result<Option<Track>> {
    db.get_track_by_id(&track_id)
}

#[tauri::command]
pub async fn insert_tracks(db: State<'_, Database>, tracks: Vec<Track>) -> Result<()> {
    db.insert_tracks(&tracks)
}

#[tauri::command]
pub async fn update_track(db: State<'_, Database>, track: Track) -> Result<()> {
    db.update_track(&track)
}

#[tauri::command]
pub async fn delete_tracks(db: State<'_, Database>, track_ids: Vec<String>) -> Result<()> {
    db.delete_tracks(&track_ids)
}
