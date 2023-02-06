import React from 'react';
import { Body, Cell, Header, HeaderCell, HeaderRow, Row, Table } from '@table-library/react-table-library';
import { CellSelect, HeaderCellSelect, useRowSelect } from '@table-library/react-table-library/select';
import { useTheme } from '@table-library/react-table-library/theme';
import { LibraryContextType } from '../@types/library';
import { LibraryContext } from '../context/LibraryContext';
import logger from '../../electron/services/logger';
import useAppState from '../hooks/useAppState';

const TrackList = () => {
  const { tracksCollection } = React.useContext(LibraryContext) as LibraryContextType;
  const data = { nodes: tracksCollection };
  const { playTrack } = useAppState();

  function onSelectChange(action, state) {
    logger.info(action, state);
  }

  const select = useRowSelect(data, {
    onChange: onSelectChange
  });

  const clickHandler = (title) => logger.info(title);

  const dblClickHandler = (item) => playTrack(item);

  const theme = useTheme({
    HeaderRow: `
        color: #eaf5fd;
        background-color: #1c2a2e;
        border-bottom: 1px solid #6e6e6e;
      `,
    Row: `
        color: #eaf5fd;
       
        &:not(:last-of-type) > .td {
          border-bottom: 1px solid #6e6e6e;
        } 

        &:nth-of-type(odd) {
          background-color: #23292b;
        }

        &:nth-of-type(even) {
          background-color: #2e3436;
        }

        &:hover {
          background-color: #6e6e6e;
        }

        &.row-select-selected {
              background-color: #055D85;
            }
      `
  });

  return (
    <Table data={data} select={select} theme={theme} layout={{ fixedHeader: true }}>
      {(tableList) => (
        <>
          <Header>
            <HeaderRow>
              <HeaderCellSelect />
              <HeaderCell>Title</HeaderCell>
              <HeaderCell>Artist</HeaderCell>
              <HeaderCell>BPM</HeaderCell>
              <HeaderCell>Album</HeaderCell>
              <HeaderCell>Year</HeaderCell>
            </HeaderRow>
          </Header>

          <Body>
            {tableList.map((item) => (
              <Row
                item={item}
                key={item.id}
                onClick={() => clickHandler(item.title)}
                onDoubleClick={() => dblClickHandler(item)}
              >
                <CellSelect item={item} />
                <Cell>{item.title}</Cell>
                <Cell>{item.artist}</Cell>
                <Cell>{item.bpm}</Cell>
                <Cell>{item.album}</Cell>
                <Cell>{item.year}</Cell>
              </Row>
            ))}
          </Body>
        </>
      )}
    </Table>
  );
};

export default TrackList;
