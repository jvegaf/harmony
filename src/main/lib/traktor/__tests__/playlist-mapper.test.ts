/**
 * Playlist Mapper Tests
 *
 * TDD tests for mapping Traktor playlists/folders to Harmony structures.
 * Traktor uses a tree structure with folders containing playlists or other folders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';

import { TraktorNMLParser } from '../nml-parser';
import {
  mapTraktorPlaylistToHarmony,
  mapTraktorNodeToFolderTree,
  flattenPlaylistTree,
  mapTraktorPlaylistKeyToPath,
  mapHarmonyPlaylistToTraktor,
} from '../mappers/playlist-mapper';
import type { TraktorNode, TraktorNML } from '../types/nml-types';

const FIXTURE_PATH = resolve(__dirname, 'fixtures/collection.nml');

describe('Playlist Mapper', () => {
  describe('mapTraktorPlaylistKeyToPath()', () => {
    it('should convert Traktor PRIMARYKEY to OS-native system path', () => {
      const key = 'C:/:Users/:josev/:Music/:BOX/:2402/:Illusiones feat. Rafa Barrios (Origi.mp3';
      const path = mapTraktorPlaylistKeyToPath(key);

      // On Windows: C:\Users\josev\Music\BOX\2402\...
      // On Linux: C:/Users/josev/Music/BOX/2402/... (path.resolve will normalize)
      expect(path).toContain('Users');
      expect(path).toContain('josev');
      expect(path).toContain('Music');
      expect(path).toContain('BOX');
      expect(path).toContain('2402');
      expect(path).toContain('Illusiones feat. Rafa Barrios (Origi.mp3');

      // Should start with C: on Windows, or be absolute on Linux
      if (process.platform === 'win32') {
        expect(path).toMatch(/^[A-Z]:\\/);
      } else {
        expect(path).toMatch(/^\//);
      }
    });

    it('should handle keys without volume prefix', () => {
      const key = '/:Users/:josev/:Music/:test.mp3';
      const path = mapTraktorPlaylistKeyToPath(key);

      expect(path).toContain('Users');
      expect(path).toContain('josev');
      expect(path).toContain('Music');
      expect(path).toContain('test.mp3');
    });

    it('should handle special characters in path', () => {
      const key = 'C:/:Users/:josev/:Music/:My & Songs/:track.mp3';
      const path = mapTraktorPlaylistKeyToPath(key);

      expect(path).toContain('Users');
      expect(path).toContain('josev');
      expect(path).toContain('Music');
      expect(path).toContain('My & Songs');
      expect(path).toContain('track.mp3');
    });
  });

  describe('mapTraktorPlaylistToHarmony()', () => {
    it('should map a playlist with entries', () => {
      const traktorNode: TraktorNode = {
        TYPE: 'PLAYLIST',
        NAME: 'My Playlist',
        PLAYLIST: {
          ENTRIES: '2',
          TYPE: 'LIST',
          UUID: 'abc123',
          ENTRY: [
            { PRIMARYKEY: { TYPE: 'TRACK', KEY: 'C:/:test/:track1.mp3' } },
            { PRIMARYKEY: { TYPE: 'TRACK', KEY: 'C:/:test/:track2.mp3' } },
          ],
        },
      };

      const playlist = mapTraktorPlaylistToHarmony(traktorNode);

      expect(playlist.id).toBe('abc123');
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.trackPaths).toHaveLength(2);
      // Paths are now OS-native, so just check they're resolved
      expect(playlist.trackPaths?.[0]).toContain('test');
      expect(playlist.trackPaths?.[0]).toContain('track1.mp3');
      expect(playlist.trackPaths?.[1]).toContain('test');
      expect(playlist.trackPaths?.[1]).toContain('track2.mp3');
    });

    it('should map an empty playlist', () => {
      const traktorNode: TraktorNode = {
        TYPE: 'PLAYLIST',
        NAME: 'Empty Playlist',
        PLAYLIST: {
          ENTRIES: '0',
          TYPE: 'LIST',
          UUID: 'empty123',
        },
      };

      const playlist = mapTraktorPlaylistToHarmony(traktorNode);

      expect(playlist.id).toBe('empty123');
      expect(playlist.name).toBe('Empty Playlist');
      expect(playlist.trackPaths).toHaveLength(0);
    });

    it('should handle single entry (not array)', () => {
      const traktorNode: TraktorNode = {
        TYPE: 'PLAYLIST',
        NAME: 'Single Track',
        PLAYLIST: {
          ENTRIES: '1',
          TYPE: 'LIST',
          UUID: 'single123',
          ENTRY: { PRIMARYKEY: { TYPE: 'TRACK', KEY: 'C:/:test/:track.mp3' } },
        },
      };

      const playlist = mapTraktorPlaylistToHarmony(traktorNode);

      expect(playlist.trackPaths).toHaveLength(1);
      expect(playlist.trackPaths?.[0]).toContain('test');
      expect(playlist.trackPaths?.[0]).toContain('track.mp3');
    });

    it('should generate ID if UUID missing', () => {
      const traktorNode: TraktorNode = {
        TYPE: 'PLAYLIST',
        NAME: 'No UUID',
        PLAYLIST: {
          ENTRIES: '0',
          TYPE: 'LIST',
          UUID: '',
        },
      };

      const playlist = mapTraktorPlaylistToHarmony(traktorNode);

      expect(playlist.id).toBeDefined();
      expect(playlist.id.length).toBeGreaterThan(0);
    });
  });

  describe('mapTraktorNodeToFolderTree()', () => {
    it('should map root folder with playlists', () => {
      const rootNode: TraktorNode = {
        TYPE: 'FOLDER',
        NAME: '$ROOT',
        SUBNODES: {
          COUNT: '2',
          NODE: [
            {
              TYPE: 'PLAYLIST',
              NAME: 'Playlist 1',
              PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'p1' },
            },
            {
              TYPE: 'PLAYLIST',
              NAME: 'Playlist 2',
              PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'p2' },
            },
          ],
        },
      };

      const tree = mapTraktorNodeToFolderTree(rootNode);

      expect(tree.name).toBe('$ROOT');
      expect(tree.isFolder).toBe(true);
      expect(tree.children).toHaveLength(2);
      expect(tree.children?.[0].name).toBe('Playlist 1');
      expect(tree.children?.[1].name).toBe('Playlist 2');
    });

    it('should map nested folders', () => {
      const rootNode: TraktorNode = {
        TYPE: 'FOLDER',
        NAME: '$ROOT',
        SUBNODES: {
          COUNT: '1',
          NODE: {
            TYPE: 'FOLDER',
            NAME: 'Sub Folder',
            SUBNODES: {
              COUNT: '1',
              NODE: {
                TYPE: 'PLAYLIST',
                NAME: 'Nested Playlist',
                PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'nested' },
              },
            },
          },
        },
      };

      const tree = mapTraktorNodeToFolderTree(rootNode);

      expect(tree.children).toHaveLength(1);
      expect(tree.children?.[0].name).toBe('Sub Folder');
      expect(tree.children?.[0].isFolder).toBe(true);
      expect(tree.children?.[0].children?.[0].name).toBe('Nested Playlist');
    });

    it('should handle single child node (not array)', () => {
      const rootNode: TraktorNode = {
        TYPE: 'FOLDER',
        NAME: '$ROOT',
        SUBNODES: {
          COUNT: '1',
          NODE: {
            TYPE: 'PLAYLIST',
            NAME: 'Only Playlist',
            PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'only' },
          },
        },
      };

      const tree = mapTraktorNodeToFolderTree(rootNode);

      expect(tree.children).toHaveLength(1);
      expect(tree.children?.[0].name).toBe('Only Playlist');
    });
  });

  describe('flattenPlaylistTree()', () => {
    it('should flatten folder tree to playlist list with paths', () => {
      const rootNode: TraktorNode = {
        TYPE: 'FOLDER',
        NAME: '$ROOT',
        SUBNODES: {
          COUNT: '2',
          NODE: [
            {
              TYPE: 'PLAYLIST',
              NAME: 'Root Playlist',
              PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'p1' },
            },
            {
              TYPE: 'FOLDER',
              NAME: 'Sub Folder',
              SUBNODES: {
                COUNT: '1',
                NODE: {
                  TYPE: 'PLAYLIST',
                  NAME: 'Nested Playlist',
                  PLAYLIST: { ENTRIES: '0', TYPE: 'LIST', UUID: 'p2' },
                },
              },
            },
          ],
        },
      };

      const tree = mapTraktorNodeToFolderTree(rootNode);
      const flat = flattenPlaylistTree(tree);

      expect(flat).toHaveLength(2);
      expect(flat[0].name).toBe('Root Playlist');
      expect(flat[0].folderPath).toBe('/$ROOT');
      expect(flat[1].name).toBe('Nested Playlist');
      expect(flat[1].folderPath).toBe('/$ROOT/Sub Folder');
    });

    it('should exclude folders from flat list', () => {
      const tree = mapTraktorNodeToFolderTree({
        TYPE: 'FOLDER',
        NAME: '$ROOT',
        SUBNODES: {
          COUNT: '1',
          NODE: {
            TYPE: 'FOLDER',
            NAME: 'Empty Folder',
          },
        },
      });

      const flat = flattenPlaylistTree(tree);

      expect(flat).toHaveLength(0);
    });
  });

  describe('mapHarmonyPlaylistToTraktor()', () => {
    it('should map Harmony playlist to Traktor node', () => {
      const playlist = {
        id: 'playlist-123',
        name: 'My Mix',
        trackPaths: ['/Users/test/track1.mp3', '/Users/test/track2.mp3'],
      };

      const node = mapHarmonyPlaylistToTraktor(playlist);

      expect(node.TYPE).toBe('PLAYLIST');
      expect(node.NAME).toBe('My Mix');
      expect(node.PLAYLIST?.UUID).toBe('playlist-123');
      expect(node.PLAYLIST?.ENTRIES).toBe('2');
      expect(node.PLAYLIST?.ENTRY).toHaveLength(2);
    });

    it('should handle empty playlist', () => {
      const playlist = {
        id: 'empty-123',
        name: 'Empty',
        trackPaths: [],
      };

      const node = mapHarmonyPlaylistToTraktor(playlist);

      expect(node.PLAYLIST?.ENTRIES).toBe('0');
      expect(node.PLAYLIST?.ENTRY).toBeUndefined();
    });
  });

  describe('Integration: Parse playlists from fixture', () => {
    let nml: TraktorNML;

    beforeAll(async () => {
      const parser = new TraktorNMLParser();
      nml = await parser.parse(FIXTURE_PATH);
    });

    it('should find playlists in fixture', () => {
      expect(nml.NML.PLAYLISTS).toBeDefined();
      expect(nml.NML.PLAYLISTS?.NODE.TYPE).toBe('FOLDER');
      expect(nml.NML.PLAYLISTS?.NODE.NAME).toBe('$ROOT');
    });

    it('should parse folder tree structure', () => {
      const tree = mapTraktorNodeToFolderTree(nml.NML.PLAYLISTS!.NODE);

      expect(tree.name).toBe('$ROOT');
      expect(tree.children?.length).toBeGreaterThan(0);
    });

    it('should flatten to playlist list', () => {
      const tree = mapTraktorNodeToFolderTree(nml.NML.PLAYLISTS!.NODE);
      const flat = flattenPlaylistTree(tree);

      // Should find playlists from fixture
      const titoPlaylist = flat.find(p => p.name === 'tito alegria');
      expect(titoPlaylist).toBeDefined();
      expect(titoPlaylist?.trackPaths?.length).toBe(3);
    });

    it('should convert track references to OS-native paths', () => {
      const tree = mapTraktorNodeToFolderTree(nml.NML.PLAYLISTS!.NODE);
      const flat = flattenPlaylistTree(tree);

      const titoPlaylist = flat.find(p => p.name === 'tito alegria');
      if (titoPlaylist?.trackPaths) {
        // Should produce OS-native paths
        expect(titoPlaylist.trackPaths[0]).toContain('Users');
        expect(titoPlaylist.trackPaths[0]).toContain('josev');
        expect(titoPlaylist.trackPaths[0]).toContain('Music');
        expect(titoPlaylist.trackPaths[0]).toContain('BOX');
        expect(titoPlaylist.trackPaths[0]).toContain('2402');

        // Should NOT contain Traktor format markers
        expect(titoPlaylist.trackPaths[0]).not.toContain('/:');

        // On Windows, should contain drive letter (C:) and backslashes
        // On Linux, should be Unix-style absolute path
        if (process.platform === 'win32') {
          expect(titoPlaylist.trackPaths[0]).toMatch(/^[A-Z]:\\/);
        } else {
          expect(titoPlaylist.trackPaths[0]).toMatch(/^\//);
        }
      }
    });
  });
});
