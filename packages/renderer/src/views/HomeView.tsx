import React from 'react';
import OnBoarding from '@Components/Onboarding';
import './Views.scss';
import AppHeader from '@Components/AppHeader';
import { useAppSelector } from '../hooks';
import { useNavigate } from 'react-router-dom';

const HomeView = () => {
  const tracks = useAppSelector((state) => state.collection.tracks);

  const navigate = useNavigate();

  React.useEffect(() => {
    if (tracks.length > 0) {
      navigate('/');
    }
  }, [tracks]);

  return (
    <div className="container">
      <AppHeader />
      <div className="content">
        <OnBoarding />
      </div>
    </div>
  );
};

export default HomeView;