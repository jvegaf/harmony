import React from 'react';
import { ProcessFiles, Track } from 'src/shared/types/emusik';

export default function useMain() {
  const onOpenFolder = React.useCallback(() => window.ipc.openFolder(), []);
  const onFixTracks = React.useCallback((selected: Track[]) => window.ipc.fixTracks(selected), []);
  const filesToProcess = React.useCallback((pf: ProcessFiles) => console.log(`done ${pf.done}/${pf.total}`), []);

  return { onOpenFolder, onFixTracks, filesToProcess };
}