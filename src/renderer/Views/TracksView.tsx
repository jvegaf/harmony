import AppHeader from '@Components/AppHeader';
import TrackList from '@Components/TrackList';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks';
import './Views.scss';

const TracksView = () => {
  const tracks = useAppSelector(state => state.collection.tracks);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!tracks.length) {
      console.log('no tracks');
      navigate('/welcome');
    }
  }, [tracks]);

  return (
    <div className="container">
      <AppHeader />
      <div className="content">
        <TrackList tracks={tracks} />
      </div>
    </div>
  );
};

export default TracksView;