import { Button } from '@geist-ui/core';
import React from 'react';
import useMain from '../Hooks/useMain';
import './OnBoarding.scss';

const OnBoarding: React.FC = () => {
  const { onOpenFolder } = useMain();

  const openHandler = () => onOpenFolder();

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