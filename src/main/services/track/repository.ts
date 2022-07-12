import type { Track, TrackId } from '../../../shared/types/emusik';

export class TrackRepository{
  private tracks: Track[] = [];

  public all(): Track[]{
    return this.tracks;
  }

  public add(track: Track){
    this.tracks.push(track);
  }

  public getTrack(id: TrackId){
    const track = this.tracks.find(t => t.id === id);
    return track as Track;
  }

  public update(updated: Track){
    const index = this.tracks.findIndex(t => t.id === updated.id);
    if(index < 0){
      log.error('track not found');
      return;
    }
    this.tracks[index] = updated;
  }

  public addAll(newtracks: Track[]){
    this.tracks = newtracks;
  }
}
