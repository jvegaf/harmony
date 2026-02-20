import { useRouteLoaderData } from 'react-router-dom';
import { useMemo } from 'react';

import { RootLoaderData } from '../views/Root';
import { Track } from '@preload/types/harmony';
import { PlaylistLoaderData } from '@renderer/views/Playlist/PlaylistView';

type Maybe<T> = T | undefined;

/**
 * Hook that returns the current view tracks (library or playlist).
 *
 * DEBT-007: Settings page is intentionally not supported here because:
 * - Settings page doesn't display tracks
 * - Components using this hook are not rendered in Settings route
 * - Returning empty array [] for Settings is the correct behavior
 *
 * @returns Array of tracks for current view, or empty array if no tracks available
 */
export default function useCurrentViewTracks(): Track[] {
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
