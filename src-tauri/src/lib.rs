// AIDEV-NOTE: Tauri application entry point
// Initializes database, plugins, and registers all commands

mod libs;
mod commands;

use libs::Database;
use log::info;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(if cfg!(debug_assertions) {
          log::LevelFilter::Debug
        } else {
          log::LevelFilter::Info
        })
        .build(),
    )
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
      // TODO: Handle single instance (focus existing window)
    }))
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_notification::init())
    .setup(|app| {
      info!("Initializing Harmony...");

      // Get app data directory
      let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

      // Create database directory and path
      let db_dir = app_data_dir.join("database");
      std::fs::create_dir_all(&db_dir).expect("Failed to create database directory");
      let db_path: PathBuf = db_dir.join("harmony.db");

      info!("Database path: {:?}", db_path);

      // Initialize database
      let database = Database::new(db_path).expect("Failed to initialize database");

      // Register database as managed state
      app.manage(database);

      info!("Harmony initialized successfully!");
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Track commands
      commands::get_all_tracks,
      commands::get_track_by_id,
      commands::insert_tracks,
      commands::update_track,
      commands::delete_tracks,
      // Playlist commands
      commands::get_all_playlists,
      commands::get_playlist_by_id,
      commands::create_playlist,
      commands::update_playlist,
      commands::delete_playlist,
      commands::set_playlist_tracks,
      commands::add_track_to_playlist,
      commands::remove_tracks_from_playlist,
      commands::reorder_playlist_tracks,
      // Folder commands
      commands::get_all_folders,
      commands::get_folder_by_id,
      commands::create_folder,
      commands::update_folder,
      commands::delete_folder,
      commands::save_folders,
      // CuePoint commands
      commands::get_cue_points_for_track,
      commands::get_cue_points_for_tracks,
      commands::save_cue_points,
      commands::delete_cue_points_for_track,
      commands::delete_cue_points,
      commands::replace_cue_points_for_track,
      // Audio metadata commands
      commands::scan_audio_file,
      commands::scan_directory,
      commands::scan_paths,
      commands::scan_audio_files_batch,
      commands::write_track_metadata,
      commands::write_tracks_metadata_batch,
      commands::import_library,
      // File operations and cover art commands
      commands::copy_track_file,
      commands::move_track_file,
      commands::delete_track_file,
      commands::delete_tracks_batch,
      commands::get_track_cover,
      commands::get_cover_from_file,
      commands::replace_track_file,
      commands::check_library_changes_cmd,
      // Audio analysis commands
      commands::analyze_audio_file,
      commands::analyze_audio_batch_command,
      // Traktor sync commands
      commands::parse_traktor_nml,
      commands::sync_traktor_nml,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

