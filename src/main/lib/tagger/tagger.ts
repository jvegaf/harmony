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
  ProviderSource,
  TrackCandidate,
} from '@preload/types/tagger';
import { TrackCandidateUtils } from '@preload/types/tagger/candidate';
import { BeatportTrackUtils, BeatportTrack } from '@preload/types/beatport';
import { TXTrack } from '@preload/types/traxsource';
import { getTaggerWorkerManager } from './worker/tagger-worker-manager';
import { getWorkerPool } from '../audio-analysis/worker-pool';
import type { RawTrackData } from './providers/types';
import { Database } from '../db/database';

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
 * AIDEV-NOTE: Callback para notificar progreso durante el auto-apply en background
 * Emite evento al renderer con progreso track por track
 */
export type AutoApplyProgressCallback = (progress: {
  processed: number;
  total: number;
  currentTrackTitle: string;
  updated: number;
  failed: number;
}) => void;

/**
 * AIDEV-NOTE: Callback para notificar cuando se completa el auto-apply en background
 * Emite evento al renderer con estadísticas de tracks actualizados/errores
 */
export type AutoApplyCompleteCallback = (result: { updated: number; failed: number; trackIds: string[] }) => void;

/**
 * AIDEV-NOTE: Aplica tags de perfect matches (>= 90% score) en background sin bloquear
 * Esta función se ejecuta de forma asíncrona después de retornar los candidatos al UI
 * Emite progreso track por track para mostrar en el renderer
 *
 * @param perfectMatches Lista de perfect matches detectados durante FindCandidates
 * @param onProgress Callback opcional para notificar progreso track por track
 * @param onComplete Callback opcional para notificar cuando termine
 */
async function applyPerfectMatchesInBackground(
  perfectMatches: Array<{ track: Track; candidate: TrackCandidate }>,
  onProgress?: AutoApplyProgressCallback,
  onComplete?: AutoApplyCompleteCallback,
): Promise<void> {
  if (perfectMatches.length === 0) return;

  log.info(`[AUTO-APPLY] Starting background application of ${perfectMatches.length} perfect matches...`);

  try {
    // Convert perfect matches to TrackSelection format
    const autoSelections: TrackSelection[] = perfectMatches.map(({ track, candidate }) => ({
      local_track_id: track.id,
      selected_candidate_id: `${candidate.source}:${candidate.id}`,
    }));

    // Emit initial progress
    onProgress?.({
      processed: 0,
      total: perfectMatches.length,
      currentTrackTitle: perfectMatches[0]?.track.title || '',
      updated: 0,
      failed: 0,
    });

    // Apply tags using the same flow as manual selections (runs in workers)
    const { updated, errors } = await ApplyTagSelections(
      autoSelections,
      perfectMatches.map(m => m.track),
    );

    // Persist to database in parallel (much faster than sequential)
    if (updated.length > 0) {
      const db = Database.getInstance();
      let persistedCount = 0;
      let persistFailedCount = 0;

      const persistPromises = updated.map(async track => {
        try {
          await db.updateTrack(track);
          persistedCount++;
          log.info(`[AUTO-APPLY] Persisted to DB: ${track.title}`);

          // Emit progress after each track
          onProgress?.({
            processed: persistedCount + persistFailedCount,
            total: perfectMatches.length,
            currentTrackTitle: track.title,
            updated: persistedCount,
            failed: persistFailedCount + errors.length,
          });

          return { success: true, trackId: track.id };
        } catch (dbError) {
          persistFailedCount++;
          log.error(`[AUTO-APPLY] Failed to persist ${track.title}:`, dbError);

          // Emit progress for failed track
          onProgress?.({
            processed: persistedCount + persistFailedCount,
            total: perfectMatches.length,
            currentTrackTitle: track.title,
            updated: persistedCount,
            failed: persistFailedCount + errors.length,
          });

          return { success: false, trackId: track.id };
        }
      });

      const persistResults = await Promise.all(persistPromises);
      const persistErrors = persistResults.filter(r => !r.success);

      log.info(
        `[AUTO-APPLY] Successfully applied and persisted ${updated.length - persistErrors.length}/${updated.length} tracks`,
      );

      // Notify completion with statistics
      if (onComplete) {
        onComplete({
          updated: updated.length - persistErrors.length,
          failed: errors.length + persistErrors.length,
          trackIds: updated.map(t => t.id),
        });
      }
    } else {
      log.warn(`[AUTO-APPLY] No tracks were successfully updated`);
      if (onComplete) {
        onComplete({
          updated: 0,
          failed: errors.length,
          trackIds: [],
        });
      }
    }

    if (errors.length > 0) {
      log.warn(`[AUTO-APPLY] Failed to apply ${errors.length} perfect matches:`, errors);
    }
  } catch (error) {
    log.error(`[AUTO-APPLY] Background auto-apply failed:`, error);
    if (onComplete) {
      onComplete({
        updated: 0,
        failed: perfectMatches.length,
        trackIds: [],
      });
    }
  }
}

/**
 * Busca candidatos para múltiples tracks usando todos los providers configurados
 *
 * AIDEV-NOTE: Refactored to use TaggerWorkerManager for parallel provider searches.
 * Workers handle all HTTP/scraping operations across 3 providers simultaneously.
 * Main thread only does scoring/ranking using ProviderOrchestrator.scoreAndRank().
 *
 * AIDEV-NOTE: Tracks with >= 90% match are auto-applied immediately and excluded from
 * the candidate list. Only tracks needing manual decision are returned.
 *
 * @param tracks Lista de tracks locales para los que buscar candidatos
 * @param onProgress Callback opcional para reportar progreso (processed, total, currentTrackTitle)
 * @param onAutoApplyProgress Callback opcional para reportar progreso del auto-apply en background
 * @param onAutoApplyComplete Callback opcional para notificar cuando el auto-apply termine
 * @returns Lista de TrackCandidatesResult con top 4 candidatos (excluye matches perfectos ya aplicados)
 */
export const FindCandidates = async (
  tracks: Track[],
  onProgress?: ProgressCallback,
  onAutoApplyProgress?: AutoApplyProgressCallback,
  onAutoApplyComplete?: AutoApplyCompleteCallback,
): Promise<TrackCandidatesResult[]> => {
  // Create orchestrator for scoring/ranking (not for searching - workers do that)
  const orchestrator = new ProviderOrchestrator(
    [createBeatportProvider(), createTraxsourceProvider(), createBandcampProvider()],
    {
      maxCandidates: 4, // Top 4 globales
      minScore: 0.3, // Score mínimo 30%
    },
  );

  const allTrackCandidates: TrackCandidatesResult[] = [];
  const perfectMatches: Array<{ track: Track; candidate: TrackCandidate }> = [];
  const taggerManager = getTaggerWorkerManager();

  try {
    // AIDEV-NOTE: Initialize workers once before batch search
    await taggerManager.initialize();

    // Convert Track[] to BatchSearchRequest[]
    const searchRequests = tracks.map(track => ({
      trackId: track.id,
      title: track.title,
      artist: track.artist || '',
      durationSecs: track.duration,
    }));

    // AIDEV-NOTE: Batch search across all tracks and all providers in parallel
    // Workers process their provider-specific queues internally while running concurrently
    const batchResults = await taggerManager.searchBatch(searchRequests, progress => {
      // Forward worker progress to caller
      onProgress?.(progress);
    });

    // Process each track's results
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      // AIDEV-NOTE: searchBatch() returns Map<trackId, BatchSearchResult>, not array
      const trackResults = batchResults.get(track.id);

      // Guard: handle missing results (shouldn't happen but defensive)
      if (!trackResults) {
        log.error(`[Tagger] No results found for track ${track.title} (id: ${track.id})`);
        const result = TrackCandidatesResultUtils.withError(
          track.id,
          track.title,
          track.artist ?? '',
          track.path,
          track.duration,
          'No search results returned for this track',
        );
        allTrackCandidates.push(result);
        continue;
      }

      try {
        // Combine all provider results (workers already handle errors -> empty arrays)
        const allRaw: Array<RawTrackData & { source: ProviderSource }> = [];
        const providers: ProviderSource[] = ['beatport', 'traxsource', 'bandcamp'];

        for (const provider of providers) {
          const providerData = trackResults.providerResults.get(provider);

          if (providerData && providerData.length > 0) {
            providerData.forEach(raw => {
              allRaw.push({ ...raw, source: provider });
            });
          }

          // Log errors if any (workers set empty [] on error and store error message)
          const error = trackResults.errors.get(provider);
          if (error) {
            log.error(`[${provider}] Search failed for ${track.title}:`, error);
          }
        }

        // Score and rank using orchestrator (main thread)
        const candidates = orchestrator.scoreAndRank(allRaw, track.title, track.artist!, track.duration);

        // Log de resultados por provider
        candidates.forEach(c => {
          log.info(
            `[${c.source.toUpperCase()}] ${c.artists} - ${c.title} - Score: ${(c.similarity_score * 100).toFixed(1)}%`,
          );
        });

        // AIDEV-NOTE: Check if best candidate has >= 90% match - auto-apply and skip preselection
        // Changed from === 0.9 to >= 0.9 to handle float precision issues
        if (candidates.length > 0 && candidates[0].similarity_score >= 0.9) {
          log.info(
            `[AUTO-APPLY] Perfect match for ${track.title} - ${candidates[0].source}:${candidates[0].id} (score: ${(candidates[0].similarity_score * 100).toFixed(1)}%)`,
          );
          perfectMatches.push({ track, candidate: candidates[0] });
          // Don't add to allTrackCandidates - user won't see it in preselection
          continue;
        }

        // Crear TrackCandidatesResult (only for tracks needing manual selection)
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
        log.error(`Error processing candidates for ${track.title}:`, error);

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

    // AIDEV-NOTE: Auto-apply tags for perfect matches in background (non-blocking)
    // This allows the UI to show manual-selection candidates immediately
    if (perfectMatches.length > 0) {
      log.info(`[AUTO-APPLY] Detected ${perfectMatches.length} perfect matches - applying in background...`);

      // Fire-and-forget: apply in background without blocking return
      applyPerfectMatchesInBackground(
        perfectMatches,
        onAutoApplyProgress, // Pass through progress callback
        onAutoApplyComplete, // Pass through completion callback
      ).catch(error => {
        log.error(`[AUTO-APPLY] Background process error:`, error);
      });
    }

    // AIDEV-NOTE: Emitir progreso final cuando todos los tracks estén procesados
    onProgress?.({
      processed: tracks.length,
      total: tracks.length,
      currentTrackTitle: '',
    });

    return allTrackCandidates;
  } finally {
    // AIDEV-NOTE: Don't shutdown workers here - let IPCTaggerModule manage lifecycle
  }
};

/**
 * Aplica las selecciones de tags del usuario a los tracks locales
 *
 * AIDEV-NOTE: Refactored to use TaggerWorkerManager for detail fetching (all providers)
 * and AudioAnalysisWorkerPool for Bandcamp audio analysis (batch processing).
 * This moves ALL blocking HTTP/analysis operations off the main thread.
 *
 * @param selections Lista de selecciones del usuario
 * @param tracks Lista de tracks locales a actualizar
 * @returns Lista de tracks actualizados con sus nuevos tags
 */
export const ApplyTagSelections = async (
  selections: TrackSelection[],
  tracks: Track[],
): Promise<{ updated: Track[]; errors: Array<{ trackId: string; error: string }> }> => {
  const taggerManager = getTaggerWorkerManager();
  const audioPool = getWorkerPool();

  const updated: Track[] = [];
  const errors: Array<{ trackId: string; error: string }> = [];
  const bandcampTracksToAnalyze: Array<{ track: Track; index: number }> = [];

  try {
    // AIDEV-NOTE: Ensure workers are initialized
    await taggerManager.initialize();

    // Process each selection sequentially (to maintain order)
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

        // AIDEV-NOTE: Fetch details via worker (off main thread)
        let resultTag: ResultTag;
        let needsAudioAnalysis = false;

        if (source === 'beatport') {
          // Fetch via worker
          const beatportTrack = await taggerManager.getDetails('beatport', { trackId: id });

          const artUrl = BeatportTrackUtils.getArtworkUrl(beatportTrack as BeatportTrack, 500);
          log.info(`Beatport artwork URL: ${artUrl}`);

          // Convertir BeatportTrack a ResultTag
          const bt = beatportTrack as BeatportTrack;
          resultTag = {
            id: bt.id,
            title: bt.name,
            artist: bt.artists?.[0]?.name,
            artists: bt.artists?.map(a => a.name) || [],
            album: bt.release?.name,
            year: bt.publish_date?.substring(0, 4),
            bpm: bt.bpm,
            key: BeatportTrackUtils.getKeyName(bt),
            genre: BeatportTrackUtils.getGenreName(bt),
            duration: BeatportTrackUtils.getDurationSecs(bt),
            art: artUrl,
            label: BeatportTrackUtils.getLabelName(bt),
            url: bt.slug ? `https://www.beatport.com/track/${bt.slug}/${bt.id}` : undefined,
          };
        } else if (source === 'traxsource') {
          // Fetch via worker (worker re-searches and extends internally)
          const extendedTrack = await taggerManager.getDetails('traxsource', {
            trackId: id,
            localTitle: localTrack.title,
            localArtist: localTrack.artist || '',
          });

          const txTrack = extendedTrack as TXTrack;
          log.info(`Traxsource artwork URL: ${txTrack.art || txTrack.thumbnail}`);

          // Convertir TXTrack a ResultTag
          resultTag = {
            id: txTrack.track_id || undefined,
            title: txTrack.title,
            artist: txTrack.artists[0],
            artists: txTrack.artists,
            album: txTrack.album,
            year: txTrack.release_date?.substring(0, 4),
            bpm: txTrack.bpm,
            key: txTrack.key,
            genre: txTrack.genres?.[0],
            duration: txTrack.duration,
            art: txTrack.art || txTrack.thumbnail,
            label: txTrack.label,
            url: txTrack.url,
          };
        } else if (source === 'bandcamp') {
          // AIDEV-NOTE: Bandcamp - fetch details via worker, defer audio analysis to batch
          const trackUrl = id; // The ID is the full URL for Bandcamp
          const trackDetails = await taggerManager.getDetails('bandcamp', { trackId: trackUrl });

          if (!trackDetails) {
            throw new Error(`Failed to fetch Bandcamp track: ${trackUrl}`);
          }

          log.info(`Bandcamp artwork URL: ${trackDetails.artwork_url}`);

          // Convert to ResultTag (BPM and Key will be undefined initially)
          resultTag = {
            title: trackDetails.title,
            artist: trackDetails.artists[0],
            artists: trackDetails.artists,
            album: trackDetails.label,
            year: trackDetails.release_date?.substring(0, 4),
            genre: trackDetails.genre,
            duration: trackDetails.duration_secs,
            art: trackDetails.artwork_url,
            label: trackDetails.label,
            url: trackDetails.url,
          };

          // Flag for batch audio analysis
          needsAudioAnalysis = true;
        } else {
          throw new Error(`Unknown provider: ${source}`);
        }

        // Aplicar los tags al track local
        const updatedTrack = await Update(localTrack, resultTag);

        // AIDEV-NOTE: Accumulate Bandcamp tracks for batch audio analysis
        if (needsAudioAnalysis) {
          bandcampTracksToAnalyze.push({
            track: updatedTrack,
            index: updated.length,
          });
        }

        updated.push(updatedTrack);
        log.info(`Tags applied successfully for ${updatedTrack.title}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`Error applying tags for track ${selection.local_track_id}: ${errorMsg}`);
        errors.push({ trackId: selection.local_track_id, error: errorMsg });
      }
    }

    // AIDEV-NOTE: Batch audio analysis for all Bandcamp tracks using worker pool
    if (bandcampTracksToAnalyze.length > 0) {
      log.info(`[Bandcamp] Running batch audio analysis for ${bandcampTracksToAnalyze.length} tracks...`);

      try {
        const filePaths = bandcampTracksToAnalyze.map(({ track }) => track.path);
        const analysisResultsMap = await audioPool.analyzeFiles(filePaths, {
          detectBpm: true,
          detectKey: true,
          generateWaveform: true,
          waveformBins: 300,
        });

        // Apply results back to tracks
        bandcampTracksToAnalyze.forEach(({ track, index }) => {
          const result = analysisResultsMap.get(track.path);

          if (!result) {
            log.warn(`[Bandcamp] ${track.title} - No analysis result`);
            return;
          }

          if (result instanceof Error) {
            log.warn(`[Bandcamp] ${track.title} - Analysis failed: ${result.message}`);
            return;
          }

          // Result is AudioAnalysisResult
          let updatedTrack = updated[index];

          if (result.bpm) {
            updatedTrack = { ...updatedTrack, bpm: result.bpm };
            log.info(`[Bandcamp] ${track.title} - Detected BPM: ${result.bpm}`);
          }
          if (result.key) {
            updatedTrack = { ...updatedTrack, initialKey: result.key };
            log.info(`[Bandcamp] ${track.title} - Detected Key: ${result.key}`);
          }
          if (result.waveformPeaks) {
            updatedTrack = { ...updatedTrack, waveformPeaks: result.waveformPeaks };
            log.info(`[Bandcamp] ${track.title} - Generated waveform: ${result.waveformPeaks.length} peaks`);
          }

          updated[index] = updatedTrack;
        });

        log.info(`[Bandcamp] Batch audio analysis completed successfully`);
      } catch (analysisError) {
        // Log but don't fail - partial tags are better than none
        log.warn(`[Bandcamp] Batch audio analysis failed: ${analysisError}`);
      }
    }

    return { updated, errors };
  } finally {
    // AIDEV-NOTE: Don't shutdown workers here - let IPCTaggerModule manage lifecycle
  }
};
