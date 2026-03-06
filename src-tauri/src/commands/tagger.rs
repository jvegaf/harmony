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

/// AIDEV-NOTE: Input for applying tag selections from tagger UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackSelection {
  /// ID of the local track in the library
  pub local_track_id: String,
  /// Formatted candidate ID (provider:id) or null if skipped
  pub selected_candidate_id: Option<String>,
}

/// Result of applying a single tag selection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyTagResult {
  /// ID of the track that was updated (or failed)
  pub track_id: String,
  /// Error message if the update failed
  pub error: Option<String>,
}

/// Summary of apply tag selections operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyTagSelectionsResult {
  /// List of successfully updated tracks
  pub updated: Vec<crate::libs::track::Track>,
  /// List of errors (track_id + error message)
  pub errors: Vec<ApplyTagResult>,
}

/// Apply selected metadata candidates to local tracks
///
/// # Arguments
/// * `selections` - Array of user selections (track_id + candidate_id)
/// * `candidates_results` - Full search results with all candidates (for looking up selected metadata)
/// * `db` - Database handle
/// * `state` - Tagger state (unused currently, for future enhancement)
///
/// # Returns
/// Summary with updated tracks and any errors
#[tauri::command]
pub async fn apply_tag_selections(
  selections: Vec<TrackSelection>,
  candidates_results: Vec<TrackCandidatesResult>,
  db: tauri::State<'_, crate::libs::Database>,
  _state: tauri::State<'_, TaggerState>,
) -> Result<ApplyTagSelectionsResult, String> {
  use crate::libs::artwork::fetch_and_embed_artwork;

  let mut updated_tracks = Vec::new();
  let mut errors = Vec::new();

  for selection in selections {
    // Skip selections without a candidate
    if selection.selected_candidate_id.is_none() {
      log::info!("Skipping track {} - no candidate selected", selection.local_track_id);
      continue;
    }

    let candidate_id = selection.selected_candidate_id.unwrap();

    // Find the track in the database
    let local_track = match db.get_track_by_id(&selection.local_track_id) {
      Ok(Some(track)) => track,
      Ok(None) => {
        log::error!("Track {} not found in database", selection.local_track_id);
        errors.push(ApplyTagResult {
          track_id: selection.local_track_id.clone(),
          error: Some("Track not found".to_string()),
        });
        continue;
      }
      Err(e) => {
        log::error!("Database error fetching track {}: {}", selection.local_track_id, e);
        errors.push(ApplyTagResult {
          track_id: selection.local_track_id.clone(),
          error: Some(format!("Database error: {}", e)),
        });
        continue;
      }
    };

    // Find the selected candidate in the results
    let candidate = candidates_results
      .iter()
      .find(|r| r.local_track_id == selection.local_track_id)
      .and_then(|r| {
        r.candidates
          .iter()
          .find(|c| format!("{}:{}", c.source.as_str(), c.id) == candidate_id)
      });

    if candidate.is_none() {
      log::error!("Candidate {} not found for track {}", candidate_id, selection.local_track_id);
      errors.push(ApplyTagResult {
        track_id: selection.local_track_id.clone(),
        error: Some("Candidate not found".to_string()),
      });
      continue;
    }

    let candidate = candidate.unwrap();

    log::info!(
      "Applying tags from {} for track: {}",
      candidate.source.as_str(),
      local_track.title
    );

    // Build updated track with new metadata
    let mut updated_track = local_track.clone();
    updated_track.title = candidate.title.clone();
    updated_track.artist = Some(candidate.artists.clone());
    updated_track.album = candidate.album.clone();
    updated_track.bpm = candidate.bpm.map(|bpm| bpm.round() as i32);
    updated_track.initial_key = candidate.key.clone();
    updated_track.genre = candidate.genre.clone();
    updated_track.label = candidate.label.clone();
    updated_track.url = candidate.url.clone();

    // Parse year from release_date (YYYY-MM-DD)
    if let Some(ref release_date) = candidate.release_date {
      if let Some(year_str) = release_date.split('-').next() {
        if let Ok(year) = year_str.parse::<i32>() {
          updated_track.year = Some(year);
        }
      }
    }

    // Update duration if available (convert seconds to milliseconds)
    if let Some(duration_secs) = candidate.duration_secs {
      updated_track.duration = (duration_secs as i64) * 1000;
    }

    // Save track to database
    if let Err(e) = db.update_track(&updated_track) {
      log::error!("Failed to update track {} in database: {}", updated_track.id, e);
      errors.push(ApplyTagResult {
        track_id: selection.local_track_id.clone(),
        error: Some(format!("Database update failed: {}", e)),
      });
      continue;
    }

    // Fetch and embed artwork (if available)
    if let Some(ref artwork_url) = candidate.artwork_url {
      log::info!("Fetching artwork from: {}", artwork_url);
      match fetch_and_embed_artwork(&local_track.path, artwork_url).await {
        Ok(_) => {
          log::info!("Artwork embedded successfully for {}", updated_track.title);
        }
        Err(e) => {
          log::warn!("Failed to embed artwork for {}: {}", updated_track.title, e);
          // Don't fail the whole operation, just log the warning
        }
      }
    }

    updated_tracks.push(updated_track);
    log::info!("Tags applied successfully for {}", selection.local_track_id);
  }

  Ok(ApplyTagSelectionsResult {
    updated: updated_tracks,
    errors,
  })
}
