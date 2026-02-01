/**
 * useAutoSyncNotification Hook
 *
 * AIDEV-NOTE: Subscribes to auto-sync status events and shows/updates
 * a notification with progress during auto-sync operations.
 * Should be mounted once at the app root level.
 */

import { useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import type { AutoSyncStatus } from '../../../preload/types/traktor';

const { traktor } = window.Main;

const NOTIFICATION_ID = 'auto-sync-notification';

export function useAutoSyncNotification(): void {
  const wasRunningRef = useRef(false);
  const hasShownNotificationRef = useRef(false);

  useEffect(() => {
    const handleStatusChange = (status: AutoSyncStatus) => {
      // Starting sync
      if (status.isRunning && !wasRunningRef.current) {
        wasRunningRef.current = true;
        hasShownNotificationRef.current = true;

        notifications.show({
          id: NOTIFICATION_ID,
          title: 'Traktor Auto-Sync',
          message: status.message || 'Starting sync...',
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        return;
      }

      // Progress update
      if (status.isRunning && wasRunningRef.current) {
        const directionLabel = status.direction === 'export' ? 'Exporting' : 'Importing';
        const message = status.message || `${directionLabel}... ${status.progress}%`;

        notifications.update({
          id: NOTIFICATION_ID,
          title: 'Traktor Auto-Sync',
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
            title: 'Traktor Auto-Sync Failed',
            message: status.lastError,
            loading: false,
            autoClose: 5000,
            color: 'red',
            withCloseButton: true,
          });
        } else if (status.phase === 'complete') {
          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Traktor Auto-Sync Complete',
            message: status.message || 'Sync completed successfully',
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
