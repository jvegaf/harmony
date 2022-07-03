/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { useTable, useResizeColumns, useFlexLayout, useRowSelect, useSortBy } from 'react-table';
import { useViewportSize } from '@mantine/hooks';
import { Track, TrackId } from '../../electron/types/emusik';
import useAppState from '../hooks/useAppState';

interface TrackListProps {
  tracks: Track[];
  trackPlaying?: Track;
  setTrackDetail: React.Dispatch<React.SetStateAction<TrackId>>;
  showCtxMenu: (selected: Track[]) => void;
  columns: any[];
  height: number;
}

const Styles = styled.div`
  padding: 0;
  ${'' /* These styles are suggested for the table fill all available space in its containing element */}
  display: block;
  ${'' /* These styles are required for a horizontaly scrollable table overflow */}
  overflow: auto;
  color: #eeeeee;

  .table {
    border-spacing: 0;
    width: 100%;
    height: 100%;

    .thead {
      ${'' /* These styles are required for a scrollable body to align with the header properly */}
      overflow-y: auto;
      overflow-x: hidden;
    }

    .tbody {
      overflow-y: scroll;
      overflow-x: hidden;
    }

    .tr {
      :nth-child(even) {
        background-color: #23292b;
      }

      :nth-child(odd) {
        background-color: #2e3436;
      }

      :hover {
        background-color: #796868;
      }

      :last-child {
        .td {
          border-bottom: 0;
        }
      }

      &.isSelected {
        background-color: #967a7a;
      }

      &.isPlaying {
        background-color: #1793f8;
      }
    }

    .td {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: medium;
    }

    .th {
      background-color: #23292b;
      color: #eeeeee;
      font-size: small;
    }

    .th,
    .td {
      margin: 0;
      padding: 0.4rem 1rem;
      user-select: none;
      :first-child {
        padding: 0.4rem 0.5rem;
      }

      ${
        '' /* In this example we use an absolutely position resizer,
       so this is required. */
      }
      position: relative;

      :last-child {
        border-right: 0;
      }

      .resizer {
        right: 0;
        background: #464849;
        width: 2px;
        height: 100%;
        position: absolute;
        top: 0;
        z-index: 1;
        ${'' /* prevents from scrolling while dragging on touch devices */}
        touch-action :none;

        &.isResizing {
          background: #5a878a;
        }
      }
    }
  }
`;

const headerProps = (props, { column }) => getStyles(props, column.align);

const cellProps = (props, { cell }) => getStyles(props, cell.column.align);

const getStyles = (props, align = 'left') => [
  props,
  {
    style: {
      justifyContent: align === 'center' ? 'center' : 'flex-start',
      alignItems: 'flex-start',
      display: 'flex'
    }
  }
];

// eslint-disable-next-line react/prop-types
const TableView: React.FC<TrackListProps> = (props) => {
  const { tracks: data, trackPlaying, setTrackDetail, showCtxMenu, columns, height } = props;
  const [lastIndexSelected, setLastIndexSelected] = React.useState(-1);
  const [selectedTracks, setSelectedTracks] = React.useState([]);

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 35, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200 // maxWidth is only used as a limit for resizing
    }),
    []
  );
  const [bHeight, setBHeight] = React.useState(0);

  React.useEffect(() => {
    if (height) {
      const ht = height - 112;
      setBHeight(ht);
    }
  }, [height]);

  const { getTableProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
      defaultColumn
    },
    useResizeColumns,
    useFlexLayout,
    useSortBy,
    useRowSelect
  );

  const clickHandler = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    console.log(e);
    console.log(row.original.title);

    if (!row) return;
    const index = rows.indexOf(row);

    if (e.shiftKey) {
      console.log('shift pressed');
      console.log(lastIndexSelected);

      const tempSelected = [];
      if (lastIndexSelected < 0) {
        setLastIndexSelected(index);
        tempSelected.push(row.original);
        return;
      }

      const from = row.index < lastIndexSelected ? index : lastIndexSelected + 1;
      const to = row.index > lastIndexSelected ? index + 1 : lastIndexSelected;
      // eslint-disable-next-line no-plusplus
      for (let i = from; i < to; i++) {
        tempSelected.push(rows[i].original);
      }
      setLastIndexSelected(index);
      setSelectedTracks([...tempSelected]);
      return;
    }

    if (e.ctrlKey) {
      setSelectedTracks([...selectedTracks, row.original]);
      return;
    }

    setLastIndexSelected(index);
    setSelectedTracks([row.original]);
  };

  const auxClickHandler = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    console.log(e);
    console.log(row.original.title);
    const tempSelected = [];
    e.preventDefault();

    if (!row) return;
    const trackClicked: Track = row.original;

    if (selectedTracks.indexOf(trackClicked) < 0) {
      tempSelected.push(trackClicked);
      setSelectedTracks([...tempSelected]);
      showCtxMenu(tempSelected);
      return;
    }

    showCtxMenu(selectedTracks);
  };

  const doubleClickHandler = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    console.log(e);
    console.log(row.original.title);

    if (!row) return;
    const trackClicked: Track = row.original;

    setTrackDetail(trackClicked);
    setLastIndexSelected(undefined);
    setSelectedTracks([]);
  };

  return (
    <div {...getTableProps()} className="table">
      <div>
        {headerGroups.map((headerGroup) => (
          <div
            {...headerGroup.getHeaderGroupProps({
              // style: { paddingRight: '15px' },
            })}
            className="tr"
          >
            {headerGroup.headers.map((column) => (
              <div {...column.getHeaderProps({ ...column.getSortByToggleProps(), ...headerProps })} className="th">
                {column.render('Header')}
                {/* Use column.getResizerProps to hook up the events correctly */}
                <span>{column.isSorted ? (column.isSortedDesc ? '  🔽' : '  🔼') : ''}</span>
                {column.canResize && (
                  <div {...column.getResizerProps()} className={`resizer ${column.isResizing ? 'isResizing' : ''}`} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ height: bHeight }} className="tbody">
        {rows.map((row) => {
          prepareRow(row);
          return (
            <div
              {...row.getRowProps()}
              onClick={(e) => clickHandler(e, row)}
              onAuxClick={(e) => auxClickHandler(e, row)}
              onDoubleClick={(e) => doubleClickHandler(e, row)}
              className={`tr 
                ${selectedTracks.indexOf(row.original) < 0 ? '' : 'isSelected'} 
                ${trackPlaying && row.original.id === trackPlaying.id ? 'isPlaying' : ''}`}
            >
              {row.cells.map((cell) => {
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
  );
};

const TrackList: React.FC = () => {
  const { height } = useViewportSize();
  const { tracks, trackPlaying, setTrackDetail, showCtxMenu } = useAppState();
  const columns = React.useMemo(
    () => [
      {
        Header: 'Title',
        accessor: 'title'
      },
      {
        Header: 'Artist',
        accessor: 'artist'
      },
      {
        Header: 'Time',
        accessor: 'time',
        width: 35,
        align: 'center'
      },
      {
        Header: 'Album',
        accessor: 'album'
      },
      {
        Header: 'Rate',
        accessor: 'bitrate',
        width: 35,
        align: 'center'
      },
      {
        Header: 'BPM',
        accessor: 'bpm',
        width: 35,
        align: 'center'
      },
      {
        Header: 'Key',
        accessor: 'key',
        width: 35,
        align: 'center'
      },
      {
        Header: 'Year',
        accessor: 'year',
        width: 35,
        align: 'center'
      }
    ],
    []
  );

  const props = {
    tracks,
    trackPlaying,
    setTrackDetail,
    showCtxMenu,
    columns,
    height
  };

  return (
    <Styles>
      <TableView {...props} />
    </Styles>
  );
};

export default TrackList;
