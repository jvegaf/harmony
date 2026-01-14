import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  CellContextMenuEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowDoubleClickedEvent,
  SortChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { TrklistCtxMenuPayload, Playlist, Track, TrackId } from '../../../../preload/types/harmony';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import './TrackList.css';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { ParseDuration } from '../../../../preload/utils';
import TrackRatingComponent from '../TrackRatingComponent/TrackRatingComponent';
import { GetParentFolderName, ratingComparator } from '../../lib/utils-library';

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
  const libraryAPI = useLibraryAPI();
  const { searched, updated, deleting, tracklistSort } = useLibraryStore();
  const gridRef = useRef<AgGridReact>(null);
  const [lastUpdated, setLastUpdated] = useState<Track | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const colDefs = [
    { field: 'title', minWidth: 150 },
    { field: 'artist', minWidth: 90 },
    {
      field: 'duration',
      maxWidth: 80,
      headerName: 'Time',
      valueFormatter: (p: { value: number | null }) => ParseDuration(p.value),
    },
    // { field: 'album', minWidth: 90 },
    {
      field: 'path',
      headerName: 'Crate',
      valueFormatter: (p: { value: string }) => GetParentFolderName(p.value),
      minWidth: 80,
      maxWidth: 100,
    },
    {
      field: 'rating',
      minWidth: 120,
      maxWidth: 130,
      comparator: ratingComparator,
      cellRenderer: props => {
        return (
          <>
            <TrackRatingComponent
              trackSrc={props.data.path}
              rating={props.value}
              size='md'
            />
          </>
        );
      },
    },
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

  const updateTrackRow = useCallback(
    updatedTrack => {
      // const rowNode = gridRef.current!.api.getRowNode(updatedTrack.id)!;
      const rowNode = gridRef.current?.api.getRowNode(updatedTrack.id);
      if (!rowNode) {
        logger.error(`[TracksTable] track not found: ${updatedTrack.title}`);
        return;
      }
      rowNode.updateData(updatedTrack);
      logger.info(`[TracksTable] updated track: ${updatedTrack.title}`);
      setLastUpdated(updatedTrack);
    },
    [gridRef],
  );

  const goTo = useCallback(
    (trackID: string) => {
      const rowNode = gridRef.current!.api.getRowNode(trackID);
      if (!rowNode) {
        logger.error(`[TracksTable] track not found: ${trackID}`);
        return;
      }

      gridRef.current!.api.deselectAll();
      rowNode.setSelected(true);
      // rowNode.setFocused ? rowNode.setFocused(true) : rowNode.setSelected(true, true);
      gridRef.current!.api.ensureNodeVisible(rowNode);

      logger.info(`[TracksTable] selected track: ${trackID}`);

      libraryAPI.setSearched(null);
    },
    [gridRef, libraryAPI],
  );

  useEffect(() => {
    if (gridApi && updated !== null && updated !== lastUpdated) {
      updateTrackRow(updated);
    }
  }, [gridApi, updated, lastUpdated]);

  useEffect(() => {
    if (deleting) {
      const selectedRowData = gridRef.current!.api.getSelectedRows();
      gridRef.current!.api.applyTransaction({ remove: selectedRowData });
    }
  }, [deleting]);

  useEffect(() => {
    if (gridApi) {
      gridApi.sizeColumnsToFit();
    }
  }, [gridApi, width]);

  useEffect(() => {
    if (searched) {
      goTo(searched.id);
    }

    return () => {
      libraryAPI.setSearched(null);
    };
  }, [searched]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracks);

    // AIDEV-NOTE: Apply persisted sort configuration on grid initialization
    if (tracklistSort && tracklistSort.colId && tracklistSort.mode) {
      params.api.applyColumnState({
        state: [{ colId: tracklistSort.colId, sort: tracklistSort.mode as 'asc' | 'desc' }],
        defaultState: { sort: null },
      });
      logger.info(`[TracksTable] Applied initial sort: ${tracklistSort.colId} ${tracklistSort.mode}`);
    }
  };

  const onDoubleClick = useCallback(
    (event: RowDoubleClickedEvent) => {
      event.event?.preventDefault();
      const { rowIndex } = event;
      const queue = event.node.parent!.childrenAfterSort!.map((node: any) => node.data.id as TrackId);
      playerAPI.start(queue, rowIndex!);
      event.node.setSelected(false);
    },
    [playerAPI],
  );

  const onShowCtxtMenu = useCallback((event: CellContextMenuEvent) => {
    event.event?.preventDefault();
    if (!event.node.isSelected()) {
      event.node.setSelected(true, true);
    }

    const selected = event.api.getSelectedRows() as Track[];

    const payload: TrklistCtxMenuPayload = {
      selected,
      playlists,
      currentPlaylist: currentPlaylist || null,
    };

    menu.tracklist(payload);
  }, []);

  const onKeyPress = useCallback((event: { ctrlKey: boolean; key: string; preventDefault: () => void }) => {
    event.preventDefault();
    if (event.key === 'Escape') {
      gridRef.current?.api.deselectAll();
    }
    if (event.ctrlKey && event.key === 'a') {
      gridRef.current?.api.selectAll();
    }
  }, []);

  // AIDEV-NOTE: Save sort state when user changes column sorting
  const onSortChanged = useCallback(
    (event: SortChangedEvent) => {
      const sortedColumns = event.api.getColumnState().filter(col => col.sort !== null);

      if (sortedColumns.length > 0) {
        const colId = sortedColumns[0].colId!;
        const sortMode = sortedColumns[0].sort!;

        logger.info(`[TracksTable] Sort changed: ${colId}, mode: ${sortMode}`);
        libraryAPI.setTracklistSort(colId, sortMode);
      }
    },
    [libraryAPI],
  );

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

  return (
    <div
      style={{
        height: height,
        width: width,
      }}
      className='ag-theme-alpine-auto-dark ag-theme-harmony'
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
        onSortChanged={onSortChanged}
        onRowDoubleClicked={e => onDoubleClick(e)}
        onCellContextMenu={e => onShowCtxtMenu(e)}
        suppressCellFocus
      />
    </div>
  );
};

export default TrackList;
