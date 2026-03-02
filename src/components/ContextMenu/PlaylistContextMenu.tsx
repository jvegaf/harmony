import { useCallback } from 'react';
import { Menu } from '@mantine/core';
import { IconEdit, IconCopy, IconFileExport, IconTrash } from '@tabler/icons-react';

import { usePlaylistsAPI } from '@/stores/usePlaylistsStore';
import useLibraryUIStore from '@/stores/useLibraryUIStore';
import { ContextMenuState } from '@/hooks/useContextMenu';

import styles from './ContextMenu.module.css';

interface PlaylistContextMenuProps {
  menuState: ContextMenuState<string>;
  onClose: () => void;
}

/**
 * AIDEV-NOTE: Context menu for playlist items in sidebar
 * Renders on right-click with playlistId
 * Menu actions call store APIs directly (no Tauri events needed)
 */
export function PlaylistContextMenu({ menuState, onClose }: PlaylistContextMenuProps) {
  const playlistsAPI = usePlaylistsAPI();
  const uiAPI = useLibraryUIStore(state => state.api);

  const { opened, position, data: playlistId } = menuState;

  // AIDEV-NOTE: Menu actions - call store APIs directly
  // All callbacks defined before early return to comply with React hooks rules

  const handleRename = useCallback(() => {
    if (playlistId) {
      uiAPI.setRenamingPlaylist(playlistId);
      onClose();
    }
  }, [uiAPI, playlistId, onClose]);

  const handleDuplicate = useCallback(async () => {
    if (playlistId) {
      await playlistsAPI.duplicate(playlistId);
      onClose();
    }
  }, [playlistsAPI, playlistId, onClose]);

  const handleExport = useCallback(async () => {
    if (playlistId) {
      await playlistsAPI.exportToM3u(playlistId);
      onClose();
    }
  }, [playlistsAPI, playlistId, onClose]);

  const handleDelete = useCallback(async () => {
    if (playlistId) {
      await playlistsAPI.remove(playlistId);
      onClose();
    }
  }, [playlistsAPI, playlistId, onClose]);

  // Early return after all hooks
  if (!playlistId) return null;

  return (
    <Menu
      opened={opened}
      onChange={onClose}
      position='bottom-start'
      withinPortal
      shadow='md'
      width={200}
    >
      <Menu.Target>
        <div
          className={styles.menuTarget}
          style={{ top: position.y, left: position.x }}
        />
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit size={16} />}
          onClick={handleRename}
        >
          Rename
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy size={16} />}
          onClick={handleDuplicate}
        >
          Duplicate
        </Menu.Item>
        <Menu.Item
          leftSection={<IconFileExport size={16} />}
          onClick={handleExport}
        >
          Export to M3U
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconTrash size={16} />}
          onClick={handleDelete}
          color='red'
        >
          Delete Playlist
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
