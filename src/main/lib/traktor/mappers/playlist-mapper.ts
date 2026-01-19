/**
 * Playlist Mapper
 *
 * Maps between Traktor NML playlist/folder structure and Harmony playlists.
 *
 * AIDEV-NOTE: Traktor uses a tree structure with:
 * - $ROOT folder at the top
 * - TYPE="FOLDER" for folders containing other nodes
 * - TYPE="PLAYLIST" for actual playlists with track entries
 *
 * Each PLAYLIST has a UUID we use as the Harmony playlist ID.
 * Track references use PRIMARYKEY with a path in Traktor format.
 */

import type { TraktorNode, TraktorPlaylistEntry } from '../types/nml-types';
import { mapSystemPathToTraktor } from './track-mapper';

/**
 * Harmony playlist with optional folder path and track paths.
 * Used for import/export with Traktor.
 */
export interface ImportedPlaylist {
  id: string;
  name: string;
  /** Track file paths (system format) */
  trackPaths?: string[];
  /** Folder path in tree (e.g., "/$ROOT/My Folder") */
  folderPath?: string;
}

/**
 * Folder/playlist tree node for representing hierarchy.
 */
export interface FolderTreeNode {
  name: string;
  isFolder: boolean;
  /** Only for playlists */
  playlist?: ImportedPlaylist;
  /** Child nodes (folders or playlists) */
  children?: FolderTreeNode[];
}

/**
 * Convert Traktor PRIMARYKEY path to system path.
 *
 * Traktor format: "C:/:Users/:josev/:Music/:file.mp3"
 * System format:  "/Users/josev/Music/file.mp3"
 *
 * @param key - Traktor PRIMARYKEY.KEY value
 * @returns System path
 */
export function mapTraktorPlaylistKeyToPath(key: string): string {
  // Remove Windows volume prefix (e.g., "C:" or "D:")
  let path = key;
  if (/^[A-Z]:/.test(path)) {
    path = path.substring(2);
  }

  // Convert /: to / and remove trailing colons
  path = path.replace(/\/:/g, '/').replace(/:+$/g, '');

  return path;
}

/**
 * Generate a unique ID for playlists without UUID.
 */
function generatePlaylistId(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `playlist-${Math.abs(hash).toString(36)}`;
}

/**
 * Map a Traktor playlist node to a Harmony playlist.
 *
 * @param node - Traktor node with TYPE="PLAYLIST"
 * @returns ImportedPlaylist
 */
export function mapTraktorPlaylistToHarmony(node: TraktorNode): ImportedPlaylist {
  const playlistData = node.PLAYLIST;
  const trackPaths: string[] = [];

  if (playlistData?.ENTRY) {
    const entries = Array.isArray(playlistData.ENTRY) ? playlistData.ENTRY : [playlistData.ENTRY];

    for (const entry of entries) {
      if (entry.PRIMARYKEY?.KEY) {
        trackPaths.push(mapTraktorPlaylistKeyToPath(entry.PRIMARYKEY.KEY));
      }
    }
  }

  return {
    id: playlistData?.UUID || generatePlaylistId(node.NAME),
    name: node.NAME,
    trackPaths,
  };
}

/**
 * Map a Traktor node tree to a folder/playlist tree structure.
 *
 * @param node - Traktor node (folder or playlist)
 * @returns FolderTreeNode
 */
export function mapTraktorNodeToFolderTree(node: TraktorNode): FolderTreeNode {
  if (node.TYPE === 'PLAYLIST') {
    return {
      name: node.NAME,
      isFolder: false,
      playlist: mapTraktorPlaylistToHarmony(node),
    };
  }

  // It's a folder
  const children: FolderTreeNode[] = [];

  if (node.SUBNODES?.NODE) {
    const subNodes = Array.isArray(node.SUBNODES.NODE) ? node.SUBNODES.NODE : [node.SUBNODES.NODE];

    for (const subNode of subNodes) {
      children.push(mapTraktorNodeToFolderTree(subNode));
    }
  }

  return {
    name: node.NAME,
    isFolder: true,
    children,
  };
}

/**
 * Flatten a folder tree to a list of playlists with folder paths.
 *
 * @param tree - Root folder tree node
 * @param parentPath - Parent folder path (for recursion)
 * @returns Flat list of playlists with folderPath set
 */
export function flattenPlaylistTree(tree: FolderTreeNode, parentPath: string = ''): ImportedPlaylist[] {
  const currentPath = parentPath ? `${parentPath}/${tree.name}` : `/${tree.name}`;
  const playlists: ImportedPlaylist[] = [];

  if (!tree.isFolder && tree.playlist) {
    // It's a playlist node
    playlists.push({
      ...tree.playlist,
      folderPath: parentPath || '/',
    });
  }

  if (tree.children) {
    for (const child of tree.children) {
      playlists.push(...flattenPlaylistTree(child, currentPath));
    }
  }

  return playlists;
}

/**
 * Map a Harmony playlist to Traktor node format.
 *
 * @param playlist - Harmony playlist with track paths
 * @returns Traktor node
 */
export function mapHarmonyPlaylistToTraktor(playlist: { id: string; name: string; trackPaths: string[] }): TraktorNode {
  const entries: TraktorPlaylistEntry[] = [];

  for (const path of playlist.trackPaths) {
    const { dir, file } = mapSystemPathToTraktor(path);
    // Construct the PRIMARYKEY path format: "C:" + dir + file (without trailing /:)
    const traktorPath = 'C:' + dir.replace(/\/:$/, '') + '/:' + file;

    entries.push({
      PRIMARYKEY: {
        TYPE: 'TRACK',
        KEY: traktorPath,
      },
    });
  }

  const node: TraktorNode = {
    TYPE: 'PLAYLIST',
    NAME: playlist.name,
    PLAYLIST: {
      ENTRIES: String(playlist.trackPaths.length),
      TYPE: 'LIST',
      UUID: playlist.id,
      ENTRY: entries.length > 0 ? entries : undefined,
    },
  };

  return node;
}

/**
 * Create a folder node with children.
 *
 * @param name - Folder name
 * @param children - Child nodes (folders or playlists)
 * @returns Traktor folder node
 */
export function createFolderNode(name: string, children: TraktorNode[]): TraktorNode {
  return {
    TYPE: 'FOLDER',
    NAME: name,
    SUBNODES: {
      COUNT: String(children.length),
      NODE: children.length === 1 ? children[0] : children,
    },
  };
}
