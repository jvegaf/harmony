/* eslint-disable no-console */
import { createStyles, ScrollArea, Table } from '@mantine/core';
import React, { useState } from 'react';
import { Track } from '../../shared/types/emusik';
import useAppState from '../hooks/useAppState';

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
    userSelect: 'none',
  },

  titleCol: {
    paddingLeft: 40,
    userSelect: 'none',
  },

  playingRow: {
    backgroundColor: theme.colors.blue[9],
  },
}));

interface TrackListProps {
  tlheight: number;
  tlwidth: number;
}
const TrackList: React.FC<TrackListProps> = (props) => {
  const { tlheight, tlwidth } = props;
  const { tracks, trackPlaying, setTrackPlaying, showCtxMenu } = useAppState();
  const { classes, cx } = useStyles();
  const [scrolled, setScrolled] = useState(false);

  const handleDblClk = (t: Track) => setTrackPlaying(t);

  const handleRghClk = (t: Track) => {
    showCtxMenu(t);
  };

  const rows = tracks.map((track) => (
    <tr
      key={track.id}
      onAuxClick={() => handleRghClk(track)}
      onDoubleClick={() => handleDblClk(track)}
      className={cx({ [classes.playingRow]: track === trackPlaying })}
    >
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
