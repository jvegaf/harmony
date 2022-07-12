import React from "react";
import ReactWaves from "@dschoon/react-waves";
import useAppState from "../hooks/useAppState";
import styled from "styled-components";

const Styles = styled.div`
  height: 100px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .container {
    width: 70%;
  }

  .button {
    position: absolute;
    left: -60px;
    top: 44%;
    cursor: pointer;
    font-size: 34px;
    filter: hue-rotate(0deg);
  }

  .react-waves {
    display: inline-block;
    width: 100%;
    height: 70px;
    padding: 0;
    margin: 0;

    .wave {
      width: 80%;
    }
  }
`;

const Player = () => {
  const { trackPlaying }          = useAppState();
  const [ playing, setPlaying ]   = React.useState(false);
  const [ position, setPosition ] = React.useState(0);

  const [ trackSrc, setTrackSrc ] = React.useState();

  React.useEffect(() => {
    if(trackPlaying){
      const track = window.Main.GetTrack(trackPlaying);
      setTrackSrc(track.filepath);
      setPlaying(false);
    }
  }, [ trackPlaying ]);

  const onPosChange = (ws) => {
    if(ws.pos !== position){
      setPosition(ws.pos);
    }
  };

  const onSeek = (ws) => {
    console.log("seek", ws);
  };

  const onReady = (ws) => {
    console.log("ready", ws);
    setPosition(0);
    setPlaying(true);
  };

  return (
    <Styles>
      <div className="container">
        {trackSrc && (
          <div
            className="play button"
            onClick={() => {
              setPlaying(!playing);
            }}
            style={{ left: "-99px" }}
          >
            {!playing ? "▶️" : "⏹"}
          </div>
        )}
        <ReactWaves
          audioFile={trackSrc}
          className="react-waves"
          options={{
            barHeight:     1,
            barWidth:      2,
            cursorWidth:   0,
            barGap:        0,
            height:        80,
            hideScrollbar: true,
            progressColor: "#EC407A",
            responsive:    true,
            waveColor:     "#D1D6DA"
          }}
          volume={1}
          zoom={1}
          playing={playing}
          pos={position}
          onPosChange={onPosChange}
          onSeek={onSeek}
          onReady={onReady}
        />
      </div>
    </Styles>
  );
};

export default Player;
