/**
 * Traktor NML Parser
 *
 * Parses Traktor's collection.nml XML files into typed TypeScript objects.
 * Uses fast-xml-parser for high-performance XML parsing.
 *
 * AIDEV-NOTE: NML files use XML attributes heavily. The parser is configured
 * to extract attributes with @ prefix, which we then map to our interfaces.
 * Single child elements vs arrays are normalized in post-processing.
 */

import { readFile } from 'fs/promises';

import { XMLParser } from 'fast-xml-parser';

import type {
  TraktorNML,
  TraktorEntry,
  TraktorLocation,
  TraktorInfo,
  TraktorAlbum,
  TraktorTempo,
  TraktorLoudness,
  TraktorMusicalKey,
  TraktorCue,
  TraktorModificationInfo,
  TraktorHead,
  TraktorCollection,
  TraktorNode,
  TraktorPlaylists,
  TraktorPlaylistData,
  TraktorPlaylistEntry,
  TraktorPrimaryKey,
} from './types/nml-types';

/**
 * Parser for Traktor NML (collection.nml) files.
 *
 * Usage:
 * ```typescript
 * const parser = new TraktorNMLParser();
 * const nml = await parser.parse('/path/to/collection.nml');
 * ```
 */
export class TraktorNMLParser {
  private parser: XMLParser;

  constructor() {
    // AIDEV-NOTE: fast-xml-parser config for NML format:
    // - ignoreAttributes: false - we need all XML attributes
    // - attributeNamePrefix: '' - don't prefix attribute names
    // - parseAttributeValue: false - keep values as strings (matches our types)
    // - isArray: callback to force certain elements to always be arrays
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
      isArray: name => {
        // These elements should always be arrays even if there's only one
        return ['ENTRY', 'CUE_V2', 'NODE'].includes(name);
      },
    });
  }

  /**
   * Parse an NML file from disk.
   *
   * @param filePath - Absolute path to the collection.nml file
   * @returns Parsed NML structure
   * @throws Error if file cannot be read or parsed
   */
  async parse(filePath: string): Promise<TraktorNML> {
    const xmlContent = await readFile(filePath, 'utf-8');
    return this.parseXml(xmlContent);
  }

  /**
   * Parse NML from XML string.
   *
   * @param xmlContent - Raw XML content
   * @returns Parsed NML structure
   */
  parseXml(xmlContent: string): TraktorNML {
    const rawParsed = this.parser.parse(xmlContent);
    return this.transformToTyped(rawParsed);
  }

  /**
   * Transform raw parsed XML into our typed structure.
   * Maps @_ prefixed attributes to our interface properties.
   */
  private transformToTyped(raw: Record<string, unknown>): TraktorNML {
    const rawNML = raw.NML as Record<string, unknown>;

    return {
      NML: {
        VERSION: this.getAttr(rawNML, 'VERSION') || '',
        HEAD: this.transformHead(rawNML.HEAD as Record<string, unknown>),
        COLLECTION: this.transformCollection(rawNML.COLLECTION as Record<string, unknown>),
        PLAYLISTS: rawNML.PLAYLISTS ? this.transformPlaylists(rawNML.PLAYLISTS as Record<string, unknown>) : undefined,
        SORTING_ORDER: undefined, // Not commonly used, can add if needed
      },
    };
  }

  private transformHead(raw: Record<string, unknown>): TraktorHead {
    return {
      COMPANY: this.getAttr(raw, 'COMPANY') || '',
      PROGRAM: this.getAttr(raw, 'PROGRAM') || '',
    };
  }

  private transformCollection(raw: Record<string, unknown>): TraktorCollection {
    const entries = raw.ENTRY as Record<string, unknown>[];
    return {
      ENTRIES: this.getAttr(raw, 'ENTRIES') || '0',
      ENTRY: entries ? entries.map(e => this.transformEntry(e)) : [],
    };
  }

  private transformEntry(raw: Record<string, unknown>): TraktorEntry {
    return {
      // Attributes on ENTRY element
      MODIFIED_DATE: this.getAttr(raw, 'MODIFIED_DATE'),
      MODIFIED_TIME: this.getAttr(raw, 'MODIFIED_TIME'),
      AUDIO_ID: this.getAttr(raw, 'AUDIO_ID'),
      TITLE: this.getAttr(raw, 'TITLE'),
      ARTIST: this.getAttr(raw, 'ARTIST'),

      // Child elements
      LOCATION: this.transformLocation(raw.LOCATION as Record<string, unknown>),
      ALBUM: raw.ALBUM ? this.transformAlbum(raw.ALBUM as Record<string, unknown>) : undefined,
      MODIFICATION_INFO: raw.MODIFICATION_INFO
        ? this.transformModificationInfo(raw.MODIFICATION_INFO as Record<string, unknown>)
        : undefined,
      INFO: raw.INFO ? this.transformInfo(raw.INFO as Record<string, unknown>) : undefined,
      TEMPO: raw.TEMPO ? this.transformTempo(raw.TEMPO as Record<string, unknown>) : undefined,
      LOUDNESS: raw.LOUDNESS ? this.transformLoudness(raw.LOUDNESS as Record<string, unknown>) : undefined,
      MUSICAL_KEY: raw.MUSICAL_KEY ? this.transformMusicalKey(raw.MUSICAL_KEY as Record<string, unknown>) : undefined,
      CUE_V2: raw.CUE_V2
        ? this.transformCues(raw.CUE_V2 as Record<string, unknown> | Record<string, unknown>[])
        : undefined,
      PRIMARYKEY: raw.PRIMARYKEY ? this.transformPrimaryKey(raw.PRIMARYKEY as Record<string, unknown>) : undefined,
    };
  }

  private transformLocation(raw: Record<string, unknown>): TraktorLocation {
    return {
      DIR: this.getAttr(raw, 'DIR') || '',
      FILE: this.getAttr(raw, 'FILE') || '',
      VOLUME: this.getAttr(raw, 'VOLUME') || '',
      VOLUMEID: this.getAttr(raw, 'VOLUMEID'),
    };
  }

  private transformAlbum(raw: Record<string, unknown>): TraktorAlbum {
    return {
      TITLE: this.getAttr(raw, 'TITLE'),
      TRACK: this.getAttr(raw, 'TRACK'),
      OF_TRACKS: this.getAttr(raw, 'OF_TRACKS'),
    };
  }

  private transformModificationInfo(raw: Record<string, unknown>): TraktorModificationInfo {
    return {
      AUTHOR_TYPE: this.getAttr(raw, 'AUTHOR_TYPE'),
    };
  }

  private transformInfo(raw: Record<string, unknown>): TraktorInfo {
    return {
      BITRATE: this.getAttr(raw, 'BITRATE'),
      GENRE: this.getAttr(raw, 'GENRE'),
      LABEL: this.getAttr(raw, 'LABEL'),
      COMMENT: this.getAttr(raw, 'COMMENT'),
      COVERARTID: this.getAttr(raw, 'COVERARTID'),
      KEY: this.getAttr(raw, 'KEY'),
      PLAYTIME: this.getAttr(raw, 'PLAYTIME'),
      PLAYTIME_FLOAT: this.getAttr(raw, 'PLAYTIME_FLOAT'),
      RANKING: this.getAttr(raw, 'RANKING'),
      IMPORT_DATE: this.getAttr(raw, 'IMPORT_DATE'),
      RELEASE_DATE: this.getAttr(raw, 'RELEASE_DATE'),
      LAST_PLAYED: this.getAttr(raw, 'LAST_PLAYED'),
      PLAYCOUNT: this.getAttr(raw, 'PLAYCOUNT'),
      FLAGS: this.getAttr(raw, 'FLAGS'),
      FILESIZE: this.getAttr(raw, 'FILESIZE'),
    };
  }

  private transformTempo(raw: Record<string, unknown>): TraktorTempo {
    return {
      BPM: this.getAttr(raw, 'BPM') || '0',
      BPM_QUALITY: this.getAttr(raw, 'BPM_QUALITY'),
    };
  }

  private transformLoudness(raw: Record<string, unknown>): TraktorLoudness {
    return {
      PEAK_DB: this.getAttr(raw, 'PEAK_DB'),
      PERCEIVED_DB: this.getAttr(raw, 'PERCEIVED_DB'),
      ANALYZED_DB: this.getAttr(raw, 'ANALYZED_DB'),
    };
  }

  private transformMusicalKey(raw: Record<string, unknown>): TraktorMusicalKey {
    return {
      VALUE: this.getAttr(raw, 'VALUE') || '0',
    };
  }

  private transformCues(raw: Record<string, unknown> | Record<string, unknown>[]): TraktorCue | TraktorCue[] {
    // fast-xml-parser with isArray config should always return array for CUE_V2
    const cues = Array.isArray(raw) ? raw : [raw];
    const transformed = cues.map(cue => this.transformSingleCue(cue));
    // Return single cue if only one, otherwise return array
    return transformed.length === 1 ? transformed[0] : transformed;
  }

  private transformSingleCue(raw: Record<string, unknown>): TraktorCue {
    return {
      NAME: this.getAttr(raw, 'NAME'),
      DISPL_ORDER: this.getAttr(raw, 'DISPL_ORDER'),
      TYPE: this.getAttr(raw, 'TYPE') || '0',
      START: this.getAttr(raw, 'START') || '0',
      LEN: this.getAttr(raw, 'LEN'),
      REPEATS: this.getAttr(raw, 'REPEATS'),
      HOTCUE: this.getAttr(raw, 'HOTCUE'),
    };
  }

  private transformPrimaryKey(raw: Record<string, unknown>): TraktorPrimaryKey {
    return {
      TYPE: this.getAttr(raw, 'TYPE'),
      KEY: this.getAttr(raw, 'KEY'),
    };
  }

  private transformPlaylists(raw: Record<string, unknown>): TraktorPlaylists {
    // NODE might be an array due to isArray config, but PLAYLISTS always has single root NODE
    const nodeData = raw.NODE;
    const rootNode = Array.isArray(nodeData) ? nodeData[0] : nodeData;
    return {
      NODE: this.transformNode(rootNode as Record<string, unknown>),
    };
  }

  private transformNode(raw: Record<string, unknown>): TraktorNode {
    const node: TraktorNode = {
      TYPE: (this.getAttr(raw, 'TYPE') as 'FOLDER' | 'PLAYLIST') || 'FOLDER',
      NAME: this.getAttr(raw, 'NAME') || '',
    };

    // Handle SUBNODES (for folders)
    if (raw.SUBNODES) {
      const subnodes = raw.SUBNODES as Record<string, unknown>;
      const nodeData = subnodes.NODE;
      node.SUBNODES = {
        COUNT: this.getAttr(subnodes, 'COUNT'),
        NODE: nodeData
          ? Array.isArray(nodeData)
            ? nodeData.map(n => this.transformNode(n as Record<string, unknown>))
            : this.transformNode(nodeData as Record<string, unknown>)
          : undefined,
      };
    }

    // Handle PLAYLIST (for playlist nodes)
    if (raw.PLAYLIST) {
      node.PLAYLIST = this.transformPlaylistData(raw.PLAYLIST as Record<string, unknown>);
    }

    return node;
  }

  private transformPlaylistData(raw: Record<string, unknown>): TraktorPlaylistData {
    const entryData = raw.ENTRY;
    let entries: TraktorPlaylistEntry | TraktorPlaylistEntry[] | undefined;

    if (entryData) {
      if (Array.isArray(entryData)) {
        entries = entryData.map(e => this.transformPlaylistEntry(e as Record<string, unknown>));
      } else {
        entries = this.transformPlaylistEntry(entryData as Record<string, unknown>);
      }
    }

    return {
      ENTRIES: this.getAttr(raw, 'ENTRIES') || '0',
      TYPE: this.getAttr(raw, 'TYPE') || '',
      UUID: this.getAttr(raw, 'UUID') || '',
      ENTRY: entries,
    };
  }

  private transformPlaylistEntry(raw: Record<string, unknown>): TraktorPlaylistEntry {
    return {
      PRIMARYKEY: this.transformPrimaryKey(raw.PRIMARYKEY as Record<string, unknown>),
    };
  }

  /**
   * Helper to extract an attribute from a raw parsed element.
   * fast-xml-parser prefixes attributes with @_ when attributeNamePrefix is set.
   */
  private getAttr(obj: Record<string, unknown> | undefined, name: string): string | undefined {
    if (!obj) return undefined;
    const value = obj[`@_${name}`];
    return value !== undefined ? String(value) : undefined;
  }
}
