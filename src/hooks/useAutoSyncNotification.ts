/**
 * useAutoSyncNotification Hook
 *
 * Subscribes to auto-sync status events and shows/updates
 * a notification with detailed progress during auto-sync operations.
 * Shows percentage and current phase (parsing, syncing, writing, etc.)
 * Should be mounted once at the app root level.
 */

import { useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import type { AutoSyncStatus } from '@/types/traktor';
import { traktor } from '@/lib/tauri-api';

const NOTIFICATION_ID = 'auto-sync-notification';

/**
 * Get user-friendly phase label
 */
function getPhaseLabel(phase: AutoSyncStatus['phase']): string {
  switch (phase) {
    case 'parsing':
      return '📖 Parsing';
    case 'loading':
      return '📂 Loading';
    case 'syncing':
      return '🔄 Syncing';
    case 'validating':
      return '✓ Validating';
    case 'writing':
      return '💾 Writing';
    case 'building':
      return '🔨 Building';
    case 'complete':
      return '✓ Complete';
    default:
      return '';
  }
}

/**
 * Get operation label based on direction
 */
function getOperationLabel(direction: AutoSyncStatus['direction']): string {
  if (direction === 'export') {
    return 'Export to Traktor';
  } else if (direction === 'import') {
    return 'Import from Traktor';
  }
  return 'Sync with Traktor';
}

export function useAutoSyncNotification(): void {
  const wasRunningRef = useRef(false);
  const hasShownNotificationRef = useRef(false);

  useEffect(() => {
    const handleStatusChange = (status: AutoSyncStatus) => {
      // Starting sync
      if (status.isRunning && !wasRunningRef.current) {
        wasRunningRef.current = true;
        hasShownNotificationRef.current = true;

        const operationLabel = getOperationLabel(status.direction);

        notifications.show({
          id: NOTIFICATION_ID,
          title: `Traktor: ${operationLabel}`,
          message: status.message || 'Starting...',
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        return;
      }

      // Progress update
      if (status.isRunning && wasRunningRef.current) {
        const operationLabel = getOperationLabel(status.direction);
        const phaseLabel = status.phase ? getPhaseLabel(status.phase) : '';
        const progress = status.progress ?? 0;

        // Build detailed message with phase and percentage
        let message = status.message || 'Processing...';

        // Add phase and percentage if available
        if (phaseLabel && progress > 0) {
          message = `${phaseLabel} ${message} (${progress.toFixed(0)}%)`;
        } else if (phaseLabel) {
          message = `${phaseLabel} ${message}`;
        } else if (progress > 0) {
          message = `${message} (${progress.toFixed(0)}%)`;
        }

        notifications.update({
          id: NOTIFICATION_ID,
          title: `Traktor: ${operationLabel}`,
          message,
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        return;
      }

      // Sync completed or errored
      if (!status.isRunning && wasRunningRef.current) {
        wasRunningRef.current = false;

        if (status.lastError) {
          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Traktor Sync Failed',
            message: status.lastError,
            loading: false,
            autoClose: 5000,
            color: 'red',
            withCloseButton: true,
          });
        } else if (status.phase === 'complete') {
          const operationLabel = getOperationLabel(status.direction);
          notifications.update({
            id: NOTIFICATION_ID,
            title: `Traktor ${operationLabel} Complete`,
            message: status.message || 'Operation completed successfully',
            loading: false,
            autoClose: 3000,
            color: 'green',
            withCloseButton: true,
          });
        }
      }
    };

    // Subscribe to status changes
    const unsubscribe = traktor.autoSync.onStatusChange(handleStatusChange);

    // Clean up
    return () => {
      unsubscribe();
      // Hide notification if it was shown
      if (hasShownNotificationRef.current) {
        notifications.hide(NOTIFICATION_ID);
      }
    };
  }, []);
}
