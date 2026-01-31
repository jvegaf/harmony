import { useNavigate, useLocation } from 'react-router-dom';
import styles from './AppHeader.module.css';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';

type Tab = {
  id: string;
  label: string;
  path: string;
};

type AppHeaderProps = {
  analysisProgress?: { current: number; total: number } | null;
};

const { app } = window.Main;

export default function AppHeader({ analysisProgress }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs: Tab[] = [
    { id: 'library', label: 'Library', path: '/' },
    { id: 'settings', label: 'Settings', path: '/settings' },
    { id: 'preparation', label: 'Preparation', path: '/preparation' },
    { id: 'prune', label: 'Prune', path: '/prune' },
    { id: 'tools', label: 'Tools', path: '/tools' },
  ];

  const isActiveTab = (tab: Tab) => {
    if (tab.path === '/') {
      return (
        location.pathname === '/' ||
        location.pathname.startsWith('/details') ||
        location.pathname.startsWith('/playlists')
      );
    }
    if (tab.path === '/prune') {
      return location.pathname === '/prune';
    }
    if (tab.path === '/preparation') {
      return location.pathname === '/preparation';
    }
    return location.pathname === tab.path;
  };

  const handleTabClick = (tab: Tab) => {
    navigate(tab.path);
  };

  return (
    <header className={styles.header}>
      {/* Left section - Analysis progress */}
      <div className={styles.leftSection}>
        {analysisProgress && (
          <>
            <span className={styles.analysisText}>
              Analysing {analysisProgress.current}/{analysisProgress.total}
            </span>
            <span className={styles.separator}>|</span>
          </>
        )}
      </div>

      {/* Center section - Tabs */}
      <div className={styles.centerSection}>
        <div className={styles.tabGroup}>
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              type='button'
              className={`${styles.tab} ${isActiveTab(tab) ? styles.tabActive : ''} ${
                index === 0 ? styles.tabFirst : ''
              } ${index === tabs.length - 1 ? styles.tabLast : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right section - Window controls */}
      <div className={styles.rightSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: analysisProgress ? `${(analysisProgress.current / analysisProgress.total) * 100}%` : '0%',
              }}
            />
          </div>
        </div>
        <div className={styles.windowControls}>
          <button
            type='button'
            className={styles.windowControl}
            onClick={() => app.minimize()}
          >
            <IconMinus size={14} />
          </button>
          <button
            type='button'
            className={styles.windowControl}
            onClick={() => app.maximize()}
          >
            <IconSquare size={12} />
          </button>
          <button
            type='button'
            className={styles.windowControl}
            onClick={() => app.close()}
          >
            <IconX size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
