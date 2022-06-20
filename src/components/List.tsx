/* eslint-disable no-console */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { useTable, useResizeColumns, useFlexLayout, useRowSelect } from 'react-table';
import { Track, TrackId } from '../../electron/types/emusik';
import useAppState from '../hooks/useAppState';

interface TrackListProps {
  tracks: Track[];
  trackPlaying?: TrackId;
  setTrackDetail: React.Dispatch<React.SetStateAction<TrackId>>;
  showCtxMenu: (trackId: string) => void;
  columns: any[];
}

const Styles = styled.div`
  padding: 0;
  ${'' /* These styles are suggested for the table fill all available space in its containing element */}
  display: block;
  ${'' /* These styles are required for a horizontaly scrollable table overflow */}
  overflow: auto;
  width: 100%;
  height: 100%;
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
      height: max-content;
      overflow-y: scroll;
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
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      display: 'flex'
    }
  }
];

// eslint-disable-next-line react/prop-types
const TableView: React.FC<TrackListProps> = (props) => {
  const { tracks: data, trackPlaying, setTrackDetail, showCtxMenu, columns } = props;
  const [lastIndexSelected, setLastIndexSelected] = React.useState(-1);

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 25, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200 // maxWidth is only used as a limit for resizing
    }),
    []
  );

  const {
    getTableProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { selectedRowIds }
  } = useTable(
    {
      columns,
      data,
      defaultColumn
    },
    useResizeColumns,
    useFlexLayout,
    useRowSelect
  );

  const onClick = (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, row): void => {
    console.log(e);
    console.log(row);

    e.preventDefault();

    if (!row) return;
    const trackId = row.original.id;

    if (e.type === 'dblclick') {
      setTrackDetail(trackId);
      setLastIndexSelected(undefined);
      selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
    }

    if (e.type === 'auxclick') {
      if (!selectedFlatRows.includes(row)) {
        selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
        setLastIndexSelected(row.index);
        row.toggleRowSelected();
      }
      showCtxMenu(selectedFlatRows.map((r) => r.original));
      return;
    }

    if (e.type === 'click') {
      if (e.shiftKey) {
        console.log('shift pressed');
        console.log(lastIndexSelected);

        if (lastIndexSelected < 0) {
          setLastIndexSelected(row.index);
          row.toggleRowSelected();
          return;
        }

        const from = row.index < lastIndexSelected ? row.index : lastIndexSelected + 1;
        const to = row.index > lastIndexSelected ? row.index + 1 : lastIndexSelected;
        // eslint-disable-next-line no-plusplus
        for (let i = from; i < to; i++) {
          rows[i].toggleRowSelected();
        }
        setLastIndexSelected(row.index);
        return;
      }

      if (e.ctrlKey) {
        row.toggleRowSelected();
        setLastIndexSelected(row.index);
        return;
      }

      selectedFlatRows.forEach((r) => r.toggleRowSelected(false));
      setLastIndexSelected(row.index);
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
      <div className="tbody">
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
                ${row.original.id === trackPlaying ? 'isPlaying' : ''}`}
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
        width: 25,
        align: 'center'
      },
      {
        Header: 'Album',
        accessor: 'album'
      },
      {
        Header: 'Rate',
        accessor: 'bitrate',
        width: 25
      },
      {
        Header: 'BPM',
        accessor: 'bpm',
        width: 25
      },
      {
        Header: 'Key',
        accessor: 'key',
        width: 25
      },
      {
        Header: 'Year',
        accessor: 'year',
        width: 25
      }
    ],
    []
  );

  const props = {
    tracks,
    trackPlaying,
    setTrackDetail,
    showCtxMenu,
    columns
  };

  return (
    <Styles>
      <TableView {...props} />
    </Styles>
  );
};

export default TrackList;
