/**
 * Escritura de tags de audio
 *
 * Proporciona funcionalidades para escribir metadatos en archivos de audio
 * incluyendo tags básicos, artwork y diferentes formatos.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as NodeID3 from "node-id3";
import { parseFile } from "music-metadata";

import { BeatportTags } from "./models/tags";
import { BeatportError, BeatportErrorType } from "./error";

/**
 * Escribe tags completos a un archivo de audio
 */
export async function writeTags(
  filePath: string,
  tags: BeatportTags,
): Promise<void> {
  try {
    // Verificar que el archivo existe
    await fs.access(filePath);

    // Determinar el formato del archivo
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".mp3") {
      await writeMP3Tags(filePath, tags);
    } else if (ext === ".flac") {
      await writeFLACTags(filePath, tags);
    } else if (ext === ".m4a" || ext === ".mp4" || ext === ".aac") {
      await writeM4ATags(filePath, tags);
    } else {
      throw BeatportError.tagWriteError(`Formato no soportado: ${ext}`);
    }
  } catch (error) {
    if (error instanceof BeatportError) {
      throw error;
    }
    throw BeatportError.tagWriteError(`Error escribiendo tags: ${error}`);
  }
}

/**
 * Escribe solo el artwork a un archivo de audio
 */
export async function writeArtworkOnly(
  filePath: string,
  artworkData: Uint8Array,
): Promise<void> {
  try {
    // Verificar que el archivo existe
    await fs.access(filePath);

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".mp3") {
      await writeMP3Artwork(filePath, artworkData);
    } else if (ext === ".flac") {
      await writeFLACArtwork(filePath, artworkData);
    } else if (ext === ".m4a" || ext === ".mp4" || ext === ".aac") {
      await writeM4AArtwork(filePath, artworkData);
    } else {
      throw BeatportError.tagWriteError(
        `Formato no soportado para artwork: ${ext}`,
      );
    }
  } catch (error) {
    if (error instanceof BeatportError) {
      throw error;
    }
    throw BeatportError.tagWriteError(`Error escribiendo artwork: ${error}`);
  }
}

/**
 * Escribe tags MP3 usando node-id3
 */
async function writeMP3Tags(
  filePath: string,
  tags: BeatportTags,
): Promise<void> {
  const id3Tags: NodeID3.Tags = {};

  // Tags básicos
  if (tags.title) id3Tags.title = tags.title;
  if (tags.artist) id3Tags.artist = tags.artist;
  if (tags.album) id3Tags.album = tags.album;
  if (tags.year) id3Tags.year = tags.year.toString();
  if (tags.genre) id3Tags.genre = tags.genre;

  // BPM
  if (tags.bpm) id3Tags.bpm = tags.bpm.toString();

  // Key (usar campo personalizado o comment)
  if (tags.key) {
    id3Tags.comment = {
      language: "eng",
      text: `Key: ${tags.key}`,
    };
  }

  // Label (usar publisher)
  if (tags.label) id3Tags.publisher = tags.label;

  // ISRC
  if (tags.isrc) id3Tags.ISRC = tags.isrc;

  // Artwork
  if (tags.artwork_data) {
    id3Tags.image = {
      mime: "image/jpeg",
      type: {
        id: 3, // Cover (front)
        name: "Cover (front)",
      },
      description: "Cover",
      imageBuffer: Buffer.from(tags.artwork_data),
    };
  }

  const success = NodeID3.write(id3Tags, filePath);
  if (!success) {
    throw BeatportError.tagWriteError("Error escribiendo tags MP3");
  }
}

/**
 * Escribe solo artwork a MP3
 */
async function writeMP3Artwork(
  filePath: string,
  artworkData: Uint8Array,
): Promise<void> {
  // Leer tags existentes
  const existingTags = NodeID3.read(filePath) || {};

  // Actualizar solo el artwork
  existingTags.image = {
    mime: "image/jpeg",
    type: {
      id: 3, // Cover (front)
      name: "Cover (front)",
    },
    description: "Cover",
    imageBuffer: Buffer.from(artworkData),
  };

  const success = NodeID3.write(existingTags, filePath);
  if (!success) {
    throw BeatportError.tagWriteError("Error escribiendo artwork MP3");
  }
}

/**
 * Escribe tags FLAC (por ahora solo artwork, tags básicos limitados)
 */
async function writeFLACTags(
  filePath: string,
  tags: BeatportTags,
): Promise<void> {
  // FLAC tiene soporte limitado en node-id3
  // Por ahora solo escribir artwork
  if (tags.artwork_data) {
    await writeFLACArtwork(filePath, tags.artwork_data);
  }

  // Para tags completos necesitaríamos otra librería como music-metadata
  // Por ahora lanzar error para indicar limitación
  throw BeatportError.tagWriteError(
    "Escritura completa de tags FLAC no implementada aún",
  );
}

/**
 * Escribe artwork a FLAC
 */
async function writeFLACArtwork(
  filePath: string,
  artworkData: Uint8Array,
): Promise<void> {
  // FLAC artwork writing requiere librerías especializadas
  // Por ahora no implementado
  throw BeatportError.tagWriteError(
    "Escritura de artwork FLAC no implementada aún",
  );
}

/**
 * Escribe tags M4A (por ahora limitado)
 */
async function writeM4ATags(
  filePath: string,
  tags: BeatportTags,
): Promise<void> {
  // M4A/MP4 tags requieren librerías especializadas
  // Por ahora solo artwork si está disponible
  if (tags.artwork_data) {
    await writeM4AArtwork(filePath, tags.artwork_data);
  }

  throw BeatportError.tagWriteError(
    "Escritura completa de tags M4A no implementada aún",
  );
}

/**
 * Escribe artwork a M4A
 */
async function writeM4AArtwork(
  filePath: string,
  artworkData: Uint8Array,
): Promise<void> {
  // M4A artwork writing requiere librerías especializadas
  // Por ahora no implementado
  throw BeatportError.tagWriteError(
    "Escritura de artwork M4A no implementada aún",
  );
}

/**
 * Lee los tags actuales de un archivo de audio
 */
export async function readTags(
  filePath: string,
): Promise<Partial<BeatportTags>> {
  try {
    const metadata = await parseFile(filePath);

    const tags: Partial<BeatportTags> = {};

    // Extraer tags comunes
    if (metadata.common.title) tags.title = metadata.common.title;
    if (metadata.common.artist) tags.artist = metadata.common.artist;
    if (metadata.common.album) tags.album = metadata.common.album;
    if (metadata.common.year) tags.year = metadata.common.year;
    if (metadata.common.genre?.[0]) tags.genre = metadata.common.genre[0];

    // BPM (buscar en diferentes campos)
    if (metadata.common.bpm) {
      tags.bpm = metadata.common.bpm;
    }

    return tags;
  } catch (error) {
    throw BeatportError.tagWriteError(`Error leyendo tags: ${error}`);
  }
}
