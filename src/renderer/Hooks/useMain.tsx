import React from 'react';
import { log } from 'src/main/services/log/log';
import { Track } from 'src/shared/types/emusik';

export default function useMain() {
  const [totalFiles, setTotalFiles] = React.useState<number>(0);
  const [doneFiles, setDoneFiles] = React.useState<number>(0);

  const onOpenFolder = React.useCallback(() => window.ipc.openFolder(), []);

  const onFixTracks = React.useCallback((selected: Track[]) => window.ipc.fixTracks(selected), []);

  const filesToProcess = React.useCallback((total: number) => {
    setTotalFiles(total);
    log.info(`founded ${total} music files`);
  }, []);

  const fileDone = React.useCallback(() => {
    const updatedDone = doneFiles + 1;
    setDoneFiles(updatedDone);
    log.info(`done ${updatedDone} of ${totalFiles} music files`);
  }, [doneFiles, totalFiles]);

  return {
    onOpenFolder,
    onFixTracks,
    filesToProcess,
    fileDone,
    totalFiles,
    doneFiles,
  };
}