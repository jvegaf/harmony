// AIDEV-NOTE: CuePoint-related Tauri commands
// Exposes cue point CRUD operations to the frontend

use tauri::State;
use crate::libs::{Database, CuePoint, Result};

#[tauri::command]
pub async fn get_cue_points_for_track(db: State<'_, Database>, track_id: String) -> Result<Vec<CuePoint>> {
    db.get_cue_points_for_track(&track_id)
}

#[tauri::command]
pub async fn get_cue_points_for_tracks(db: State<'_, Database>, track_ids: Vec<String>) -> Result<Vec<CuePoint>> {
    db.get_cue_points_for_tracks(&track_ids)
}

#[tauri::command]
pub async fn save_cue_points(db: State<'_, Database>, cue_points: Vec<CuePoint>) -> Result<()> {
    db.save_cue_points(&cue_points)
}

#[tauri::command]
pub async fn delete_cue_points_for_track(db: State<'_, Database>, track_id: String) -> Result<()> {
    db.delete_cue_points_for_track(&track_id)
}

#[tauri::command]
pub async fn delete_cue_points(db: State<'_, Database>, cue_point_ids: Vec<String>) -> Result<()> {
    db.delete_cue_points(&cue_point_ids)
}

#[tauri::command]
pub async fn replace_cue_points_for_track(
    db: State<'_, Database>,
    track_id: String,
    cue_points: Vec<CuePoint>,
) -> Result<()> {
    db.replace_cue_points_for_track(&track_id, &cue_points)
}
