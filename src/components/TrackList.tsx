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
  showCtxMenu: (trackId: string) => void;
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

  const { getTableProps, headerGroups, rows, prepareRow, selectedFlatRows } = useTable(
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

  React.useEffect(() => {
    selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
  }, [rows]);

  const onClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    console.log(e);
    console.log(row);
    console.log(selectedFlatRows);

    e.preventDefault();

    if (!row) return;
    const trackId = row.original.id;
    const index = rows.indexOf(row);

    if (e.type === 'dblclick') {
      setTrackDetail(trackId);
      setLastIndexSelected(undefined);
      selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
    }

    if (e.type === 'auxclick') {
      if (!selectedFlatRows.includes(row)) {
        selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
      }

      if (selectedFlatRows.lenght < 1) {
        selectedFlatRows.push(row);
        setLastIndexSelected(index);
      }

      const tracks = selectedFlatRows.map((r) => r.original);
      console.log('tracks', tracks);
      showCtxMenu(tracks);
    }

    if (e.type === 'click') {
      if (e.shiftKey) {
        console.log('shift pressed');
        console.log(lastIndexSelected);

        if (lastIndexSelected < 0) {
          setLastIndexSelected(index);
          row.toggleRowSelected();
          return;
        }

        const from = row.index < lastIndexSelected ? index : lastIndexSelected + 1;
        const to = row.index > lastIndexSelected ? index + 1 : lastIndexSelected;
        // eslint-disable-next-line no-plusplus
        for (let i = from; i < to; i++) {
          rows[i].toggleRowSelected();
        }
        setLastIndexSelected(index);
        return;
      }

      if (e.ctrlKey) {
        row.toggleRowSelected();
        setLastIndexSelected(index);
        return;
      }

      selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
      setLastIndexSelected(index);
      row.toggleRowSelected();
    }
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
              onClick={(e) => onClick(e, row)}
              onAuxClick={(e) => onClick(e, row)}
              onDoubleClick={(e) => onClick(e, row)}
              className={`tr 
                ${row.isSelected ? 'isSelected' : ''} 
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
