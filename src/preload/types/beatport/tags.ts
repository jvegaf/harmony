/**
 * Tipos relacionados con tags extraídos de Beatport
 *
 * Incluye: BeatportTags + conversión desde BeatportTrack
 */

import { BeatportTrack, BeatportTrackUtils } from './track';

/**
 * Tags extraídos de Beatport para aplicar a un track local
 */
export interface BeatportTags {
  title?: string;
  artist?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  label?: string;
  album?: string;
  year?: number;
  isrc?: string;
  catalog_number?: string;
  artwork_url?: string;
  /** Datos binarios del artwork (solo en memoria, no serializado) */
  artwork_data?: Uint8Array;
}

/**
 * Utilidades para convertir BeatportTrack a BeatportTags
 */
export class BeatportTagsUtils {
  /**
   * Convierte un BeatportTrack a BeatportTags
   */
  static fromTrack(track: BeatportTrack): BeatportTags {
    const artists = track.artists?.map(a => a.name).join(', ') || '';

    const year = track.publish_date ? parseInt(track.publish_date.split('-')[0], 10) || undefined : undefined;

    // Usar el helper get_artwork_url que busca en todas las fuentes posibles
    // (release.image, release.image_dynamic_uri, track.image, track.track_image_dynamic_uri)
    const artwork_url = BeatportTrackUtils.getArtworkUrl(track, 500);

    // Construir título completo con mix_name si existe
    let title: string | undefined;
    if (track.mix_name && track.mix_name.trim() !== '' && track.mix_name.toLowerCase() !== 'original mix') {
      title = `${track.name} (${track.mix_name})`;
    } else {
      title = track.name;
    }

    return {
      title,
      artist: artists || undefined,
      bpm: track.bpm,
      key: BeatportTrackUtils.getKeyName(track),
      genre: BeatportTrackUtils.getGenreName(track),
      label: BeatportTrackUtils.getLabelName(track), // Usa helper que busca en track y release
      album: track.release?.name,
      year,
      isrc: track.isrc,
      catalog_number: track.catalog_number,
      artwork_url,
      artwork_data: undefined,
    };
  }
}
