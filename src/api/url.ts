import { SonarrError } from './errors';

const HOST_RE = /^(\[[0-9a-f:.]+\]|[a-z0-9._-]+)(:\d{1,5})?$/;

/** Parses by hand so behavior is identical in React Native and node. */
export function normalizeBaseUrl(input: string): string {
  let s = input.trim();
  if (!s) throw new SonarrError('invalid-url');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `http://${s}`;

  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(s);
  if (!m) throw new SonarrError('invalid-url');
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if ((scheme !== 'http' && scheme !== 'https') || !HOST_RE.test(host)) {
    throw new SonarrError('invalid-url');
  }

  const path = m[3]
    .replace(/\/+$/, '')
    .replace(/\/api(\/v3)?$/i, '')
    .replace(/\/+$/, '');
  return `${scheme}://${host}${path}`;
}
