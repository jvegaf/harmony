import React, { useState } from 'react';
import { createStyles, Table, ScrollArea } from '@mantine/core';

const useStyles = createStyles((theme) => ({
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor:
      theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',

    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `1px solid ${
        theme.colorScheme === 'dark'
          ? theme.colors.dark[3]
          : theme.colors.gray[2]
      }`,
    },
  },

  scrolled: {
    boxShadow: theme.shadows.sm,
  },
}));

interface TrackListProps {
  data: {
    title: string;
    artist: string;
    duration: string;
    bpm: number;
    year: number;
    album: string;
  }[];
  tlheight: number;
  tlwidth: number;
}

const TrackList: React.FC<TrackListProps> = (props) => {
  const { data, tlheight, tlwidth } = props;
  const { classes, cx } = useStyles();
  const [scrolled, setScrolled] = useState(false);

  // eslint-disable-next-line no-console
  const onAction = (name) => console.log(`clicked: ${name}`);

  const rows = data.map((row) => (
    <tr key={row.name} onClick={() => onAction(row.title)}>
      <td>{row.title}</td>
      <td>{row.artist}</td>
      <td>{row.duration}</td>
      <td>{row.bpm}</td>
      <td>{row.year}</td>
      <td>{row.album}</td>
    </tr>
  ));

  return (
    <ScrollArea
      sx={{ height: tlheight }}
      onScrollPositionChange={({ y }) => setScrolled(y !== 0)}
    >
      <Table
        striped
        highlightOnHover
        verticalSpacing="xs"
        sx={{ minWidth: tlwidth }}
      >
        <thead className={cx(classes.header, { [classes.scrolled]: scrolled })}>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Time</th>
            <th>BPM</th>
            <th>Year</th>
            <th>Album</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </ScrollArea>
  );
};

export default TrackList;
