import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  CellContextMenuEvent,
  ColDef,
  FirstDataRenderedEvent,
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

type Props = {
  type: string;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
  height: number;
};

const { menu, logger } = window.Main;

const TrackList = (props: Props) => {
  const { type, tracks, trackPlayingID, playlists, currentPlaylist, height } = props;
  const playerAPI = usePlayerAPI();
  const gridRef = useRef<AgGridReact>(null);
  const [lastUpdated, setLastUpdated] = useState<Track | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const updated = useLibraryStore.use.updated();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [colDefs, setColDefs] = useState([
    { field: 'title', minWidth: 150 },
    { field: 'artist', minWidth: 90 },
    { field: 'time', maxWidth: 90 },
    { field: 'album', minWidth: 90 },
    { field: 'genre', minWidth: 70 },
    { field: 'year', maxWidth: 70 },
    { field: 'bpm', maxWidth: 70 },
    { field: 'bitrate', valueFormatter: (p: { value: number }) => p.value / 1000 + 'kbps', minWidth: 80, maxWidth: 90 },
    { field: 'key', maxWidth: 70 },
  ]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    gridRef.current?.api.sizeColumnsToFit();
  }, []);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracks);
  };

  const onDoubleClick = useCallback((event: RowDoubleClickedEvent) => {
    event.event?.preventDefault();
    const { data } = event;
    // navigate(`detail/${data.id}`);
    playerAPI.start(data.id);
  }, []);

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

  return (
    <div
      style={{
        height: height,
      }}
      className='ag-theme-alpine-auto-dark ag-theme-emusik'
      onKeyDown={e => onKeyPress(e)}
    >
      <AgGridReact
        ref={gridRef}
        rowSelection='multiple'
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        getRowId={getRowId}
        onFirstDataRendered={onFirstDataRendered}
        onRowDoubleClicked={e => onDoubleClick(e)}
        onCellContextMenu={e => onShowCtxtMenu(e)}
        suppressCellFocus
        animateRows={false}
      />
    </div>
  );
};

export default TrackList;
