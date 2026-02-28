import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';

/**
 * Handle navigation events from Tauri backend (app menu shortcuts)
 * AIDEV-NOTE: Phase 5 - Menu system not yet fully implemented, events should be emitted from Rust
 */
export function useIPCNavigationEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    function goToLibrary() {
      navigate('/');
    }

    function goToPlaylists() {
      navigate('/');
    }

    function goToSettings() {
      navigate('/settings');
    }

    function goToTrackDetail(trackID: string) {
      navigate(`/details/${trackID}`);
    }

    // Shortcuts from the application menu (Phase 5 - needs menu implementation in Rust)
    listen('menu:go-to-library', () => goToLibrary()).then(unlisten => unlisteners.push(unlisten));
    listen('menu:go-to-playlists', () => goToPlaylists()).then(unlisten => unlisteners.push(unlisten));
    listen('menu:go-to-settings', () => goToSettings()).then(unlisten => unlisteners.push(unlisten));
    listen('cmd:track:detail', event => goToTrackDetail(event.payload as string)).then(unlisten =>
      unlisteners.push(unlisten),
    );

    return function cleanup() {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, [navigate]);
}
