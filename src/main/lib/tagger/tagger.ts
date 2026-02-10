import log from 'electron-log';
import type { Track, ResultTag } from '../../../preload/types/harmony';
import Update from '../track/updater';
//   Mantener Traxsource para FixTags (auto-tagging)
import { Traxsource } from './traxsource/traxsource';
//   Nuevos imports para sistema unificado multi-provider
import { ProviderOrchestrator } from './providers/orchestrator';
import { createBeatportProvider } from './beatport/provider';
import { createTraxsourceProvider } from './traxsource/provider';
import { createBandcampProvider } from './bandcamp';
import {
  TrackCandidatesResult,
  TrackCandidatesResultUtils,
  TrackSelection,
  TagCandidatesProgress,
} from '@preload/types/tagger';
import { TrackCandidateUtils } from '@preload/types/tagger/candidate';
import { BeatportClient } from './beatport/client/client';
import { BeatportTrackUtils } from '@preload/types/beatport';
import { analyzeAudio } from '../audio-analysis';

// import { SearchTags } from './beatport/beatport';
// import { BandcampSearchResult, search } from './bandcamp/bandcamp';
// import { soundcloudSearch } from './soundcloud/soundcloudProvider';

// const searchOnBandCamp = async (track: Track): Promise<BandcampSearchResult[]> => {
//   const { title, artist } = track;
//   const reqAggregate: string[] = [title];
//   if (artist) {
//     reqAggregate.push(artist);
//   }

//   const result = await search(reqAggregate.join(' '));
//   return result;
// };

// const searchOnSoundCloud = async (track: Track): Promise<MatchResult | null> => {
//   const { title, artist } = track;
//   const reqAggregate: string[] = [title];
//   if (artist) {
//     reqAggregate.push(artist);
//   }

//   const trackTokens = GetStringTokens(reqAggregate);
//   const result = await soundcloudSearch(reqAggregate.join(' '));

//   log.info('Soundcloud results count: ', result.length);
//   log.info('tokens: ', trackTokens);
//   log.info('Soundcloud result: ', result[0]);
//   const match = Match(trackTokens, result);

//   return match;
// };
// const SearchOnDab = async (track: Track): Promise<MatchResult | null> => {
//   const { title, artist, duration } = track;
//   const reqAggregate: string[] = [title];
//   if (artist) {
//     reqAggregate.push(...artist);
//   }
//   const trackTokens = GetStringTokens(reqAggregate);
//   const bpResults = await SearchTags(title, artist);
//   if (!bpResults.length) {
//     return null;
//   }
//   if (!duration) {
//     const match = Match(trackTokens, bpResults);
//     return match;
//   }
//   const durRounded = Math.round(duration);
//   const resultsFiltered = bpResults.filter(
//     result => result.duration >= durRounded - 10 && result.duration <= durRounded + 10,
//   );
//   if (resultsFiltered.length < 2) {
//     return {
//       tag: resultsFiltered[0],
//       trackTokens,
//       matches: 1,
//       of: 1,
//     };
//   }
//   const match = Match(trackTokens, resultsFiltered);
//   return match;
// };

export const FixTags = async (track: Track): Promise<Track> => {
  const tsClient = new Traxsource();
  try {
    const result = await tsClient.matchTrack(track);
    if (!result.length) {
      log.warn(`no match for ${track.title}`);
      return track;
    }

    const txMatch = await tsClient.extendTrack(result[0].track);
    const fixedTrack = Update(track, txMatch);

    log.info(`track ${track.title} fixed`);
    return fixedTrack;
  } catch (error) {
    log.error(`fixing track ${track.title} failed: ${error}`);
  }

  return track;
};

/**
 * AIDEV-NOTE: Callback de progreso para reportar el estado de la búsqueda
 * Permite actualizar el progress modal en tiempo real
 */
export type ProgressCallback = (progress: TagCandidatesProgress) => void;

/**
 * Busca candidatos para múltiples tracks usando todos los providers configurados
 *
 *   Esta función ahora usa el ProviderOrchestrator para buscar
 * en Beatport y Traxsource en paralelo, aplicando scoring unificado
 * y retornando los top 4 candidatos globales.
 *
 * @param tracks Lista de tracks locales para los que buscar candidatos
 * @param onProgress Callback opcional para reportar progreso (processed, total, currentTrackTitle)
 * @returns Lista de TrackCandidatesResult con top 4 candidatos de todos los providers
 */
export const FindCandidates = async (
  tracks: Track[],
  onProgress?: ProgressCallback,
): Promise<TrackCandidatesResult[]> => {
  //   Crear orchestrator con todos los providers (Beatport, Traxsource, Bandcamp)
  const orchestrator = new ProviderOrchestrator(
    [createBeatportProvider(), createTraxsourceProvider(), createBandcampProvider()],
    {
      maxCandidates: 4, // Top 4 globales
      minScore: 0.3, // Score mínimo 30%
    },
  );

  const allTrackCandidates: TrackCandidatesResult[] = [];

  //   Procesamiento secuencial para evitar rate limiting
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    log.info(`Processing candidates for: ${track.artist} - ${track.title}`);

    // AIDEV-NOTE: Emitir progreso antes de procesar cada track
    onProgress?.({
      processed: i,
      total: tracks.length,
      currentTrackTitle: track.title,
    });

    try {
      // Buscar en todos los providers en paralelo
      const candidates = await orchestrator.findCandidates(track.title, track.artist!, track.duration);

      // Log de resultados por provider
      candidates.forEach(c => {
        log.info(
          `[${c.source.toUpperCase()}] ${c.artists} - ${c.title} - Score: ${(c.similarity_score * 100).toFixed(1)}%`,
        );
      });

      // Crear TrackCandidatesResult
      const result = TrackCandidatesResultUtils.withCandidates(
        track.id,
        track.title,
        track.artist ?? '',
        track.path,
        track.duration,
        candidates,
      );

      allTrackCandidates.push(result);
    } catch (error) {
      log.error(`Error finding candidates for ${track.title}:`, error);

      // Agregar resultado con error
      const result = TrackCandidatesResultUtils.withError(
        track.id,
        track.title,
        track.artist ?? '',
        track.path,
        track.duration,
        error instanceof Error ? error.message : String(error),
      );

      allTrackCandidates.push(result);
    }
  }

  // AIDEV-NOTE: Emitir progreso final cuando todos los tracks estén procesados
  onProgress?.({
    processed: tracks.length,
    total: tracks.length,
    currentTrackTitle: '',
  });

  return allTrackCandidates;
};

/**
 * Aplica las selecciones de tags del usuario a los tracks locales
 *
 *   Esta función toma las selecciones del usuario (qué candidato usar para cada track)
 * y aplica los tags completos desde el provider correspondiente (Beatport, Traxsource, o Bandcamp).
 * Ignora tracks con selected_candidate_id null ("No está disponible").
 *
 * AIDEV-NOTE: Para Bandcamp, automáticamente ejecuta audio analysis para detectar BPM/Key
 * ya que Bandcamp no proporciona esta metadata.
 *
 * @param selections Lista de selecciones del usuario
 * @param tracks Lista de tracks locales a actualizar
 * @returns Lista de tracks actualizados con sus nuevos tags
 */
export const ApplyTagSelections = async (
  selections: TrackSelection[],
  tracks: Track[],
): Promise<{ updated: Track[]; errors: Array<{ trackId: string; error: string }> }> => {
  const beatportClient = BeatportClient.new();
  const traxsourceClient = new Traxsource();
  const bandcampProvider = createBandcampProvider();

  const updated: Track[] = [];
  const errors: Array<{ trackId: string; error: string }> = [];

  //   Procesar cada selección secuencialmente para evitar rate limiting
  for (const selection of selections) {
    // Ignorar tracks sin candidato seleccionado (usuario eligió "No está disponible")
    if (!selection.selected_candidate_id) {
      log.info(`Skipping track ${selection.local_track_id} - no candidate selected`);
      continue;
    }

    try {
      // Buscar el track local
      const localTrack = tracks.find(t => t.id === selection.local_track_id);
      if (!localTrack) {
        log.error(`Local track ${selection.local_track_id} not found`);
        errors.push({ trackId: selection.local_track_id, error: 'Track not found' });
        continue;
      }

      // Parsear el ID del candidato (formato: "provider:id")
      const { source, id } = TrackCandidateUtils.parseId(selection.selected_candidate_id);

      log.info(`Applying tags for ${localTrack.title} from ${source}:${id}`);

      // Obtener tags completos desde el provider correspondiente
      let resultTag: ResultTag;
      let needsAudioAnalysis = false;

      if (source === 'beatport') {
        // Obtener track completo de Beatport
        const beatportTrack = await beatportClient.getTrack(parseInt(id, 10));

        const artUrl = BeatportTrackUtils.getArtworkUrl(beatportTrack, 500);
        log.info(`Beatport artwork URL: ${artUrl}`);

        // Convertir BeatportTrack a ResultTag
        resultTag = {
          id: beatportTrack.id,
          title: beatportTrack.name,
          artist: beatportTrack.artists?.[0]?.name,
          artists: beatportTrack.artists?.map(a => a.name) || [],
          album: beatportTrack.release?.name,
          year: beatportTrack.publish_date?.substring(0, 4), // "2023-01-15" -> "2023"
          bpm: beatportTrack.bpm,
          key: BeatportTrackUtils.getKeyName(beatportTrack),
          genre: BeatportTrackUtils.getGenreName(beatportTrack),
          duration: BeatportTrackUtils.getDurationSecs(beatportTrack),
          art: artUrl,
          label: BeatportTrackUtils.getLabelName(beatportTrack),
        };
      } else if (source === 'traxsource') {
        // Buscar el track completo de Traxsource
        //   Necesitamos el objeto TXTrack completo con URL para usar extendTrack
        const searchResults = await traxsourceClient.searchTracks(localTrack.title, localTrack.artist || '');
        const txTrack = searchResults.find(t => t.track_id === id);

        if (!txTrack) {
          throw new Error(`Traxsource track ${id} not found in search results`);
        }

        // Extender con datos completos (artwork, album, etc.)
        const extendedTrack = await traxsourceClient.extendTrack(txTrack);

        log.info(`Traxsource artwork URL: ${extendedTrack.art || extendedTrack.thumbnail}`);

        // Convertir TXTrack a ResultTag
        resultTag = {
          id: extendedTrack.track_id || undefined,
          title: extendedTrack.title,
          artist: extendedTrack.artists[0],
          artists: extendedTrack.artists,
          album: extendedTrack.album,
          year: extendedTrack.release_date?.substring(0, 4), // "2023-01-15" -> "2023"
          bpm: extendedTrack.bpm,
          key: extendedTrack.key,
          genre: extendedTrack.genres?.[0],
          duration: extendedTrack.duration,
          art: extendedTrack.art || extendedTrack.thumbnail,
          label: extendedTrack.label,
        };
      } else if (source === 'bandcamp') {
        // AIDEV-NOTE: Bandcamp requires special handling:
        // 1. The 'id' is actually the full track URL
        // 2. Bandcamp doesn't provide BPM/Key, so we need audio analysis
        const trackUrl = id; // The ID is the full URL for Bandcamp
        const trackDetails = await bandcampProvider.getTrackDetails(trackUrl);

        log.info(`Bandcamp artwork URL: ${trackDetails?.artwork_url}`);

        if (!trackDetails) {
          throw new Error(`Failed to fetch Bandcamp track: ${trackUrl}`);
        }

        // Convert to ResultTag (BPM and Key will be undefined)
        resultTag = {
          title: trackDetails.title,
          artist: trackDetails.artists[0],
          artists: trackDetails.artists,
          album: trackDetails.label, // Use label as album fallback
          year: trackDetails.release_date?.substring(0, 4),
          genre: trackDetails.genre,
          duration: trackDetails.duration_secs,
          art: trackDetails.artwork_url,
          label: trackDetails.label,
          // BPM and Key are undefined - will be filled by audio analysis
        };

        // Flag for audio analysis since Bandcamp doesn't provide BPM/Key
        needsAudioAnalysis = true;
      } else {
        throw new Error(`Unknown provider: ${source}`);
      }

      // Aplicar los tags al track local usando el updater existente
      let updatedTrack = await Update(localTrack, resultTag);

      // AIDEV-NOTE: Auto-analyze audio for Bandcamp tracks to get BPM/Key/Waveform
      if (needsAudioAnalysis) {
        log.info(`[Bandcamp] Running audio analysis for ${updatedTrack.title}...`);
        try {
          const analysisResult = await analyzeAudio(localTrack.path, {
            detectBpm: true,
            detectKey: true,
            generateWaveform: true,
            waveformBins: 300,
          });

          // Apply analysis results to track
          if (analysisResult.bpm) {
            updatedTrack = { ...updatedTrack, bpm: analysisResult.bpm };
            log.info(`[Bandcamp] Detected BPM: ${analysisResult.bpm}`);
          }
          if (analysisResult.key) {
            updatedTrack = { ...updatedTrack, initialKey: analysisResult.key };
            log.info(`[Bandcamp] Detected Key: ${analysisResult.key}`);
          }
          if (analysisResult.waveformPeaks) {
            updatedTrack = { ...updatedTrack, waveformPeaks: analysisResult.waveformPeaks };
            log.info(`[Bandcamp] Generated waveform: ${analysisResult.waveformPeaks.length} peaks`);
          }
        } catch (analysisError) {
          // Log but don't fail - partial tags are better than none
          log.warn(`[Bandcamp] Audio analysis failed: ${analysisError}`);
        }
      }

      updated.push(updatedTrack);

      log.info(`Tags applied successfully for ${updatedTrack.title}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Error applying tags for track ${selection.local_track_id}: ${errorMsg}`);
      errors.push({ trackId: selection.local_track_id, error: errorMsg });
    }
  }

  return { updated, errors };
};
