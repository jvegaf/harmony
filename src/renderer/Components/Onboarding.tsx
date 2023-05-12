import { Button } from '@geist-ui/core';
import React from 'react';
import './OnBoarding.scss';

const OnBoarding: React.FC = () => {

  const openHandler = () => window.Main.OpenFolder();

  return (
    <div className="onboarding">
      <div className="upload-container">
        <Button onClick={openHandler}>
          Open Folder
        </Button>
      </div>
    </div>
  );
};

export default OnBoarding;