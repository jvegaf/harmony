import usePlayingTrackID from '@renderer/hooks/usePlayingTrackID';
import { filterTracks } from '@renderer/lib/utils-library';
import useLibraryStore from '@renderer/stores/useLibraryStore';
import { useMemo } from 'react';
import { Link, LoaderFunctionArgs, useLoaderData, useParams, useRouteLoaderData } from 'react-router-dom';
import { LoaderData } from '../router';
import { RootLoaderData } from '../Root';
import * as ViewMessage from '../../elements/ViewMessage/ViewMessage';
import TrackList from '@renderer/components/TrackList/TrackList';
import { useViewportSize } from '@renderer/hooks/useViewPortSize';
import { perfLogger } from '../../lib/performance-logger';

const { db } = window.Main;

export default function PlaylistView() {
  const { width, height } = useViewportSize();
  const { playlistTracks } = useLoaderData() as PlaylistLoaderData;
  const { playlistID } = useParams();
  const trackPlayingID = usePlayingTrackID();

  // OPTIMIZATION: Get playlists from parent loader (RootView) instead of reloading
  const { playlists } = useRouteLoaderData('root') as RootLoaderData;

  const search = useLibraryStore(state => state.search);
  const filteredTracks = useMemo(() => filterTracks(playlistTracks, search), [playlistTracks, search]);

  if (playlistTracks.length === 0) {
    return (
      <ViewMessage.Notice>
        <p>Empty playlist</p>
        <ViewMessage.Sub>
          You can add tracks from the{' '}
          <Link
            to='/'
            draggable={false}
          >
            library view
          </Link>
        </ViewMessage.Sub>
      </ViewMessage.Notice>
    );
  }

  if (filteredTracks.length === 0 && search.length > 0) {
    return (
      <ViewMessage.Notice>
        <p>Your search returned no results</p>
      </ViewMessage.Notice>
    );
  }

  // A bit hacky though
  if (filteredTracks && filteredTracks.length === 0) {
    return (
      <ViewMessage.Notice>
        <p>Empty playlist</p>
        <ViewMessage.Sub>
          You can add tracks from the{' '}
          <Link
            to='/'
            draggable={false}
          >
            library view
          </Link>
        </ViewMessage.Sub>
      </ViewMessage.Notice>
    );
  }

  return (
    <TrackList
      type='playlist'
      reorderable={true}
      tracks={playlistTracks}
      trackPlayingID={trackPlayingID}
      playlists={playlists}
      currentPlaylist={playlistID}
      width={width}
      height={height}
    />
  );
}

export type PlaylistLoaderData = LoaderData<typeof PlaylistView.loader>;

PlaylistView.loader = async ({ params }: LoaderFunctionArgs) => {
  perfLogger.measure('PlaylistView.loader started');

  if (typeof params.playlistID !== 'string') {
    throw new Error('Playlist ID is not defined');
  }

  perfLogger.measure('Before db.playlists.findOnlyByID', { playlistID: params.playlistID });

  const playlist = await db.playlists.findOnlyByID(params.playlistID);

  perfLogger.measure('After db.playlists.findOnlyByID', {
    tracksCount: playlist.tracks?.length || 0,
  });

  // OPTIMIZATION: Removed db.playlists.getAll() - use parent loader data instead
  // This eliminates ~248ms of unnecessary database query time
  perfLogger.measure('Skipped db.playlists.getAll (using parent loader cache)');

  perfLogger.measure('PlaylistView.loader finished');

  return {
    // Playlists come from parent RootView loader (useRouteLoaderData('root'))
    playlistTracks: playlist.tracks,
  };
};
