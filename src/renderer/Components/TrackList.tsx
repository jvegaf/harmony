import { Table } from '@geist-ui/core';
import React from 'react';
import { Track } from 'src/shared/types/emusik';

type Props = {
  collection: Track[];
};

const TrackList = (props: Props) => {
  const { collection } = props;

  return (
    <Table<Track> data={collection}>
      <Table.Column<Track> prop="title" label="Title" />
      <Table.Column<Track> prop="artist" label="Artist" />
      <Table.Column<Track> prop="album" label="Album" />
    </Table>
  );
};

export default TrackList;