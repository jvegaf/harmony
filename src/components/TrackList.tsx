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
import classes from './TrackList.module.css';
import useAppStore from '../stores/useAppStore';
import {Menu, Item, Separator, Submenu, useContextMenu} from 'react-contexify';

import 'react-contexify/dist/ReactContexify.css';

const MENU_ID = 'menu-id';

export function TrackList() {
  const data = useLibraryStore(state => state.tracks);
  const start = usePlayerStore(state => state.api.start);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const contentHeight = useAppStore(state => state.contentHeight);

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
    start(row.id);
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

  const {show} = useContextMenu({
    id: MENU_ID,
  });

  const displayMenu = event => {
    show({
      event,
    });
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

  const table = useMantineReactTable({
    columns,
    data,
    enableFilters: false,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableRowVirtualization: true,
    enableSorting: true,
    mantineTableContainerProps: {style: {height: contentHeight}},

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
      onContextMenu: (event: React.MouseEvent<HTMLTableCellElement, MouseEvent>) => {
        // event.preventDefault();
        displayMenu(event);
      },
    }),
    state: {rowSelection},
  });

  return (
    <div className={classes.trackList}>
      <MantineReactTable table={table} />
      <Menu id={MENU_ID}>
        <Item onClick={playTrackHandler}>Item 1</Item>
        <Item onClick={playTrackHandler}>Item 2</Item>
        <Separator />
        <Item disabled>Disabled</Item>
        <Separator />
        <Submenu label="Submenu">
          <Item onClick={playTrackHandler}>Sub Item 1</Item>
          <Item onClick={playTrackHandler}>Sub Item 2</Item>
        </Submenu>
      </Menu>
    </div>
  );
}
