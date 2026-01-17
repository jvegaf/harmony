import usePlayingTrackID from '@renderer/hooks/usePlayingTrackID';
import { filterTracks } from '@renderer/lib/utils-library';
import useLibraryStore from '@renderer/stores/useLibraryStore';
import { useMemo } from 'react';
import { Link, LoaderFunctionArgs, useLoaderData, useParams } from 'react-router-dom';
import { LoaderData } from '../router';
import * as ViewMessage from '../../elements/ViewMessage/ViewMessage';
import TrackList from '@renderer/components/TrackList/TrackList';
import { useViewportSize } from '@renderer/hooks/useViewPortSize';

const { db } = window.Main;

export default function PlaylistView() {
  const { width, height } = useViewportSize();
  const { playlists, playlistTracks } = useLoaderData() as PlaylistLoaderData;
  const { playlistID } = useParams();
  const trackPlayingID = usePlayingTrackID();

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
  if (typeof params.playlistID !== 'string') {
    throw new Error('Playlist ID is not defined');
  }

  const playlist = await db.playlists.findOnlyByID(params.playlistID);

  return {
    // TODO: can we re-use parent's data?
    playlists: await db.playlists.getAll(),
    playlistTracks: playlist.tracks,
  };
};
