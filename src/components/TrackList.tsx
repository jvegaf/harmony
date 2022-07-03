/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */

import React from 'react';
import { Dropdown, Popover, Table, Whisper } from 'rsuite';
import { Track } from '../../electron/types/emusik';
import useAppState from '../hooks/useAppState';

interface TrackListProps {
  tracks: Track[];
  trackPlaying?: Track;
  setTrackPlaying: React.Dispatch<React.SetStateAction<Track>>;
  setTrackDetail: React.Dispatch<React.SetStateAction<Track>>;
  onFixTrack: (track: Track) => void;
}

const MenuPopover = React.forwardRef(({ onSelect, ...rest }, ref) => (
  <Popover ref={ref} {...rest} full>
    <Dropdown.Menu onSelect={onSelect}>
      <Dropdown.Item eventKey={'playTrack'}>PlayTrack</Dropdown.Item>
      <Dropdown.Item eventKey={'viewDetail'}>View Details</Dropdown.Item>
      <Dropdown.Item divider />
      <Dropdown.Item eventKey={'fixTrack'}>Fix Tags</Dropdown.Item>
    </Dropdown.Menu>
  </Popover>
));

const TableView: React.FC<TrackListProps> = props => {
  const { tracks, trackPlaying, setTrackDetail, setTrackPlaying, onFixTrack } = props;

  function Row(rowProps) {
    const { children, id, rowData } = rowProps;
    const styles = {
      width: '100%',
      height: '100%',
      userSelect: 'none'
    };

    const ref = React.useRef(null);

    function dblClickHandler(event, rowData) {
      setTrackDetail(rowData);
    }

    function handleSelectMenu(eventKey, event, rowData) {
      switch (eventKey) {
        case 'playTrack':
          setTrackPlaying(rowData);
          break;
        case 'viewDetail':
          setTrackDetail(rowData);
          break;
        case 'fixTrack':
          onFixTrack(rowData);
          break;
      }

      ref.current.close();
    }

    return (
      <Whisper
        placement="bottom"
        controlId="control-id-with-dropdown"
        trigger="contextMenu"
        // followCursor
        ref={ref}
        speaker={<MenuPopover onSelect={(ek, e) => handleSelectMenu(ek, e, rowData)} />}
      >
        <div ref={ref} onDoubleClick={e => dblClickHandler(e, rowData)} style={styles}>
          {children}
        </div>
      </Whisper>
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
  const { tracks, trackPlaying, setTrackDetail, setTrackPlaying, onFixTrack } = useAppState();

  const props = {
    tracks,
    trackPlaying,
    setTrackDetail,
    setTrackPlaying,
    onFixTrack
  };

  return <TableView {...props} />;
};

export default TrackList;
