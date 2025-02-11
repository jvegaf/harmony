import { useMemo } from 'react';

import { filterTracks } from '../lib/utils-library';
import useLibraryStore from '../stores/useLibraryStore';
import { Track } from '../../../preload/types/harmony';

export default function useFilteredTracks(tracks: Track[]): Track[] {
  const { search } = useLibraryStore();

  // Filter and sort TracksList
  const filteredTracks = useMemo(() => filterTracks(tracks, search), [tracks, search]);

  return filteredTracks;
}
