import { Button } from '@mantine/core';
import React from 'react';
import useAppState from 'renderer/hooks/useAppState';
import styled from 'styled-components';

const Styles = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .upload-container {
    height: 80%;
    width: 80%;
    border: 1px solid #92b0b3;
    border-radius: 4px;
    background: #666666;
    outline: 2px dashed #92b0b3;
    outline-offset: -10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const OnBoarding: React.FC = () => {
  const { onOpenFolder } = useAppState();

  const openHandler = () => onOpenFolder();

  return (
    <Styles>
      <div className="upload-container">
        <Button onClick={openHandler} size="sm">
          Open Folder
        </Button>
      </div>
    </Styles>
  );
};

export default OnBoarding;