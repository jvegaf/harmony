import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createHttpClient, minifyHtml, parseDurationToSeconds, parseDateIso, limit } from './utils';
import type { TXTrack, TraxSourceMatch, AudioFileInfo } from './types';

export class Traxsource {
  client: AxiosInstance;
  baseUrl = 'https://www.traxsource.com';

  constructor(client?: AxiosInstance) {
    this.client = client ?? createHttpClient();
  }

  // Buscar pistas en Traxsource. No lanza panic: devuelve array (posiblemente vacío).
  async searchTracks(query: string): Promise<TXTrack[]> {
    try {
      const res = await this.client.get(`${this.baseUrl}/search/tracks`, {
        params: { term: query },
      });
      const html = await minifyHtml(res.data as string);
      const $ = cheerio.load(html);

      const list = $('#searchTrackList');
      if (!list || list.length === 0) {
        return [];
      }

      const rows = list.find('.trk-row');
      const tracks: TXTrack[] = [];

      rows.each((_, elem) => {
        try {
          const row = $(elem);

          // Title / version / duration: prefer robust parsing
          const titleElem = row.find('div.title').first();
          const titleTextParts = titleElem
            .contents()
            .toArray()
            .map(n => $(n).text().trim())
            .filter(Boolean);

          const title = titleTextParts[0] ?? '';
          let version: string | undefined;
          let durationSeconds: number | undefined;

          if (titleTextParts.length === 3) {
            version = titleTextParts[1]?.replace(/\u00A0/g, ' ').trim() ?? undefined;
            const dur = parseDurationToSeconds(titleTextParts[2]);
            if (dur != null) durationSeconds = dur;
          } else if (titleTextParts.length >= 2) {
            const dur = parseDurationToSeconds(titleTextParts[1]);
            if (dur != null) durationSeconds = dur;
          }

          // URL and track_id
          const link = titleElem.find('a').first();
          const href = link.attr('href') ?? '';
          const url = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          const trackIdMatch = href.match(/\/track\/([^\/\?]+)/);
          const track_id = trackIdMatch ? trackIdMatch[1] : undefined;

          // artists
          const artists: string[] = [];
          row.find('div.artists a').each((_, a) => {
            const t = $(a).text().trim();
            if (t) artists.push(t);
          });

          // label
          const label = row.find('div.label').first().text().trim() || undefined;

          // key and bpm
          const keyBpmText = row.find('div.key-bpm').first().text().trim();
          let key: string | undefined;
          let bpm: number | undefined;
          if (keyBpmText) {
            // often something like "Amaj 120"
            const parts = keyBpmText.split(/\s+/).filter(Boolean);
            if (parts.length >= 1) {
              key = parts[0].replace(/maj/gi, '').replace(/min/gi, 'm');
            }
            const bpmMatch = keyBpmText.match(/(\d{2,3})/);
            if (bpmMatch) bpm = parseInt(bpmMatch[1], 10);
          }

          // genre
          const genre = row.find('div.genre').first().text().trim() || undefined;

          // release date raw
          const rdateRaw = row.find('div.r-date').first().text().trim() || '';
          const rdateClean = rdateRaw.replace('Pre-order for ', '').trim();
          const release_date = parseDateIso(rdateClean) ?? undefined;

          // thumbnail
          const thumb = row.find('div.thumb img').first().attr('src') ?? undefined;
          const thumbnail = thumb && thumb.startsWith('http') ? thumb : thumb ? `${this.baseUrl}${thumb}` : undefined;

          const track: TXTrack = {
            platform: 'traxsource',
            version,
            artists,
            bpm,
            key,
            title,
            url,
            album_artists: [],
            label,
            release_date,
            genres: genre ? [genre] : [],
            track_id,
            release_id: undefined,
            duration: durationSeconds,
            thumbnail,
          };

          tracks.push(track);
        } catch (innerErr) {
          // continue with the next row
        }
      });

      return tracks;
    } catch (err) {
      return []; // fail gracefully
    }
  }

  // Extiende datos de track con info de página de track y opcionalmente de album
  async extendTrack(track: TXTrack, albumMeta = true, albumArt = true): Promise<void> {
    if (!track.url) throw new Error('track.url is required for extendTrack');
    try {
      const res = await this.client.get(track.url);
      const html = await minifyHtml(res.data as string);
      const $ = cheerio.load(html);

      const albumElem = $('div.ttl-info.ellip a').first();
      const albumHref = albumElem.attr('href');
      const albumName = albumElem.text().trim() || undefined;
      if (albumName) track.album = albumName;
      if (albumHref) {
        const releaseIdMatch = albumHref.match(/\/title\/([^\/\?]+)/);
        if (releaseIdMatch) track.release_id = releaseIdMatch[1];
      }

      if (!albumMeta || !albumHref) return;

      // Fetch album page
      const albumUrl = albumHref.startsWith('http') ? albumHref : `${this.baseUrl}${albumHref}`;
      const albumRes = await this.client.get(albumUrl);
      const albumHtml = await minifyHtml(albumRes.data as string);
      const $$ = cheerio.load(albumHtml);

      // catalog number and release date block: "cat | 2021-08-..."
      const catRdate = $$('div.cat-rdate').first().text().trim() || '';
      const rdSplit = catRdate
        .split(' | ')
        .map(s => s.trim())
        .filter(Boolean);
      if (rdSplit.length >= 1) {
        // often first part is catalog number
        track.catalog_number = rdSplit[0] || undefined;
      }

      // album artists
      const albumArtistsText = $$('h1.artists').first().text().trim() || '';
      if (albumArtistsText) {
        track.album_artists = albumArtistsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      // track number: element with class ptk-<track_id> inside album page
      if (track.track_id) {
        const sel = `div.trk-row.ptk-${track.track_id}`;
        const trackRow = $$(sel).first();
        if (trackRow && trackRow.length) {
          const tnumText = trackRow.find('div.tnum').first().text().trim();
          const parsed = parseInt(tnumText.replace(/\D/g, ''), 10);
          if (!Number.isNaN(parsed)) track.track_number = parsed;
        }
      }

      // track total: count trk-row.play-trk
      const total = $$('.trk-row.play-trk').length;
      if (total > 0) track.track_total = total;

      // album art
      const img = $$('div.t-image img').first();
      const src = img.attr('src');
      if (src) {
        track.art = src.startsWith('http') ? src : `${this.baseUrl}${src}`;
        // optionally prefetch art to bypass hotlink protections
        if (albumArt && track.art) {
          // fire and forget with concurrency limit
          limit(async () => {
            try {
              await this.client.get(track.art!, {
                headers: { Referer: this.baseUrl },
                responseType: 'arraybuffer',
              });
            } catch (err) {}
          });
        }
      }
    } catch (err) {}
  }

  // Simple match implementation: search + naive scoring. Replace with your real MatchingUtils if available.
  async matchTrack(info: AudioFileInfo): Promise<TraxSourceMatch[]> {
    try {
      const artist = (await info.artist()).trim();
      const title = (await info.title()).trim();
      const query = `${artist} ${title}`;
      const candidates = await this.searchTracks(query);

      // Simple scoring: token overlap on title + artist
      function scoreCandidate(t: TXTrack): number {
        const qtokens = `${artist} ${title}`.toLowerCase().split(/\s+/).filter(Boolean);
        const cand = `${t.artists.join(' ')} ${t.title}`.toLowerCase();
        let hits = 0;
        for (const tk of qtokens) {
          if (cand.includes(tk)) hits++;
        }
        // normalize to 0..100
        return Math.min(100, Math.round((hits / Math.max(1, qtokens.length)) * 100));
      }

      return candidates
        .map(t => ({ track: t, score: scoreCandidate(t) }) as TraxSourceMatch)
        .sort((a, b) => b.score - a.score);
    } catch (err) {
      return [];
    }
  }
}
