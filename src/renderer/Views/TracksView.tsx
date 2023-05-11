import AppHeader from '@Components/AppHeader';
import TrackList from '@Components/TrackList';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks';

const TracksView = () => {
  const tracks = useAppSelector(state => state.collection.tracks);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!tracks.length) {
      navigate('/welcome');
    }
  }, [tracks]);

  return (
    <div>
      <AppHeader />
      <TrackList tracks={tracks} />
    </div>
  );
};

export default TracksView;