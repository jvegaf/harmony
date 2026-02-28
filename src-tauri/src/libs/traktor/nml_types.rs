// AIDEV-NOTE: Traktor NML type definitions
// Represents the structure of Traktor's collection.nml XML files
//
// Based on Traktor Pro 3.x NML format (VERSION="19")
// All fields are strings as they come from XML parsing
// Uses serde for XML deserialization with quick-xml

use serde::{Deserialize, Serialize};

/// Root NML structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorNML {
  #[serde(rename = "NML")]
  pub nml: NML,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NML {
  #[serde(rename = "@VERSION")]
  pub version: String,

  #[serde(rename = "HEAD")]
  pub head: TraktorHead,

  #[serde(rename = "COLLECTION")]
  pub collection: TraktorCollection,

  #[serde(rename = "PLAYLISTS")]
  pub playlists: Option<TraktorPlaylists>,

  #[serde(rename = "INDEXING")]
  pub indexing: Option<TraktorIndexing>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorHead {
  #[serde(rename = "@COMPANY")]
  pub company: String,

  #[serde(rename = "@PROGRAM")]
  pub program: String,
}

// ============================================================================
// Collection (Track Library)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorCollection {
  #[serde(rename = "@ENTRIES")]
  pub entries: String,

  #[serde(rename = "ENTRY", default)]
  pub entry: Vec<TraktorEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorEntry {
  // Attributes on ENTRY element
  #[serde(rename = "@MODIFIED_DATE")]
  pub modified_date: Option<String>,

  #[serde(rename = "@MODIFIED_TIME")]
  pub modified_time: Option<String>,

  #[serde(rename = "@AUDIO_ID")]
  pub audio_id: Option<String>,

  #[serde(rename = "@TITLE")]
  pub title: Option<String>,

  #[serde(rename = "@ARTIST")]
  pub artist: Option<String>,

  // Child elements
  #[serde(rename = "LOCATION")]
  pub location: TraktorLocation,

  #[serde(rename = "ALBUM")]
  pub album: Option<TraktorAlbum>,

  #[serde(rename = "MODIFICATION_INFO")]
  pub modification_info: Option<TraktorModificationInfo>,

  #[serde(rename = "INFO")]
  pub info: Option<TraktorInfo>,

  #[serde(rename = "TEMPO")]
  pub tempo: Option<TraktorTempo>,

  #[serde(rename = "LOUDNESS")]
  pub loudness: Option<TraktorLoudness>,

  #[serde(rename = "MUSICAL_KEY")]
  pub musical_key: Option<TraktorMusicalKey>,

  #[serde(rename = "CUE_V2", default)]
  pub cue_v2: Vec<TraktorCue>,

  #[serde(rename = "PRIMARYKEY")]
  pub primarykey: Option<TraktorPrimaryKey>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorLocation {
  #[serde(rename = "@DIR")]
  pub dir: String,

  #[serde(rename = "@FILE")]
  pub file: String,

  #[serde(rename = "@VOLUME")]
  pub volume: Option<String>,

  #[serde(rename = "@VOLUMEID")]
  pub volumeid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorAlbum {
  #[serde(rename = "@TITLE")]
  pub title: Option<String>,

  #[serde(rename = "@TRACK")]
  pub track: Option<String>,

  #[serde(rename = "@OF_TRACKS")]
  pub of_tracks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorModificationInfo {
  #[serde(rename = "@AUTHOR_TYPE")]
  pub author_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorInfo {
  #[serde(rename = "@BITRATE")]
  pub bitrate: Option<String>,

  #[serde(rename = "@GENRE")]
  pub genre: Option<String>,

  #[serde(rename = "@LABEL")]
  pub label: Option<String>,

  #[serde(rename = "@COMMENT")]
  pub comment: Option<String>,

  #[serde(rename = "@COVERARTID")]
  pub coverartid: Option<String>,

  #[serde(rename = "@KEY")]
  pub key: Option<String>,

  #[serde(rename = "@PLAYTIME")]
  pub playtime: Option<String>,

  #[serde(rename = "@PLAYTIME_FLOAT")]
  pub playtime_float: Option<String>,

  #[serde(rename = "@RANKING")]
  pub ranking: Option<String>,

  #[serde(rename = "@IMPORT_DATE")]
  pub import_date: Option<String>,

  #[serde(rename = "@RELEASE_DATE")]
  pub release_date: Option<String>,

  #[serde(rename = "@LAST_PLAYED")]
  pub last_played: Option<String>,

  #[serde(rename = "@PLAYCOUNT")]
  pub playcount: Option<String>,

  #[serde(rename = "@FLAGS")]
  pub flags: Option<String>,

  #[serde(rename = "@FILESIZE")]
  pub filesize: Option<String>,

  #[serde(rename = "@COLOR")]
  pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorTempo {
  #[serde(rename = "@BPM")]
  pub bpm: String,

  #[serde(rename = "@BPM_QUALITY")]
  pub bpm_quality: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorLoudness {
  #[serde(rename = "@PEAK_DB")]
  pub peak_db: Option<String>,

  #[serde(rename = "@PERCEIVED_DB")]
  pub perceived_db: Option<String>,

  #[serde(rename = "@ANALYZED_DB")]
  pub analyzed_db: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorMusicalKey {
  #[serde(rename = "@VALUE")]
  pub value: String,
}

/// Traktor Cue Point (V2 format)
///
/// Cue types:
/// - 0 = Cue (hot cue)
/// - 1 = Fade-in
/// - 2 = Fade-out
/// - 3 = Load
/// - 4 = Grid (beatgrid marker) - contains nested GRID element with BPM
/// - 5 = Loop
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorCue {
  #[serde(rename = "@NAME")]
  pub name: Option<String>,

  #[serde(rename = "@DISPL_ORDER")]
  pub displ_order: Option<String>,

  #[serde(rename = "@TYPE")]
  pub cue_type: String,

  #[serde(rename = "@START")]
  pub start: String,

  #[serde(rename = "@LEN")]
  pub len: Option<String>,

  #[serde(rename = "@REPEATS")]
  pub repeats: Option<String>,

  #[serde(rename = "@HOTCUE")]
  pub hotcue: Option<String>,

  #[serde(rename = "GRID")]
  pub grid: Option<TraktorGrid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorGrid {
  #[serde(rename = "@BPM")]
  pub bpm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorPrimaryKey {
  #[serde(rename = "@TYPE")]
  pub key_type: Option<String>,

  #[serde(rename = "@KEY")]
  pub key: Option<String>,
}

// ============================================================================
// Playlists Structure
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorPlaylists {
  #[serde(rename = "NODE")]
  pub node: TraktorNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorNode {
  #[serde(rename = "@TYPE")]
  pub node_type: String, // "FOLDER" or "PLAYLIST"

  #[serde(rename = "@NAME")]
  pub name: String,

  #[serde(rename = "SUBNODES")]
  pub subnodes: Option<TraktorSubnodes>,

  #[serde(rename = "PLAYLIST")]
  pub playlist: Option<TraktorPlaylistData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorSubnodes {
  #[serde(rename = "@COUNT")]
  pub count: Option<String>,

  #[serde(rename = "NODE", default)]
  pub nodes: Vec<TraktorNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorPlaylistData {
  #[serde(rename = "@ENTRIES")]
  pub entries: String,

  #[serde(rename = "@TYPE")]
  pub playlist_type: String,

  #[serde(rename = "@UUID")]
  pub uuid: String,

  #[serde(rename = "ENTRY", default)]
  pub entry: Vec<TraktorPlaylistEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorPlaylistEntry {
  #[serde(rename = "PRIMARYKEY")]
  pub primarykey: TraktorPrimaryKey,
}

// ============================================================================
// INDEXING (Sorting Information)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorIndexing {
  #[serde(rename = "SORTING_INFO", default)]
  pub sorting_info: Vec<TraktorSortingInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorSortingInfo {
  #[serde(rename = "@PATH")]
  pub path: String,

  #[serde(rename = "CRITERIA")]
  pub criteria: Option<TraktorCriteria>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraktorCriteria {
  #[serde(rename = "@ATTRIBUTE")]
  pub attribute: String,

  #[serde(rename = "@DIRECTION")]
  pub direction: String, // "UP" (ascending) or "DOWN" (descending)
}
