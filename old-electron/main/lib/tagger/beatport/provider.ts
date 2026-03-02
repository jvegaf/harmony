/**
 * Adapter de BeatportClient para la interface TrackProvider
 *
 *   Este adapter permite usar BeatportClient como un TrackProvider
 * compatible con el sistema unificado, sin modificar el cliente existente.
 */

import { TrackProvider, RawTrackData } from '../providers/types';
import { BeatportClient } from './client/client';
import { BeatportTrack, BeatportTrackUtils } from '../../../../preload/types/beatport';

/**
 * Provider de Beatport que implementa TrackProvider
 */
export class BeatportProvider implements TrackProvider {
  readonly name = 'beatport' as const;

  constructor(private client: BeatportClient) {}

  /**
   * Busca tracks en Beatport
   * @returns Lista de tracks crudos (sin scoring)
   */
  async search(title: string, artist: string): Promise<RawTrackData[]> {
    try {
      // Usar el método de búsqueda existente de BeatportClient
      const results = await this.client.search(title, artist);

      // Convertir BeatportTrack[] a RawTrackData[]
      return results.tracks.map(track => this.beatportTrackToRaw(track));
    } catch (error) {
      console.error('[BeatportProvider] Search failed:', error);
      // Retornar array vacío en caso de error (el orchestrator maneja esto)
      return [];
    }
  }

  /**
   * Convierte un BeatportTrack a RawTrackData
   */
  private beatportTrackToRaw(track: BeatportTrack): RawTrackData {
    return {
      id: track.id.toString(),
      title: track.name,
      mix_name: track.mix_name,
      artists: track.artists?.map(a => a.name) || [],
      bpm: track.bpm,
      key: BeatportTrackUtils.getKeyName(track),
      duration_secs: BeatportTrackUtils.getDurationSecs(track),
      artwork_url: BeatportTrackUtils.getArtworkUrl(track, 100),
      genre: BeatportTrackUtils.getGenreName(track),
      label: BeatportTrackUtils.getLabelName(track),
      release_date: track.publish_date,
    };
  }
}

/**
 * Factory para crear una instancia de BeatportProvider
 */
export function createBeatportProvider(): BeatportProvider {
  const client = BeatportClient.new();
  return new BeatportProvider(client);
}
