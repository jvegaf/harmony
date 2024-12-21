/* eslint-disable @typescript-eslint/no-unused-vars */
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'mantine-react-table/styles.css';
import type { MouseEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  MantineReactTable,
  MRT_Row,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
} from 'mantine-react-table';
import classes from './TrackList.module.css';
import { Menu, Item, Separator, useContextMenu } from 'react-contexify';
import { useNavigate } from 'react-router-dom';

import 'react-contexify/dist/ReactContexify.css';
import { useHotkeys } from '@mantine/hooks';
import { Playlist, Track } from '../../../../preload/types/emusik';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import { useLibraryAPI } from '../../stores/useLibraryStore';

type Props = {
  type: string;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
};

const { logger } = window.Main;
const MENU_ID = 'menu-id';

export default function TrackList(props: Props) {
  const { tracks, trackPlayingID, playlists, currentPlaylist } = props;
  const navigate = useNavigate();
  const playerAPI = usePlayerAPI();
  const libraryAPI = useLibraryAPI();

  // const data = useLibraryStore(state => state.tracks);
  // const setSorted = useLibraryStore(state => state.setSorted);
  // const isSorted = useLibraryStore(state => state.isSorted);
  // const sorted = useLibraryStore(state => state.sorted);
  // const fixTracks = useLibraryStore(state => state.fixTracks);
  // const removeTracks = useLibraryStore(state => state.removeTracks);
  // const start = usePlayerStore(state => state.api.start);
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
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

  const playTrackHandler = (row: Track) => {
    setRowSelection({});
    playerAPI.start([row]);
  };

  const handleSelection = (
    event: MouseEvent<HTMLTableRowElement, globalThis.MouseEvent>,
    row: Track | MRT_Row<Track>,
  ) => {
    if (event.detail > 1) {
      playTrackHandler(row as Track);
      return;
    }

    if (event.ctrlKey) {
      logger.info(`selectionHandlerEventCtrlKey ${event}`);
      setRowSelection(prev => ({
        ...prev,
        [row.id]: !prev[row.id],
      }));
      return;
    }

    // if (event.shiftKey && Object.keys(rowSelection).length > 0) {
    //   const shiftedIndex = sorted.findIndex(r => r.id === row.id);
    //   const order = [sortedIndex, shiftedIndex].sort((a, b) => a - b);
    //   const sortedIds = sorted.map(r => r.id).splice(order[0], order[1] - order[0] + 1);
    //   sortedIds.map(id => {
    //     setRowSelection(prev => ({
    //       ...prev,
    //       [id]: true,
    //     }));
    //   });

    // return;
    // }

    logger.info(`selectionHandlerRow ${row}`);
    setRowSelection(prev => ({
      [row.id]: !prev[row.id],
    }));
  };

  const handleKeyPress = (e: globalThis.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRowSelection({});
    }
  };

  const { show } = useContextMenu({
    id: MENU_ID,
  });

  const displayMenu = (event: MouseEvent, props: { row: MRT_Row<Track> }) => {
    show({
      event,
      props,
    });
  };

  const fixTracksHandler = () => {
    const ids = Object.keys(rowSelection);
    ids.forEach(id => libraryAPI.fixTrack(id));
  };

  const handleDetailAction = (row: { id: any }) => {
    navigate(`details/${row.id}`);
  };

  useEffect(() => {
    document.addEventListener('keydown', e => handleKeyPress(e));
    return () => document.removeEventListener('keydown', e => handleKeyPress(e));
  }, []);

  useEffect(() => {
    logger.info(`colorScheme: ${colorScheme}`);
  }, [colorScheme]);

  const isPlayable = Object.keys(rowSelection).length < 2;

  const isPlaying = (rowId: string) => {
    if (trackPlayingID !== rowId) return '';
    if (colorScheme === 'light') return '#d0fbdb';
    return '#087f5b';
  };

  const table = useMantineReactTable({
    columns,
    data: tracks,
    enableFilters: false,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableRowVirtualization: true,
    enableSorting: true,

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

  // useEffect(() => {
  //   setSorted(table.getSortedRowModel().rows);
  // }, [table.getSortedRowModel().rows]);

  const deleteTracksHandler = () => {
    const ids = Object.keys(rowSelection);
    libraryAPI.remove(ids);
  };

  useHotkeys([
    [
      'Escape',
      () => {
        setRowSelection({});
      },
    ],
    [
      'Ctrl+A',
      () => {
        table.toggleAllRowsSelected();
      },
    ],
  ]);

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
