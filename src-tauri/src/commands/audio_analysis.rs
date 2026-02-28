// AIDEV-NOTE: Audio analysis commands for Tauri
// Provides BPM detection, key detection, and waveform generation
// Replaces IPCAudioAnalysisModule from Electron

use crate::libs::{analyze_audio, analyze_audio_batch, AudioAnalysisOptions, AudioAnalysisResult};
use log::info;
use serde::Serialize;

/// Result wrapper for batch analysis
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchAnalysisResult {
  pub path: String,
  pub success: bool,
  pub result: Option<AudioAnalysisResult>,
  pub error: Option<String>,
}

/// Analyze a single audio file
/// Returns BPM, key, and waveform peaks
#[tauri::command]
pub async fn analyze_audio_file(
  path: String,
  options: Option<AudioAnalysisOptions>,
) -> Result<AudioAnalysisResult, String> {
  info!("Command: analyze_audio_file - path: {}", path);

  analyze_audio(&path, options).map_err(|e| e.to_string())
}

/// Analyze multiple audio files in parallel
/// Returns results for all files (including errors)
#[tauri::command]
pub async fn analyze_audio_batch_command(
  paths: Vec<String>,
  options: Option<AudioAnalysisOptions>,
) -> Result<Vec<BatchAnalysisResult>, String> {
  info!("Command: analyze_audio_batch - {} files", paths.len());

  let results = analyze_audio_batch(paths.clone(), options);

  // AIDEV-NOTE: Convert Result<AudioAnalysisResult> to BatchAnalysisResult
  // so frontend can handle both successes and errors gracefully
  let batch_results: Vec<BatchAnalysisResult> = paths
    .into_iter()
    .zip(results)
    .map(|(path, result)| match result {
      Ok(analysis) => BatchAnalysisResult {
        path,
        success: true,
        result: Some(analysis),
        error: None,
      },
      Err(e) => BatchAnalysisResult {
        path,
        success: false,
        result: None,
        error: Some(e.to_string()),
      },
    })
    .collect();

  Ok(batch_results)
}

// AIDEV-TODO: Consider adding progress reporting via Tauri events
// For long-running batch operations, we could emit progress events:
// app.emit_all("audio-analysis-progress", { processed: i, total: paths.len() })
//
// Example implementation:
// #[tauri::command]
// pub async fn analyze_audio_batch_with_progress(
//   app_handle: tauri::AppHandle,
//   paths: Vec<String>,
//   options: Option<AudioAnalysisOptions>,
// ) -> Result<Vec<BatchAnalysisResult>, String> {
//   // Emit events during processing
//   app_handle.emit_all("audio-analysis-progress", ProgressPayload { ... })?;
//   ...
// }
