// AIDEV-NOTE: Playlist-related Tauri commands
// Exposes playlist CRUD operations to the frontend

use tauri::State;
use crate::libs::{Database, Playlist, Result};

#[tauri::command]
pub async fn get_all_playlists(db: State<'_, Database>) -> Result<Vec<Playlist>> {
    db.get_all_playlists()
}

#[tauri::command]
pub async fn get_playlist_by_id(db: State<'_, Database>, playlist_id: String) -> Result<Option<Playlist>> {
    db.get_playlist_by_id(&playlist_id)
}

#[tauri::command]
pub async fn create_playlist(db: State<'_, Database>, playlist: Playlist) -> Result<()> {
    db.create_playlist(&playlist)
}

#[tauri::command]
pub async fn update_playlist(db: State<'_, Database>, playlist: Playlist) -> Result<()> {
    db.update_playlist(&playlist)
}

#[tauri::command]
pub async fn delete_playlist(db: State<'_, Database>, playlist_id: String) -> Result<()> {
    db.delete_playlist(&playlist_id)
}

#[tauri::command]
pub async fn set_playlist_tracks(
    db: State<'_, Database>,
    playlist_id: String,
    track_ids: Vec<String>,
) -> Result<()> {
    db.set_playlist_tracks(&playlist_id, &track_ids)
}

#[tauri::command]
pub async fn add_track_to_playlist(
    db: State<'_, Database>,
    playlist_id: String,
    track_id: String,
) -> Result<()> {
    db.add_track_to_playlist(&playlist_id, &track_id)
}

#[tauri::command]
pub async fn remove_tracks_from_playlist(
    db: State<'_, Database>,
    playlist_id: String,
    track_ids: Vec<String>,
) -> Result<()> {
    db.remove_tracks_from_playlist(&playlist_id, &track_ids)
}

#[tauri::command]
pub async fn reorder_playlist_tracks(
    db: State<'_, Database>,
    playlist_id: String,
    ordered_track_ids: Vec<String>,
) -> Result<()> {
    db.reorder_playlist_tracks(&playlist_id, &ordered_track_ids)
}
