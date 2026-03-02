/**
 * Traktor NML Writer
 *
 * Writes changes back to Traktor's collection.nml format.
 *
 * Strategy for writing:
 * 1. Work with parsed NML structure (preserve original data)
 * 2. Update only the fields that have changed
 * 3. Generate valid XML that Traktor can read
 * 4. Preserve cue points, analysis data, and other metadata
 */

import { writeFile } from 'fs/promises';

import type { Track } from '../../../preload/types/harmony';
import type { CuePoint } from '../../../preload/types/cue-point';
import type { TraktorNML, TraktorEntry, TraktorCue, TraktorNode } from './types/nml-types';
import { mapSystemPathToTraktor, mapHarmonyRatingToTraktor } from './mappers/track-mapper';
import { mapHarmonyKeyToTraktor } from './mappers/key-mapper';
import { mapHarmonyCueToTraktor } from './mappers/cue-mapper';
import { mapHarmonyPlaylistToTraktor } from './mappers/playlist-mapper';

/**
 * Escape XML special characters
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format a Date as Traktor date string (YYYY/M/D - no zero padding)
 */
export function formatTraktorDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const day = date.getDate();
  return `${year}/${month}/${day}`;
}

/**
 * Build XML for a single CUE_V2 element
 */
export function buildCueXml(cue: CuePoint): string {
  const traktorCue = mapHarmonyCueToTraktor(cue);
  const attrs: string[] = [];

  if (traktorCue.NAME) {
    attrs.push(`NAME="${escapeXml(traktorCue.NAME)}"`);
  }
  if (traktorCue.DISPL_ORDER) {
    attrs.push(`DISPL_ORDER="${traktorCue.DISPL_ORDER}"`);
  }
  attrs.push(`TYPE="${traktorCue.TYPE}"`);
  attrs.push(`START="${traktorCue.START}"`);
  if (traktorCue.LEN) {
    attrs.push(`LEN="${traktorCue.LEN}"`);
  }
  if (traktorCue.REPEATS) {
    attrs.push(`REPEATS="${traktorCue.REPEATS}"`);
  }
  if (traktorCue.HOTCUE !== undefined) {
    attrs.push(`HOTCUE="${traktorCue.HOTCUE}"`);
  }

  return `<CUE_V2 ${attrs.join(' ')}></CUE_V2>`;
}

/**
 * Build XML for a complete ENTRY element from a Harmony Track
 */
export function buildEntryXml(track: Track, cuePoints?: CuePoint[]): string {
  const { dir, file, volume } = mapSystemPathToTraktor(track.path);

  const lines: string[] = [];

  // Entry opening with attributes
  const entryAttrs: string[] = [];
  if (track.title) {
    entryAttrs.push(`TITLE="${escapeXml(track.title)}"`);
  }
  if (track.artist) {
    entryAttrs.push(`ARTIST="${escapeXml(track.artist)}"`);
  }
  // Add modification date
  entryAttrs.push(`MODIFIED_DATE="${formatTraktorDate(new Date())}"`);
  entryAttrs.push(`MODIFIED_TIME="${Math.floor(Date.now() / 1000) % 86400}"`);

  lines.push(`<ENTRY ${entryAttrs.join(' ')}>`);

  // LOCATION element - Use extracted volume from path
  lines.push(`  <LOCATION DIR="${escapeXml(dir)}" FILE="${escapeXml(file)}" VOLUME="${escapeXml(volume)}"></LOCATION>`);

  // ALBUM element
  if (track.album) {
    lines.push(`  <ALBUM TITLE="${escapeXml(track.album)}"></ALBUM>`);
  }

  // INFO element
  const infoAttrs: string[] = [];
  if (track.bitrate) {
    infoAttrs.push(`BITRATE="${track.bitrate * 1000}"`);
  }
  if (track.genre) {
    infoAttrs.push(`GENRE="${escapeXml(track.genre)}"`);
  }
  if (track.comment) {
    infoAttrs.push(`COMMENT="${escapeXml(track.comment)}"`);
  }
  if (track.initialKey) {
    const traktorKey = mapHarmonyKeyToTraktor(track.initialKey);
    if (traktorKey) {
      infoAttrs.push(`KEY="${traktorKey}"`);
    }
  }
  if (track.duration) {
    infoAttrs.push(`PLAYTIME="${track.duration}"`);
  }
  if (track.rating?.rating) {
    infoAttrs.push(`RANKING="${mapHarmonyRatingToTraktor(track.rating.rating)}"`);
  }
  // Use releaseDate for full precision, fallback to year/1/1
  if (track.releaseDate) {
    infoAttrs.push(`RELEASE_DATE="${track.releaseDate}"`);
  } else if (track.year) {
    infoAttrs.push(`RELEASE_DATE="${track.year}/1/1"`);
  }
  if (infoAttrs.length > 0) {
    lines.push(`  <INFO ${infoAttrs.join(' ')}></INFO>`);
  }

  // TEMPO element - Use bpmPrecise for full precision when available
  const bpmValue = track.bpmPrecise || (track.bpm ? String(track.bpm) : undefined);
  if (bpmValue) {
    lines.push(`  <TEMPO BPM="${bpmValue}" BPM_QUALITY="100.000000"></TEMPO>`);
  }

  // CUE_V2 elements
  if (cuePoints && cuePoints.length > 0) {
    for (const cue of cuePoints) {
      lines.push(`  ${buildCueXml(cue)}`);
    }
  }

  lines.push('</ENTRY>');
  return lines.join('\n');
}

/**
 * Writer for Traktor NML files.
 *
 * The writer preserves the original structure and only updates
 * changed entries. This ensures Traktor can still read all analysis data,
 * cue points, and other metadata.
 */
export class TraktorNMLWriter {
  /**
   * Update a single track in the NML structure
   *
   * @param nml - Original parsed NML
   * @param track - Track with updated data
   * @param cuePoints - Optional updated cue points (if undefined, preserves original)
   * @returns Updated NML structure (does not modify original)
   */
  updateTrack(nml: TraktorNML, track: Track, cuePoints?: CuePoint[]): TraktorNML {
    const { dir, file } = mapSystemPathToTraktor(track.path);

    // Deep clone the NML to avoid mutating original
    const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));

    // Find the entry to update
    const entryIndex = updatedNml.NML.COLLECTION.ENTRY.findIndex(entry => {
      return entry.LOCATION.DIR === dir && entry.LOCATION.FILE === file;
    });

    if (entryIndex === -1) {
      // Track not found, add as new entry
      const newEntry = this.buildEntryFromTrack(track, cuePoints);
      updatedNml.NML.COLLECTION.ENTRY.push(newEntry);
      updatedNml.NML.COLLECTION.ENTRIES = String(updatedNml.NML.COLLECTION.ENTRY.length);
    } else {
      // Update existing entry
      const entry = updatedNml.NML.COLLECTION.ENTRY[entryIndex];
      this.updateEntryFromTrack(entry, track, cuePoints);
    }

    return updatedNml;
  }

  /**
   * Update multiple tracks in the NML structure
   */
  updateTracks(nml: TraktorNML, updates: Array<{ track: Track; cuePoints?: CuePoint[] }>): TraktorNML {
    let updatedNml = nml;
    for (const { track, cuePoints } of updates) {
      updatedNml = this.updateTrack(updatedNml, track, cuePoints);
    }
    return updatedNml;
  }

  /**
   * Build a new TraktorEntry from a Harmony Track
   */
  private buildEntryFromTrack(track: Track, cuePoints?: CuePoint[]): TraktorEntry {
    const { dir, file, volume } = mapSystemPathToTraktor(track.path);

    const entry: TraktorEntry = {
      TITLE: track.title,
      ARTIST: track.artist,
      MODIFIED_DATE: formatTraktorDate(new Date()),
      MODIFIED_TIME: String(Math.floor(Date.now() / 1000) % 86400),
      LOCATION: {
        DIR: dir,
        FILE: file,
        VOLUME: volume,
      },
    };

    if (track.album) {
      entry.ALBUM = { TITLE: track.album };
    }

    // Build INFO
    entry.INFO = {};
    if (track.bitrate) entry.INFO.BITRATE = String(track.bitrate * 1000);
    if (track.genre) entry.INFO.GENRE = track.genre;
    if (track.comment) entry.INFO.COMMENT = track.comment;
    if (track.initialKey) {
      const traktorKey = mapHarmonyKeyToTraktor(track.initialKey);
      if (traktorKey) entry.INFO.KEY = traktorKey;
    }
    if (track.duration) entry.INFO.PLAYTIME = String(track.duration);
    if (track.rating?.rating) {
      entry.INFO.RANKING = mapHarmonyRatingToTraktor(track.rating.rating);
    }
    // Use releaseDate for full precision, fallback to year/1/1
    if (track.releaseDate) {
      entry.INFO.RELEASE_DATE = track.releaseDate;
    } else if (track.year) {
      entry.INFO.RELEASE_DATE = `${track.year}/1/1`;
    }

    // Build TEMPO - Use bpmPrecise for full precision when available
    const bpmValue = track.bpmPrecise || (track.bpm ? String(track.bpm) : undefined);
    if (bpmValue) {
      entry.TEMPO = {
        BPM: bpmValue,
        BPM_QUALITY: '100.000000',
      };
    }

    // Build CUE_V2
    if (cuePoints && cuePoints.length > 0) {
      entry.CUE_V2 = cuePoints.map(cue => mapHarmonyCueToTraktor(cue));
    }

    return entry;
  }

  /**
   * Update an existing entry with data from a Track
   * Preserves fields not in Track (like AUDIO_ID, LOUDNESS, etc.)
   */
  private updateEntryFromTrack(entry: TraktorEntry, track: Track, cuePoints?: CuePoint[]): void {
    // Update top-level attributes
    if (track.title) entry.TITLE = track.title;
    if (track.artist) entry.ARTIST = track.artist;
    entry.MODIFIED_DATE = formatTraktorDate(new Date());
    entry.MODIFIED_TIME = String(Math.floor(Date.now() / 1000) % 86400);

    // Update ALBUM
    if (track.album) {
      entry.ALBUM = entry.ALBUM || {};
      entry.ALBUM.TITLE = track.album;
    }

    // Update INFO (preserve existing fields)
    entry.INFO = entry.INFO || {};
    if (track.bitrate) entry.INFO.BITRATE = String(track.bitrate * 1000);
    if (track.genre) entry.INFO.GENRE = track.genre;
    if (track.comment !== undefined) entry.INFO.COMMENT = track.comment;
    if (track.initialKey) {
      const traktorKey = mapHarmonyKeyToTraktor(track.initialKey);
      if (traktorKey) entry.INFO.KEY = traktorKey;
    }
    if (track.duration) entry.INFO.PLAYTIME = String(track.duration);
    if (track.rating?.rating) {
      entry.INFO.RANKING = mapHarmonyRatingToTraktor(track.rating.rating);
    }
    // Use releaseDate for full precision, fallback to year/1/1
    if (track.releaseDate) {
      entry.INFO.RELEASE_DATE = track.releaseDate;
    } else if (track.year) {
      entry.INFO.RELEASE_DATE = `${track.year}/1/1`;
    }

    // Update TEMPO - Use bpmPrecise for full precision when available
    const bpmValue = track.bpmPrecise || (track.bpm ? String(track.bpm) : undefined);
    if (bpmValue) {
      entry.TEMPO = entry.TEMPO || { BPM: '0' };
      entry.TEMPO.BPM = bpmValue;
    }

    // Update cue points only if explicitly provided
    if (cuePoints !== undefined) {
      entry.CUE_V2 = cuePoints.map(cue => mapHarmonyCueToTraktor(cue));
    }
  }

  /**
   * Convert NML structure to XML string
   */
  toXml(nml: TraktorNML): string {
    const lines: string[] = [];

    // XML declaration
    lines.push('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');

    // NML root
    lines.push(`<NML VERSION="${nml.NML.VERSION}">`);

    // HEAD
    lines.push(
      `  <HEAD COMPANY="${escapeXml(nml.NML.HEAD.COMPANY)}" PROGRAM="${escapeXml(nml.NML.HEAD.PROGRAM)}"></HEAD>`,
    );

    // COLLECTION
    lines.push(`  <COLLECTION ENTRIES="${nml.NML.COLLECTION.ENTRIES}">`);
    for (const entry of nml.NML.COLLECTION.ENTRY) {
      lines.push(this.entryToXml(entry, '    '));
    }
    lines.push('  </COLLECTION>');

    // SETS - Remix Sets container (typically empty, Harmony doesn't manage Remix Sets)
    // SETS element is required for full Traktor NML compatibility
    lines.push('  <SETS ENTRIES="0"></SETS>');

    // PLAYLISTS (if present)
    if (nml.NML.PLAYLISTS) {
      lines.push('  <PLAYLISTS>');
      lines.push(this.nodeToXml(nml.NML.PLAYLISTS.NODE, '    '));
      lines.push('  </PLAYLISTS>');
    }

    // INDEXING section must be preserved for Traktor compatibility
    // It contains SORTING_INFO elements with optional CRITERIA for collection ordering
    if (nml.NML.INDEXING) {
      lines.push('  <INDEXING>');
      const sortingInfos = nml.NML.INDEXING.SORTING_INFO;
      if (sortingInfos) {
        const infos = Array.isArray(sortingInfos) ? sortingInfos : [sortingInfos];
        for (const info of infos) {
          if (info?.PATH !== undefined) {
            if (info.CRITERIA) {
              // SORTING_INFO with nested CRITERIA element
              lines.push(`    <SORTING_INFO PATH="${escapeXml(info.PATH)}">`);
              lines.push(
                `      <CRITERIA ATTRIBUTE="${escapeXml(info.CRITERIA.ATTRIBUTE)}" DIRECTION="${info.CRITERIA.DIRECTION}"></CRITERIA>`,
              );
              lines.push('    </SORTING_INFO>');
            } else {
              // Simple SORTING_INFO without CRITERIA
              lines.push(`    <SORTING_INFO PATH="${escapeXml(info.PATH)}"></SORTING_INFO>`);
            }
          }
        }
      }
      lines.push('  </INDEXING>');
    }

    lines.push('</NML>');

    return lines.join('\n');
  }

  /**
   * Write NML to file
   */
  async writeToFile(nml: TraktorNML, filePath: string): Promise<void> {
    const xml = this.toXml(nml);
    await writeFile(filePath, xml, 'utf-8');
  }

  /**
   * Convert a single entry to XML
   */
  private entryToXml(entry: TraktorEntry, indent: string): string {
    const lines: string[] = [];

    // Entry opening
    const entryAttrs: string[] = [];
    if (entry.MODIFIED_DATE) entryAttrs.push(`MODIFIED_DATE="${entry.MODIFIED_DATE}"`);
    if (entry.MODIFIED_TIME) entryAttrs.push(`MODIFIED_TIME="${entry.MODIFIED_TIME}"`);
    if (entry.AUDIO_ID) entryAttrs.push(`AUDIO_ID="${entry.AUDIO_ID}"`);
    if (entry.TITLE) entryAttrs.push(`TITLE="${escapeXml(entry.TITLE)}"`);
    if (entry.ARTIST) entryAttrs.push(`ARTIST="${escapeXml(entry.ARTIST)}"`);

    lines.push(`${indent}<ENTRY ${entryAttrs.join(' ')}>`);

    // LOCATION
    lines.push(
      `${indent}  <LOCATION DIR="${escapeXml(entry.LOCATION.DIR)}" FILE="${escapeXml(entry.LOCATION.FILE)}" VOLUME="${escapeXml(entry.LOCATION.VOLUME)}"${entry.LOCATION.VOLUMEID ? ` VOLUMEID="${entry.LOCATION.VOLUMEID}"` : ''}></LOCATION>`,
    );

    // ALBUM
    if (entry.ALBUM) {
      const albumAttrs: string[] = [];
      if (entry.ALBUM.TITLE) albumAttrs.push(`TITLE="${escapeXml(entry.ALBUM.TITLE)}"`);
      if (entry.ALBUM.TRACK) albumAttrs.push(`TRACK="${entry.ALBUM.TRACK}"`);
      if (entry.ALBUM.OF_TRACKS) albumAttrs.push(`OF_TRACKS="${entry.ALBUM.OF_TRACKS}"`);
      lines.push(`${indent}  <ALBUM ${albumAttrs.join(' ')}></ALBUM>`);
    }

    // MODIFICATION_INFO
    if (entry.MODIFICATION_INFO) {
      lines.push(
        `${indent}  <MODIFICATION_INFO AUTHOR_TYPE="${entry.MODIFICATION_INFO.AUTHOR_TYPE || 'user'}"></MODIFICATION_INFO>`,
      );
    }

    // INFO
    if (entry.INFO) {
      const infoAttrs: string[] = [];
      if (entry.INFO.BITRATE) infoAttrs.push(`BITRATE="${entry.INFO.BITRATE}"`);
      if (entry.INFO.GENRE) infoAttrs.push(`GENRE="${escapeXml(entry.INFO.GENRE)}"`);
      if (entry.INFO.LABEL) infoAttrs.push(`LABEL="${escapeXml(entry.INFO.LABEL)}"`);
      if (entry.INFO.COMMENT) infoAttrs.push(`COMMENT="${escapeXml(entry.INFO.COMMENT)}"`);
      if (entry.INFO.COVERARTID) infoAttrs.push(`COVERARTID="${entry.INFO.COVERARTID}"`);
      if (entry.INFO.KEY) infoAttrs.push(`KEY="${entry.INFO.KEY}"`);
      if (entry.INFO.PLAYTIME) infoAttrs.push(`PLAYTIME="${entry.INFO.PLAYTIME}"`);
      if (entry.INFO.PLAYTIME_FLOAT) infoAttrs.push(`PLAYTIME_FLOAT="${entry.INFO.PLAYTIME_FLOAT}"`);
      if (entry.INFO.RANKING) infoAttrs.push(`RANKING="${entry.INFO.RANKING}"`);
      if (entry.INFO.IMPORT_DATE) infoAttrs.push(`IMPORT_DATE="${entry.INFO.IMPORT_DATE}"`);
      if (entry.INFO.RELEASE_DATE) infoAttrs.push(`RELEASE_DATE="${entry.INFO.RELEASE_DATE}"`);
      if (entry.INFO.LAST_PLAYED) infoAttrs.push(`LAST_PLAYED="${entry.INFO.LAST_PLAYED}"`);
      if (entry.INFO.PLAYCOUNT) infoAttrs.push(`PLAYCOUNT="${entry.INFO.PLAYCOUNT}"`);
      if (entry.INFO.FLAGS) infoAttrs.push(`FLAGS="${entry.INFO.FLAGS}"`);
      if (entry.INFO.FILESIZE) infoAttrs.push(`FILESIZE="${entry.INFO.FILESIZE}"`);
      if (entry.INFO.COLOR) infoAttrs.push(`COLOR="${entry.INFO.COLOR}"`);
      if (infoAttrs.length > 0) {
        lines.push(`${indent}  <INFO ${infoAttrs.join(' ')}></INFO>`);
      }
    }

    // TEMPO
    if (entry.TEMPO) {
      lines.push(
        `${indent}  <TEMPO BPM="${entry.TEMPO.BPM}"${entry.TEMPO.BPM_QUALITY ? ` BPM_QUALITY="${entry.TEMPO.BPM_QUALITY}"` : ''}></TEMPO>`,
      );
    }

    // LOUDNESS
    if (entry.LOUDNESS) {
      const loudAttrs: string[] = [];
      if (entry.LOUDNESS.PEAK_DB) loudAttrs.push(`PEAK_DB="${entry.LOUDNESS.PEAK_DB}"`);
      if (entry.LOUDNESS.PERCEIVED_DB) loudAttrs.push(`PERCEIVED_DB="${entry.LOUDNESS.PERCEIVED_DB}"`);
      if (entry.LOUDNESS.ANALYZED_DB) loudAttrs.push(`ANALYZED_DB="${entry.LOUDNESS.ANALYZED_DB}"`);
      if (loudAttrs.length > 0) {
        lines.push(`${indent}  <LOUDNESS ${loudAttrs.join(' ')}></LOUDNESS>`);
      }
    }

    // MUSICAL_KEY
    if (entry.MUSICAL_KEY) {
      lines.push(`${indent}  <MUSICAL_KEY VALUE="${entry.MUSICAL_KEY.VALUE}"></MUSICAL_KEY>`);
    }

    // CUE_V2
    if (entry.CUE_V2) {
      const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : [entry.CUE_V2];
      for (const cue of cues) {
        lines.push(`${indent}  ${this.cueToXml(cue)}`);
      }
    }

    // PRIMARYKEY
    if (entry.PRIMARYKEY) {
      lines.push(
        `${indent}  <PRIMARYKEY TYPE="${entry.PRIMARYKEY.TYPE || 'TRACK'}" KEY="${escapeXml(entry.PRIMARYKEY.KEY || '')}"></PRIMARYKEY>`,
      );
    }

    lines.push(`${indent}</ENTRY>`);
    return lines.join('\n');
  }

  /**
   * Convert a TraktorCue to XML
   *
   * Critical for Traktor compatibility:
   * - NAME must ALWAYS be present (use "n.n." for unnamed cues)
   * - TYPE=4 (AutoGrid) cues must include nested <GRID BPM="..."> element
   */
  private cueToXml(cue: TraktorCue): string {
    const attrs: string[] = [];

    // NAME is required by Traktor - use "n.n." (no name) as default
    attrs.push(`NAME="${escapeXml(cue.NAME || 'n.n.')}"`);
    if (cue.DISPL_ORDER !== undefined) attrs.push(`DISPL_ORDER="${cue.DISPL_ORDER}"`);
    attrs.push(`TYPE="${cue.TYPE}"`);
    attrs.push(`START="${cue.START}"`);
    if (cue.LEN !== undefined) attrs.push(`LEN="${cue.LEN}"`);
    if (cue.REPEATS !== undefined) attrs.push(`REPEATS="${cue.REPEATS}"`);
    if (cue.HOTCUE !== undefined) attrs.push(`HOTCUE="${cue.HOTCUE}"`);

    // TYPE=4 (Grid/AutoGrid) cues contain a nested GRID element with precise BPM
    // This is critical for beatgrid alignment - without it Traktor loses sync precision
    if (cue.GRID?.BPM) {
      return `<CUE_V2 ${attrs.join(' ')}><GRID BPM="${cue.GRID.BPM}"></GRID>\n</CUE_V2>`;
    }

    return `<CUE_V2 ${attrs.join(' ')}></CUE_V2>`;
  }

  /**
   * Convert a playlist node to XML (recursive)
   */
  private nodeToXml(node: TraktorNode, indent: string): string {
    const lines: string[] = [];

    lines.push(`${indent}<NODE TYPE="${node.TYPE}" NAME="${escapeXml(node.NAME)}">`);

    // SUBNODES
    if (node.SUBNODES) {
      const count = node.SUBNODES.COUNT || '0';
      lines.push(`${indent}  <SUBNODES COUNT="${count}">`);

      if (node.SUBNODES.NODE) {
        const nodes = Array.isArray(node.SUBNODES.NODE) ? node.SUBNODES.NODE : [node.SUBNODES.NODE];
        for (const childNode of nodes) {
          lines.push(this.nodeToXml(childNode, `${indent}    `));
        }
      }

      lines.push(`${indent}  </SUBNODES>`);
    }

    // PLAYLIST data
    if (node.PLAYLIST) {
      const pl = node.PLAYLIST;
      lines.push(`${indent}  <PLAYLIST ENTRIES="${pl.ENTRIES}" TYPE="${pl.TYPE}" UUID="${pl.UUID}">`);

      if (pl.ENTRY) {
        const entries = Array.isArray(pl.ENTRY) ? pl.ENTRY : [pl.ENTRY];
        for (const entry of entries) {
          lines.push(
            `${indent}    <ENTRY><PRIMARYKEY TYPE="${entry.PRIMARYKEY.TYPE || 'TRACK'}" KEY="${escapeXml(entry.PRIMARYKEY.KEY || '')}"></PRIMARYKEY></ENTRY>`,
          );
        }
      }

      lines.push(`${indent}  </PLAYLIST>`);
    }

    lines.push(`${indent}</NODE>`);
    return lines.join('\n');
  }

  // ===========================================================================
  // Playlist Management Methods
  // ===========================================================================

  /**
   * Add a new playlist to the NML PLAYLISTS tree.
   * Adds to $ROOT level by default.
   *
   * @param nml - Original parsed NML
   * @param playlist - Playlist with id, name, and trackPaths
   * @returns Updated NML structure (does not modify original)
   */
  addPlaylist(nml: TraktorNML, playlist: { id: string; name: string; trackPaths: string[] }): TraktorNML {
    // Deep clone
    const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));

    // Ensure PLAYLISTS structure exists
    if (!updatedNml.NML.PLAYLISTS) {
      updatedNml.NML.PLAYLISTS = {
        NODE: {
          TYPE: 'FOLDER',
          NAME: '$ROOT',
          SUBNODES: { COUNT: '0' },
        },
      };
    }

    // Create Traktor node from playlist
    const traktorNode = mapHarmonyPlaylistToTraktor(playlist);

    // Add to $ROOT subnodes
    const root = updatedNml.NML.PLAYLISTS.NODE;
    if (!root.SUBNODES) {
      root.SUBNODES = { COUNT: '0' };
    }

    const existingNodes = root.SUBNODES.NODE
      ? Array.isArray(root.SUBNODES.NODE)
        ? root.SUBNODES.NODE
        : [root.SUBNODES.NODE]
      : [];

    existingNodes.push(traktorNode);
    root.SUBNODES.NODE = existingNodes;
    root.SUBNODES.COUNT = String(existingNodes.length);

    return updatedNml;
  }

  /**
   * Update an existing playlist's track list in the NML.
   *
   * @param nml - Original parsed NML
   * @param playlist - Playlist with id, name, and trackPaths
   * @returns Updated NML structure (does not modify original)
   */
  updatePlaylist(nml: TraktorNML, playlist: { id: string; name: string; trackPaths: string[] }): TraktorNML {
    // Deep clone
    const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));

    if (!updatedNml.NML.PLAYLISTS) {
      return updatedNml;
    }

    // Create updated Traktor node
    const updatedNode = mapHarmonyPlaylistToTraktor(playlist);

    // Find and replace the playlist by UUID
    const findAndUpdate = (node: TraktorNode): boolean => {
      if (node.TYPE === 'PLAYLIST' && node.PLAYLIST?.UUID === playlist.id) {
        // Update in place
        node.PLAYLIST = updatedNode.PLAYLIST;
        node.NAME = playlist.name;
        return true;
      }

      // Recurse into subnodes
      if (node.SUBNODES?.NODE) {
        const children = Array.isArray(node.SUBNODES.NODE) ? node.SUBNODES.NODE : [node.SUBNODES.NODE];
        for (const child of children) {
          if (findAndUpdate(child)) {
            return true;
          }
        }
      }

      return false;
    };

    findAndUpdate(updatedNml.NML.PLAYLISTS.NODE);

    return updatedNml;
  }

  /**
   * Remove a playlist from NML by UUID
   *
   * Recursively removes a playlist node from the NML tree structure.
   * Used to delete playlists that were removed in Harmony.
   *
   * @param nml - Original parsed NML
   * @param playlistId - UUID of the playlist to remove
   * @returns Updated NML structure (does not modify original)
   */
  removePlaylist(nml: TraktorNML, playlistId: string): TraktorNML {
    // Deep clone
    const updatedNml: TraktorNML = JSON.parse(JSON.stringify(nml));

    if (!updatedNml.NML.PLAYLISTS) {
      return updatedNml;
    }

    // Recursively find and remove the playlist
    const removeFromNode = (parentNode: TraktorNode): boolean => {
      if (!parentNode.SUBNODES?.NODE) {
        return false;
      }

      const children = Array.isArray(parentNode.SUBNODES.NODE) ? parentNode.SUBNODES.NODE : [parentNode.SUBNODES.NODE];

      // Find the index of the playlist to remove
      const indexToRemove = children.findIndex(
        child => child.TYPE === 'PLAYLIST' && child.PLAYLIST?.UUID === playlistId,
      );

      if (indexToRemove !== -1) {
        // Found it - remove from array
        if (Array.isArray(parentNode.SUBNODES.NODE)) {
          parentNode.SUBNODES.NODE.splice(indexToRemove, 1);
          // If array is now empty, set to undefined
          if (parentNode.SUBNODES.NODE.length === 0) {
            delete parentNode.SUBNODES.NODE;
          }
        } else {
          // Single node, remove SUBNODES entirely
          delete parentNode.SUBNODES.NODE;
        }
        return true;
      }

      // Not found at this level, recurse into children (folders)
      for (const child of children) {
        if (child.TYPE === 'FOLDER' && removeFromNode(child)) {
          return true;
        }
      }

      return false;
    };

    removeFromNode(updatedNml.NML.PLAYLISTS.NODE);

    return updatedNml;
  }

  /**
   * Merge Harmony playlists into NML structure.
   * - Adds new playlists from Harmony
   * - Updates existing playlists
   * - REMOVES playlists that exist in NML but not in Harmony (Harmony is source of truth)
   *
   * Changed behavior - now deletes playlists that are not in Harmony.
   * This ensures that when a user deletes a playlist in Harmony, it also gets
   * removed from Traktor on the next export.
   *
   * @param nml - Original parsed NML
   * @param harmonyPlaylists - Array of Harmony playlists with tracks
   * @returns Updated NML structure
   */
  mergePlaylistsFromHarmony(
    nml: TraktorNML,
    harmonyPlaylists: Array<{ id: string; name: string; tracks?: Track[] }>,
  ): TraktorNML {
    let updatedNml = nml;

    // Get existing playlist UUIDs from NML
    const existingUUIDs = this.getPlaylistUUIDsFromNml(nml);

    // Build set of Harmony playlist IDs for quick lookup
    const harmonyPlaylistIds = new Set(harmonyPlaylists.map(p => p.id));

    // Step 1: Add/Update playlists from Harmony
    for (const playlist of harmonyPlaylists) {
      const trackPaths = playlist.tracks?.map(t => t.path) || [];

      if (existingUUIDs.has(playlist.id)) {
        // Update existing
        updatedNml = this.updatePlaylist(updatedNml, { id: playlist.id, name: playlist.name, trackPaths });
      } else {
        // Add new
        updatedNml = this.addPlaylist(updatedNml, { id: playlist.id, name: playlist.name, trackPaths });
      }
    }

    // Step 2: Remove playlists that exist in NML but not in Harmony
    for (const nmlUUID of existingUUIDs) {
      if (!harmonyPlaylistIds.has(nmlUUID)) {
        updatedNml = this.removePlaylist(updatedNml, nmlUUID);
      }
    }

    return updatedNml;
  }

  /**
   * Extract all playlist UUIDs from NML structure
   *
   * @param nml - Parsed NML structure
   * @returns Set of playlist UUIDs
   */
  private getPlaylistUUIDsFromNml(nml: TraktorNML): Set<string> {
    const uuids = new Set<string>();

    if (!nml.NML.PLAYLISTS) {
      return uuids;
    }

    // Recursive traversal of PLAYLISTS tree
    const collectUUIDs = (node: TraktorNode): void => {
      if (node.TYPE === 'PLAYLIST' && node.PLAYLIST?.UUID) {
        uuids.add(node.PLAYLIST.UUID);
      }

      if (node.SUBNODES?.NODE) {
        const children = Array.isArray(node.SUBNODES.NODE) ? node.SUBNODES.NODE : [node.SUBNODES.NODE];
        for (const child of children) {
          collectUUIDs(child);
        }
      }
    };

    collectUUIDs(nml.NML.PLAYLISTS.NODE);

    return uuids;
  }
}
