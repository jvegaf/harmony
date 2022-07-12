import { Button } from "@mantine/core";
import React from "react";
import useAppState from "renderer/hooks/useAppState";
import styled from "styled-components";
import Player from "./Player";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Styles = styled.div`
  background-color: #222222;
  border-bottom: 0;
  width: 100%;
  height: 100px;
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
  grid-template-rows: 1fr;
  row-gap: 0;

  .left-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .right-container {
    margin-right: 30;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
`;

const AppHeader: React.FC = () => {
  const {
    tracksLoaded, onFixAllTracks, onOpenFolder 
  } = useAppState();

  // const btnProps = {
  //   color: 'white',
  //   size: 40,
  //   action: togglePlayPause,
  // };

  return (
    <Styles>
      <div className="left-container"></div>
      <Player />
      <div className="right-container">
        {tracksLoaded > 0 && (
          <>
            <Button onClick={onOpenFolder} size="sm">
              Open Folder
            </Button>
            <Button onClick={onFixAllTracks} size="sm">
              Fix All tracks
            </Button>
          </>
        )}
      </div>
    </Styles>
  );
};

export default AppHeader;
