import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine component features
import 'mantine-react-table/styles.css'; //make sure MRT styles were imported in your app root (once)
import type {Track} from '../../electron/types';
import {useState, useEffect, useMemo} from 'react';
import log from 'electron-log/renderer';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table';

export interface TrackListProps {
  tracks: Track[];
  playTrack: (id: string) => void;
}

export function TrackList({tracks}: TrackListProps) {
  // const data = useLibraryStore((state) => state.tracks);
  const data = tracks;
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
      },
      {
        accessorKey: 'year',
        header: 'Year',
      },
      {
        accessorKey: 'genre',
        header: 'Genre',
      },
    ],
    [],
  );

  const playTrackHandler = row => console.log('playTrackHandler', row);

  const handleSelection = (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row) => {
    if (event.detail > 1) {
      playTrackHandler(row);
      return;
    }

    if (event.ctrlKey) {
      console.log('selectionHandlerEventShiftKey');
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

  const table = useMantineReactTable({
    columns,
    data,
    enableFilters: false,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,

    getRowId: row => row.id,
    mantineTableBodyRowProps: ({row}) => ({
      //implement row selection click events manually
      onClick: (event: React.MouseEvent<HTMLTableRowElement, MouseEvent>) => handleSelection(event, row),
      selected: rowSelection[row.id],
      sx: {
        cursor: 'pointer',
      },
    }),
    mantineTableBodyCellProps: () => ({
      style: {
        userSelect: 'none',
      },
    }),
    state: {rowSelection},
  });

  return <MantineReactTable table={table} />;
}
