import { useMemo } from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router-dom';

import * as ViewMessage from '../elements/ViewMessage/ViewMessage';
import useLibraryStore from '../stores/useLibraryStore';
import usePlayingTrackID from '../hooks/usePlayingTrackID';
import useFilteredTracks from '../hooks/useFilteredTracks';

import { RootLoaderData } from './Root';
import { LoaderData } from './router';
import appStyles from './Root.module.css';
import styles from './ViewLibrary.module.css';
import TrackList from '../components/TrackList/TrackList';
import { useViewportSize } from '../hooks/useViewPortSize';

const { db } = window.Main;

export default function ViewLibrary() {
  const trackPlayingID = usePlayingTrackID();
  const refreshing = useLibraryStore(state => state.refreshing);
  const search = useLibraryStore(state => state.search);
  const { height } = useViewportSize();

  const { playlists } = useLoaderData() as LibraryLoaderData;
  const { tracks } = useRouteLoaderData('root') as RootLoaderData;
  const filteredTracks = useFilteredTracks(tracks);

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
        <ViewMessage.Notice>
          <p>Too bad, there is no music in your library =(</p>
          <ViewMessage.Sub>
            <span>you can always just drop files and folders anywhere or</span>{' '}
            <Link
              to='/settings/library'
              draggable={false}
            >
              add your music here
            </Link>
          </ViewMessage.Sub>
        </ViewMessage.Notice>
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
      <TrackList
        type='library'
        tracks={filteredTracks}
        trackPlayingID={trackPlayingID}
        playlists={playlists}
        height={height}
      />
    );
  }, [search, refreshing, height, filteredTracks, playlists, trackPlayingID]);

  return <div className={`${appStyles.view} ${styles.viewLibrary}`}>{getLibraryComponent}</div>;
}

export type LibraryLoaderData = LoaderData<typeof ViewLibrary.loader>;

ViewLibrary.loader = async () => {
  return {
    playlists: await db.playlists.getAll(),
  };
};
