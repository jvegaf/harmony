import React, { useState } from 'react';
import { createStyles, Table, ScrollArea } from '@mantine/core';
import { Track } from 'shared/types/emusik';

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

  timeCol: {
    width: 40,
  },

  titleCol: {
    paddingLeft: 40,
  },
}));

interface TrackListProps {
  data: Track[];
  tlheight: number;
  tlwidth: number;
}

const TrackList: React.FC<TrackListProps> = (props) => {
  const { data, tlheight, tlwidth } = props;
  const { classes, cx } = useStyles();
  const [scrolled, setScrolled] = useState(false);

  // eslint-disable-next-line no-console
  const onAction = (title: string) => console.log(`clicked: ${title}`);

  const rows = data.map((row) => (
    <tr key={row.id} onClick={() => onAction(row.title)}>
      <td className={classes.titleCol}>{row.title}</td>
      <td className={classes.titleCol}>{row.artist}</td>
      <td className={classes.timeCol}>{row.time}</td>
      <td className={classes.timeCol}>{row.bpm}</td>
      <td className={classes.timeCol}>{row.year}</td>
      <td className={classes.titleCol}>{row.album}</td>
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
