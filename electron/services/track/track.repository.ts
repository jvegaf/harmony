import { TrackId } from './../../types/emusik';
import { Track } from '../../types/emusik';
import { AppLogger } from '../log/app.logger';
const log = AppLogger.getInstance();

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
      log.info('track not found');
      return;
    }
    this._tracks[index] = updated;
  }

  public removeAll() {
    this._tracks = [];
  }
}
