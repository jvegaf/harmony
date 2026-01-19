import {
  AllCommunityModule,
  CellContextMenuEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  IRowDragItem,
  ModuleRegistry,
  RowDoubleClickedEvent,
  RowDragCancelEvent,
  RowDragEndEvent,
  RowDragLeaveEvent,
  RowDragMoveEvent,
  SortChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

ModuleRegistry.registerModules([AllCommunityModule]);

import { TrklistCtxMenuPayload, Playlist, Track, TrackId, TrackRating } from '../../../../preload/types/harmony';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';
import { ParseDuration } from '../../../../preload/utils';
import TrackRatingComponent from '../TrackRatingComponent/TrackRatingComponent';
import { GetParentFolderName, ratingComparator } from '../../lib/utils-library';
import PlaylistsAPI from '../../stores/PlaylistsAPI';
import { perfLogger } from '../../lib/performance-logger';
import { themeQuartz, iconSetMaterial } from 'ag-grid-community';
import styles from './TrackList.module.css';

const harmonyTheme = themeQuartz.withPart(iconSetMaterial).withParams({
  fontFamily: { googleFont: 'Inter' },
  backgroundColor: 'transparent',
  foregroundColor: 'var(--text-secondary)',
  headerTextColor: 'var(--text-muted)',
  headerBackgroundColor: 'rgba(31, 41, 55, 0.8)',
  rowHeight: 40,
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'rgba(55, 65, 81, 0.5)',
  selectedRowBackgroundColor: 'rgba(250, 137, 5, 0.15)',
  rangeSelectionBorderColor: 'var(--primary-color)',
  borderColor: 'var(--border-color)',
  cellHorizontalPadding: 8,
  fontSize: 16,
});

const RatingCellRenderer = (props: { data: { path: string }; value: TrackRating }) => {
  return (
    <TrackRatingComponent
      trackSrc={props.data.path}
      rating={props.value}
      size='md'
    />
  );
};

type Props = {
  type: string;
  reorderable?: boolean;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
};

const { menu, logger } = window.Main;

const TrackList = (props: Props) => {
  const { tracks, trackPlayingID, playlists, currentPlaylist, type } = props;
  const playerAPI = usePlayerAPI();
  const libraryAPI = useLibraryAPI();
  const { searched, updated, deleting, tracklistSort } = useLibraryStore();
  const gridRef = useRef<AgGridReact>(null);
  const [lastUpdated, setLastUpdated] = useState<Track | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const [isDragEnabled, setIsDragEnabled] = useState<boolean>(false);

  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  // AIDEV-NOTE: Helper to check if drag should be enabled
  // Drag is only enabled in playlist view when sorted by playlistOrder or no sorting
  const checkDragEnabled = useCallback(() => {
    if (type !== 'playlist' || !props.reorderable || !gridApi) {
      return false;
    }

    const sortedColumns = gridApi.getColumnState().filter(col => col.sort !== null);

    // Enable drag only when sorted by playlistOrder or no sorting
    if (sortedColumns.length === 0) {
      return true; // No sorting active
    }

    if (sortedColumns.length === 1 && sortedColumns[0].colId === 'playlistOrder') {
      return true; // Sorted by order column
    }

    return false; // Sorted by other column
  }, [type, props.reorderable, gridApi]);

  // AIDEV-NOTE: Column definitions with conditional order column for playlists
  const colDefs = useMemo(() => {
    const baseColumns: ColDef[] = [
      {
        field: 'title',
        minWidth: 150,
        // rowDrag: isDragEnabled, // Enable drag handle in this column
      },
      { field: 'artist', minWidth: 90 },
      {
        field: 'duration',
        maxWidth: 80,
        headerName: 'Time',
        valueFormatter: (p: { value: number | null }) => ParseDuration(p.value),
      },
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
        cellRenderer: RatingCellRenderer,
        valueFormatter: (p: { value: TrackRating }) => String(p.value || 0),
      },
      { field: 'genre', minWidth: 180, maxWidth: 200 },
      { field: 'year', maxWidth: 70 },
      { field: 'bpm', maxWidth: 70 },
      {
        field: 'bitrate',
        valueFormatter: (p: { value: number }) => p.value / 1000 + 'kbps',
        minWidth: 80,
        maxWidth: 90,
      },
      { field: 'initialKey', headerName: 'Key', maxWidth: 70 },
    ];

    // AIDEV-NOTE: Add order column at the beginning for playlists with drag handle
    if (type === 'playlist') {
      return [
        {
          field: 'playlistOrder',
          headerName: '#',
          maxWidth: 60,
          sortable: true,
          comparator: (valueA: number, valueB: number) => valueA - valueB,
        },
        ...baseColumns,
      ];
    }

    return baseColumns;
  }, [type, isDragEnabled]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      resizable: true,
      sortable: true,
      // Custom drag ghost text for entire row drag
    };
  }, []);

  const rowDragText = useCallback(function (params: IRowDragItem) {
    // keep double equals here because data can be a string or number
    // if (params.rowNode!.data.year == '2012') {
    //   return params.defaultTextValue + ' (London Olympics)';
    // }
    const track = params.rowNode!.data;
    if (!track) return 'Track';

    const title = track.title || 'Unknown Title';
    const artist = track.artist || 'Unknown Artist';

    return `🎵 ${title} - ${artist}`;
  }, []);

  // AIDEV-NOTE: Add playlistOrder field to tracks when in playlist view for sortable order column
  const tracksWithOrder = useMemo(() => {
    if (type === 'playlist') {
      return tracks.map((track, index) => ({
        ...track,
        playlistOrder: index + 1, // 1-based order
      }));
    }
    return tracks;
  }, [tracks, type]);

  const updateTrackRow = useCallback(updatedTrack => {
    // const rowNode = gridRef.current!.api.getRowNode(updatedTrack.id)!;
    const rowNode = gridRef.current?.api.getRowNode(updatedTrack.id);
    if (!rowNode) {
      logger.error(`[TracksTable] track not found: ${updatedTrack.title}`);
      return;
    }
    rowNode.updateData(updatedTrack);
    logger.info(`[TracksTable] updated track: ${updatedTrack.title}`);
    setLastUpdated(updatedTrack);
  }, []);

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
    [libraryAPI],
  );

  useEffect(() => {
    if (gridApi && updated !== null && updated !== lastUpdated) {
      updateTrackRow(updated);
    }
  }, [gridApi, updated, lastUpdated, updateTrackRow]);

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
  }, [gridApi]);

  useEffect(() => {
    if (searched) {
      goTo(searched.id);
    }

    return () => {
      libraryAPI.setSearched(null);
    };
  }, [searched, goTo, libraryAPI]);

  // AIDEV-NOTE: CRITICAL FIX - Update rowData when tracks change (e.g., switching playlists)
  // Without this, the grid shows stale data when navigating between playlists
  useEffect(() => {
    setRowData(tracksWithOrder);
  }, [tracksWithOrder]);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    setRowData(tracksWithOrder);

    // See docs/aidev-notes/tracklist-sorting.md for sort persistence details
    if (tracklistSort && tracklistSort.colId && tracklistSort.mode) {
      params.api.applyColumnState({
        state: [{ colId: tracklistSort.colId, sort: tracklistSort.mode as 'asc' | 'desc' }],
        defaultState: { sort: null },
      });
      logger.info(`[TracksTable] Applied initial sort: ${tracklistSort.colId} ${tracklistSort.mode}`);
    }

    // Check if drag should be enabled based on initial sort state
    const dragEnabled = checkDragEnabled();
    setIsDragEnabled(dragEnabled);
    logger.info(`[TracksTable] Initial drag enabled: ${dragEnabled}`);
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

  const onShowCtxtMenu = useCallback(
    (event: CellContextMenuEvent) => {
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
    },
    [playlists, currentPlaylist],
  );

  const onKeyPress = useCallback((event: { ctrlKey: boolean; key: string; preventDefault: () => void }) => {
    event.preventDefault();
    if (event.key === 'Escape') {
      gridRef.current?.api.deselectAll();
    }
    if (event.ctrlKey && event.key === 'a') {
      gridRef.current?.api.selectAll();
    }
  }, []);

  // See docs/aidev-notes/tracklist-sorting.md for sort persistence details
  const onSortChanged = useCallback(
    (event: SortChangedEvent) => {
      const sortedColumns = event.api.getColumnState().filter(col => col.sort !== null);

      if (sortedColumns.length > 0) {
        const colId = sortedColumns[0].colId!;
        const sortMode = sortedColumns[0].sort!;

        logger.info(`[TracksTable] Sort changed: ${colId}, mode: ${sortMode}`);
        libraryAPI.setTracklistSort(colId, sortMode);
      }

      // Update drag enabled state based on new sort
      const dragEnabled = checkDragEnabled();
      setIsDragEnabled(dragEnabled);
      logger.info(`[TracksTable] Drag enabled: ${dragEnabled}`);
    },
    [libraryAPI, checkDragEnabled],
  );

  // AIDEV-NOTE: Drag & Drop handlers for playlist track reordering
  const onRowDragMove = useCallback(
    (event: RowDragMoveEvent) => {
      if (!isDragEnabled) return;

      const overNode = event.overNode;
      if (!overNode) {
        event.api.setRowDropPositionIndicator(null);
        return;
      }

      const overNodeTop = overNode.rowTop ?? 0;
      const overNodeHeight = overNode.rowHeight ?? 0;

      // Calculate yRatio: 0 = center, <0 = above, >0 = below
      const yRatio = (event.y - overNodeTop - overNodeHeight / 2) / overNodeHeight;

      event.api.setRowDropPositionIndicator({
        row: overNode,
        dropIndicatorPosition: yRatio < 0 ? 'above' : 'below',
      });
    },
    [isDragEnabled],
  );

  // AIDEV-NOTE: Immediate state update on drag - Manual reorder with instant UI update
  const onRowDragEnd = useCallback(
    (event: RowDragEndEvent) => {
      // Start performance session
      const sessionId = `drag-${Date.now()}`;
      perfLogger.startSession(sessionId);

      perfLogger.measure('Drop event fired');

      // Always clear indicator
      event.api.setRowDropPositionIndicator(null);

      if (!isDragEnabled || !currentPlaylist) {
        perfLogger.measure('Early return (not enabled or no playlist)');
        perfLogger.endSession();
        return;
      }

      const overNode = event.overNode;
      if (!overNode || !overNode.data) {
        logger.warn('[TracksTable] Drag ended without valid target');
        perfLogger.measure('Early return (no valid target)');
        perfLogger.endSession();
        return;
      }

      const draggedNode = event.node;
      if (!draggedNode || !draggedNode.data) {
        logger.warn('[TracksTable] Invalid dragged node');
        perfLogger.measure('Early return (invalid dragged node)');
        perfLogger.endSession();
        return;
      }

      const targetTrack = overNode.data as Track;
      const draggedTrack = draggedNode.data as Track;

      perfLogger.measure('Track data extracted', {
        draggedTrack: draggedTrack.title,
        targetTrack: targetTrack.title,
      });

      // Don't reorder if dropped on itself
      if (draggedTrack.id === targetTrack.id) {
        logger.info('[TracksTable] Track dropped on itself, no reorder needed');
        perfLogger.measure('Early return (dropped on itself)');
        perfLogger.endSession();
        return;
      }

      // Calculate drop position
      const overNodeTop = overNode.rowTop ?? 0;
      const overNodeHeight = overNode.rowHeight ?? 0;
      const yRatio = (event.y - overNodeTop - overNodeHeight / 2) / overNodeHeight;
      const position = yRatio < 0 ? 'above' : 'below';

      perfLogger.measure('Position calculated', { position });

      logger.info(`[TracksTable] Reordering: ${draggedTrack.title} ${position} ${targetTrack.title}`);

      // IMMEDIATE UPDATE: Calculate new order manually and update state
      // Get current order from rowData state (not from grid, as managed mode hasn't updated state)
      const currentOrder = [...rowData];

      // Find indices
      const draggedIndex = currentOrder.findIndex(t => t.id === draggedTrack.id);
      const targetIndex = currentOrder.findIndex(t => t.id === targetTrack.id);

      if (draggedIndex === -1 || targetIndex === -1) {
        logger.error('[TracksTable] Could not find track indices');
        perfLogger.endSession();
        return;
      }

      // Remove dragged track
      const [removed] = currentOrder.splice(draggedIndex, 1);

      // Calculate new position
      let insertIndex = targetIndex;
      if (position === 'below') {
        insertIndex = targetIndex + 1;
      }
      // Adjust if dragged was before target
      if (draggedIndex < targetIndex) {
        insertIndex--;
      }

      // Insert at new position
      currentOrder.splice(insertIndex, 0, removed);

      // Recalculate playlistOrder
      const newOrderWithIndex = currentOrder.map((track, index) => ({
        ...track,
        playlistOrder: index + 1,
      }));

      perfLogger.measure('Calculated new order');

      // UPDATE STATE IMMEDIATELY - This triggers React re-render with new order
      setRowData(newOrderWithIndex);

      perfLogger.measure('State updated - UI will re-render IMMEDIATELY');

      // Wait for next frame to ensure render completed
      requestAnimationFrame(() => {
        perfLogger.measure('UI re-rendered with new order - INSTANT');
        perfLogger.endSession();
      });

      logger.info('[TracksTable] UI updated immediately, sending to backend...');

      // FIRE AND FORGET: Send event to backend queue (non-blocking, no await)
      PlaylistsAPI.reorderTracks(currentPlaylist, [draggedTrack], targetTrack, position)
        .then(() => {
          logger.info('[TracksTable] Backend processed reorder successfully');
        })
        .catch(error => {
          logger.error('[TracksTable] Backend reorder failed:', error);
          // Note: UI already updated, we don't revert (backend will retry in queue)
        });
    },
    [isDragEnabled, currentPlaylist, rowData],
  );

  const onRowDragLeave = useCallback((event: RowDragLeaveEvent) => {
    event.api.setRowDropPositionIndicator(null);
  }, []);

  const onRowDragCancel = useCallback((event: RowDragCancelEvent) => {
    event.api.setRowDropPositionIndicator(null);
    logger.info('[TracksTable] Drag cancelled');
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

  const rowSelection = useMemo(() => {
    return {
      mode: 'multiRow' as const,
      checkboxes: false,
      enableClickSelection: true,
      headerCheckbox: false,
    };
  }, []);

  return (
    <section
      className={styles.trackListContainer}
      aria-label='Track list'
      tabIndex={-1}
      onKeyDown={e => onKeyPress(e)}
    >
      <div
        id='grid-wrapper'
        style={{ width: '100%', height: '100%' }}
      >
        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            theme={harmonyTheme}
            rowSelection={rowSelection}
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
            rowDragText={rowDragText}
            rowDragEntireRow={isDragEnabled}
            suppressRowDrag={!isDragEnabled}
            onRowDragMove={onRowDragMove}
            onRowDragEnd={onRowDragEnd}
            onRowDragLeave={onRowDragLeave}
            onRowDragCancel={onRowDragCancel}
          />
        </div>
      </div>
    </section>
  );
};

// AIDEV-NOTE: Export styles for external use (e.g., custom cell renderers)
export { styles as TrackListStyles };

export default TrackList;
