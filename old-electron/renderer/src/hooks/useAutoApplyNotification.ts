/**
 * useAutoApplyNotification Hook
 *
 * Subscribes to auto-apply events (TAG_AUTO_APPLY_COMPLETE) and shows/updates
 * a notification with detailed progress during auto-apply of perfect matches (>= 90% score).
 * Shows track-by-track progress and refreshes the UI when complete.
 * Should be mounted once at the app root level.
 */

import { useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import router from '../views/router';
import useTaggerStore from '../stores/useTaggerStore';

const { library, db } = window.Main;

const NOTIFICATION_ID = 'auto-apply-notification';

/**
 * Auto-apply event types from main process
 */
type AutoApplyEvent =
  | {
      type: 'progress';
      processed: number;
      total: number;
      currentTrackTitle: string;
      updated: number;
      failed: number;
    }
  | {
      type: 'complete';
      updated: number;
      failed: number;
      trackIds: string[];
    };

export function useAutoApplyNotification(): void {
  const isActiveRef = useRef(false);
  const hasShownNotificationRef = useRef(false);

  useEffect(() => {
    const handleAutoApplyEvent = (event: AutoApplyEvent) => {
      if (event.type === 'progress') {
        // Starting or updating progress
        if (!isActiveRef.current) {
          isActiveRef.current = true;
          hasShownNotificationRef.current = true;

          notifications.show({
            id: NOTIFICATION_ID,
            title: 'Auto-Applying Perfect Matches',
            message: `Processing ${event.currentTrackTitle || ''}...`,
            loading: true,
            autoClose: false,
            withCloseButton: false,
          });
          return;
        }

        // Update progress
        const percentage = event.total > 0 ? Math.round((event.processed / event.total) * 100) : 0;
        const message = event.currentTrackTitle
          ? `${event.processed}/${event.total} - ${event.currentTrackTitle} (${percentage}%)`
          : `${event.processed}/${event.total} tracks processed (${percentage}%)`;

        notifications.update({
          id: NOTIFICATION_ID,
          title: 'Auto-Applying Perfect Matches',
          message,
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });
        return;
      }

      if (event.type === 'complete') {
        isActiveRef.current = false;

        if (event.failed > 0) {
          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Auto-Apply Completed with Errors',
            message: `${event.updated} tracks updated, ${event.failed} failed`,
            loading: false,
            autoClose: 5000,
            color: 'yellow',
            withCloseButton: true,
          });
        } else {
          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Auto-Apply Complete',
            message: `${event.updated} track${event.updated === 1 ? '' : 's'} updated successfully`,
            loading: false,
            autoClose: 3000,
            color: 'green',
            withCloseButton: true,
          });
        }

        // Refresh UI to show updated tracks
        // We update the store to trigger AG Grid row updates for each track
        if (event.trackIds.length > 0) {
          (async () => {
            try {
              const updatedTracks = await db.tracks.findByID(event.trackIds);
              // Update each track in the store to trigger AG Grid refresh
              updatedTracks.forEach(track => {
                useTaggerStore.setState({ updated: track });
              });
              // Also revalidate router to refresh loaders
              router.revalidate();
            } catch (error) {
              console.error('[useAutoApplyNotification] Failed to refresh UI:', error);
            }
          })();
        }
      }
    };

    // Subscribe to auto-apply events
    const unsubscribe = library.onTagAutoApplyComplete(handleAutoApplyEvent);

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
