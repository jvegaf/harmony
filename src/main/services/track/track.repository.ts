import { TrackId } from './../../types/emusik';
import { Track } from '../../types/emusik';
import log from 'electron-log';

export class TrackRepository {
  private _tracks: Track[] = [];

  public all(): Track[] {
    return this._tracks;
  }

  public add(track: Track) {
    this._tracks.push(track);
  }

  public getTrack(id: TrackId) {
    const track = this._tracks.find((t) => t.id === id);
    return track as Track;
  }

  public update(updated: Track) {
    const index = this._tracks.findIndex((t) => t.id === updated.id);
    if (index < 0) {
      log.error('track not found');
      return;
    }
    this._tracks[index] = updated;
  }

  public removeAll() {
    this._tracks = [];
  }
}
