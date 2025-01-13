import { useEffect, useState } from 'react';
import { Track } from '../../../../preload/types/harmony';
import styles from './PlayerInfo.module.css';

type Props = {
  track: Track | null;
};

function PlayerInfo({ track }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    if (track !== null) {
      setTitle(track.title);
      setArtist(track.artist || '');
    }
  }, [track]);

  return (
    <div className={styles.playerInfo}>
      <div className={styles.infoArtist}>
        <span>{artist}</span>
      </div>
      <div className={styles.infoTitle}>
        <span>{title}</span>
      </div>
    </div>
  );
}

export default PlayerInfo;
