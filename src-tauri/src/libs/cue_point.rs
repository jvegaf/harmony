// AIDEV-NOTE: CuePoint model and CueType enum
// Matches src/preload/types/cue-point.ts
// Used for hot cues, loops, beatgrid markers, fade markers

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CueType {
  HotCue,
  FadeIn,
  FadeOut,
  Load,
  Grid,
  Loop,
}

impl CueType {
  pub fn as_str(&self) -> &'static str {
    match self {
      CueType::HotCue => "hot_cue",
      CueType::FadeIn => "fade_in",
      CueType::FadeOut => "fade_out",
      CueType::Load => "load",
      CueType::Grid => "grid",
      CueType::Loop => "loop",
    }
  }

  pub fn to_string(&self) -> String {
    self.as_str().to_string()
  }

  pub fn from_str(s: &str) -> Option<Self> {
    match s {
      "hot_cue" => Some(CueType::HotCue),
      "fade_in" => Some(CueType::FadeIn),
      "fade_out" => Some(CueType::FadeOut),
      "load" => Some(CueType::Load),
      "grid" => Some(CueType::Grid),
      "loop" => Some(CueType::Loop),
      _ => None,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CuePoint {
  pub id: String,
  pub track_id: String,
  #[serde(rename = "type")]
  pub cue_type: CueType,
  pub position_ms: f64, // Real for microsecond precision
  pub length_ms: Option<f64>,
  pub hotcue_slot: Option<i32>,
  pub name: Option<String>,
  pub color: Option<String>,
  pub order: Option<i32>,
}
