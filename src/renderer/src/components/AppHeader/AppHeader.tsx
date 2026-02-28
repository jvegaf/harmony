import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import styles from './AppHeader.module.css';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react';
import { app } from '@renderer/lib/tauri-api';

type Tab = {
  id: string;
  label: string;
  path: string;
};

type AppHeaderProps = {
  analysisProgress?: { current: number; total: number } | null;
};

export default function AppHeader({ analysisProgress }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);

  const tabs: Tab[] = [
    { id: 'library', label: 'Library', path: '/library' },
    { id: 'settings', label: 'Settings', path: '/settings' },
    { id: 'preparation', label: 'Preparation', path: '/preparation' },
    { id: 'prune', label: 'Prune', path: '/prune' },
    { id: 'tools', label: 'Tools', path: '/tools' },
  ];

  // AIDEV-NOTE: Setup window dragging for custom titlebar
  // Uses Tauri's startDragging() API for manual drag region control
  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    const handleMouseDown = async (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Check if the click is on the draggable region (not on buttons/tabs)
      const target = e.target as HTMLElement;
      const isInteractive =
        target.closest('button') ||
        target.closest('[data-no-drag]') ||
        target.closest(`.${styles.tabGroup}`) ||
        target.closest(`.${styles.windowControls}`) ||
        target.closest(`.${styles.progressBar}`);

      if (isInteractive) return;

      // Double-click to maximize/restore
      if (e.detail === 2) {
        await getCurrentWindow().toggleMaximize();
      } else {
        // Start dragging
        await getCurrentWindow().startDragging();
      }
    };

    headerElement.addEventListener('mousedown', handleMouseDown);

    return () => {
      headerElement.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const isActiveTab = (tab: Tab) => {
    if (tab.path === '/') {
      return (
        location.pathname === '/library' ||
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
    <header
      ref={headerRef}
      className={styles.header}
      data-tauri-drag-region
    >
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
