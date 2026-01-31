import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Modal, Progress, Text } from '@mantine/core';
import { IconAlertTriangle, IconCopy, IconSearch, IconTrash, IconWaveSine } from '@tabler/icons-react';

import type { DuplicateScanProgress, DuplicateScanResult } from '../../../../preload/types/duplicates';
import type { TrackId, Track } from '../../../../preload/types/harmony';

import { usePlayerAPI } from '../../stores/usePlayerStore';
import DuplicateGroup from './DuplicateGroup';
import styles from './DuplicateFinderTool.module.css';

const { config, duplicates, db, library, logger, audioAnalysis } = window.Main;

/**
 * DuplicateFinderTool - Main component for finding and managing duplicate tracks
 * AIDEV-NOTE: Uses IPC to scan library for duplicates based on configured criteria.
 * Allows user to select which tracks to keep and delete the rest.
 */
export default function DuplicateFinderTool() {
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<DuplicateScanProgress | null>(null);
  const [scanResult, setScanResult] = useState<DuplicateScanResult | null>(null);

  // Selection state: which tracks to keep
  const [keeperIds, setKeeperIds] = useState<Set<TrackId>>(new Set());

  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Waveform analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ completed: number; total: number } | null>(null);

  const playerAPI = usePlayerAPI();

  // Listen for scan progress updates
  useEffect(() => {
    const unsubscribe = duplicates.onProgress((progress: DuplicateScanProgress) => {
      setScanProgress(progress);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for audio analysis progress and track completion
  useEffect(() => {
    const unsubProgress = audioAnalysis.onProgress((progress: { completed: number; total: number }) => {
      setAnalysisProgress(progress);
    });

    // AIDEV-NOTE: When a track completes analysis, update it in the scan results
    // This allows waveforms to appear in real-time as analysis completes
    const unsubTrackComplete = audioAnalysis.onTrackComplete((updatedTrack: Track) => {
      setScanResult(prev => {
        if (!prev) return prev;
        // Update the track in all groups where it appears
        const updatedGroups = prev.groups.map(group => ({
          ...group,
          tracks: group.tracks.map(trackInfo =>
            trackInfo.track.id === updatedTrack.id ? { ...trackInfo, track: updatedTrack } : trackInfo,
          ),
        }));
        return { ...prev, groups: updatedGroups };
      });
    });

    return () => {
      unsubProgress();
      unsubTrackComplete();
    };
  }, []);

  /**
   * Start scanning for duplicates
   */
  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress({ phase: 'loading', progress: 0, message: 'Starting scan...' });
    setScanResult(null);
    setKeeperIds(new Set());

    try {
      // Get current duplicate finder config
      const dupConfig = await config.get('duplicateFinderConfig');

      // Run the scan
      const result = await duplicates.find(dupConfig);

      // Pre-select suggested keepers
      const initialKeepers = new Set<TrackId>();
      for (const group of result.groups) {
        initialKeepers.add(group.suggestedKeeperId);
      }

      setScanResult(result);
      setKeeperIds(initialKeepers);
    } catch (error) {
      logger.error('Duplicate scan failed:', error);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }, []);

  /**
   * Toggle keep status for a track
   */
  const handleKeepChange = useCallback((trackId: TrackId, keep: boolean) => {
    setKeeperIds(prev => {
      const next = new Set(prev);
      if (keep) {
        next.add(trackId);
      } else {
        next.delete(trackId);
      }
      return next;
    });
  }, []);

  /**
   * Play a track for preview
   */
  const handlePlayTrack = useCallback(
    (trackId: TrackId) => {
      playerAPI.start([trackId], 0);
    },
    [playerAPI],
  );

  /**
   * Get tracks to delete (all tracks not in keeperIds)
   */
  const getTracksToDelete = useCallback((): Track[] => {
    if (!scanResult) return [];

    const toDelete: Track[] = [];
    for (const group of scanResult.groups) {
      for (const trackInfo of group.tracks) {
        if (!keeperIds.has(trackInfo.track.id)) {
          toDelete.push(trackInfo.track);
        }
      }
    }
    return toDelete;
  }, [scanResult, keeperIds]);

  /**
   * Calculate total size of tracks to delete
   */
  const getDeleteSize = useCallback((): number => {
    if (!scanResult) return 0;

    let totalSize = 0;
    for (const group of scanResult.groups) {
      for (const trackInfo of group.tracks) {
        if (!keeperIds.has(trackInfo.track.id)) {
          totalSize += trackInfo.fileSize;
        }
      }
    }
    return totalSize;
  }, [scanResult, keeperIds]);

  /**
   * Show confirmation modal before deletion
   */
  const handleDeleteClick = useCallback(() => {
    const tracksToDelete = getTracksToDelete();
    if (tracksToDelete.length === 0) {
      return;
    }
    setShowConfirmModal(true);
  }, [getTracksToDelete]);

  /**
   * Confirm and execute deletion
   */
  const handleConfirmDelete = useCallback(async () => {
    const tracksToDelete = getTracksToDelete();
    if (tracksToDelete.length === 0) {
      setShowConfirmModal(false);
      return;
    }

    setShowConfirmModal(false);
    setIsDeleting(true);

    try {
      // Stop playback if any deleted track is playing
      playerAPI.stop();

      // Remove from database
      await db.tracks.remove(tracksToDelete.map(t => t.id));

      // Delete from disk
      await library.deleteTracks(tracksToDelete);

      // Clear scan results (user should rescan after deletion)
      setScanResult(null);
      setKeeperIds(new Set());

      logger.info(`Deleted ${tracksToDelete.length} duplicate tracks`);
    } catch (error) {
      logger.error('Failed to delete duplicate tracks:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [getTracksToDelete, playerAPI]);

  /**
   * Deselect all tracks (mark none as keepers)
   */
  const handleDeselectAll = useCallback(() => {
    setKeeperIds(new Set());
  }, []);

  /**
   * Select suggested keepers again
   */
  const handleSelectSuggested = useCallback(() => {
    if (!scanResult) return;
    const suggested = new Set<TrackId>();
    for (const group of scanResult.groups) {
      suggested.add(group.suggestedKeeperId);
    }
    setKeeperIds(suggested);
  }, [scanResult]);

  /**
   * Get all unique tracks from scan results that are missing waveform data
   * AIDEV-NOTE: Returns tracks that have no waveformPeaks or empty peaks array
   */
  const tracksMissingWaveforms = useMemo(() => {
    if (!scanResult) return [];

    const seen = new Set<TrackId>();
    const missing: Track[] = [];

    for (const group of scanResult.groups) {
      for (const trackInfo of group.tracks) {
        const track = trackInfo.track;
        if (!seen.has(track.id)) {
          seen.add(track.id);
          if (!track.waveformPeaks || track.waveformPeaks.length === 0) {
            missing.push(track);
          }
        }
      }
    }
    return missing;
  }, [scanResult]);

  /**
   * Analyze tracks missing waveforms to generate waveform data
   * AIDEV-NOTE: Uses batch audio analysis API which updates tracks in DB
   * and emits events for real-time UI updates
   */
  const handleAnalyzeWaveforms = useCallback(async () => {
    if (tracksMissingWaveforms.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress({ completed: 0, total: tracksMissingWaveforms.length });

    try {
      const filePaths = tracksMissingWaveforms.map(t => t.path);

      logger.info(`Starting waveform analysis for ${filePaths.length} tracks`);

      // AIDEV-NOTE: analyzeBatch will emit progress events that we listen to above
      // and track completion events that update the UI in real-time
      await audioAnalysis.analyzeBatch(filePaths, {
        generateWaveform: true,
        detectBpm: false, // Only generate waveforms, skip BPM detection
        detectKey: false, // Skip key detection
      });

      logger.info('Waveform analysis complete');
    } catch (error) {
      logger.error('Waveform analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  }, [tracksMissingWaveforms]);

  // Calculate stats for display
  const tracksToDelete = getTracksToDelete();
  const deleteSize = getDeleteSize();
  const deleteSizeMB = (deleteSize / (1024 * 1024)).toFixed(1);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>
            <IconCopy
              size={20}
              style={{ marginRight: 8, verticalAlign: 'middle' }}
            />
            Duplicate Finder
          </h2>
          {scanResult && scanResult.duplicateCount > 0 && (
            <span className={styles.duplicateCount}>{scanResult.duplicateCount} duplicates found</span>
          )}
        </div>

        <div className={styles.headerActions}>
          {scanResult && scanResult.groups.length > 0 && (
            <>
              <Button
                variant='subtle'
                size='xs'
                onClick={handleDeselectAll}
              >
                Deselect All
              </Button>
              <Button
                variant='subtle'
                size='xs'
                onClick={handleSelectSuggested}
              >
                Select Suggested
              </Button>
              <button
                type='button'
                className={styles.deleteButton}
                onClick={handleDeleteClick}
                disabled={tracksToDelete.length === 0 || isDeleting}
              >
                <IconTrash size={16} />
                Delete {tracksToDelete.length} Duplicates
              </button>
              {tracksMissingWaveforms.length > 0 && (
                <Button
                  variant='subtle'
                  size='xs'
                  leftSection={<IconWaveSine size={14} />}
                  onClick={handleAnalyzeWaveforms}
                  disabled={isAnalyzing}
                  title={`Analyze ${tracksMissingWaveforms.length} tracks to generate waveform previews`}
                >
                  {isAnalyzing
                    ? `Analyzing ${analysisProgress?.completed ?? 0}/${analysisProgress?.total ?? 0}`
                    : `Analyze ${tracksMissingWaveforms.length} Waveforms`}
                </Button>
              )}
            </>
          )}
          <button
            type='button'
            className={styles.scanButton}
            onClick={handleScan}
            disabled={isScanning}
          >
            <IconSearch size={16} />
            {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
          </button>
        </div>
      </div>

      {/* Scan Progress indicator */}
      {isScanning && scanProgress && (
        <div className={styles.progressContainer}>
          <Progress
            value={scanProgress.progress}
            size='lg'
            radius='xl'
            style={{ width: '100%', maxWidth: 400 }}
          />
          <Text className={styles.progressMessage}>{scanProgress.message}</Text>
        </div>
      )}

      {/* Waveform Analysis Progress indicator */}
      {isAnalyzing && analysisProgress && (
        <div className={styles.progressContainer}>
          <Progress
            value={(analysisProgress.completed / analysisProgress.total) * 100}
            size='lg'
            radius='xl'
            color='orange'
            style={{ width: '100%', maxWidth: 400 }}
          />
          <Text className={styles.progressMessage}>
            Analyzing waveforms: {analysisProgress.completed} / {analysisProgress.total}
          </Text>
        </div>
      )}

      {/* Empty state */}
      {!isScanning && !scanResult && (
        <div className={styles.emptyState}>
          <IconCopy
            size={64}
            className={styles.emptyIcon}
          />
          <Text className={styles.emptyText}>
            Click &quot;Scan for Duplicates&quot; to find duplicate tracks in your library based on your configured
            detection strategies.
          </Text>
          <Text
            size='sm'
            c='dimmed'
          >
            Configure detection strategies in Settings → Duplicates
          </Text>
        </div>
      )}

      {/* No duplicates found */}
      {!isScanning && scanResult && scanResult.groups.length === 0 && (
        <div className={styles.emptyState}>
          <IconCopy
            size={64}
            className={styles.emptyIcon}
          />
          <Text className={styles.emptyText}>No duplicates found in your library!</Text>
          <Text
            size='sm'
            c='dimmed'
          >
            Scanned {scanResult.totalTracks} tracks in {(scanResult.scanDurationMs / 1000).toFixed(1)}s
          </Text>
        </div>
      )}

      {/* Results */}
      {!isScanning && scanResult && scanResult.groups.length > 0 && (
        <div className={styles.resultsContainer}>
          {scanResult.groups.map(group => (
            <DuplicateGroup
              key={group.id}
              group={group}
              keeperIds={keeperIds}
              onKeepChange={handleKeepChange}
              onPlayTrack={handlePlayTrack}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        opened={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title='Delete Duplicate Tracks'
        centered
      >
        <div className={styles.confirmationContent}>
          <div className={styles.confirmationWarning}>
            <IconAlertTriangle
              size={24}
              className={styles.confirmationWarningIcon}
            />
            <Text className={styles.confirmationText}>
              This will permanently delete the selected duplicate tracks from your library and from disk. This action
              cannot be undone.
            </Text>
          </div>

          <div className={styles.confirmationStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Tracks to delete:</span>
              <span className={styles.statValue}>{tracksToDelete.length}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Space to free:</span>
              <span className={styles.statValue}>{deleteSizeMB} MB</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Tracks to keep:</span>
              <span className={styles.statValue}>{keeperIds.size}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              variant='subtle'
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              color='red'
              onClick={handleConfirmDelete}
            >
              Delete {tracksToDelete.length} Tracks
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
