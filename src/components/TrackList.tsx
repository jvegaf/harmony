import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import {
  CellContextMenuEvent,
  ColDef,
  FirstDataRenderedEvent,
  GridApi,
  GridReadyEvent,
  RowDoubleClickedEvent
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import useAppState from '../hooks/useAppState';

const TrackList = () => {
  const { tracksCollection, playTrack, showCtxMenu } = useAppState();
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'title', minWidth: 150 },
      { field: 'artist', minWidth: 90 },
      { field: 'time', maxWidth: 70 },
      { field: 'album', minWidth: 90 },
      { field: 'genre', minWidth: 70 },
      { field: 'year', maxWidth: 70 },
      { field: 'bpm', maxWidth: 70 },
      { field: 'bitrate', maxWidth: 70 },
      { field: 'key', maxWidth: 90 }
    ],
    []
  );
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true
    };
  }, []);

  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    gridRef.current?.api.sizeColumnsToFit();
  }, []);

  useEffect(() => {
    setRowData(tracksCollection);
  }, [tracksCollection]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracksCollection);
  };

  const onDblClick = useCallback(
    (event: RowDoubleClickedEvent) => {
      event.event?.preventDefault();
      const { data } = event;
      playTrack(data as Track);
    },
    [playTrack]
  );

  const onShowCtxtMenu = useCallback(
    (event: CellContextMenuEvent) => {
      event.event?.preventDefault();
      if (!event.node.isSelected()) {
        event.node.setSelected(true, true);
      }

      const selected = event.api.getSelectedRows();
      showCtxMenu(selected);
    },
    [showCtxMenu]
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle} className="ag-theme-alpine">
        <AgGridReact
          ref={gridRef}
          rowSelection="multiple"
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

export default TrackList;
