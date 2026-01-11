import axios, { AxiosInstance } from 'axios';
import { minify } from 'html-minifier-terser';
import pLimit from 'p-limit';
import { parseISO, isValid, format } from 'date-fns';

// Create configured axios instance with retries/timeouts
export function createHttpClient(): AxiosInstance {
  const client = axios.create({
    timeout: 10_000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:85.0) Gecko/20100101 Firefox/85.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  return client;
}

export async function minifyHtml(html: string): Promise<string> {
  try {
    return await minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      keepClosingSlash: true,
    });
  } catch (err) {
    return html;
  }
}

export function parseDurationToSeconds(s: string): number | null {
  // Accept formats: mm:ss or hh:mm:ss or m:ss
  if (!s) return null;
  const parts = s
    .trim()
    .split(':')
    .map(p => p.trim());
  if (parts.length === 2) {
    const [m, sec] = parts;
    const mm = parseInt(m.replace(/\D/g, ''), 10);
    const ss = parseInt(sec.replace(/\D/g, ''), 10);
    if (Number.isFinite(mm) && Number.isFinite(ss)) return mm * 60 + ss;
  } else if (parts.length === 3) {
    const [h, m, sec] = parts;
    const hh = parseInt(h.replace(/\D/g, ''), 10);
    const mm = parseInt(m.replace(/\D/g, ''), 10);
    const ss = parseInt(sec.replace(/\D/g, ''), 10);
    if (Number.isFinite(hh) && Number.isFinite(mm) && Number.isFinite(ss)) return hh * 3600 + mm * 60 + ss;
  }
  // fallback try to extract numbers
  const num = parseInt(s.replace(/\D/g, ''), 10);
  return Number.isFinite(num) ? num : null;
}

export function parseDateIso(dateStr: string): string | null {
  if (!dateStr) return null;
  // Attempt parsing common ISO-like formats
  try {
    // If already yyyy-mm-dd
    const maybe = parseISO(dateStr.trim());
    if (isValid(maybe)) return format(maybe, 'yyyy-MM-dd');
  } catch (_) {}
  // Try to extract yyyy-mm-dd with regex
  const m = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return null;
}

// concurrency helper
export const limit = pLimit(5);
