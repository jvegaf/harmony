// AIDEV-NOTE: Folder-related Tauri commands
// Exposes folder CRUD operations to the frontend

use tauri::State;
use crate::libs::{Database, Folder, Result};

#[tauri::command]
pub async fn get_all_folders(db: State<'_, Database>) -> Result<Vec<Folder>> {
    db.get_all_folders()
}

#[tauri::command]
pub async fn get_folder_by_id(db: State<'_, Database>, folder_id: String) -> Result<Option<Folder>> {
    db.get_folder_by_id(&folder_id)
}

#[tauri::command]
pub async fn create_folder(db: State<'_, Database>, folder: Folder) -> Result<()> {
    db.create_folder(&folder)
}

#[tauri::command]
pub async fn update_folder(db: State<'_, Database>, folder: Folder) -> Result<()> {
    db.update_folder(&folder)
}

#[tauri::command]
pub async fn delete_folder(db: State<'_, Database>, folder_id: String) -> Result<()> {
    db.delete_folder(&folder_id)
}

#[tauri::command]
pub async fn save_folders(db: State<'_, Database>, folders: Vec<Folder>) -> Result<()> {
    db.save_folders(&folders)
}
