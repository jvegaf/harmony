import { ResultTag, Maybe } from '@preload/types/harmony';

export interface TXTrack extends ResultTag {
  platform: string;
  version?: Maybe<string>;
  artists: string[];
  bpm?: Maybe<number>;
  key?: Maybe<string>;
  title: string;
  url: string;
  album?: Maybe<string>;
  label?: Maybe<string>;
  release_date?: Maybe<string>; // ISO yyyy-MM-dd when parsed
  genres?: string[];
  track_id?: Maybe<string>;
  release_id?: Maybe<string>;
  duration?: Maybe<number>; // seconds
  thumbnail?: Maybe<string>;
  art?: Maybe<string>;
  // other fields omitted for brevity
}

export interface TaggerConfig {
  // simplified: checks whether a tag is enabled
  tagEnabled(tag: string): boolean;
  anyTagEnabled(tags: string[]): boolean;
}

export interface TraxSourceMatch {
  track: TXTrack;
  score: number; // 0..100
  reason?: string;
}
