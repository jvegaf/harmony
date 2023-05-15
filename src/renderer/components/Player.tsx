import { createStyles, Image, Text } from '@mantine/core';
import React from 'react';
import { useAudioPlayer, useAudioPosition } from 'react-use-audio-player';
import { Track, TrackSrc } from 'shared/types/emusik';
import Placeholder from '../../../assets/placeholder.png';

const useStyles = createStyles((theme) => ({
  playerContainer: {
    height: 70,
    width: 370,
    display: 'flex',
    backgroundColor: theme.colors.dark[4],
  },

  artwork: {
    height: 70,
    width: 70,
  },

  player: {
    display: 'flex',
    height: '100%',
    width: 300,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekbar: {
    width: '100%',
    height: 10,
    cursor: 'pointer',
    backgroundColor: '#989da8',
    overflow: 'hidden',
  },
  tick: {
    backgroundColor: '#6e7179',
    height: '100%',
  },
  title: { paddingTop: 5 },
}));

export interface PlayerProps {
  trackPlaying: Track | null;
}

const Player: React.FC<PlayerProps> = ({ trackPlaying }) => {
  const [artSrc, setArtSrc] = React.useState(Placeholder);
  const { classes } = useStyles();
  const player = useAudioPlayer();

  const { duration, seek, percentComplete } = useAudioPosition({ highRefreshRate: true });
  const [barWidth, setBarWidth] = React.useState('0%');

  const seekBarElem = React.useRef<HTMLDivElement>(null);

  const getArt = async (filepath: TrackSrc) => {
    const art = await window.Main.GetArtWork(filepath);
    if (art === null) {
      setArtSrc(Placeholder);
      return;
    }

    // eslint-disable-next-line no-undef
    const blob = new Blob([art.imageBuffer], { type: art.mime });

    const src = URL.createObjectURL(blob);
    setArtSrc(src);
  };

  React.useEffect(() => {
    if (trackPlaying) {
      player.load({
        src: trackPlaying.filepath,
        html5: true,
        format: 'mp3',
        autoplay: true,
      });
      getArt(trackPlaying.filepath);
    }
  }, [trackPlaying]);

  React.useEffect(() => {
    setBarWidth(`${percentComplete}%`);
  }, [percentComplete]);

  const goTo = React.useCallback(
    (event: React.MouseEvent) => {
      const { pageX: eventOffsetX } = event;

      if (seekBarElem.current) {
        const elementOffsetX = seekBarElem.current.offsetLeft;
        const elementWidth = seekBarElem.current.clientWidth;
        const percent = (eventOffsetX - elementOffsetX) / elementWidth;
        seek(percent * duration);
      }
    },
    [duration, seek]
  );

  return (
    <div className={classes.playerContainer}>
      <div className={classes.artwork}>
        <Image src={artSrc} width={70} height={70} />
      </div>
      {trackPlaying && (
        <div className={classes.player}>
          <Text className={classes.title} size="sm" lineClamp={1} align="center">
            {trackPlaying.title}
          </Text>
          <Text size="sm" align="center" lineClamp={1}>
            {trackPlaying.artist}
          </Text>
          <div className={classes.seekbar} ref={seekBarElem} onClick={goTo}>
            <div style={{ width: barWidth }} className={classes.tick} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;