import { useRouteLoaderData } from 'react-router-dom';
import { useMemo } from 'react';

import { RootLoaderData } from '../views/Root';
// import { PlaylistLoaderData } from '../views/ViewPlaylistDetails';

import { Track } from '../../../preload/types/harmony';
import { PlaylistLoaderData } from '@renderer/views/Playlist/PlaylistView';

type Maybe<T> = T | undefined;

/**
 * Hook that returns the current view tracks (library or playlist)
 */
export default function useCurrentViewTracks(): Track[] {
  // TODO: how to support Settings page? Should we?
  const rootData = useRouteLoaderData('root') as Maybe<RootLoaderData>;
  const filteredLibraryTracks = (rootData && rootData.tracks) ?? [];
  const playlistData = useRouteLoaderData('playlists') as Maybe<PlaylistLoaderData>;

  const tracks = useMemo(() => {
    if (playlistData) {
      return playlistData.playlistTracks;
    }

    if (rootData) {
      return filteredLibraryTracks;
    }

    return [];
  }, [filteredLibraryTracks, rootData]);

  return tracks;
}
