/**
 * useImportNotification Hook
 *
 * Subscribes to library import progress events and shows/updates
 * a Mantine notification with a live progress bar during the import operation.
 * Covers all phases: scanning, importing (per-track), saving, complete, and error.
 * Should be mounted once at the app root level.
 */

import { useEffect, useRef } from 'react';

import { notifications } from '@mantine/notifications';
import { Progress, Text } from '@mantine/core';

import type { LibraryImportProgress } from '@/types/harmony';
import { library } from '@/lib/tauri-api';

const NOTIFICATION_ID = 'library-import-notification';

/**
 * Build the step label shown as the notification title
 */
function getStepTitle(step: LibraryImportProgress['step']): string {
  switch (step) {
    case 'scanning':
      return 'Scanning filesystem...';
    case 'importing':
      return 'Importing library';
    case 'saving':
      return 'Saving to database';
    default:
      return 'Importing library';
  }
}

/**
 * Build a ReactNode message with a progress bar for importing/saving steps.
 * Mantine notifications accept ReactNode as the message prop.
 */
function buildProgressMessage(progress: LibraryImportProgress) {
  const { processed, total, message } = progress;
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <>
      <Text size='sm'>{message}</Text>
      <Progress
        value={percentage}
        size='sm'
        mt={6}
        animated
      />
      <Text
        size='xs'
        c='dimmed'
        mt={4}
      >
        {processed.toLocaleString()} / {total.toLocaleString()} &nbsp;({percentage}%)
      </Text>
    </>
  );
}

export function useImportNotification(): void {
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const unsubscribe = library.onImportProgress((progress: LibraryImportProgress) => {
      const { step, processed, total } = progress;

      switch (step) {
        case 'scanning': {
          isVisibleRef.current = true;
          notifications.show({
            id: NOTIFICATION_ID,
            title: 'Importing library',
            message: 'Scanning filesystem...',
            loading: true,
            autoClose: false,
            withCloseButton: false,
          });
          break;
        }

        case 'importing':
        case 'saving': {
          notifications.update({
            id: NOTIFICATION_ID,
            title: getStepTitle(step),
            // AIDEV-NOTE: Mantine notifications accept ReactNode as `message`,
            // allowing us to embed a Progress bar directly in the toast.
            message: total > 0 ? buildProgressMessage(progress) : progress.message,
            loading: total === 0,
            autoClose: false,
            withCloseButton: false,
          });
          break;
        }

        case 'complete': {
          const tracksAdded = processed;
          const successMessage =
            tracksAdded > 0
              ? `Successfully imported ${tracksAdded.toLocaleString()} track${tracksAdded === 1 ? '' : 's'}`
              : 'All tracks were already up to date';

          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Library import complete',
            message: successMessage,
            loading: false,
            autoClose: 4000,
            color: 'green',
            withCloseButton: true,
          });

          isVisibleRef.current = false;
          break;
        }

        case 'error': {
          notifications.update({
            id: NOTIFICATION_ID,
            title: 'Library import failed',
            message: progress.message,
            loading: false,
            autoClose: 5000,
            color: 'red',
            withCloseButton: true,
          });

          isVisibleRef.current = false;
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      if (isVisibleRef.current) {
        notifications.hide(NOTIFICATION_ID);
        isVisibleRef.current = false;
      }
    };
  }, []);
}
