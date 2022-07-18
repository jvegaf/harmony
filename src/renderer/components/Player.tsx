import ReactWaves from '@dschoon/react-waves';
import React from 'react';
import styled from 'styled-components';
import usePlayer from '../hooks/usePlayer';

const Styles = styled.div`
  height: 70px;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .container {
    width: 70%;
  }

  .react-waves {
    display: inline-block;
    width: 100%;
    height: 50px;
    padding: 0;
    margin: 0;

    .wave {
      width: 100%;
    }
  }
`;

const Player = () => {
  const { trackPlaying, isPlaying, setIsPlaying } = usePlayer();
  
  const [ position, setPosition ] = React.useState(0);

  const [ trackSrc, setTrackSrc ] = React.useState();

  React.useEffect(() => {
    if (trackPlaying){
      setTrackSrc(trackPlaying.filepath);
      setIsPlaying(false);
    }
  }, [ trackPlaying, setIsPlaying ]);

  const onPosChange = (ws) => {
    if (ws.pos !== position){
      setPosition(ws.pos);
    }
  };

  const onReady = () => {
    setPosition(0);
    setIsPlaying(true);
  };

  return (
    <Styles>
      <div className="container">
        <ReactWaves
          audioFile={trackSrc}
          className="react-waves"
          options={{
            barHeight:     1,
            barWidth:      2,
            cursorWidth:   0,
            barGap:        0,
            height:        50,
            hideScrollbar: true,
            progressColor: '#EC407A',
            responsive:    true,
            waveColor:     '#D1D6DA'
          }}
          volume={1}
          zoom={1}
          playing={isPlaying}
          pos={position}
          onPosChange={onPosChange}
          onReady={onReady}
        />
      </div>
    </Styles>
  );
};

export default Player;
