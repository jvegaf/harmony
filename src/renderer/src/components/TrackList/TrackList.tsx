import { Table, Header, HeaderRow, Body, Row, HeaderCell, Cell } from '@table-library/react-table-library/table';

import { SelectTypes, useRowSelect } from '@table-library/react-table-library/select';

import { useTheme } from '@table-library/react-table-library/theme';
import { Playlist, Track } from '../../../../preload/types/emusik';

type Props = {
  type: string;
  tracks: Track[];
  trackPlayingID: string | null;
  playlists: Playlist[];
  currentPlaylist?: string;
  height: number;
};

const TrackList = (props: Props) => {
  const { type, tracks, trackPlayingID, playlists, currentPlaylist, height } = props;
  const data = { nodes: tracks };

  const theme = useTheme({
    Table: `
        --data-table-library_grid-template-columns: repeat(2, minmax(0, 1fr)) 70px 70px 70px minmax(0,1fr) 200px  ;
      `,
    HeaderRow: `
        background-color: #151313;
      `,
    Row: `
        &.row-select-selected, &.row-select-single-selected {
            color: red;
          }

        &:hover {
          color: orange;
        }


        &:nth-of-type(odd) {
          background-color: #1f2123;
        }

        &:nth-of-type(even) {
          background-color: #181a1b;
        }
      `,

    BaseCell: `
        padding: 5px;
        user-select: none;
      `,
  });

  // function onSelectChange(action, state) {
  //   console.log(action, state);
  // }

  const select = useRowSelect(
    data,
    // {
    //   onChange: onSelectChange,
    // },
    {
      isCarryForward: false,
      // rowSelect: SelectTypes.MultiSelect,
      // buttonSelect: SelectTypes.MultiSelect,
    },
  );

  return (
    <div
      style={{
        height: height,
      }}
    >
      <Table
        data={data}
        layout={{ custom: true, fixedHeader: true }}
        theme={theme}
        select={select}
      >
        {tableList => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCell>Title</HeaderCell>
                <HeaderCell>Artist</HeaderCell>
                <HeaderCell>BPM</HeaderCell>
                <HeaderCell>Time</HeaderCell>
                <HeaderCell>Year</HeaderCell>
                <HeaderCell>Album</HeaderCell>
                <HeaderCell>Genre</HeaderCell>
              </HeaderRow>
            </Header>

            <Body>
              {tableList.map(item => (
                <Row
                  key={item.id}
                  item={item}
                >
                  <Cell>{item.title}</Cell>
                  <Cell>{item.artist}</Cell>
                  <Cell>{item.bpm}</Cell>
                  <Cell>{item.time}</Cell>
                  <Cell>{item.year}</Cell>
                  <Cell>{item.album}</Cell>
                  <Cell>{item.genre}</Cell>
                </Row>
              ))}
            </Body>
          </>
        )}
      </Table>
    </div>
  );
};

export default TrackList;
