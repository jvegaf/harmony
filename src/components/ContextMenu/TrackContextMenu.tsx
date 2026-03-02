import { useEffect, useState, useCallback } from 'react';
import { Menu } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  IconEdit,
  IconPlaylistAdd,
  IconPlaylist,
  IconTrash,
  IconSearch,
  IconTags,
  IconWaveSine,
  IconUser,
} from '@tabler/icons-react';

import { TrklistCtxMenuPayload, SearchEngineConfig } from '@/types/harmony';
import { usePlaylistsAPI } from '@/stores/usePlaylistsStore';
import { useLibraryAPI } from '@/stores/useLibraryStore';
import { useTaggerAPI } from '@/stores/useTaggerStore';
import { config, shell } from '@/lib/tauri-api';
import { analyzeAudioTracks } from '@/lib/audio-analysis-helper';
import { ContextMenuState } from '@/hooks/useContextMenu';

import styles from './ContextMenu.module.css';

interface TrackContextMenuProps {
  menuState: ContextMenuState<TrklistCtxMenuPayload>;
  onClose: () => void;
}

/**
 * AIDEV-NOTE: Context menu for track list (AG Grid)
 * Renders on right-click with selected tracks, available playlists, and current playlist context
 * Menu actions call store APIs directly (no Tauri events needed)
 */
export function TrackContextMenu({ menuState, onClose }: TrackContextMenuProps) {
  const navigate = useNavigate();
  const playlistsAPI = usePlaylistsAPI();
  const libraryAPI = useLibraryAPI();
  const taggerAPI = useTaggerAPI();

  const [searchEngines, setSearchEngines] = useState<SearchEngineConfig[]>([]);

  // Load search engines from config on mount
  useEffect(() => {
    const loadEngines = async () => {
      const engines = await config.get('searchEngines');
      if (engines) {
        setSearchEngines(engines);
      }
    };
    loadEngines();
  }, []);

  const { opened, position, data } = menuState;

  // AIDEV-NOTE: Menu actions - call store APIs directly
  // All callbacks defined before early return to comply with React hooks rules

  const handleEditDetails = useCallback(() => {
    if (data?.selected.length === 1) {
      navigate(`/details/${data.selected[0].id}`);
      onClose();
    }
  }, [data, navigate, onClose]);

  const handleAddToNewPlaylist = useCallback(async () => {
    if (data?.selected) {
      await playlistsAPI.create('New playlist', data.selected);
      onClose();
    }
  }, [playlistsAPI, data, onClose]);

  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (data?.selected) {
        await playlistsAPI.addTracks(playlistId, data.selected);
        onClose();
      }
    },
    [playlistsAPI, data, onClose],
  );

  const handleRemoveFromPlaylist = useCallback(async () => {
    if (data?.currentPlaylist && data.selected) {
      await playlistsAPI.removeTracks(data.currentPlaylist, data.selected);
      onClose();
    }
  }, [playlistsAPI, data, onClose]);

  const handleFindByArtist = useCallback(() => {
    const singleTrack = data?.selected.length === 1 ? data.selected[0] : null;
    if (singleTrack?.artist) {
      libraryAPI.search(singleTrack.artist);
      onClose();
    }
  }, [libraryAPI, data, onClose]);

  const handleSearchOn = useCallback(
    async (engine: SearchEngineConfig) => {
      const singleTrack = data?.selected.length === 1 ? data.selected[0] : null;
      if (!singleTrack) return;
      const query = `${singleTrack.artist || ''} ${singleTrack.title || ''}`.trim();
      const url = engine.urlTemplate.replace('{query}', encodeURIComponent(query));
      await shell.openExternal(url);
      onClose();
    },
    [data, onClose],
  );

  const handleFilenameToTags = useCallback(() => {
    if (data?.selected) {
      taggerAPI.filenameToTags(data.selected);
      onClose();
    }
  }, [taggerAPI, data, onClose]);

  const handleFindCandidates = useCallback(() => {
    if (data?.selected) {
      taggerAPI.findCandidates(data.selected);
      onClose();
    }
  }, [taggerAPI, data, onClose]);

  const handleAnalyzeAudio = useCallback(() => {
    if (data?.selected) {
      analyzeAudioTracks(data.selected);
      onClose();
    }
  }, [data, onClose]);

  const handleDeleteTracks = useCallback(async () => {
    if (data?.selected) {
      await libraryAPI.deleteTracks(data.selected);
      onClose();
    }
  }, [libraryAPI, data, onClose]);

  // Early return after all hooks
  if (!data) return null;

  const { selected, playlists, currentPlaylist } = data;
  const singleTrack = selected.length === 1 ? selected[0] : null;

  return (
    <Menu
      opened={opened}
      onChange={onClose}
      position='bottom-start'
      withinPortal
      shadow='md'
      width={220}
    >
      <Menu.Target>
        <div
          className={styles.menuTarget}
          style={{ top: position.y, left: position.x }}
        />
      </Menu.Target>

      <Menu.Dropdown>
        {/* Edit Details (single track only) */}
        {singleTrack && (
          <>
            <Menu.Item
              leftSection={<IconEdit size={16} />}
              onClick={handleEditDetails}
            >
              Edit Details
            </Menu.Item>
            <Menu.Divider />
          </>
        )}

        {/* Playlist operations */}
        <Menu.Item
          leftSection={<IconPlaylistAdd size={16} />}
          onClick={handleAddToNewPlaylist}
        >
          Add to New Playlist
        </Menu.Item>

        {playlists.length > 0 && <Menu.Label>Add to Playlist</Menu.Label>}
        {playlists.map(playlist => (
          <Menu.Item
            key={playlist.id}
            leftSection={<IconPlaylist size={16} />}
            onClick={() => handleAddToPlaylist(playlist.id)}
          >
            {playlist.name}
          </Menu.Item>
        ))}

        {currentPlaylist && (
          <Menu.Item
            leftSection={<IconTrash size={16} />}
            onClick={handleRemoveFromPlaylist}
            color='red'
          >
            Remove from Playlist
          </Menu.Item>
        )}

        <Menu.Divider />

        {/* Search operations */}
        {singleTrack?.artist && (
          <Menu.Item
            leftSection={<IconUser size={16} />}
            onClick={handleFindByArtist}
          >
            Find by Artist
          </Menu.Item>
        )}

        {searchEngines.length > 0 && singleTrack && (
          <>
            <Menu.Label>Search on...</Menu.Label>
            {searchEngines.map(engine => (
              <Menu.Item
                key={engine.id}
                leftSection={<IconSearch size={16} />}
                onClick={() => handleSearchOn(engine)}
              >
                {engine.name}
              </Menu.Item>
            ))}
          </>
        )}

        <Menu.Divider />

        {/* Metadata operations */}
        <Menu.Item
          leftSection={<IconTags size={16} />}
          onClick={handleFilenameToTags}
        >
          Filename to Tags
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSearch size={16} />}
          onClick={handleFindCandidates}
        >
          Find Tag Candidates
        </Menu.Item>
        <Menu.Item
          leftSection={<IconWaveSine size={16} />}
          onClick={handleAnalyzeAudio}
        >
          Analyze Audio
        </Menu.Item>

        <Menu.Divider />

        {/* Delete */}
        <Menu.Item
          leftSection={<IconTrash size={16} />}
          onClick={handleDeleteTracks}
          color='red'
        >
          Delete from Library
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
