import { ReactNode, useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IconSearch, IconPlus, IconPlayerPlay } from '@tabler/icons-react';
import { Playlist } from '../../../../preload/types/harmony';
import styles from './Sidebar.module.css';
import PlaylistsAPI from '@renderer/stores/PlaylistsAPI';
import useLibraryStore from '@renderer/stores/useLibraryStore';
import { JSX } from 'react/jsx-runtime';

type SidebarProps = {
  trackCount: number;
  playlists: Playlist[];
  onSearch: (query: string) => void;
};

type NavItem = {
  id: string;
  isPlaylist: boolean;
  label: string;
  count?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  badge?: string;
};

const { menu, logger } = window.Main;

export default function Sidebar({ trackCount, playlists, onSearch }: SidebarProps) {
  const { playlistID } = useParams();
  const location = useLocation();
  const { renamingPlaylist, api } = useLibraryStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // AIDEV-NOTE: Determine which nav item is active based on current route
  // If we're at root (/), 'all-tracks' is active
  // If we're at /playlists/:id, that playlist is active
  const isRootRoute = location.pathname === '/' || location.pathname === '';

  const navItems: NavItem[] = [
    { id: 'all-tracks', isPlaylist: false, label: `All Tracks`, count: trackCount, isActive: isRootRoute },
    { id: 'recently-added', isPlaylist: false, label: 'Recently Added', count: trackCount, isActive: false },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleNavClick = (itemId: string) => {
    if (itemId === 'all-tracks' || itemId === 'queue' || itemId === 'recently-added') {
      navigate('/');
    }
  };

  const createPlaylist = useCallback(async () => {
    await PlaylistsAPI.create('New playlist', [], false);
  }, []);

  const rename = useCallback(async (playlistID: string, name: string) => {
    await PlaylistsAPI.rename(playlistID, name);
  }, []);

  const keyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.persist();

      switch (e.nativeEvent.code) {
        case 'Enter': {
          // Enter
          if (renamingPlaylist && e.currentTarget) {
            await rename(renamingPlaylist, e.currentTarget.value);
            api.setRenamingPlaylist(null);
          }
          break;
        }
        case 'Escape': {
          // Escape
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

  const nav = playlists.map(elem => {
    let navItemContent: string | number | boolean | JSX.Element | Iterable<ReactNode> | null | undefined;
    // AIDEV-NOTE: Check if this playlist is currently active based on URL params
    const isPlaylistActive = playlistID === elem.id;

    if (elem.id === renamingPlaylist) {
      navItemContent = (
        <input
          className={styles.item__input}
          type='text'
          defaultValue={elem.name}
          onKeyDown={keyDown}
          onBlur={blur}
          onFocus={focus}
          autoFocus
        />
      );
    } else {
      navItemContent = (
        <a
          key={elem.id}
          href='#'
          className={`${styles.navItem} ${isPlaylistActive ? styles.navItemActive : ''}`}
          onClick={e => {
            e.preventDefault();
            handlePlaylistClick(elem.id);
          }}
          onContextMenu={() => onShowCtxtMenu(elem.id)}
        >
          {elem.name}
        </a>
      );
    }

    return <div key={`playlist-${elem.id}`}>{navItemContent}</div>;
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
          placeholder='Search... All Tracks'
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map(
          item =>
            !item.isPlaylist && (
              <a
                key={item.id}
                href='#'
                className={`${styles.navItem} ${item.isActive ? styles.navItemActive : ''}`}
                onClick={e => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
              >
                <span className={styles.navLabel}>
                  {item.label}
                  {item.count !== undefined && ` [${item.count}]`}
                  {item.badge && <span className={styles.navBadge}>[{item.badge}]</span>}
                </span>
                {item.isPlaying && (
                  <IconPlayerPlay
                    className={styles.playingIcon}
                    size={18}
                  />
                )}
              </a>
            ),
        )}
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
        <div className={styles.playlistsContainerWrapper}>
          {playlists.length > 0 ? (
            <div className={styles.playlistsList}>{nav}</div>
          ) : (
            <p className={styles.noPlaylists}></p>
          )}
        </div>
      </div>
    </aside>
  );
}
