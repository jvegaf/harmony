import { useViewportSize } from "@mantine/hooks";
import React from "react";
import {
  useFlexLayout,
  useResizeColumns,
  useRowSelect,
  useTable
} from "react-table";
import type { Track, TrackId } from "shared/types/emusik";
import useAppState from "../hooks/useAppState";
import { ContextMenu } from "./ContextMenu";
import { Container } from "./TrackList.styles";

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

const getStyles = (props, align = "left") => [
  props,
  {
    style: {
      justifyContent: align === "right" ? "flex-end" : "flex-start",
      alignItems:     "flex-start",
      display:        "flex"
    }
  }
];

const TrackListView: React.FC<TrackListProps> = (props) => {
  const {
    height,
    tracks: data,
    trackPlaying,
    updateTrackDetail,
    columns
  } = props;
  const [ selected, setSelected ]     = React.useState("");
  const [ popupProps, setPopupProps ] = React.useState({
    visible: false,
    x:       0,
    y:       0
  });

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 25, // minWidth is only used as a limit for resizing
      width:    150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200 // maxWidth is only used as a limit for resizing
    }),
    []
  );

  const {
    getTableProps, headerGroups, rows, prepareRow 
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

  const onDblClick = (
    e: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
    row
  ): void => {
    e.preventDefault();
    if(!row) return;
    const trackId = row.original.id;

    updateTrackDetail(trackId);
  };

  const onClick = (
    e: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
    row
  ): void => {
    e.preventDefault();
    if(!row) return;
    const trackId = row.original.id;
    setSelected(trackId);
    console.log("selected", selected);
  };

  const onRightClick = (
    e: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
    row
  ): void => {
    e.preventDefault();
    if(!row) return;
    const trackId = row.original.id;

    if(!popupProps.visible){
      document.addEventListener(`click`, function onClickOutside(){
        setPopupProps({ ...popupProps, visible: false });
        document.removeEventListener(`click`, onClickOutside);
      });
    }
    setPopupProps({
      trackId,
      visible: true,
      x:       e.clientX,
      y:       e.clientY
    });
  };

  return (
    <div>
      {rows.length && (
        <div {...getTableProps()} className="table">
          <div>
            {headerGroups.map((headerGroup) => (
              <div {...headerGroup.getHeaderGroupProps()} className="tr">
                {headerGroup.headers.map((column) => (
                  <div {...column.getHeaderProps(headerProps)} className="th">
                    {column.render("Header")}
                    {/* Use column.getResizerProps to hook up the events correctly */}
                    {column.canResize && (
                      <div
                        {...column.getResizerProps()}
                        className={`resizer ${
                          column.isResizing ? "isResizing" : ""
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="tbody" style={{ height: height - 120 }}>
            {rows.map((row) => {
              prepareRow(row);
              return (
                <div
                  {...row.getRowProps()}
                  onContextMenu={(e) => onRightClick(e, row)}
                  onClick={(e) => onClick(e, row)}
                  onDoubleClick={(e) => onDblClick(e, row)}
                  className={`tr 
              ${row.original.id === selected ? "isSelected" : ""} 
              ${row.original.id === trackPlaying ? "isPlaying" : ""}`}
                >
                  {row.cells.map((cell) => {
                    return (
                      <div {...cell.getCellProps(cellProps)} className="td">
                        {cell.render("Cell")}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ContextMenu {...popupProps} />
    </div>
  );
};

export const TrackList: React.FC = () => {
  const {
    tracksLoaded, trackPlaying, updateTrackPlaying, updateTrackDetail 
  } =
    useAppState();
  const { height }            = useViewportSize();
  const [ tracks, setTracks ] = React.useState([]);
  const columns               = React.useMemo(
    () => [
      {
        Header:   "Title",
        accessor: "title"
      },
      {
        Header:   "Artist",
        accessor: "artist"
      },
      {
        Header:   "Time",
        accessor: "time",
        width:    25,
        align:    "center"
      },
      {
        Header:   "Album",
        accessor: "album"
      },
      {
        Header:   "Rate",
        accessor: "bitrate",
        width:    25
      },
      {
        Header:   "BPM",
        accessor: "bpm",
        width:    25
      },
      {
        Header:   "Key",
        accessor: "key",
        width:    25
      },
      {
        Header:   "Year",
        accessor: "year",
        width:    25
      }
    ],
    []
  );

  React.useEffect(() => {
    if(window.Main){
      window.Main.on("all-tracks", (updatedTracks) => setTracks(updatedTracks));
    }
  }, []);

  React.useEffect(() => {
    if(tracksLoaded){
      window.Main.GetAll();
    }
  }, [ tracksLoaded ]);

  const tableprops = {
    height,
    tracks,
    columns,
    trackPlaying,
    updateTrackPlaying,
    updateTrackDetail
  };

  return (
    <Container>
      <TrackListView {...tableprops} />
    </Container>
  );
};
