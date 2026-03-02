import { notifications } from '@mantine/notifications';
import { audioAnalysis } from '@/lib/tauri-api';
import { Track } from '@/types/harmony';
import useTaggerStore from '@/stores/useTaggerStore';

/**
 * AIDEV-NOTE: Extracted audio analysis helper from useIPCMenuEvents
 * Handles batch audio analysis with progress notifications and real-time TrackList updates
 * Used by TrackContextMenu and any other component that needs audio analysis
 */

export function analyzeAudioTracks(selectedTracks: Track[]): void {
  const notificationId = `audio-analysis-${Date.now()}`;

  notifications.show({
    id: notificationId,
    title: 'Audio Analysis',
    message: `Analyzing ${selectedTracks.length} track(s)...`,
    loading: true,
    autoClose: false,
  });

  // Listen to progress events and update notification
  const unsubscribeProgress = audioAnalysis.onProgress(progress => {
    const { completed, total, percentage } = progress;
    notifications.update({
      id: notificationId,
      title: 'Audio Analysis',
      message: `Analyzing... ${completed}/${total} (${percentage.toFixed(0)}%)`,
      loading: true,
      autoClose: false,
    });
  });

  // Listen for track completion events to update TrackList in real-time
  // This triggers the store's `updated` state which AG Grid watches for row updates
  const unsubscribeTrackComplete = audioAnalysis.onTrackComplete(track => {
    useTaggerStore.setState({ updated: track });
  });

  const filePaths = selectedTracks.map(track => track.path);

  // Fire-and-forget pattern - don't await the batch analysis
  // This prevents UI blocking while analysis runs in the background
  audioAnalysis
    .analyzeBatch(filePaths)
    .then(() => {
      // Cleanup listeners
      unsubscribeProgress();
      unsubscribeTrackComplete();

      notifications.update({
        id: notificationId,
        title: 'Audio Analysis Complete',
        message: `Successfully analyzed ${selectedTracks.length} track(s)`,
        loading: false,
        autoClose: 3000,
        color: 'green',
      });
    })
    .catch(error => {
      // Cleanup listeners
      unsubscribeProgress();
      unsubscribeTrackComplete();

      notifications.update({
        id: notificationId,
        title: 'Audio Analysis Failed',
        message: String(error),
        loading: false,
        autoClose: 5000,
        color: 'red',
      });
    });
}
