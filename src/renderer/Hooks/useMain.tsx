import React from 'react';
import { Track } from 'src/shared/types/emusik';

export default function useMain() {
  const [totalFiles, setTotalFiles] = React.useState<number>(0);
  const [doneFiles, setDoneFiles] = React.useState<number>(0);

  const onOpenFolder = React.useCallback(() => window.ipc.openFolder(), []);

  const onFixTracks = React.useCallback((selected: Track[]) => window.ipc.fixTracks(selected), []);

  const filesToProcess = React.useCallback((total: number) => {
    setTotalFiles(total);
    console.log(`founded ${total} music files`);
  }, []);

  const fileDone = React.useCallback(() => {
    const updatedDone = doneFiles + 1;
    setDoneFiles(updatedDone);
    console.log(`done ${updatedDone} of ${totalFiles} music files`);
  }, [doneFiles, totalFiles]);

  return {
    onOpenFolder,
    onFixTracks,
    filesToProcess,
    fileDone,
  };
}