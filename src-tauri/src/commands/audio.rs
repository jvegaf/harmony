// AIDEV-NOTE: Audio metadata commands
// Exposes audio file scanning and metadata operations to the frontend

use tauri::State;
use walkdir::WalkDir;
use std::path::Path;

use crate::libs::{Database, Track, Result, extract_metadata, write_metadata, is_supported_extension};

/// Scan a single audio file and extract metadata
#[tauri::command]
pub async fn scan_audio_file(file_path: String) -> Result<Track> {
    extract_metadata(&file_path)
}

/// Scan a directory recursively and return all supported audio file paths
#[tauri::command]
pub async fn scan_directory(dir_path: String) -> Result<Vec<String>> {
    let mut audio_files = Vec::new();

    for entry in WalkDir::new(&dir_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Only include files (not directories)
        if path.is_file() {
            if let Some(path_str) = path.to_str() {
                if is_supported_extension(path_str) {
                    audio_files.push(path_str.to_string());
                }
            }
        }
    }

    Ok(audio_files)
}

/// Scan multiple paths (files and/or directories) and return all audio file paths
#[tauri::command]
pub async fn scan_paths(paths: Vec<String>) -> Result<Vec<String>> {
    let mut all_audio_files = Vec::new();

    for path_str in paths {
        let path = Path::new(&path_str);

        if path.is_file() {
            // Single file - check if supported
            if is_supported_extension(&path_str) {
                all_audio_files.push(path_str);
            }
        } else if path.is_dir() {
            // Directory - scan recursively
            for entry in WalkDir::new(&path_str)
                .follow_links(true)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Some(file_path_str) = entry_path.to_str() {
                        if is_supported_extension(file_path_str) {
                            all_audio_files.push(file_path_str.to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(all_audio_files)
}

/// Scan multiple audio files and extract metadata (batch operation)
/// Returns tracks with metadata, skipping files that fail to parse
#[tauri::command]
pub async fn scan_audio_files_batch(file_paths: Vec<String>) -> Result<Vec<Track>> {
    use rayon::prelude::*;

    // Use rayon for parallel processing
    let tracks: Vec<Track> = file_paths
        .par_iter()
        .filter_map(|path| {
            match extract_metadata(path) {
                Ok(track) => Some(track),
                Err(e) => {
                    log::warn!("Failed to extract metadata from {}: {}", path, e);
                    None
                }
            }
        })
        .collect();

    Ok(tracks)
}

/// Write track metadata back to audio file
#[tauri::command]
pub async fn write_track_metadata(track: Track) -> Result<()> {
    write_metadata(&track.path, &track)
}

/// Write metadata for multiple tracks (batch operation)
#[tauri::command]
pub async fn write_tracks_metadata_batch(tracks: Vec<Track>) -> Result<BatchResult> {
    let mut succeeded = 0;
    let mut failed = 0;

    for track in tracks {
        match write_metadata(&track.path, &track) {
            Ok(_) => succeeded += 1,
            Err(e) => {
                log::error!("Failed to write metadata to {}: {}", track.path, e);
                failed += 1;
            }
        }
    }

    Ok(BatchResult { succeeded, failed })
}

/// Full library import: scan paths, extract metadata, insert into database
#[tauri::command]
pub async fn import_library(
    db: State<'_, Database>,
    paths: Vec<String>,
) -> Result<ImportResult> {
    use rayon::prelude::*;
    
    log::info!("Starting library import for {} paths", paths.len());

    // Step 1: Scan all paths to get audio file list
    let mut all_files = Vec::new();
    for path_str in paths {
        let path = Path::new(&path_str);
        if path.is_file() && is_supported_extension(&path_str) {
            all_files.push(path_str);
        } else if path.is_dir() {
            for entry in WalkDir::new(&path_str)
                .follow_links(true)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.path().is_file() {
                    if let Some(file_path) = entry.path().to_str() {
                        if is_supported_extension(file_path) {
                            all_files.push(file_path.to_string());
                        }
                    }
                }
            }
        }
    }

    let total_files = all_files.len();
    log::info!("Found {} audio files to import", total_files);

    // Step 2: Extract metadata in parallel
    let tracks: Vec<Track> = all_files
        .par_iter()
        .filter_map(|path| {
            match extract_metadata(path) {
                Ok(track) => Some(track),
                Err(e) => {
                    log::warn!("Failed to extract metadata from {}: {}", path, e);
                    None
                }
            }
        })
        .collect();

    let processed = tracks.len();
    let failed = total_files - processed;

    log::info!("Extracted metadata for {} tracks ({} failed)", processed, failed);

    // Step 3: Insert into database
    db.insert_tracks(&tracks)?;

    log::info!("Library import complete: {} tracks imported", processed);

    Ok(ImportResult {
        total: total_files,
        processed,
        failed,
    })
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResult {
    pub succeeded: usize,
    pub failed: usize,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub total: usize,
    pub processed: usize,
    pub failed: usize,
}
