import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import type { MouseEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import useLibraryStore from '../stores/useLibraryStore';
import usePlayerStore from '../stores/usePlayerStore';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table';
import classes from './TrackList.module.css';
import { Track } from '@preload/emusik';
import useAppStore from '../stores/useAppStore';
import { Menu, Item, Separator, useContextMenu } from 'react-contexify';
import { useNavigate } from 'react-router-dom';

import 'react-contexify/dist/ReactContexify.css';
import { modals } from '@mantine/modals';
import { Text } from '@mantine/core';

const MENU_ID = 'menu-id';

export function TrackList() {
  const navigate = useNavigate();
  const data = useLibraryStore(state => state.tracks);
  const setSorted = useLibraryStore(state => state.setSorted);
  const isSorted = useLibraryStore(state => state.isSorted);
  const sorted = useLibraryStore(state => state.sorted);
  const fixTracks = useLibraryStore(state => state.fixTracks);
  const removeTracks = useLibraryStore(state => state.removeTracks);
  const start = usePlayerStore(state => state.api.start);
  const playingTrack = usePlayerStore(state => state.playingTrack);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const contentHeight = useAppStore(state => state.contentHeight);
  const [sortedIndex, setSortedIndex] = useState<number>(0);
  const colorScheme = document.querySelector('html')!.getAttribute('data-mantine-color-scheme');

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
        accessorKey: 'bpm',
        header: 'BPM',
        size: 10,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        size: 10,
      },
      {
        accessorKey: 'year',
        header: 'Year',
        size: 10,
      },
      {
        accessorKey: 'album', //normal accessorKey
        header: 'Album',
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

  const handleSelection = (event, row) => {
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

    if (event.shiftKey && Object.keys(rowSelection).length > 0) {
      const shiftedIndex = sorted.findIndex(r => r.id === row.id);
      const order = [sortedIndex, shiftedIndex].sort((a, b) => a - b);
      const sortedIds = sorted.map(r => r.id).splice(order[0], order[1] - order[0] + 1);
      sortedIds.map(id => {
        setRowSelection(prev => ({
          ...prev,
          [id]: true,
        }));
      });

      return;
    }

    console.log('selectionHandlerRow', row);
    setRowSelection(prev => ({
      [row.id]: !prev[row.id],
    }));
    if (isSorted) {
      const index = sorted.findIndex(r => r.id === row.id);
      setSortedIndex(index);
      console.log('sortedIndex', index);
    }
  };

  const handleKeyPress = (e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRowSelection({});
    }
  };

  const { show } = useContextMenu({
    id: MENU_ID,
  });

  const displayMenu = (event: MouseEvent, props) => {
    show({
      event,
      props,
    });
  };

  const fixTracksHandler = () => {
    const ids = Object.keys(rowSelection);
    fixTracks(ids);
  };

  const handleDetailAction = row => {
    navigate(`detail/${row.id}`);
  };

  useEffect(() => {
    console.log('isSorted', isSorted);
    if (isSorted) {
      console.log('first track', sorted[0].original.title);
    }
  }, [isSorted, sorted]);

  useEffect(() => {
    document.addEventListener('keydown', e => handleKeyPress(e));
    return () => document.removeEventListener('keydown', e => handleKeyPress(e));
  }, []);

  useEffect(() => {
    console.log('colorScheme:', colorScheme);
  }, [colorScheme]);

  const isPlayable = Object.keys(rowSelection).length < 2;

  const isPlaying = (rowId: string) => {
    if (playingTrack !== rowId) return '';
    if (colorScheme === 'light') return '#d0fbdb';
    return '#087f5b';
  };

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
    mantineTableContainerProps: { style: { height: contentHeight } },

    getRowId: row => row.id,
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: event => handleSelection(event, row),
      onContextMenu: (event: MouseEvent) => {
        if (Object.keys(rowSelection).length < 2)
          setRowSelection(prev => ({
            [row.id]: !prev[row.id],
          }));
        displayMenu(event, { row });
      },
      selected: rowSelection[row.id],
      style: {
        backgroundColor: isPlaying(row.id),
      },
    }),
    mantineTableBodyCellProps: { style: { userSelect: 'none', backgroundColor: 'transparent' } },
    state: {
      rowSelection,
      density: 'xs',
    },
  });

  useEffect(() => {
    setSorted(table.getSortedRowModel().rows);
  }, [table.getSortedRowModel().rows]);

  const getConfirmMessage = () => {
    if (Object.keys(rowSelection).length > 1)
      return `Are you sure you want to delete these ${Object.keys(rowSelection).length} tracks?`;
    return 'Are you sure you want to delete this track?';
  };

  const deleteTracksHandler = () => {
    modals.openConfirmModal({
      title: 'Confirm',
      centered: true,
      children: <Text size='sm'>{getConfirmMessage()}</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        const ids = Object.keys(rowSelection);
        removeTracks(ids);
      },
    });
  };

  return (
    <div className={classes.trackListContainer}>
      <MantineReactTable table={table} />
      <Menu id={MENU_ID}>
        <Item
          disabled={!isPlayable}
          onClick={({ props }) => playTrackHandler(props.row)}
        >
          Play Track
        </Item>
        <Item
          disabled={Object.keys(rowSelection).length !== 1}
          onClick={({ props }) => handleDetailAction(props.row)}
        >
          View Detail
        </Item>
        <Separator />
        <Item
          disabled={Object.keys(rowSelection).length < 1}
          onClick={fixTracksHandler}
        >
          Fix Tags
        </Item>
        <Separator />
        <Item
          disabled={Object.keys(rowSelection).length < 1}
          onClick={deleteTracksHandler}
        >
          Delete
        </Item>
      </Menu>
    </div>
  );
}
