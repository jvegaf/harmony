/* eslint-disable no-console */
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Track } from '../../shared/types/emusik';

interface TrackListProps {
  tracks: Track[];
  trackPlaying: Track;
  setTrackPlaying: React.Dispatch<React.SetStateAction<Track>>;
  showCtxMenu: (track: Track) => void;
}
const TrackList: React.FC<TrackListProps> = props => {
  const { tracks, trackPlaying, setTrackPlaying, showCtxMenu } = props;

  const gridRef = useRef<AgGridReact>(null);
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState<any[]>();
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    { field: 'title', minWidth: 150 },
    { field: 'artist', minWidth: 150 },
    { field: 'time', maxWidth: 90 },
    { field: 'year', maxWidth: 90 },
    { field: 'album', minWidth: 150 },
    { field: 'genre', minWidth: 150 },
    { field: 'bpm', maxWidth: 90 },
    { field: 'key', maxWidth: 90 },
  ]);
  const defaultColDef = useMemo<ColDef>(() => {
    return {
      flex: 1,
      minWidth: 100,
    };
  }, []);

  const onSelectionChanged = useCallback(() => {
    const selectedRows = gridRef.current!.api.getSelectedRows();
    let selectedRowsString = '';
    const maxToShow = 5;
    selectedRows.forEach((selectedRow, index) => {
      if (index >= maxToShow) {
        return;
      }
      if (index > 0) {
        selectedRowsString += ', ';
      }
      selectedRowsString += selectedRow.athlete;
    });
    if (selectedRows.length > maxToShow) {
      const othersCount = selectedRows.length - maxToShow;
      selectedRowsString += ` and ${othersCount} other${othersCount !== 1 ? 's' : ''}`;
    }
    (document.querySelector('#selectedRows') as any).innerHTML = selectedRowsString;
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div className="example-header">
          Selection:
          <span id="selectedRows" />
        </div>

        <div style={gridStyle} className="ag-theme-alpine">
          <AgGridReact
            ref={gridRef}
            rowData={tracks}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackList;
