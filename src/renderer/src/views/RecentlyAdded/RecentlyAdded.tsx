import { useMemo } from 'react';
import { Link, useLoaderData, useRouteLoaderData } from 'react-router-dom';

import * as ViewMessage from '../../elements/ViewMessage/ViewMessage';
import usePlayingTrackID from '../../hooks/usePlayingTrackID';

import { RootLoaderData } from '../Root';
import { LoaderData } from '../router';
import appStyles from '../Root.module.css';
import styles from './RecentlyAdded.module.css';
import TrackList from '../../components/TrackList/TrackList';
import type { Track } from '../../../../preload/types/harmony';

const { db } = window.Main;

export default function RecentlyAddedView() {
  const trackPlayingID = usePlayingTrackID();
  const { playlists, recentTracks } = useLoaderData() as RecentlyAddedLoaderData;
  const { tracks: allTracks } = useRouteLoaderData('root') as RootLoaderData;

  const getRecentlyAddedComponent = useMemo(() => {
    // AIDEV-NOTE: Show empty state if no tracks were added in the last 30 days
    if (recentTracks.length === 0) {
      return (
        <div className={styles.viewMessage}>
          <ViewMessage.Notice>
            <p>No recently added tracks</p>
            <ViewMessage.Sub>
              {allTracks.length === 0 ? (
                <>
                  <span>your library is empty, drop files and folders anywhere or</span>{' '}
                  <Link
                    to='/settings'
                    draggable={false}
                  >
                    add your music here
                  </Link>
                </>
              ) : (
                <span>tracks added in the last 30 days will appear here</span>
              )}
            </ViewMessage.Sub>
          </ViewMessage.Notice>
        </div>
      );
    }

    // AIDEV-NOTE: Show recent tracks using the same TrackList component as Library
    return (
      <div className={styles.viewRecentlyAdded}>
        <TrackList
          type='library'
          reorderable={false}
          tracks={recentTracks}
          trackPlayingID={trackPlayingID}
          playlists={playlists}
        />
      </div>
    );
  }, [recentTracks, allTracks.length, playlists, trackPlayingID]);

  return <div className={appStyles.view}>{getRecentlyAddedComponent}</div>;
}

export type RecentlyAddedLoaderData = LoaderData<typeof RecentlyAddedView.loader>;

// AIDEV-NOTE: Loader fetches recent tracks (30 days) and playlists for context menu
RecentlyAddedView.loader = async () => {
  const [playlists, recentTracks] = await Promise.all([
    db.playlists.getAll(),
    db.tracks.getRecent(30) as Promise<Track[]>,
  ]);

  return {
    playlists,
    recentTracks,
  };
};
