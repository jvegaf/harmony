import AppHeader from '@Components/AppHeader';
import TrackList from '@Components/TrackList';
import React from 'react';
import { Track } from 'src/shared/types/emusik';

const TracksView = () => {
  const [collection, setCollection] = React.useState<Track[]>([]);

  React.useEffect(() => {
    (async () => {
      const tracks = window.ipc.getAll();
      setCollection(tracks);
    })();

    return () => { }
  }, []);

  return (
    <div>
      <AppHeader />
      {collection.length > 0 && <TrackList collection={collection} />}
    </div>
  );
};

export default TracksView;