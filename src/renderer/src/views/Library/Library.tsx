import { useEffect, useMemo, useState } from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router-dom';

import * as ViewMessage from '../../elements/ViewMessage/ViewMessage';
import useLibraryStore from '../../stores/useLibraryStore';
import usePlayingTrackID from '../../hooks/usePlayingTrackID';
import useFilteredTracks from '../../hooks/useFilteredTracks';
import type { TrackSelection } from '../../../../preload/types/beatport';

import { RootLoaderData } from '../Root';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Library.module.css';
import TrackList from '../../components/TrackList/TrackList';
import { useViewportSize } from '../../hooks/useViewPortSize';
import ProgressModal from '../../components/Modal/ProgressModal';
import BeatportSelectionModal from '../../components/Modal/Beatport/BeatportModal';
import Footer from '../../components/Footer/Footer';
// import SearchBar from '../../components/SearchBar/SearchBar';

const { db } = window.Main;

export default function LibraryView() {
  const trackPlayingID = usePlayingTrackID();
  const { refreshing, search, beatportCandidates, api } = useLibraryStore();
  const { width, height } = useViewportSize();
  const [message, setMessage] = useState<string>('');

  const { playlists } = useLoaderData() as LibraryLoaderData;
  const { tracks } = useRouteLoaderData('root') as RootLoaderData;
  const filteredTracks = useFilteredTracks(tracks);

  useEffect(() => {
    if (filteredTracks.length) setMessage(`Total ${filteredTracks.length} tracks`);

    return () => {
      setMessage('');
    };
  }, [filteredTracks]);

  // Handlers para el modal de Beatport
  const handleBeatportConfirm = (selections: TrackSelection[]) => {
    api.applyBeatportSelections(selections);
  };

  const handleBeatportCancel = () => {
    api.setBeatportCandidates(null);
  };

  const getLibraryComponent = useMemo(() => {
    // Empty library
    if (filteredTracks.length === 0 && search === '') {
      if (refreshing) {
        return (
          <ViewMessage.Notice>
            <p>Your library is being scanned =)</p>
            <ViewMessage.Sub>hold on...</ViewMessage.Sub>
          </ViewMessage.Notice>
        );
      }

      return (
        <div className={styles.viewMessage}>
          <ViewMessage.Notice>
            <p>Too bad, there is no music in your library =(</p>
            <ViewMessage.Sub>
              <span>you can always just drop files and folders anywhere or</span>{' '}
              <Link
                to='/settings'
                draggable={false}
              >
                add your music here
              </Link>
            </ViewMessage.Sub>
          </ViewMessage.Notice>
        </div>
      );
    }

    // Empty search
    if (filteredTracks.length === 0) {
      return (
        <ViewMessage.Notice>
          <p>Your search returned no results</p>
        </ViewMessage.Notice>
      );
    }

    // All good !
    return (
      <div className={styles.viewLibrary}>
        {/* <div>
          <SearchBar tracks={tracks} />
        </div> */}
        <ProgressModal />
        <TrackList
          type='library'
          tracks={filteredTracks}
          trackPlayingID={trackPlayingID}
          playlists={playlists}
          width={width - 256}
          height={height - 250}
        />
        <div className={styles.footerStyles}>
          <Footer msg={message} />
        </div>
      </div>
    );
  }, [search, refreshing, width, height, filteredTracks, playlists, trackPlayingID, message]);

  return (
    <div className={appStyles.view}>
      <div>{getLibraryComponent}</div>

      {/* Modal de selección de Beatport */}
      {beatportCandidates && beatportCandidates.length > 0 && (
        <BeatportSelectionModal
          trackCandidates={beatportCandidates}
          onConfirm={handleBeatportConfirm}
          onCancel={handleBeatportCancel}
        />
      )}
    </div>
  );
}

export type LibraryLoaderData = LoaderData<typeof LibraryView.loader>;

LibraryView.loader = async () => {
  return {
    playlists: await db.playlists.getAll(),
  };
};
