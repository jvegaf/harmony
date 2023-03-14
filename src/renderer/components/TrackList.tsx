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
import React from 'react';
import useAppState from '../hooks/useAppState';
import { Track, TrackId } from 'shared/types/emusik';

const TrackListView = ({ tracks }) => {
  const { playTrack } = useAppState();
  const gridRef = React.useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = React.useState<GridApi | null>(null);
  const [rowData, setRowData] = React.useState<Track[]>([]);
  const columnDefs = React.useMemo<ColDef[]>(
    () => [
      { field: 'title', minWidth: 150 },
      { field: 'artist', minWidth: 90 },
      { field: 'time', maxWidth: 70 },
      { field: 'album', minWidth: 90 },
      { field: 'genre', minWidth: 70 },
      { field: 'year', maxWidth: 70 },
      { field: 'bpm', maxWidth: 70 },
      { field: 'bitrate', maxWidth: 70 },
      { field: 'key', maxWidth: 70 },
    ],
    []
  );
  const containerStyle = React.useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = React.useMemo(() => ({ height: '100%', width: '100%' }), []);

  const defaultColDef = React.useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true,
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onFirstDataRendered = React.useCallback((params: FirstDataRenderedEvent) => {
    gridRef.current?.api.sizeColumnsToFit();
  }, []);

  React.useEffect(() => {
    setRowData(tracks);
  }, [tracks]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracks);
  };

  const onDblClick = React.useCallback(
    (event: RowDoubleClickedEvent) => {
      event.event?.preventDefault();
      const { data } = event;
      playTrack(data.id as TrackId);
    },
    [playTrack]
  );

  const onShowCtxtMenu = React.useCallback((event: CellContextMenuEvent) => {
    event.event?.preventDefault();
    if (!event.node.isSelected()) {
      event.node.setSelected(true, true);
    }

    const selected = (event.api.getSelectedRows() as Track[]).map((t) => t.id);
    window.Main.ShowContextMenu(selected);
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className='ag-theme-alpine'>
        <AgGridReact
          ref={gridRef}
          rowSelection='multiple'
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          onRowDoubleClicked={(e) => onDblClick(e)}
          onCellContextMenu={(e) => onShowCtxtMenu(e)}
          suppressCellSelection
        />
      </div>
    </div>
  );
};

const TrackList = () => {
  const [tracks, setTracks] = React.useState([]);

  React.useEffect(() => {
    window.Main.on('all-tracks', (_, allTracks) => setTracks(allTracks));
  });

  return <>{tracks.length && <TrackListView tracks={tracks} />}</>;
};

export default TrackList;
