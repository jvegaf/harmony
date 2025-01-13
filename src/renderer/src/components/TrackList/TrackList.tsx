import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  CellContextMenuEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowDoubleClickedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { CtxMenuPayload, Playlist, Track } from '../../../../preload/types/emusik';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import './TrackList.css';
import useLibraryStore from '../../stores/useLibraryStore';
import { ParseDuration } from '../../../../preload/utils';

type Props = {
  type: string;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
  width: number;
  height: number;
};

const { menu, logger } = window.Main;

const TrackList = (props: Props) => {
  const { tracks, trackPlayingID, playlists, currentPlaylist, width, height } = props;
  const playerAPI = usePlayerAPI();
  const gridRef = useRef<AgGridReact>(null);
  const [lastUpdated, setLastUpdated] = useState<Track | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const updated = useLibraryStore.use.updated();
  const colDefs = [
    { field: 'title', minWidth: 150 },
    { field: 'artist', minWidth: 90 },
    {
      field: 'duration',
      maxWidth: 80,
      headerName: 'Time',
      valueFormatter: (p: { value: number | null }) => ParseDuration(p.value),
    },
    { field: 'album', minWidth: 90 },
    { field: 'genre', minWidth: 180, maxWidth: 200 },
    { field: 'year', maxWidth: 70 },
    { field: 'bpm', maxWidth: 70 },
    { field: 'bitrate', valueFormatter: (p: { value: number }) => p.value / 1000 + 'kbps', minWidth: 80, maxWidth: 90 },
    { field: 'initialKey', headerName: 'Key', maxWidth: 70 },
  ];

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true,
    };
  }, []);

  const updateTrackRow = useCallback(updatedTrack => {
    const rowNode = gridRef.current!.api.getRowNode(updatedTrack.id)!;
    rowNode.updateData(updatedTrack);
    logger.info(`[TracksTable] updated track: ${updatedTrack.title}`);
    setLastUpdated(updatedTrack);
  }, []);

  useEffect(() => {
    if (updated !== null && updated !== lastUpdated) {
      updateTrackRow(updated);
    }
  }, [updated, lastUpdated]);

  useEffect(() => {
    if (gridApi) {
      // Example usage of gridApi
      gridApi.sizeColumnsToFit();
    }
  }, [gridApi, width]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracks);
  };

  const onDoubleClick = useCallback(
    (event: RowDoubleClickedEvent) => {
      event.event?.preventDefault();
      const { rowIndex } = event;
      const queue = rowData.map(track => track.id);
      playerAPI.start(queue, rowIndex!);
      event.node.setSelected(false);
    },
    [playerAPI, rowData],
  );

  const onShowCtxtMenu = useCallback((event: CellContextMenuEvent) => {
    event.event?.preventDefault();
    if (!event.node.isSelected()) {
      event.node.setSelected(true, true);
    }

    const selected = event.api.getSelectedRows() as Track[];

    const payload: CtxMenuPayload = {
      selected,
      playlists,
      currentPlaylist: currentPlaylist || null,
    };

    menu.show(payload);
  }, []);

  const onKeyPress = useCallback((event: { ctrlKey: boolean; key: string }) => {
    if (event.key === 'Escape') {
      gridRef.current?.api.deselectAll();
    }
    if (event.ctrlKey && event.key === 'a') {
      gridRef.current?.api.selectAll();
    }
  }, []);

  const getRowId = useCallback((params: GetRowIdParams) => {
    return params.data.id;
  }, []);

  const rowClassRules = useMemo(() => {
    return {
      'playing-style': params => {
        const trackId = params.data.id;
        return trackId === trackPlayingID;
      },
    };
  }, [trackPlayingID]);

  // const getRowStyle = params => {
  //   if (params.data.id === trackPlayingID) {
  //     return { background: 'red' };
  //   }
  // };

  return (
    <div
      style={{
        height: height,
        width: width,
      }}
      className='ag-theme-alpine-auto-dark ag-theme-emusik'
      onKeyDown={e => onKeyPress(e)}
    >
      <AgGridReact
        ref={gridRef}
        rowSelection='multiple'
        rowData={rowData}
        rowClassRules={rowClassRules}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        getRowId={getRowId}
        onRowDoubleClicked={e => onDoubleClick(e)}
        onCellContextMenu={e => onShowCtxtMenu(e)}
        suppressCellFocus
        animateRows={false}
      />
    </div>
  );
};

export default TrackList;
