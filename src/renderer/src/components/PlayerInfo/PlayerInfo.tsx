import { useEffect, useState } from 'react';
import { Track } from '../../../../preload/types/harmony';
import useLibraryUIStore from '../../stores/useLibraryUIStore';
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

  const handleDoubleClick = () => {
    if (track) {
      useLibraryUIStore.getState().api.setScrollTargetTrackId(track.id);
    }
  };

  return (
    <div
      className={styles.playerInfo}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: track ? 'pointer' : 'default' }}
    >
      <p className={styles.infoArtist}>{artist}</p>
      <p className={styles.infoTitle}>{title}</p>
    </div>
  );
}

export default PlayerInfo;
