import React from 'react';

export default function useMain() {
  const onOpenFolder = React.useCallback(() => window.ipc.OpenFolder(), []);
  const onFixTracks = React.useCallback((selected: Track[]) => window.ipc.FixTracks(selected), []);

  return { onOpenFolder, onFixTracks };
}