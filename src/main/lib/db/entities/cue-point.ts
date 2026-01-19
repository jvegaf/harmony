import { EntitySchema } from 'typeorm';

import { CuePoint } from '../../../../preload/types/cue-point';

/**
 * CuePoint Entity
 *
 * Stores cue points, hotcues, loops, and beatgrid markers for tracks.
 * Supports bidirectional sync with Traktor NML.
 *
 * AIDEV-NOTE: positionMs and lengthMs are stored as floats for precision.
 * Traktor uses millisecond positions with microsecond precision.
 * The trackId column references track.id but we don't define a TypeORM relation
 * to keep the CuePoint interface simple and avoid circular dependencies.
 */
export const CuePointEntity = new EntitySchema<CuePoint>({
  name: 'cuePoint',
  columns: {
    id: {
      type: String,
      primary: true,
    },
    trackId: {
      type: String,
      nullable: false,
    },
    type: {
      type: String,
      nullable: false,
      // AIDEV-NOTE: Stored as string enum value (hot_cue, grid, loop, etc.)
    },
    positionMs: {
      type: 'float',
      nullable: false,
    },
    lengthMs: {
      type: 'float',
      nullable: true,
    },
    hotcueSlot: {
      type: Number,
      nullable: true,
    },
    name: {
      type: String,
      nullable: true,
    },
    color: {
      type: String,
      nullable: true,
    },
    order: {
      type: Number,
      nullable: true,
    },
  },
  indices: [
    {
      name: 'IDX_cuePoint_trackId',
      columns: ['trackId'],
    },
    {
      name: 'IDX_cuePoint_type',
      columns: ['type'],
    },
  ],
});
