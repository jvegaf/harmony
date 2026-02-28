// AIDEV-NOTE: Folder model for playlist hierarchy (Traktor NML support)
// Matches the TypeScript Folder interface

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
  pub id: String,
  pub name: String,
  pub parent_id: Option<String>, // Self-reference for tree structure
  pub path: Option<String>,
}
