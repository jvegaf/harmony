import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconPlus, IconPlayerPlay } from '@tabler/icons-react';
import { Playlist } from '../../../../preload/types/harmony';
import styles from './Sidebar.module.css';

type SidebarProps = {
  trackCount: number;
  playlists: Playlist[];
  onSearch: (query: string) => void;
};

type NavItem = {
  id: string;
  label: string;
  count?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  badge?: string;
};

export default function Sidebar({ trackCount, playlists, onSearch }: SidebarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: NavItem[] = [
    { id: 'queue', label: 'Queue' },
    { id: 'all-tracks', label: `All Tracks`, count: trackCount, isActive: true, isPlaying: true },
    { id: 'recently-added', label: 'Recently Added', count: trackCount },
    { id: 'watch-folder', label: 'Watch Folder', badge: 'Inactive' },
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
        {navItems.map(item => (
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
        ))}
      </nav>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Playlists Section */}
      <div className={styles.playlistsSection}>
        <div className={styles.playlistsHeader}>
          <h3 className={styles.playlistsTitle}>Playlists</h3>
          <button className={styles.addPlaylistBtn}>
            <IconPlus size={18} />
          </button>
        </div>

        {playlists.length > 0 ? (
          <div className={styles.playlistsList}>
            {playlists.map(playlist => (
              <a
                key={playlist.id}
                href='#'
                className={styles.playlistItem}
                onClick={e => e.preventDefault()}
              >
                {playlist.name}
              </a>
            ))}
          </div>
        ) : (
          <p className={styles.noPlaylists}>No playlists yet</p>
        )}
      </div>
    </aside>
  );
}
