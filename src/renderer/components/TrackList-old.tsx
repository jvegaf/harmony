/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* // @ts-ignore */

import { localeData } from 'moment';
import React from 'react';
import { Table } from 'rsuite';
import { Track, TrackId } from '../../electron/types/emusik';
import useAppState from '../hooks/useAppState';
import log from 'electron-log';

interface TrackListProps {
  tracks: Track[];
  trackPlaying?: TrackId;
  updateTrackDetail: (trackId: TrackId) => void;
  updateTrackPlaying: (trackId: TrackId) => void;
  onFixTrack: (trackId: TrackId) => void;
}

const TableView: React.FC<TrackListProps> = (props) => {
  const { tracks, trackPlaying, updateTrackDetail, updateTrackPlaying, onFixTrack } = props;

  function Row(rowProps: { children: any; id: any; rowData: any }) {
    const { children, id, rowData } = rowProps;
    const styles = {
      width: '100%',
      height: '100%',
      select: 'none'
    };

    const ref = React.useRef(null);

    function dblClickHandler(event, rowData) {
      event.preventDefault();
      log.info(rowData);
      log.info(event);
    }

    function ctxMenuHandler(event, rowData) {
      event.preventDefault();
      log.info(rowData);
      log.info(event);
    }

    return (
      <div
        ref={ref}
        onContextMenu={(event) => ctxMenuHandler(event, rowData)}
        onDoubleClick={(event) => dblClickHandler(event, rowData)}
        style={styles}
      >
        {children}
      </div>
    );
  }

  return (
    <Table
      virtualized
      fillHeight
      data={tracks}
      rowKey="id"
      aria-selected={false}
      renderRow={(children, rowData) => {
        return rowData ? (
          <Row key={rowData.id} rowData={rowData} id={rowData.id}>
            {children}
          </Row>
        ) : (
          children
        );
      }}
    >
      <Table.Column flexGrow={3}>
        <Table.HeaderCell>Title</Table.HeaderCell>
        <Table.Cell dataKey="title" />
      </Table.Column>

      <Table.Column flexGrow={3}>
        <Table.HeaderCell>Artist</Table.HeaderCell>
        <Table.Cell dataKey="artist" />
      </Table.Column>

      <Table.Column align="center" width={80}>
        <Table.HeaderCell>Time</Table.HeaderCell>
        <Table.Cell dataKey="time" />
      </Table.Column>

      <Table.Column flexGrow={2}>
        <Table.HeaderCell>Album</Table.HeaderCell>
        <Table.Cell dataKey="album" />
      </Table.Column>

      <Table.Column flexGrow={1}>
        <Table.HeaderCell>Genre</Table.HeaderCell>
        <Table.Cell dataKey="genre" />
      </Table.Column>

      <Table.Column align="center" width={80}>
        <Table.HeaderCell>BPM</Table.HeaderCell>
        <Table.Cell dataKey="bpm" />
      </Table.Column>

      <Table.Column align="center" width={80}>
        <Table.HeaderCell>Year</Table.HeaderCell>
        <Table.Cell dataKey="year" />
      </Table.Column>

      <Table.Column align="center" width={80}>
        <Table.HeaderCell>Bitrate</Table.HeaderCell>
        <Table.Cell dataKey="bitrate" />
      </Table.Column>
      <Table.Column width={50}>
        <Table.HeaderCell>Key</Table.HeaderCell>
        <Table.Cell dataKey="key" />
      </Table.Column>
    </Table>
  );
};

const TrackList: React.FC = () => {
  const { trackPlaying, updateTrackDetail, updateTrackPlaying, onFixTrack } = useAppState();
  const [tracks, setTracks] = React.useState<Track[]>([]);

  React.useEffect(() => {
    if (window.Main) {
      window.Main.on('all-tracks', (tracksResponse) => setTracks(tracksResponse));
    }
  }, []);

  const props = {
    tracks,
    trackPlaying,
    updateTrackDetail,
    updateTrackPlaying,
    onFixTrack
  };

  return <TableView {...props} />;
};

export default TrackList;
function ctxMenuHandler(rowData: any): void {
  throw new Error('Function not implemented.');
}
