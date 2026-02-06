import { useEffect } from 'react';
import { Outlet, useLocation, useRouteLoaderData } from 'react-router-dom';

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
import { useAutoSyncNotification } from '../hooks/useAutoSyncNotification';
import useLibraryStore, { useLibraryAPI } from '../stores/useLibraryStore';
import styles from './Root.module.css';
import { LoaderData } from './router';
import { Track } from '../../../preload/types/harmony';
import { TrackSelection } from '../../../preload/types/tagger';
import ProgressModal from '../components/Modal/ProgressModal';
import TagCandidatesSelectionModal from '../components/Modal/TagCandidateSelection/TagCandidatesSelection';

const { db, config } = window.Main;

export default function ViewRoot() {
  const trackPlaying = usePlayingTrack();
  const libraryAPI = useLibraryAPI();
  const location = useLocation();
  const { trackTagsCandidates, candidatesSearching, candidatesSearchProgress, tagsApplying, tagsApplyProgress, api } =
    useLibraryStore();

  // AIDEV-NOTE: Show auto-sync notifications when syncing with Traktor
  useAutoSyncNotification();

  const showPlayingBar = location.pathname === '/library' || location.pathname.startsWith('/playlists');

  useEffect(() => {
    AppActions.init();
  }, []);

  const handleSearch = (query: string) => {
    libraryAPI.search(query);
  };

  // Handlers para el modal de Beatport
  const handleSelectionConfirm = (selections: TrackSelection[]) => {
    api.applyTrackTagsSelections(selections);
  };

  const handleSelectionCancel = () => {
    api.setTagCandidates(null);
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

      {/* Modal de búsqueda de candidatos */}
      {candidatesSearching && (
        <ProgressModal
          isOpen={candidatesSearching}
          title='Buscando Candidatos'
          message='Buscando matches en Beatport y Traxsource...'
          processed={candidatesSearchProgress.processed}
          total={candidatesSearchProgress.total}
        />
      )}

      {/* Modal de aplicación de tags */}
      {tagsApplying && (
        <ProgressModal
          isOpen={tagsApplying}
          title='Aplicando Tags'
          message='Actualizando metadata de los tracks...'
          processed={tagsApplyProgress.processed}
          total={tagsApplyProgress.total}
        />
      )}

      {/* Modal de selección de Beatport */}
      {trackTagsCandidates && trackTagsCandidates.length > 0 && (
        <TagCandidatesSelectionModal
          trackCandidates={trackTagsCandidates}
          onConfirm={handleSelectionConfirm}
          onCancel={handleSelectionCancel}
        />
      )}
      {/** App Header */}
      <AppHeader />

      {/** Main Layout */}
      <div className={styles.mainLayout}>
        {/** Sidebar */}
        <SidebarWrapper onSearch={handleSearch} />

        {/** Main Content Area */}
        <main className={styles.mainContent}>
          {/** Now Playing Bar */}
          {showPlayingBar && <NowPlayingBarWrapper track={trackPlaying} />}

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
  const { playlists, tracks } = useRouteLoaderData('root') as RootLoaderData;

  const trackCount = tracks?.length ?? 0;

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
  const { appConfig } = useRouteLoaderData('root') as RootLoaderData;

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
  const playlists = await db.playlists.getAll();
  const appConfig = await config.getAll();

  return { tracks, playlists, appConfig };
};
