// AIDEV-NOTE: Tauri commands for the tagger system
// Exposes multi-provider metadata search to the frontend

use crate::libs::tagger::{
  BandcampProvider, BeatportProvider, Orchestrator, ProviderSource, TraxsourceProvider, TrackCandidatesResult,
};
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

/// Frontend input for a track to search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchTrackInput {
  /// Local track ID in the library
  pub local_track_id: String,
  /// Track title to search for
  pub title: String,
  /// Artist name to search for
  pub artist: String,
  /// Duration in seconds (optional, used for scoring)
  pub duration: Option<u32>,
  /// Filename (optional, for display in results)
  pub filename: Option<String>,
}

/// Shared state for providers (cached tokens, etc.)
/// AIDEV-NOTE: Uses tokio::sync::Mutex (not std::sync::Mutex) for async/await compatibility
pub struct TaggerState {
  pub beatport: Mutex<Option<BeatportProvider>>,
  pub traxsource: Mutex<Option<TraxsourceProvider>>,
  pub bandcamp: Mutex<Option<BandcampProvider>>,
  pub orchestrator: Orchestrator,
}

impl TaggerState {
  pub fn new() -> Result<Self, String> {
    // Initialize providers (fallible operations)
    let beatport = BeatportProvider::new().ok();
    let traxsource = TraxsourceProvider::new().ok();
    let bandcamp = BandcampProvider::new().ok();

    if beatport.is_none() {
      log::warn!("Failed to initialize Beatport provider");
    }
    if traxsource.is_none() {
      log::warn!("Failed to initialize Traxsource provider");
    }
    if bandcamp.is_none() {
      log::warn!("Failed to initialize Bandcamp provider");
    }

    Ok(Self {
      beatport: Mutex::new(beatport),
      traxsource: Mutex::new(traxsource),
      bandcamp: Mutex::new(bandcamp),
      orchestrator: Orchestrator::new(),
    })
  }
}

/// Search for metadata candidates for one or more tracks
///
/// # Arguments
/// * `tracks` - Array of tracks to search for
/// * `state` - Shared tagger state with providers
///
/// # Returns
/// Array of search results, one per input track
#[tauri::command]
pub async fn search_track_candidates(
  tracks: Vec<SearchTrackInput>,
  state: State<'_, TaggerState>,
) -> Result<Vec<TrackCandidatesResult>, String> {
  let mut results = Vec::with_capacity(tracks.len());

  for track in tracks {
    log::info!("Searching for track: '{}' by '{}'", track.title, track.artist);

    // Fetch from Beatport (tokio::sync::Mutex is Send-safe across await)
    let beatport_results = {
      let mut guard = state.beatport.lock().await;
      if let Some(ref mut provider) = *guard {
        provider.search(&track.title, &track.artist).await.ok()
      } else {
        None
      }
    };

    // Fetch from Traxsource
    let traxsource_results = {
      let guard = state.traxsource.lock().await;
      if let Some(ref provider) = *guard {
        provider.search(&track.title, &track.artist).await.ok()
      } else {
        None
      }
    };

    // Fetch from Bandcamp
    let bandcamp_results = {
      let guard = state.bandcamp.lock().await;
      if let Some(ref provider) = *guard {
        provider.search(&track.title, &track.artist).await.ok()
      } else {
        None
      }
    };

    // Collect provider results
    let mut provider_results = Vec::new();
    if let Some(tracks) = beatport_results {
      provider_results.push((ProviderSource::Beatport, tracks));
    }
    if let Some(tracks) = traxsource_results {
      provider_results.push((ProviderSource::Traxsource, tracks));
    }
    if let Some(tracks) = bandcamp_results {
      provider_results.push((ProviderSource::Bandcamp, tracks));
    }

    // Score and aggregate with orchestrator
    let candidates = state
      .orchestrator
      .search(&track.title, &track.artist, track.duration, provider_results);

    log::info!("Found {} candidates for track '{}'", candidates.len(), track.title);

    results.push(TrackCandidatesResult {
      local_track_id: track.local_track_id,
      local_title: track.title,
      local_artist: track.artist,
      local_duration: track.duration,
      local_filename: track.filename,
      error: None,
      candidates,
    });
  }

  Ok(results)
}

/// Get list of available tagger providers and their configuration
///
/// # Returns
/// Array of provider configurations
#[tauri::command]
pub fn get_tagger_providers() -> Vec<TaggerProviderInfo> {
  vec![
    TaggerProviderInfo {
      name: "beatport".to_string(),
      display_name: "Beatport".to_string(),
      enabled: true,
      priority: 1,
      max_results: 10,
    },
    TaggerProviderInfo {
      name: "traxsource".to_string(),
      display_name: "Traxsource".to_string(),
      enabled: true,
      priority: 2,
      max_results: 10,
    },
    TaggerProviderInfo {
      name: "bandcamp".to_string(),
      display_name: "Bandcamp".to_string(),
      enabled: true,
      priority: 3,
      max_results: 10,
    },
  ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaggerProviderInfo {
  pub name: String,
  pub display_name: String,
  pub enabled: bool,
  pub priority: u8,
  pub max_results: usize,
}
