import { useMemo } from 'react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconRewindBackward10,
  IconRewindForward10,
  IconInfoCircle,
  IconX,
  IconCircleMinus,
  IconCirclePlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '@tabler/icons-react';
import { Track, PlayerStatus, Config } from '../../../../preload/types/harmony';
import Cover from '../Cover/Cover';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';
import styles from './NowPlayingBar.module.css';
import WavePlayer from '../Player/WavePlayer';

type NowPlayingBarProps = {
  track: Track | null;
  config: Config;
};

type TagProps = {
  label: string;
  variant?: 'default' | 'primary';
};

function Tag({ label, variant = 'default' }: TagProps) {
  return <span className={`${styles.tag} ${variant === 'primary' ? styles.tagPrimary : ''}`}>{label}</span>;
}

export default function NowPlayingBar({ track, config }: NowPlayingBarProps) {
  const playerAPI = usePlayerAPI();
  const { playerStatus } = usePlayerStore();

  const tags = useMemo(() => {
    if (!track) return [];
    const result: { label: string; variant: 'default' | 'primary' }[] = [];

    if (track.bpm) result.push({ label: `${Math.round(track.bpm)}BPM`, variant: 'default' });
    if (track.initialKey) result.push({ label: track.initialKey, variant: 'primary' });
    if (track.year) result.push({ label: String(track.year), variant: 'default' });
    if (track.genre) result.push({ label: track.genre, variant: 'default' });

    return result;
  }, [track]);

  if (!track) {
    return (
      <div className={styles.nowPlayingBar}>
        <div className={styles.emptyState}>
          <p>No track selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.nowPlayingBar}>
      {/* Track Info Section */}
      <div className={styles.trackInfoSection}>
        <div className={styles.coverContainer}>
          <Cover track={track} />
        </div>
        <div className={styles.trackDetails}>
          <h1 className={styles.trackTitle}>{track.title}</h1>
          <p className={styles.trackArtist}>{track.artist || 'Unknown Artist'}</p>
        </div>
        <div className={styles.trackActions}>
          <button
            className={styles.actionButton}
            onClick={() => playerAPI.togglePlayPause()}
          >
            {playerStatus === PlayerStatus.PLAY ? (
              <IconPlayerPauseFilled size={20} />
            ) : (
              <IconPlayerPlayFilled size={20} />
            )}
          </button>
          <button
            className={styles.actionButton}
            onClick={() => playerAPI.previous()}
          >
            <IconRewindBackward10 size={20} />
          </button>
          <button
            className={styles.actionButton}
            onClick={() => playerAPI.next()}
          >
            <IconRewindForward10 size={20} />
          </button>
          <button className={styles.actionButton}>
            <IconInfoCircle size={20} />
          </button>
          <button className={styles.actionButton}>
            <IconX size={20} />
          </button>
        </div>
      </div>

      {/* Tags Section */}
      <div className={styles.tagsSection}>
        {tags.map((tag, index) => (
          <Tag
            key={index}
            label={tag.label}
            variant={tag.variant}
          />
        ))}
      </div>

      {/* Waveform Section */}
      <div className={styles.waveformSection}>
        <button className={styles.playIndicator}>
          <IconPlayerPlayFilled
            size={24}
            className={styles.playIcon}
          />
        </button>
        <div className={styles.waveformContainer}>
          <WavePlayer config={config} />
        </div>
        <div className={styles.zoomControls}>
          <IconCircleMinus
            size={18}
            className={styles.zoomButton}
          />
          <IconCirclePlus
            size={18}
            className={styles.zoomButton}
          />
        </div>
      </div>

      {/* Cue Points Section */}
      <div className={styles.cueSection}>
        <div className={styles.cueButtons}>
          <button className={styles.cueDropdown}>
            Cues
            <IconChevronDown size={16} />
          </button>
          <button className={styles.cueSlot}>
            <IconPlus size={16} />
          </button>
          <button className={styles.cueSlot}>
            <IconPlus size={16} />
          </button>
          <button className={styles.cueSlot}>
            <IconPlus size={16} />
          </button>
          <button className={styles.cueSlot}>
            <IconPlus size={16} />
          </button>
        </div>
        <div className={styles.cueControls}>
          <button className={styles.cueDropdown}>
            Default
            <IconChevronDown size={16} />
          </button>
          <div className={styles.beatSelector}>
            <button className={styles.beatButton}>
              <IconChevronLeft size={16} />
            </button>
            <span className={styles.beatValue}>4</span>
            <button className={styles.beatButton}>
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
