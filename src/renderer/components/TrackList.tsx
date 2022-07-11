/* eslint-disable no-console */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useViewportSize } from '@mantine/hooks';
import React from 'react';
import { useTable, useResizeColumns, useFlexLayout, useRowSelect } from 'react-table';
import { Track, TrackId } from 'shared/types/emusik';
import styled, { keyframes } from 'styled-components';
import useAppState from '../hooks/useAppState';
import { ContextMenu } from './ContextMenu';
import { Container } from './TrackList.styles';

interface TrackListProps {
  height: number;
  tracks: Track[];
  columns: [];
  trackPlaying: TrackId;
  updateTrackPlaying: (id: TrackId) => void;
  updateTrackDetail: (id: TrackId) => void;
}

const headerProps = (props, { column }) => getStyles(props, column.align);

const cellProps = (props, { cell }) => getStyles(props, cell.column.align);

const getStyles = (props, align = 'left') => [
  props,
  {
    style: {
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      display: 'flex',
    },
  },
];

// eslint-disable-next-line react/prop-types
const TrackListView: React.FC<TrackListProps> = props => {
  const { height, tracks: data, trackPlaying, updateTrackPlaying, updateTrackDetail, columns } = props;
  const [selected, setSelected] = React.useState('');
  const [popupProps, setPopupProps] = React.useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 25, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200, // maxWidth is only used as a limit for resizing
    }),
    []
  );

  const { getTableProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useResizeColumns,
    useFlexLayout,
    useRowSelect
  );

  const onDblClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    e.preventDefault();
    if (!row) return;
    const trackId = row.original.id;

    updateTrackPlaying(trackId);
  };

  const onClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    e.preventDefault();
    if (!row) return;
    const trackId = row.original.id;
    setSelected(trackId);
    console.log('selected', selected);
  };

  const onRightClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    e.preventDefault();
    if (!row) return;
    const trackId = row.original.id;
    const record = row.original;
    console.log(`X: ${e.clientX} Y: ${e.clientY}`);
    console.log('trackId', trackId);

    if (!popupProps.visible) {
      document.addEventListener(`click`, function onClickOutside() {
        setPopupProps({ ...popupProps, visible: false });
        document.removeEventListener(`click`, onClickOutside);
      });
    }
    setPopupProps({
      record,
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div>
      <div {...getTableProps()} className="table">
        <div>
          {headerGroups.map(headerGroup => (
            <div
              {...headerGroup.getHeaderGroupProps({
                // style: { paddingRight: '15px' },
              })}
              className="tr"
            >
              {headerGroup.headers.map(column => (
                <div {...column.getHeaderProps(headerProps)} className="th">
                  {column.render('Header')}
                  {/* Use column.getResizerProps to hook up the events correctly */}
                  {column.canResize && (
                    <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? 'isResizing' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="tbody" style={{ height: height - 100 }}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <div
                {...row.getRowProps()}
                onContextMenu={e => onRightClick(e, row)}
                onClick={e => onClick(e, row)}
                onDoubleClick={e => onDblClick(e, row)}
                className={`tr 
                  ${row.original.id === selected ? 'isSelected' : ''} 
                  ${row.original.id === trackPlaying ? 'isPlaying' : ''}`}
              >
                {row.cells.map(cell => {
                  return (
                    <div {...cell.getCellProps(cellProps)} className="td">
                      {cell.render('Cell')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <ContextMenu {...popupProps} />
    </div>
  );
};

const TrackList = (props: TrackListProps) => {
  const { trackPlaying, updateTrackPlaying, updateTrackDetail } = useAppState();
  const { height } = useViewportSize();
  const [tracks, setTracks] = React.useState([]);
  const columns = React.useMemo(
    () => [
      //   {
      //     Header: '#',
      //     accessor: (row, i) => i,
      //     width: 25,
      //     align: 'center',
      //   },
      {
        Header: 'Title',
        accessor: 'title',
      },
      {
        Header: 'Artist',
        accessor: 'artist',
      },
      {
        Header: 'Time',
        accessor: 'time',
        width: 25,
        align: 'center',
      },
      {
        Header: 'Album',
        accessor: 'album',
      },
      {
        Header: 'Rate',
        accessor: 'bitrate',
        width: 25,
      },
      {
        Header: 'BPM',
        accessor: 'bpm',
        width: 25,
      },
      {
        Header: 'Key',
        accessor: 'key',
        width: 25,
      },
      {
        Header: 'Year',
        accessor: 'year',
        width: 25,
      },
    ],
    []
  );

  React.useEffect(() => {
    if (window.Main) {
      window.Main.on('all-tracks', updatedTracks => setTracks(updatedTracks));
    }
  }, []);

  const tableprops = {
    height,
    tracks,
    columns,
    trackPlaying,
    updateTrackPlaying,
    updateTrackDetail,
  };

  return (
    <Container>
      <TrackListView {...tableprops} />
    </Container>
  );
};

export default TrackList;
