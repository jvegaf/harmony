import { ParseDuration } from '../../../../preload/utils';
import type { DuplicateGroup as DuplicateGroupType, DuplicateTrackInfo } from '../../../../preload/types/duplicates';
import type { TrackId } from '../../../../preload/types/harmony';

import MiniWaveform from './MiniWaveform';
import styles from './DuplicateFinderTool.module.css';

/**
 * DuplicateGroup - Displays a group of duplicate tracks
 * AIDEV-NOTE: Shows all tracks in a duplicate group with comparison columns.
 * First track (highest quality score) is highlighted as the recommended keeper.
 */

type DuplicateGroupProps = {
  group: DuplicateGroupType;
  keeperIds: Set<TrackId>;
  onKeepChange: (trackId: TrackId, keep: boolean) => void;
  onPlayTrack: (trackId: TrackId) => void;
};

/**
 * Format file size in MB
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? mb.toFixed(1) : Math.round(mb).toString();
}

/**
 * Get human-readable detection method label
 */
function getDetectionMethodLabel(method: DuplicateGroupType['detectionMethod']): string {
  switch (method) {
    case 'title':
      return 'Title match';
    case 'artist':
      return 'Artist match';
    case 'duration':
      return 'Duration match';
    case 'titleArtist':
      return 'Title + Artist';
    case 'titleDuration':
      return 'Title + Duration';
    case 'fingerprint':
      return 'Audio Fingerprint';
    case 'multiple':
      return 'Multiple criteria';
    default:
      return method;
  }
}

/**
 * Get CSS class for format badge
 */
function getFormatClass(format: string): string {
  const upperFormat = format.toUpperCase();
  if (['FLAC', 'AIFF', 'WAV', 'ALAC'].includes(upperFormat)) {
    return styles.formatFlac;
  }
  return styles.formatMp3;
}

/**
 * Get parent folder name from path
 */
function getParentFolder(path: string): string {
  const parts = path.split(/[/\\]/);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return '';
}

/**
 * Format bitrate for display (e.g., 320, 256)
 * AIDEV-NOTE: Bitrate is stored in bps, convert to kbps for display
 */
function formatBitrate(bitrate: number | undefined): string {
  if (!bitrate || bitrate === 0) return '—';
  // Convert from bps to kbps
  const kbps = Math.round(bitrate / 1000);
  return kbps.toString();
}

/**
 * Get CSS class for bitrate based on quality
 * AIDEV-NOTE: Green for 320+, yellow for 256-319, red for <256
 */
function getBitrateClass(bitrate: number | undefined): string {
  if (!bitrate || bitrate === 0) return '';
  const kbps = Math.round(bitrate / 1000);
  if (kbps >= 320) return styles.bitrateHigh;
  if (kbps >= 256) return styles.bitrateMedium;
  return styles.bitrateLow;
}

export default function DuplicateGroup({ group, keeperIds, onKeepChange, onPlayTrack }: DuplicateGroupProps) {
  return (
    <div className={styles.duplicateGroup}>
      {/* Group Header */}
      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>
          <span className={styles.groupBadge}>{group.tracks.length} tracks</span>
          <span>{getDetectionMethodLabel(group.detectionMethod)}</span>
        </div>
        <span className={styles.groupSimilarity}>{Math.round(group.similarity * 100)}% similar</span>
      </div>

      {/* Table Header */}
      <div className={styles.tableHeader}>
        <span>Wave</span>
        <span>Name</span>
        <span>Kind</span>
        <span>Bitrate</span>
        <span>Size</span>
        <span>Time</span>
        <span>Cues</span>
        <span>PLs</span>
        <span>Keep</span>
      </div>

      {/* Track Rows */}
      {group.tracks.map((trackInfo, index) => (
        <TrackRow
          key={`${trackInfo.track.id}-${index}`}
          trackInfo={trackInfo}
          isFirst={index === 0}
          isKeeper={keeperIds.has(trackInfo.track.id)}
          onKeepChange={onKeepChange}
          onPlayTrack={onPlayTrack}
        />
      ))}
    </div>
  );
}

/**
 * TrackRow - Individual track row within a duplicate group
 */
type TrackRowProps = {
  trackInfo: DuplicateTrackInfo;
  isFirst: boolean;
  isKeeper: boolean;
  onKeepChange: (trackId: TrackId, keep: boolean) => void;
  onPlayTrack: (trackId: TrackId) => void;
};

function TrackRow({ trackInfo, isFirst, isKeeper, onKeepChange, onPlayTrack }: TrackRowProps) {
  const { track, fileSize, format, cueCount, playlistCount } = trackInfo;

  // Build row class names
  let rowClassName = styles.trackRow;
  if (isFirst) {
    rowClassName += ` ${styles.trackRowFirst}`;
  }
  if (isKeeper) {
    rowClassName += ` ${styles.trackRowSelected}`;
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onKeepChange(track.id, e.target.checked);
  };

  const handlePlayClick = () => {
    onPlayTrack(track.id);
  };

  return (
    <div className={rowClassName}>
      {/* Waveform */}
      <MiniWaveform
        track={track}
        onClick={handlePlayClick}
        color={isKeeper ? '#22c55e' : '#fa8905'}
      />

      {/* Track Info */}
      <div className={styles.trackInfo}>
        <span className={styles.trackName}>{track.title || track.path.split(/[/\\]/).pop()}</span>
        <span className={styles.trackPath}>{getParentFolder(track.path)}</span>
      </div>

      {/* Format */}
      <div className={styles.cell}>
        <span className={`${styles.cellFormat} ${getFormatClass(format)}`}>{format}</span>
      </div>

      {/* Bitrate */}
      <div className={`${styles.cell} ${styles.cellBitrate} ${getBitrateClass(track.bitrate)}`}>
        {formatBitrate(track.bitrate)}
      </div>

      {/* Size */}
      <div className={`${styles.cell} ${styles.cellSize}`}>{formatSize(fileSize)}</div>

      {/* Duration */}
      <div className={`${styles.cell} ${styles.cellTime}`}>{ParseDuration(track.duration)}</div>

      {/* Cue Points */}
      <div className={`${styles.cell} ${styles.cellCues}`}>{cueCount > 0 ? cueCount : '—'}</div>

      {/* Playlist Count */}
      <div className={`${styles.cell} ${styles.cellPlists}`}>{playlistCount > 0 ? playlistCount : '—'}</div>

      {/* Keep Checkbox */}
      <div className={styles.keepCell}>
        <input
          type='checkbox'
          className={styles.keepCheckbox}
          checked={isKeeper}
          onChange={handleCheckboxChange}
          title={isKeeper ? 'This track will be kept' : 'Check to keep this track'}
        />
      </div>
    </div>
  );
}
