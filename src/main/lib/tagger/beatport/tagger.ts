/**
 * Tagger principal para aplicar metadatos de Beatport a archivos de audio
 *
 * Proporciona la interfaz de alto nivel para tagging automático de música
 */

import * as path from "path";
import { BeatportClient } from "./client/client";
import { BeatportTrack, BeatportTrackUtils } from "./models/track";
import { BeatportTags, BeatportTagsUtils } from "./models/tags";
import { BeatportError, BeatportErrorType } from "./error";
import { writeTags, writeArtworkOnly } from "./tag-writer";
import { mergeTags } from "./tag-merge";

/**
 * Resultado de una operación de tagging
 */
export interface TaggingResult {
  /** ID del track procesado */
  trackId: string;
  /** ID del track de Beatport encontrado */
  beatportId?: number;
  /** Tags aplicados */
  appliedTags: BeatportTags;
  /** Éxito de la operación */
  success: boolean;
  /** Mensaje de error si falló */
  error?: string;
  /** Información adicional */
  metadata?: {
    /** Tiempo de procesamiento en ms */
    processingTimeMs: number;
    /** Fuente de los datos (matching automático, manual, etc.) */
    dataSource: "auto_match" | "manual_selection" | "artwork_only";
  };
}

/**
 * Tagger principal para Beatport
 */
export class BeatportTagger {
  constructor(private client: BeatportClient) {}

  /**
   * Crea un tagger con un cliente nuevo
   */
  static async create(): Promise<BeatportTagger> {
    const client = new BeatportClient();
    return new BeatportTagger(client);
  }

  /**
   * Arregla los tags de un track individual automáticamente
   *
   * Busca el mejor match en Beatport y aplica todos los tags
   */
  async fixTrack(
    trackId: string,
    filePath: string,
    title: string,
    artist: string,
    currentDuration?: number,
    currentBpm?: number,
    currentGenre?: string,
    currentAlbum?: string,
    currentYear?: number,
  ): Promise<TaggingResult> {
    const startTime = Date.now();

    try {
      // 1. Buscar el mejor match en Beatport
      const beatportTrack = await this.client.findBestMatch(
        title,
        artist,
        currentDuration,
      );

      // 2. Convertir a tags
      let beatportTags = BeatportTagsUtils.fromTrack(beatportTrack);

      // 3. Descargar artwork si está disponible
      if (beatportTags.artwork_url) {
        try {
          const artworkData = await this.client.downloadArtwork(
            beatportTags.artwork_url,
          );
          beatportTags.artwork_data = artworkData;
        } catch (error) {
          console.warn(`Failed to download artwork for ${trackId}:`, error);
          // Continuar sin artwork
        }
      }

      // 4. Aplicar lógica de merge inteligente
      const mergedTags = mergeTags(
        beatportTags,
        currentBpm,
        currentGenre,
        currentAlbum,
        currentYear,
      );

      // 5. Escribir tags al archivo
      await writeTags(filePath, mergedTags);

      const processingTime = Date.now() - startTime;

      return {
        trackId,
        beatportId: beatportTrack.id,
        appliedTags: mergedTags,
        success: true,
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "auto_match",
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        trackId,
        appliedTags: {},
        success: false,
        error: error instanceof BeatportError ? error.message : String(error),
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "auto_match",
        },
      };
    }
  }

  /**
   * Solo busca y aplica artwork (sin modificar otros tags)
   */
  async findArtworkOnly(
    trackId: string,
    filePath: string,
    title: string,
    artist: string,
    currentDuration?: number,
  ): Promise<TaggingResult> {
    const startTime = Date.now();

    try {
      // 1. Buscar el mejor match en Beatport
      const beatportTrack = await this.client.findBestMatch(
        title,
        artist,
        currentDuration,
      );

      // 2. Obtener URL del artwork
      const artworkUrl = BeatportTrackUtils.getArtworkUrl(beatportTrack, 500);

      if (!artworkUrl) {
        return {
          trackId,
          appliedTags: {},
          success: false,
          error: "No artwork available for this track",
          metadata: {
            processingTimeMs: Date.now() - startTime,
            dataSource: "artwork_only",
          },
        };
      }

      // 3. Descargar artwork
      const artworkData = await this.client.downloadArtwork(artworkUrl);

      // 4. Aplicar solo artwork
      await writeArtworkOnly(filePath, artworkData);

      const processingTime = Date.now() - startTime;

      return {
        trackId,
        beatportId: beatportTrack.id,
        appliedTags: {
          artwork_url: artworkUrl,
          artwork_data: artworkData,
        },
        success: true,
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "artwork_only",
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        trackId,
        appliedTags: {},
        success: false,
        error: error instanceof BeatportError ? error.message : String(error),
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "artwork_only",
        },
      };
    }
  }

  /**
   * Aplica tags desde un track de Beatport ya seleccionado manualmente
   */
  async applyTagsFromTrack(
    trackId: string,
    filePath: string,
    beatportTrack: BeatportTrack,
    currentBpm?: number,
    currentGenre?: string,
    currentAlbum?: string,
    currentYear?: number,
  ): Promise<TaggingResult> {
    const startTime = Date.now();

    try {
      // 1. Convertir track a tags
      let beatportTags = BeatportTagsUtils.fromTrack(beatportTrack);

      // 2. Descargar artwork si está disponible
      if (beatportTags.artwork_url) {
        try {
          const artworkData = await this.client.downloadArtwork(
            beatportTags.artwork_url,
          );
          beatportTags.artwork_data = artworkData;
        } catch (error) {
          console.warn(`Failed to download artwork for ${trackId}:`, error);
        }
      }

      // 3. Aplicar lógica de merge (con menos preservación que el automático)
      const mergedTags = mergeTags(
        beatportTags,
        currentBpm, // Solo preservar BPM si está especificado
        undefined, // Siempre usar género de Beatport
        undefined, // Siempre usar álbum de Beatport
        undefined, // Siempre usar año de Beatport
      );

      // 4. Escribir tags al archivo
      await writeTags(filePath, mergedTags);

      const processingTime = Date.now() - startTime;

      return {
        trackId,
        beatportId: beatportTrack.id,
        appliedTags: mergedTags,
        success: true,
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "manual_selection",
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        trackId,
        appliedTags: {},
        success: false,
        error: error instanceof BeatportError ? error.message : String(error),
        metadata: {
          processingTimeMs: processingTime,
          dataSource: "manual_selection",
        },
      };
    }
  }

  /**
   * Valida que un archivo sea soportado para tagging
   */
  validateFile(filePath: string): { valid: boolean; reason?: string } {
    const ext = path.extname(filePath).toLowerCase();

    const supportedFormats = [".mp3", ".flac", ".m4a", ".mp4", ".aac"];

    if (!supportedFormats.includes(ext)) {
      return {
        valid: false,
        reason: `Formato no soportado: ${ext}. Formatossoportados: ${supportedFormats.join(", ")}`,
      };
    }

    return { valid: true };
  }

  /**
   * Obtiene estadísticas del cliente Beatport
   */
  getClientStats() {
    return {
      rateLimitState: this.client.getRateLimitState(),
    };
  }
}
