import { EntitySchema } from 'typeorm';

import { Track } from '../../../../preload/types/harmony';

export const TrackEntity = new EntitySchema<Track>({
  name: 'track',
  columns: {
    id: {
      type: String,
      primary: true,
    },
    path: {
      type: String,
      nullable: false,
    },
    title: {
      type: String,
      nullable: false,
    },
    artist: {
      type: String,
      nullable: true,
    },
    album: {
      type: String,
      nullable: true,
    },
    genre: {
      type: String,
      nullable: true,
    },
    year: {
      type: Number,
      nullable: true,
    },
    duration: {
      type: Number,
      nullable: false,
    },
    bitrate: {
      type: Number,
      nullable: true,
    },
    comment: {
      type: String,
      nullable: true,
    },
    bpm: {
      type: Number,
      nullable: true,
    },
    initialKey: {
      type: String,
      nullable: true,
    },
    rating: {
      type: 'json',
      nullable: true,
    },
  },
});
