import { type ReactNode, useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconSearch, IconPlus, IconMusic, IconVinyl, IconClock } from '@tabler/icons-react';

import { Playlist } from '../../../../preload/types/harmony';
import { usePlaylistsAPI } from '@renderer/stores/usePlaylistsStore';
import useLibraryStore, { useLibraryAPI } from '@renderer/stores/useLibraryStore';

import styles from './Sidebar.module.css';

type SidebarProps = {
  playlists: Playlist[];
  onSearch: (query: string) => void;
};

const { menu, logger } = window.Main;

/**
 * Sidebar navigation with Collection, Recently Added, and Playlists.
 * Active state is determined by the current route:
 * - /library → Collection is active
 * - /playlists/:id → that playlist is active
 * - Neither Collection nor any playlist → no active state (e.g. /settings, /tools)
 */
export default function Sidebar({ playlists, onSearch }: SidebarProps) {
  const { playlistID } = useParams();
  const location = useLocation();
  const { renamingPlaylist, api } = useLibraryStore();
  const libraryAPI = useLibraryAPI();
  const playlistsAPI = usePlaylistsAPI();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Determine active nav item based on current route
  const isLibraryRoute = location.pathname === '/library' || location.pathname === '/';
  const isRecentRoute = location.pathname === '/recent_added';

  // Clear search when navigating to track detail view
  useEffect(() => {
    if (location.pathname.startsWith('/details/')) {
      setSearchQuery('');
      libraryAPI.search('');
    }
  }, [location.pathname, libraryAPI]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  // Handle Escape key to clear search and remove focus
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      onSearch('');
      e.currentTarget.blur();
    }
  };

  const createPlaylist = useCallback(async () => {
    await playlistsAPI.create('New playlist', [], false);
  }, [playlistsAPI]);

  const rename = useCallback(async (playlistID: string, name: string) => {
    await playlistsAPI.rename(playlistID, name);
  }, [playlistsAPI]);

  const keyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.persist();

      switch (e.nativeEvent.code) {
        case 'Enter': {
          if (renamingPlaylist && e.currentTarget) {
            await rename(renamingPlaylist, e.currentTarget.value);
            api.setRenamingPlaylist(null);
          }
          break;
        }
        case 'Escape': {
          api.setRenamingPlaylist(null);
          break;
        }
        default: {
          break;
        }
      }
    },
    [renamingPlaylist, rename, api],
  );

  const blur = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      if (renamingPlaylist) {
        await rename(renamingPlaylist, e.currentTarget.value);
      }

      api.setRenamingPlaylist(null);
    },
    [rename, renamingPlaylist, api],
  );

  const focus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  }, []);

  const onShowCtxtMenu = useCallback((playlistId: string) => {
    menu.playlist(playlistId);
  }, []);

  const handlePlaylistClick = useCallback(
    (playlistId: string) => {
      logger.debug('Navigating to playlist:', `/playlists/${playlistId}`);
      navigate(`/playlists/${playlistId}`);
    },
    [navigate],
  );

  // Render playlist items with active state based on URL params
  const playlistItems = playlists.map(elem => {
    const isPlaylistActive = playlistID === elem.id;
    let content: ReactNode;

    if (elem.id === renamingPlaylist) {
      content = (
        <input
          className={styles.renameInput}
          type='text'
          defaultValue={elem.name}
          onKeyDown={keyDown}
          onBlur={blur}
          onFocus={focus}
          autoFocus
        />
      );
    } else {
      content = (
        <a
          href='#'
          className={`${styles.navItem} ${isPlaylistActive ? styles.navItemActive : ''}`}
          onClick={e => {
            e.preventDefault();
            handlePlaylistClick(elem.id);
          }}
          onContextMenu={() => onShowCtxtMenu(elem.id)}
        >
          <span className={styles.navLabel}>
            <IconMusic
              size={16}
              className={styles.navIcon}
            />
            {elem.name}
          </span>
        </a>
      );
    }

    return <div key={`playlist-${elem.id}`}>{content}</div>;
  });

  return (
    <aside className={styles.sidebar}>
      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <IconSearch
          className={styles.searchIcon}
          size={18}
        />
        <input
          type='text'
          className={styles.searchInput}
          placeholder='Search...       [ctrl+k]'
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          data-search-input='true'
        />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <a
          href='#'
          className={`${styles.navItem} ${isLibraryRoute ? styles.navItemActive : ''}`}
          onClick={e => {
            e.preventDefault();
            navigate('/library');
          }}
        >
          <span className={styles.navLabel}>
            <IconVinyl
              size={16}
              className={styles.navIcon}
            />
            Collection
          </span>
        </a>
        <a
          href='#'
          className={`${styles.navItem} ${isRecentRoute ? styles.navItemActive : ''}`}
          onClick={e => {
            e.preventDefault();
            navigate('/recent_added');
          }}
        >
          <span className={styles.navLabel}>
            <IconClock
              size={16}
              className={styles.navIcon}
            />
            Recently Added
          </span>
        </a>
      </nav>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Playlists Section */}
      <div className={styles.playlistsHeader}>
        <h3 className={styles.playlistsTitle}>Playlists</h3>
        <button
          type='button'
          onClick={createPlaylist}
          className={styles.addPlaylistBtn}
        >
          <IconPlus size={18} />
        </button>
      </div>
      <div className={styles.playlistsSection}>
        {playlists.length > 0 ? (
          <div className={styles.playlistsList}>{playlistItems}</div>
        ) : (
          <p className={styles.noPlaylists}></p>
        )}
      </div>
    </aside>
  );
}
