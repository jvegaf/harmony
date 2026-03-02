/**
 * Provider de Traxsource que implementa TrackProvider
 *
 *   Este provider adapta la clase Traxsource existente
 * para que sea compatible con el sistema unificado de providers.
 */

import { TrackProvider, RawTrackData } from '../providers/types';
import { Traxsource } from './traxsource';
import { TXTrack } from '../../../../preload/types/traxsource';

/**
 * Provider de Traxsource que implementa TrackProvider
 */
export class TraxsourceProvider implements TrackProvider {
  readonly name = 'traxsource' as const;

  constructor(private client: Traxsource) {}

  /**
   * Busca tracks en Traxsource
   * @returns Lista de tracks crudos (sin scoring)
   */
  async search(title: string, artist: string): Promise<RawTrackData[]> {
    try {
      // Usar el método de búsqueda existente de Traxsource
      const tracks = await this.client.searchTracks(title, artist);

      // Convertir TXTrack[] a RawTrackData[]
      return tracks.map(track => this.txTrackToRaw(track));
    } catch (error) {
      console.error('[TraxsourceProvider] Search failed:', error);
      // Retornar array vacío en caso de error (el orchestrator maneja esto)
      return [];
    }
  }

  /**
   * Convierte un TXTrack a RawTrackData
   */
  private txTrackToRaw(track: TXTrack): RawTrackData {
    return {
      id: track.track_id || track.url || '',
      title: track.title,
      mix_name: track.version ?? undefined,
      artists: track.artists,
      bpm: track.bpm ?? undefined,
      key: track.key ?? undefined,
      duration_secs: track.duration ?? undefined,
      artwork_url: track.thumbnail ?? track.art ?? undefined,
      genre: track.genres?.[0] ?? undefined,
      label: track.label ?? undefined,
      release_date: track.release_date ?? undefined,
    };
  }
}

/**
 * Factory para crear una instancia de TraxsourceProvider
 */
export function createTraxsourceProvider(): TraxsourceProvider {
  const client = new Traxsource();
  return new TraxsourceProvider(client);
}
