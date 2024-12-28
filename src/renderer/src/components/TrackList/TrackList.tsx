import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  CellContextMenuEvent,
  ColDef,
  FirstDataRenderedEvent,
  GridApi,
  GridReadyEvent,
  RowDoubleClickedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Playlist, Track } from '../../../../preload/types/emusik';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerAPI } from '../../stores/usePlayerStore';

type Props = {
  type: string;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
  height: number;
};

const TrackList = (props: Props) => {
  const { type, tracks, trackPlayingID, playlists, currentPlaylist, height } = props;
  const playerAPI = usePlayerAPI();
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [colDefs, setColDefs] = useState([
    { field: 'title', minWidth: 150 },
    { field: 'artist', minWidth: 90 },
    { field: 'time', maxWidth: 90 },
    { field: 'album', minWidth: 90 },
    { field: 'genre', minWidth: 70 },
    { field: 'year', maxWidth: 70 },
    { field: 'bpm', maxWidth: 70 },
    { field: 'bitrate', minWidth: 80, maxWidth: 90 },
    { field: 'key', maxWidth: 70 },
  ]);
  // const gridStyle = useMemo(() => ({ height: `${height}px`, width: '100%' }), []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true,
    };
  }, []);

  const updateItem = useCallback((updatedItem: Track) => {
    const rowNode = gridRef.current!.api.getRowNode(updatedItem.id)!;
    rowNode.setData(updatedItem);
    console.log(`[TracksTable] updated track: ${updatedItem.title}`);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    gridRef.current?.api.sizeColumnsToFit();
  }, []);

  // useEffect(() => {
  //   if (!tracks.length) return;
  //   updateItems([...tracks]);
  // }, [tracks]);

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
    // showContextMenu(selected);
    // showCtxMenu(selected);
  }, []);

  const onKeyPress = useCallback((event: { key: string }) => {
    if (event.key === 'Escape') {
      gridRef.current?.api.deselectAll();
    }
  }, []);

  return (
    <div
      style={{
        height: height,
      }}
      className='ag-theme-alpine-auto-dark ag-theme-symphony'
      onKeyDown={e => onKeyPress(e)}
    >
      <AgGridReact
        ref={gridRef}
        rowSelection='multiple'
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onFirstDataRendered={onFirstDataRendered}
        onRowDoubleClicked={e => onDoubleClick(e)}
        onCellContextMenu={e => onShowCtxtMenu(e)}
        suppressCellFocus
      />
    </div>
  );
};

export default TrackList;
