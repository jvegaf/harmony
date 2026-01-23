import { useMemo } from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router-dom';

import * as ViewMessage from '../../elements/ViewMessage/ViewMessage';
import useLibraryStore from '../../stores/useLibraryStore';
import usePlayingTrackID from '../../hooks/usePlayingTrackID';

import { RootLoaderData } from '../Root';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './Library.module.css';
import TrackList from '../../components/TrackList/TrackList';

const { db } = window.Main;

export default function LibraryView() {
  const trackPlayingID = usePlayingTrackID();
  const { refreshing, search } = useLibraryStore();

  const { playlists } = useLoaderData() as LibraryLoaderData;
  const { tracks } = useRouteLoaderData('root') as RootLoaderData;

  const getLibraryComponent = useMemo(() => {
    // Empty library
    if (tracks.length === 0 && search === '') {
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

    // All good !
    return (
      <div className={styles.viewLibrary}>
        <TrackList
          type='library'
          reorderable={false}
          tracks={tracks}
          trackPlayingID={trackPlayingID}
          playlists={playlists}
        />
      </div>
    );
  }, [search, refreshing, tracks, playlists, trackPlayingID]);

  return <div className={appStyles.view}>{getLibraryComponent}</div>;
}

export type LibraryLoaderData = LoaderData<typeof LibraryView.loader>;

LibraryView.loader = async () => {
  return {
    playlists: await db.playlists.getAll(),
  };
};
