import { createStyles, ScrollArea, Table } from '@mantine/core';
import React, { useState } from 'react';
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
  tracks: Track[];
  tlheight: number;
  tlwidth: number;
  onShowDetail: (selTrack: Track) => void;
}

const TrackList: React.FC<TrackListProps> = (props) => {
  const { tracks, tlheight, tlwidth, onShowDetail } = props;
  const { classes, cx } = useStyles();
  const [scrolled, setScrolled] = useState(false);

  // eslint-disable-next-line no-console
  const onDetailAction = (t: Track) => onShowDetail(t);

  const rows = tracks.map((track) => (
    <tr key={track.id} onDoubleClick={() => onDetailAction(track)}>
      <td className={classes.titleCol}>{track.title}</td>
      <td className={classes.titleCol}>{track.artist}</td>
      <td className={classes.timeCol}>{track.time}</td>
      <td className={classes.timeCol}>{track.bpm}</td>
      <td className={classes.timeCol}>{track.year}</td>
      <td className={classes.titleCol}>{track.album}</td>
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
