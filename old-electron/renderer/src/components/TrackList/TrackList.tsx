import {
  AllCommunityModule,
  CellContextMenuEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  IRowDragItem,
  ModuleRegistry,
  RowClassParams,
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
import { useLocation } from 'react-router-dom';
import { useMantineColorScheme } from '@mantine/core';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import useLibraryUIStore from '../../stores/useLibraryUIStore';
import useTaggerStore from '../../stores/useTaggerStore';
import { useDetailsNavigationAPI } from '../../stores/useDetailsNavigationStore';
import { ParseDuration } from '../../../../preload/utils';
import TrackRatingComponent from '../TrackRatingComponent/TrackRatingComponent';
import { GetParentFolderName, ratingComparator } from '../../lib/utils-library';
import { usePlaylistsAPI } from '../../stores/usePlaylistsStore';
import { perfLogger } from '../../lib/performance-logger';
import { themeQuartz, iconSetMaterial } from 'ag-grid-community';
import styles from './TrackList.module.css';

// AG Grid theme configurations for light and dark modes
// These themes use hardcoded color values because AG Grid's theming API doesn't support CSS variables
// Color values are matched to the design tokens in App.css
const harmonyDarkTheme = themeQuartz.withPart(iconSetMaterial).withParams({
  fontFamily: { googleFont: 'Inter' },
  backgroundColor: 'transparent',
  foregroundColor: '#9ca3af', // --hm-text-secondary (dark)
  headerTextColor: '#6b7280', // --hm-text-muted (dark)
  headerBackgroundColor: 'rgba(31, 41, 55, 0.8)', // --hm-bg-elevated (dark)
  rowHeight: 40,
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'rgba(55, 65, 81, 0.5)', // --hm-bg-hover (dark)
  selectedRowBackgroundColor: 'rgba(250, 137, 5, 0.15)', // --hm-primary-muted
  rangeSelectionBorderColor: '#fa8905', // --hm-primary
  borderColor: 'rgba(75, 85, 99, 0.5)', // --hm-border (dark)
  cellHorizontalPadding: 8,
  fontSize: 16,
});

const harmonyLightTheme = themeQuartz.withPart(iconSetMaterial).withParams({
  fontFamily: { googleFont: 'Inter' },
  backgroundColor: 'transparent',
  foregroundColor: '#495057', // --hm-text-secondary (light)
  headerTextColor: '#868e96', // --hm-text-muted (light)
  headerBackgroundColor: '#f9fafb', // --hm-bg-elevated (light)
  rowHeight: 40,
  oddRowBackgroundColor: 'transparent',
  rowHoverColor: 'rgba(0, 0, 0, 0.05)', // --hm-bg-hover (light)
  selectedRowBackgroundColor: 'rgba(250, 137, 5, 0.15)', // --hm-primary-muted
  rangeSelectionBorderColor: '#fa8905', // --hm-primary
  borderColor: 'rgba(0, 0, 0, 0.12)', // --hm-border (light)
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
  const location = useLocation();
  const playerAPI = usePlayerAPI();
  const playlistsAPI = usePlaylistsAPI();
  const detailsNavAPI = useDetailsNavigationAPI();
  const { search, deleting, tracklistSort } = useLibraryUIStore();
  const { updated } = useTaggerStore();
  const { colorScheme } = useMantineColorScheme();
  const gridRef = useRef<AgGridReact>(null);
  const [lastUpdated, setLastUpdated] = useState<Track | null>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<Track[]>([]);
  const [isDragEnabled, setIsDragEnabled] = useState<boolean>(false);

  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);

  // Select appropriate AG Grid theme based on current color scheme
  const harmonyTheme = useMemo(() => {
    return colorScheme === 'dark' ? harmonyDarkTheme : harmonyLightTheme;
  }, [colorScheme]);

  // Helper to check if drag should be enabled
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

  // Column definitions with conditional order column for playlists
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
      { field: 'label', minWidth: 180, maxWidth: 200 },
      { field: 'year', maxWidth: 70 },
      { field: 'bpm', maxWidth: 70 },
      {
        field: 'bitrate',
        // Bitrate is stored in kbps, no conversion needed
        valueFormatter: (p: { value: number }) => (p.value ? p.value + 'kbps' : ''),
        minWidth: 80,
        maxWidth: 90,
      },
      { field: 'initialKey', headerName: 'Key', maxWidth: 70 },
    ];

    // Add order column at the beginning for playlists with drag handle
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

  // Add playlistOrder field to tracks when in playlist view for sortable order column
  const tracksWithOrder = useMemo(() => {
    if (type === 'playlist') {
      return tracks.map((track, index) => ({
        ...track,
        playlistOrder: index + 1, // 1-based order
      }));
    }
    return tracks;
  }, [tracks, type]);

  const updateTrackRow = useCallback((updatedTrack: Track) => {
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

  // CRITICAL FIX - Update rowData when tracks change (e.g., switching playlists)
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

      // Save navigation context for Details view
      // When user opens Details from context menu, they can navigate prev/next within the current track list
      if (selected.length === 1 && gridApi) {
        const allDisplayedTracks: Track[] = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          if (node.data) {
            allDisplayedTracks.push(node.data);
          }
        });
        const trackIds = allDisplayedTracks.map(t => t.id);
        detailsNavAPI.setContext(trackIds, selected[0].id, location.pathname);
      }

      const payload: TrklistCtxMenuPayload = {
        selected,
        playlists,
        currentPlaylist: currentPlaylist || null,
      };

      menu.tracklist(payload);
    },
    [playlists, currentPlaylist, gridApi, detailsNavAPI, location.pathname],
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
        useLibraryUIStore.getState().api.setTracklistSort(colId, sortMode);
      }

      // Update drag enabled state based on new sort
      const dragEnabled = checkDragEnabled();
      setIsDragEnabled(dragEnabled);
      logger.info(`[TracksTable] Drag enabled: ${dragEnabled}`);
    },
    [checkDragEnabled],
  );

  // Drag & Drop handlers for playlist track reordering
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

  // Immediate state update on drag - Manual reorder with instant UI update
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

      // DEBT-005: Get selected tracks for multi-track reordering
      const selectedRows = event.api.getSelectedRows() as Track[];
      const selectedTrackIds = new Set(selectedRows.map(t => t.id));

      // Determine which tracks to move:
      // - If dragged track is selected, move all selected tracks
      // - Otherwise, move only the dragged track
      const tracksToMove = selectedTrackIds.has(draggedTrack.id) ? selectedRows : [draggedTrack];

      perfLogger.measure('Tracks to move determined', {
        count: tracksToMove.length,
        isMultiTrack: tracksToMove.length > 1,
      });

      // Don't reorder if any of the tracks being moved is the target
      if (tracksToMove.some(t => t.id === targetTrack.id)) {
        logger.info('[TracksTable] Target track is in selection, no reorder needed');
        perfLogger.measure('Early return (target in selection)');
        perfLogger.endSession();
        return;
      }

      // Calculate drop position
      const overNodeTop = overNode.rowTop ?? 0;
      const overNodeHeight = overNode.rowHeight ?? 0;
      const yRatio = (event.y - overNodeTop - overNodeHeight / 2) / overNodeHeight;
      const position = yRatio < 0 ? 'above' : 'below';

      perfLogger.measure('Position calculated', { position });

      logger.info(`[TracksTable] Reordering: ${tracksToMove.length} track(s) ${position} ${targetTrack.title}`);

      // IMMEDIATE UPDATE: Calculate new order manually and update state
      // Get current order from rowData state (not from grid, as managed mode hasn't updated state)
      const currentOrder = [...rowData];

      // DEBT-005: Multi-track reordering logic
      // 1. Extract the tracks being moved (preserving their relative order)
      const trackIdsToMove = new Set(tracksToMove.map(t => t.id));
      const movedTracks = currentOrder.filter(t => trackIdsToMove.has(t.id));
      const remainingTracks = currentOrder.filter(t => !trackIdsToMove.has(t.id));

      // 2. Find target position in the remaining tracks
      const targetIndex = remainingTracks.findIndex(t => t.id === targetTrack.id);

      if (targetIndex === -1) {
        logger.error('[TracksTable] Could not find target track');
        perfLogger.endSession();
        return;
      }

      // 3. Calculate insertion index
      let insertIndex = targetIndex;
      if (position === 'below') {
        insertIndex = targetIndex + 1;
      }

      // 4. Insert moved tracks at new position (maintaining their relative order)
      remainingTracks.splice(insertIndex, 0, ...movedTracks);

      // Recalculate playlistOrder
      const newOrderWithIndex = remainingTracks.map((track, index) => ({
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

      logger.info(`[TracksTable] UI updated immediately (${tracksToMove.length} tracks), sending to backend...`);

      // FIRE AND FORGET: Send event to backend queue (non-blocking, no await)
      // DEBT-005: Now supports multi-track reordering
      playlistsAPI
        .reorderTracks(currentPlaylist, tracksToMove, targetTrack, position)
        .then(() => {
          logger.info('[TracksTable] Backend processed reorder successfully');
        })
        .catch(error => {
          logger.error('[TracksTable] Backend reorder failed:', error);
          // Note: UI already updated, we don't revert (backend will retry in queue)
        });
    },
    [isDragEnabled, currentPlaylist, rowData, playlistsAPI],
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
      'playing-style': (params: RowClassParams) => {
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
            quickFilterText={search}
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

// Export styles for external use (e.g., custom cell renderers)
export { styles as TrackListStyles };

export default TrackList;
