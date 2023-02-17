import React from 'react';
import { Box, createStyles } from '@mantine/core';
import { useRowSelect } from '@table-library/react-table-library/select';
import { useViewportSize } from '@mantine/hooks';
import type { Track, TrackId } from 'shared/types/emusik';
import { useTheme } from '@table-library/react-table-library/theme';
import useAppState from '../hooks/useAppState';
import PlayerContext from 'renderer/context/PlayerContext';
import { PlayerContextType } from 'renderer/@types/emusik';
import { Body, Cell, Header, HeaderCell, HeaderRow, Row, Table } from '@table-library/react-table-library';

interface TrackListProps {
  height: number;
  tracks: Track[];
  playingId?: TrackId;
  playTrack: (track: Track) => void;
  updateTrackDetail: (id: TrackId) => void;
  onFixTracks: (tracks: Track[]) => void;
}

// const useStyles = createStyles(() => ({
//   isPlaying: { backgroundColor: '#3C4F91' },
// }));

const theme = useTheme({
  BaseRow: `
        font-size: 16px;
  `,
  HeaderRow: `
        background-color: #23292b;

        .th {
            border-bottom: 1px solid #a0a8ae;
        }
      `,
  Row: `


        &:nth-of-type(odd) {
          background-color: #2D3538;
        }

        &:nth-of-type(even) {
          background-color: #293133;
        }

        .td {
          border-bottom: 1px solid #a0a8ae;
        }

        &.row-select-selected, &.row-select-single-selected {
          background-color: #43495e;
        } 
      `,
  BaseCell: `
        padding: 10px 16px;
      `,
});

const TrackListView: React.FC<TrackListProps> = (props) => {
  const { height, columns, tracks, playTrack, playingId, updateTrackDetail, onFixTracks } = props;

  const data = { nodes: tracks };

  const onSelectionChange = (action, state) => console.log(action, state);

  const select = useRowSelect(data, {
    onChange: onSelectionChange,
  });

  return (
    <Box sx={{ height }}>
      <Table data={data} theme={theme} layout={{ fixedHeader: true }} select={select}>
        {(tableList) => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCell>Title</HeaderCell>
                <HeaderCell>Artist</HeaderCell>
                <HeaderCell>Time</HeaderCell>
                <HeaderCell>Album</HeaderCell>
                <HeaderCell>Bpm</HeaderCell>
                <HeaderCell>Key</HeaderCell>
                <HeaderCell>Year</HeaderCell>
              </HeaderRow>
            </Header>

            <Body>
              {tableList.map((item) => (
                <Row key={item.id} item={item}>
                  <Cell>{item.title}</Cell>
                  <Cell>{item.artist}</Cell>
                  <Cell>{item.time}</Cell>
                  <Cell>{item.album}</Cell>
                  <Cell>{item.bpm}</Cell>
                  <Cell>{item.key}</Cell>
                  <Cell>{item.year}</Cell>
                </Row>
              ))}
            </Body>
          </>
        )}
      </Table>
    </Box>
  );
};

export const TrackList: React.FC = () => {
  const { tracksLoaded, updateTrackDetail, playTrack, onFixTracks } = useAppState();
  const { playingId } = React.useContext(PlayerContext) as PlayerContextType;
  const { height } = useViewportSize();
  const [tracks, setTracks] = React.useState([]);

  React.useEffect(() => {
    if (window.Main) {
      window.Main.on('all-tracks', (updatedTracks) => setTracks(updatedTracks));
    }
  }, []);

  React.useEffect(() => {
    if (tracksLoaded) {
      window.Main.GetAll();
    }
  }, [tracksLoaded]);

  const tableprops = {
    height,
    tracks,
    playingId,
    playTrack,
    updateTrackDetail,
    onFixTracks,
  };

  return <TrackListView {...tableprops} />;
};
