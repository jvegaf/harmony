import { useEffect, useState } from 'react';
import { Outlet, useRouteLoaderData } from 'react-router-dom';

import AppEvents from '../components/Events/AppEvents';
import GlobalKeyBindings from '../components/Events/GlobalKeyBindings';
import IPCNavigationEvents from '../components/Events/IPCNavigationEvents';
import IPCPlayerEvents from '../components/Events/IPCPlayerEvents';
import MediaSessionEvents from '../components/Events/MediaSessionEvents';
import PlayerEvents from '../components/Events/PlayerEvents';
import AppActions from '../stores/AppAPI';

import IPCMenuEvents from '../components/Events/IPCMenuEvents';
import AppHeader from '../components/AppHeader/AppHeader';
import Sidebar from '../components/Sidebar/Sidebar';
import NowPlayingBar from '../components/NowPlayingBar/NowPlayingBar';
import usePlayingTrack from '../hooks/usePlayingTrack';
import { useLibraryAPI } from '../stores/useLibraryStore';
import styles from './Root.module.css';
import { LoaderData } from './router';
import { Playlist, Track } from '../../../preload/types/harmony';

const { db, config } = window.Main;

export default function ViewRoot() {
  const trackPlaying = usePlayingTrack();
  const libraryAPI = useLibraryAPI();

  useEffect(() => {
    AppActions.init();
  }, []);

  const handleSearch = (query: string) => {
    libraryAPI.search(query);
  };

  return (
    <div className={styles.root}>
      {/** Bunch of global event handlers */}
      <IPCNavigationEvents />
      <IPCPlayerEvents />
      <AppEvents />
      <PlayerEvents />
      <MediaSessionEvents />
      <GlobalKeyBindings />
      <IPCMenuEvents />

      {/** App Header */}
      <AppHeader />

      {/** Main Layout */}
      <div className={styles.mainLayout}>
        {/** Sidebar */}
        <SidebarWrapper onSearch={handleSearch} />

        {/** Main Content Area */}
        <main className={styles.mainContent}>
          {/** Now Playing Bar */}
          <NowPlayingBarWrapper track={trackPlaying} />

          {/** Content Outlet */}
          <div className={styles.contentArea}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// Wrapper component to get data from route loader
function SidebarWrapper({ onSearch }: { onSearch: (query: string) => void }) {
  const routeData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const loadPlaylists = async () => {
      const loadedPlaylists = await db.playlists.getAll();
      setPlaylists(loadedPlaylists);
    };
    loadPlaylists();
  }, []);

  const trackCount = routeData?.tracks?.length ?? 0;

  return (
    <Sidebar
      trackCount={trackCount}
      playlists={playlists}
      onSearch={onSearch}
    />
  );
}

// Wrapper component to get config from route loader
function NowPlayingBarWrapper({ track }: { track: Track | null }) {
  const routeData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const appConfig = routeData?.appConfig;

  if (!appConfig) return null;

  return (
    <NowPlayingBar
      track={track}
      config={appConfig}
    />
  );
}

export type RootLoaderData = LoaderData<typeof ViewRoot.loader>;

ViewRoot.loader = async () => {
  // this can be slow, think about caching it or something, especially when
  // we revalidate routing
  const tracks = await db.tracks.getAll();
  const appConfig = await config.getAll();
  return { tracks, appConfig };
};
