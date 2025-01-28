import { useRef, useState } from 'react';
import usePlayingTrack from '../../hooks/usePlayingTrack';
import Cover from '../Cover/Cover';
import PlayerControls from '../PlayerControls/PlayerControls';
import styles from './Header.module.css';
import WavePlayer from '../Player/WavePlayer';

function Header() {
  const trackPlaying = usePlayingTrack();

  return (
    <div className={styles.headerRoot}>
      <div className={styles.coverImage}>
        <Cover track={trackPlaying} />
      </div>
      <div className={styles.controls}>
        <PlayerControls />
      </div>
      <div className={styles.playerWaveform}>
        <WavePlayer />
      </div>
    </div>
  );
}

export default Header;
