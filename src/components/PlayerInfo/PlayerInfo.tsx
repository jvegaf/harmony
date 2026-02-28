import { useEffect, useState } from 'react';
import { Track } from '@/types/harmony';
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
      <p className={styles.infoArtist}>{artist}</p>
      <p className={styles.infoTitle}>{title}</p>
    </div>
  );
}

export default PlayerInfo;
