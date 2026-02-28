// AIDEV-NOTE: Playlist Sync for Traktor NML - Phase 4.5
//
// Maps between Traktor NML playlist/folder structure and Harmony playlists.
//
// Traktor uses a tree structure:
// - $ROOT folder at the top
// - TYPE="FOLDER" for folders containing other nodes
// - TYPE="PLAYLIST" for actual playlists with track entries
//
// Each PLAYLIST has a UUID we use as the Harmony playlist ID.
// Track references use PRIMARYKEY with a path in Traktor format.
//
// Reference: src/main/lib/traktor/mappers/playlist-mapper.ts

use log::{debug, warn};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

use crate::libs::playlist::Playlist;
use crate::libs::traktor::mapper::map_traktor_path_to_system;
use crate::libs::traktor::nml_types::TraktorNode;

/// Harmony playlist with track paths for import/export
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedPlaylist {
  pub id: String,
  pub name: String,
  /// Track file paths (system format)
  pub track_paths: Vec<String>,
  /// Folder path in tree (e.g., "/$ROOT/My Folder")
  pub folder_path: Option<String>,
}

/// Folder/playlist tree node for representing hierarchy
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderTreeNode {
  pub name: String,
  pub is_folder: bool,
  /// Only for playlists
  pub playlist: Option<ImportedPlaylist>,
  /// Child nodes (folders or playlists)
  pub children: Vec<FolderTreeNode>,
}

/// Convert Traktor PRIMARYKEY path to system path.
///
/// AIDEV-NOTE: Path conversion from Traktor format to OS-native format
/// Traktor format: "C:/:Users/:josev/:Music/:BOX/:2402/:file.mp3"
/// Windows output:  C:\Users\josev\Music\BOX\2402\file.mp3
/// Linux output:    /Users/josev/Music/BOX/2402/file.mp3
///
/// # Arguments
/// * `key` - Traktor PRIMARYKEY.KEY value
///
/// # Returns
/// OS-native system path
pub fn map_traktor_playlist_key_to_path(key: &str) -> String {
  // Extract volume prefix if present (e.g., "C:" or "D:")
  let (volume, traktor_path) = if key.len() >= 2 && key.chars().nth(1) == Some(':') {
    let vol = &key[0..2];
    let path = &key[2..];
    (Some(vol), path)
  } else {
    (None, key)
  };

  // Split traktor path into dir + file
  // Traktor format: "/:Users/:josev/:Music/:BOX/:2402/:file.mp3"
  // Need to extract: dir="/:Users/:josev/:Music/:BOX/:2402/:" file="file.mp3"
  let last_slash_colon = traktor_path.rfind("/:");

  let (dir, file) = if let Some(idx) = last_slash_colon {
    let d = &traktor_path[0..idx + 2]; // Include the trailing /:
    let f = &traktor_path[idx + 2..]; // After /:
    (d, f)
  } else {
    // No /: delimiter found - treat entire string as filename (edge case)
    ("", traktor_path)
  };

  // Convert to system path
  map_traktor_path_to_system(dir, file, volume)
}

/// Generate a deterministic ID for playlists without UUID.
///
/// # Arguments
/// * `name` - Playlist name
///
/// # Returns
/// Unique playlist ID (format: "playlist-{hash}")
fn generate_playlist_id(name: &str) -> String {
  let mut hasher = DefaultHasher::new();
  name.hash(&mut hasher);
  let hash = hasher.finish();
  format!("playlist-{:x}", hash)
}

/// Map a Traktor playlist node to a Harmony playlist.
///
/// AIDEV-NOTE: Extracts playlist metadata and track paths from Traktor NODE
/// - Uses UUID as playlist ID (or generates one from name)
/// - Converts PRIMARYKEY paths to system format
/// - Preserves track order from ENTRY array
///
/// # Arguments
/// * `node` - Traktor node with TYPE="PLAYLIST"
///
/// # Returns
/// ImportedPlaylist with track paths
pub fn map_traktor_playlist_to_harmony(node: &TraktorNode) -> ImportedPlaylist {
  let mut track_paths: Vec<String> = Vec::new();

  if let Some(playlist_data) = &node.playlist {
    for entry in &playlist_data.entry {
      if let Some(key) = &entry.primarykey.key {
        let system_path = map_traktor_playlist_key_to_path(key);
        track_paths.push(system_path);
      } else {
        warn!("Playlist entry missing PRIMARYKEY.KEY");
      }
    }

    debug!(
      "Mapped Traktor playlist '{}' with {} tracks",
      node.name,
      track_paths.len()
    );

    ImportedPlaylist {
      id: playlist_data.uuid.clone(),
      name: node.name.clone(),
      track_paths,
      folder_path: None, // Will be set by flattenPlaylistTree
    }
  } else {
    // No playlist data - should not happen for TYPE="PLAYLIST"
    warn!(
      "Node '{}' has TYPE=PLAYLIST but no PLAYLIST data",
      node.name
    );
    ImportedPlaylist {
      id: generate_playlist_id(&node.name),
      name: node.name.clone(),
      track_paths: vec![],
      folder_path: None,
    }
  }
}

/// Map a Traktor node tree to a folder/playlist tree structure.
///
/// AIDEV-NOTE: Recursively converts Traktor NODE tree to FolderTreeNode
/// - TYPE="PLAYLIST" → playlist node
/// - TYPE="FOLDER" → folder node with children
///
/// # Arguments
/// * `node` - Traktor node (folder or playlist)
///
/// # Returns
/// FolderTreeNode with hierarchy
pub fn map_traktor_node_to_folder_tree(node: &TraktorNode) -> FolderTreeNode {
  if node.node_type == "PLAYLIST" {
    return FolderTreeNode {
      name: node.name.clone(),
      is_folder: false,
      playlist: Some(map_traktor_playlist_to_harmony(node)),
      children: vec![],
    };
  }

  // It's a folder - process children
  let mut children: Vec<FolderTreeNode> = Vec::new();

  if let Some(subnodes) = &node.subnodes {
    for subnode in &subnodes.nodes {
      children.push(map_traktor_node_to_folder_tree(subnode));
    }
  }

  debug!(
    "Mapped Traktor folder '{}' with {} children",
    node.name,
    children.len()
  );

  FolderTreeNode {
    name: node.name.clone(),
    is_folder: true,
    playlist: None,
    children,
  }
}

/// Flatten a folder tree to a list of playlists with folder paths.
///
/// AIDEV-NOTE: Recursively walks tree and collects all playlists
/// - Sets folderPath for each playlist based on parent hierarchy
/// - Example: "/$ROOT/House Music/Deep House"
///
/// # Arguments
/// * `tree` - Root folder tree node
/// * `parent_path` - Parent folder path (for recursion)
///
/// # Returns
/// Flat list of playlists with folderPath set
pub fn flatten_playlist_tree(
  tree: &FolderTreeNode,
  parent_path: Option<&str>,
) -> Vec<ImportedPlaylist> {
  let current_path = if let Some(parent) = parent_path {
    format!("{}/{}", parent, tree.name)
  } else {
    format!("/{}", tree.name)
  };

  let mut playlists: Vec<ImportedPlaylist> = Vec::new();

  if !tree.is_folder {
    // It's a playlist node
    if let Some(mut playlist) = tree.playlist.clone() {
      playlist.folder_path = parent_path.map(|s| s.to_string()).or(Some("/".to_string()));
      playlists.push(playlist);
    }
  }

  // Process children recursively
  for child in &tree.children {
    playlists.extend(flatten_playlist_tree(child, Some(&current_path)));
  }

  playlists
}

/// Extract all playlists from Traktor NML PLAYLISTS structure.
///
/// AIDEV-NOTE: Main entry point for playlist extraction
/// - Parses the root NODE (usually named "$ROOT")
/// - Converts to tree, then flattens to list
/// - Returns playlists with track paths and folder paths
///
/// # Arguments
/// * `root_node` - Root Traktor node from PLAYLISTS/NODE
///
/// # Returns
/// Vec of ImportedPlaylist
pub fn extract_playlists_from_traktor(root_node: &TraktorNode) -> Vec<ImportedPlaylist> {
  debug!(
    "Extracting playlists from Traktor NML root node '{}'",
    root_node.name
  );

  let tree = map_traktor_node_to_folder_tree(root_node);
  let playlists = flatten_playlist_tree(&tree, None);

  debug!("Extracted {} playlists from Traktor NML", playlists.len());
  playlists
}

/// Convert ImportedPlaylist to Harmony Playlist (for database storage).
///
/// AIDEV-NOTE: Final conversion step before saving to database
/// - Harmony Playlist requires actual Track objects, not paths
/// - This function creates the playlist metadata only
/// - Track associations are created separately via PlaylistTrack entries
///
/// # Arguments
/// * `imported` - ImportedPlaylist with track paths
///
/// # Returns
/// Harmony Playlist (without tracks populated)
pub fn convert_to_harmony_playlist(imported: &ImportedPlaylist) -> Playlist {
  Playlist {
    id: imported.id.clone(),
    name: imported.name.clone(),
    folder_id: imported.folder_path.clone(),
    tracks: vec![], // Tracks are linked via PlaylistTrack table
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::libs::traktor::nml_types::{TraktorPlaylistData, TraktorSubnodes};

  #[test]
  fn test_map_traktor_playlist_key_to_path_windows() {
    // Traktor format with Windows volume
    let key = "C:/:Users/:josev/:Music/:track.mp3";
    let path = map_traktor_playlist_key_to_path(key);

    #[cfg(target_os = "windows")]
    assert_eq!(path, "C:\\Users\\josev\\Music\\track.mp3");

    #[cfg(not(target_os = "windows"))]
    assert_eq!(path, "/Users/josev/Music/track.mp3");
  }

  #[test]
  fn test_map_traktor_playlist_key_to_path_unix() {
    // Traktor format without volume (Unix)
    let key = "/:home/:user/:music/:track.mp3";
    let path = map_traktor_playlist_key_to_path(key);

    #[cfg(target_os = "windows")]
    assert_eq!(path, "\\home\\user\\music\\track.mp3");

    #[cfg(not(target_os = "windows"))]
    assert_eq!(path, "/home/user/music/track.mp3");
  }

  #[test]
  fn test_generate_playlist_id_deterministic() {
    let id1 = generate_playlist_id("House Music");
    let id2 = generate_playlist_id("House Music");
    assert_eq!(id1, id2); // Same name = same ID

    let id3 = generate_playlist_id("Techno");
    assert_ne!(id1, id3); // Different name = different ID
  }

  #[test]
  fn test_map_traktor_playlist_to_harmony() {
    let node = TraktorNode {
      node_type: "PLAYLIST".to_string(),
      name: "My Playlist".to_string(),
      subnodes: None,
      playlist: Some(TraktorPlaylistData {
        entries: "2".to_string(),
        playlist_type: "LIST".to_string(),
        uuid: "test-uuid-123".to_string(),
        entry: vec![
          TraktorPlaylistEntry {
            primarykey: TraktorPrimaryKey {
              key_type: "TRACK".to_string(),
              key: Some("/:music/:track1.mp3".to_string()),
            },
          },
          TraktorPlaylistEntry {
            primarykey: TraktorPrimaryKey {
              key_type: "TRACK".to_string(),
              key: Some("/:music/:track2.mp3".to_string()),
            },
          },
        ],
      }),
    };

    let playlist = map_traktor_playlist_to_harmony(&node);

    assert_eq!(playlist.id, "test-uuid-123");
    assert_eq!(playlist.name, "My Playlist");
    assert_eq!(playlist.track_paths.len(), 2);
  }

  #[test]
  fn test_map_traktor_node_to_folder_tree_playlist() {
    let node = TraktorNode {
      node_type: "PLAYLIST".to_string(),
      name: "Test Playlist".to_string(),
      subnodes: None,
      playlist: Some(TraktorPlaylistData {
        entries: "0".to_string(),
        playlist_type: "LIST".to_string(),
        uuid: "uuid-1".to_string(),
        entry: vec![],
      }),
    };

    let tree = map_traktor_node_to_folder_tree(&node);

    assert!(!tree.is_folder);
    assert!(tree.playlist.is_some());
    assert_eq!(tree.children.len(), 0);
  }

  #[test]
  fn test_map_traktor_node_to_folder_tree_folder() {
    let node = TraktorNode {
      node_type: "FOLDER".to_string(),
      name: "My Folder".to_string(),
      subnodes: Some(TraktorSubnodes {
        count: Some("1".to_string()),
        nodes: vec![TraktorNode {
          node_type: "PLAYLIST".to_string(),
          name: "Child Playlist".to_string(),
          subnodes: None,
          playlist: Some(TraktorPlaylistData {
            entries: "0".to_string(),
            playlist_type: "LIST".to_string(),
            uuid: "uuid-2".to_string(),
            entry: vec![],
          }),
        }],
      }),
      playlist: None,
    };

    let tree = map_traktor_node_to_folder_tree(&node);

    assert!(tree.is_folder);
    assert!(tree.playlist.is_none());
    assert_eq!(tree.children.len(), 1);
    assert_eq!(tree.children[0].name, "Child Playlist");
  }

  #[test]
  fn test_flatten_playlist_tree() {
    let tree = FolderTreeNode {
      name: "$ROOT".to_string(),
      is_folder: true,
      playlist: None,
      children: vec![
        FolderTreeNode {
          name: "House".to_string(),
          is_folder: true,
          playlist: None,
          children: vec![FolderTreeNode {
            name: "Deep House".to_string(),
            is_folder: false,
            playlist: Some(ImportedPlaylist {
              id: "playlist-1".to_string(),
              name: "Deep House".to_string(),
              track_paths: vec![],
              folder_path: None,
            }),
            children: vec![],
          }],
        },
        FolderTreeNode {
          name: "Techno".to_string(),
          is_folder: false,
          playlist: Some(ImportedPlaylist {
            id: "playlist-2".to_string(),
            name: "Techno".to_string(),
            track_paths: vec![],
            folder_path: None,
          }),
          children: vec![],
        },
      ],
    };

    let playlists = flatten_playlist_tree(&tree, None);

    assert_eq!(playlists.len(), 2);

    // First playlist is nested: /$ROOT/House/Deep House
    assert_eq!(playlists[0].name, "Deep House");
    assert_eq!(playlists[0].folder_path, Some("/$ROOT/House".to_string()));

    // Second playlist is at root level: /$ROOT/Techno
    assert_eq!(playlists[1].name, "Techno");
    assert_eq!(playlists[1].folder_path, Some("/$ROOT".to_string()));
  }

  #[test]
  fn test_extract_playlists_from_traktor() {
    let root = TraktorNode {
      node_type: "FOLDER".to_string(),
      name: "$ROOT".to_string(),
      subnodes: Some(TraktorSubnodes {
        count: Some("2".to_string()),
        nodes: vec![
          TraktorNode {
            node_type: "PLAYLIST".to_string(),
            name: "Playlist A".to_string(),
            subnodes: None,
            playlist: Some(TraktorPlaylistData {
              entries: "0".to_string(),
              playlist_type: "LIST".to_string(),
              uuid: "uuid-a".to_string(),
              entry: vec![],
            }),
          },
          TraktorNode {
            node_type: "FOLDER".to_string(),
            name: "Subfolder".to_string(),
            subnodes: Some(TraktorSubnodes {
              count: Some("1".to_string()),
              nodes: vec![TraktorNode {
                node_type: "PLAYLIST".to_string(),
                name: "Playlist B".to_string(),
                subnodes: None,
                playlist: Some(TraktorPlaylistData {
                  entries: "0".to_string(),
                  playlist_type: "LIST".to_string(),
                  uuid: "uuid-b".to_string(),
                  entry: vec![],
                }),
              }],
            }),
            playlist: None,
          },
        ],
      }),
      playlist: None,
    };

    let playlists = extract_playlists_from_traktor(&root);

    assert_eq!(playlists.len(), 2);
    assert_eq!(playlists[0].name, "Playlist A");
    assert_eq!(playlists[1].name, "Playlist B");
  }

  #[test]
  fn test_convert_to_harmony_playlist() {
    let imported = ImportedPlaylist {
      id: "test-id".to_string(),
      name: "Test Playlist".to_string(),
      track_paths: vec!["/path/to/track1.mp3".to_string()],
      folder_path: Some("/$ROOT/House".to_string()),
    };

    let harmony = convert_to_harmony_playlist(&imported);

    assert_eq!(harmony.id, "test-id");
    assert_eq!(harmony.name, "Test Playlist");
    assert_eq!(harmony.folder_id, Some("/$ROOT/House".to_string()));
    assert_eq!(harmony.tracks.len(), 0); // Tracks linked separately
  }
}
