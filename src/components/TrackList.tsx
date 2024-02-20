import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import type {Track} from '../../electron/types';
import {useState, useEffect, useMemo} from 'react';
import log from 'electron-log/renderer';
import useLibraryStore from '../stores/useLibraryStore';
import usePlayerStore from '../stores/usePlayerStore';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table';
import useAppStore from '../stores/useAppStore';

export function TrackList() {
  const data = useLibraryStore(state => state.tracks);
  const libHeight = useAppStore(state => state.libHeight);
  const playTrack = usePlayerStore(state => state.playTrack);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const columns = useMemo<MRT_ColumnDef<Track>[]>(
    () => [
      {
        accessorKey: 'title', //access nested data with dot notation
        header: 'Title',
      },
      {
        accessorKey: 'artist',
        header: 'Artist',
      },
      {
        accessorKey: 'album', //normal accessorKey
        header: 'Album',
      },
      {
        accessorKey: 'bpm',
        header: 'BPM',
        size: 10,
      },
      {
        accessorKey: 'year',
        header: 'Year',
        size: 10,
      },
      {
        accessorKey: 'genre',
        header: 'Genre',
        size: 50,
      },
    ],
    [],
  );

  const playTrackHandler = row => {
    setRowSelection({});
    playTrack(row.id);
  };

  const handleSelection = (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row) => {
    if (event.detail > 1) {
      playTrackHandler(row);
      return;
    }

    if (event.ctrlKey) {
      console.log('selectionHandlerEventCtrlKey', event);
      setRowSelection(prev => ({
        ...prev,
        [row.id]: !prev[row.id],
      }));
      return;
    }

    console.log('selectionHandlerEvent', event);
    console.log('selectionHandlerRow', row);
    setRowSelection(prev => ({
      [row.id]: !prev[row.id],
    }));
  };

  const handleKeyPress = (e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRowSelection({});
    }
  };

  useEffect(() => {
    log.info('selected:', rowSelection);
  }, [rowSelection]);

  useEffect(() => {
    document.addEventListener('keydown', e => handleKeyPress(e));
    return () => document.removeEventListener('keydown', e => handleKeyPress(e));
  }, []);

  useEffect(() => {
    console.log('trackList: playingTrack', playingTrack);
  }, [playingTrack]);

  useEffect(() => {
    log.info('libHeight: ', libHeight);
  }, [libHeight]);

  const table = useMantineReactTable({
    columns,
    data,
    enableFilters: false,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    mantineTableContainerProps: {style: {height: libHeight}},

    getRowId: row => row.id,
    mantineTableBodyRowProps: ({row}) => ({
      onClick: (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => handleSelection(event, row),
      selected: rowSelection[row.id],
      sx: {
        cursor: 'pointer',
      },
    }),
    mantineTableBodyCellProps: ({row}) => ({
      style: {
        userSelect: 'none',
        backgroundColor: playingTrack && row.id === playingTrack ? 'var(--mantine-color-default-border)' : '',
      },
    }),
    state: {rowSelection},
  });

  return <MantineReactTable table={table} />;
}
