import { useCallback, useEffect, useState } from 'react';

import { Button, Modal, Progress, Text } from '@mantine/core';
import { IconAlertTriangle, IconCopy, IconSearch, IconTrash } from '@tabler/icons-react';

import type { DuplicateScanProgress, DuplicateScanResult } from '../../../../preload/types/duplicates';
import type { TrackId, Track } from '../../../../preload/types/harmony';

import DuplicateGroup from './DuplicateGroup';
import styles from './DuplicateFinderTool.module.css';
import { useLibraryAPI } from '@renderer/stores/useLibraryStore';

const { config, duplicates, db, library, logger } = window.Main;

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
  const libraryApi = useLibraryAPI();

  // Selection state: which tracks to keep
  const [keeperIds, setKeeperIds] = useState<Set<TrackId>>(new Set());

  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // AIDEV-NOTE: Track which duplicate is currently active (only one plays at a time)
  // Each WavePlayer manages its own playback independently
  const [activePlayingId, setActivePlayingId] = useState<TrackId | null>(null);

  // Listen for scan progress updates
  useEffect(() => {
    const unsubscribe = duplicates.onProgress((progress: DuplicateScanProgress) => {
      setScanProgress(progress);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Start scanning for duplicates
   * AIDEV-NOTE: Now checks cache first before scanning
   */
  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress({ phase: 'loading', progress: 0, message: 'Starting scan...' });
    setScanResult(null);
    setKeeperIds(new Set());
    setActivePlayingId(null); // Reset active player on new scan

    try {
      // Get current duplicate finder config
      const dupConfig = await config.get('duplicateFinderConfig');

      // Check cache first
      setScanProgress({ phase: 'loading', progress: 10, message: 'Checking cache...' });
      const cachedResult = await duplicates.getCache(dupConfig);

      let result: DuplicateScanResult;

      if (cachedResult) {
        // Use cached results
        logger.info('Using cached duplicate scan results');
        result = cachedResult;

        // Simulate progress for UX (cache is instant but we show progress)
        setScanProgress({ phase: 'loading', progress: 50, message: 'Loading cached results...' });
        await new Promise(resolve => setTimeout(resolve, 200));
        setScanProgress({ phase: 'complete', progress: 100, message: 'Cache loaded' });
      } else {
        // Run fresh scan
        logger.info('No valid cache, running fresh scan');
        result = await duplicates.find(dupConfig);
      }

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
   * Set a track as the active player (only one can be active at a time)
   * AIDEV-NOTE: When a track becomes active, all others will pause automatically
   */
  const handleSetActiveTrack = useCallback((trackId: TrackId) => {
    setActivePlayingId(trackId);
  }, []);

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
   * AIDEV-NOTE: Must clear scan results BEFORE deleting files to ensure
   * WaveSurfer instances are destroyed and release file handles
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
      // Stop any active playback and clear scan results first
      // This unmounts all DuplicateWavePlayer components, destroying WaveSurfer instances
      // and releasing file handles before we try to delete the files
      setActivePlayingId(null);
      setScanResult(null);
      setKeeperIds(new Set());

      // Wait for React to unmount components and release file handles
      await new Promise(resolve => setTimeout(resolve, 500));

      // Remove from database
      await db.tracks.remove(tracksToDelete.map(t => t.id));

      // Delete from disk (files should be unlocked now)
      await library.deleteTracks(tracksToDelete);

      logger.info(`Deleted ${tracksToDelete.length} duplicate tracks`);
      await libraryApi.refresh();
    } catch (error) {
      logger.error('Failed to delete duplicate tracks:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [getTracksToDelete]);

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
              activePlayingId={activePlayingId}
              onKeepChange={handleKeepChange}
              onSetActiveTrack={handleSetActiveTrack}
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
