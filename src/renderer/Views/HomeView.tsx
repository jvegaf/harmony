import React from 'react';
import OnBoarding from '@Components/Onboarding';
import './Home.scss';
import AppHeader from '@Components/AppHeader';

const HomeView = () => {
  return (
    <div className="home">
      <AppHeader />
      <div className="content">
        <OnBoarding />
      </div>
    </div>
  );
};

export default HomeView;