export type SonarrErrorKind =
  | 'invalid-url'
  | 'unreachable'
  | 'timeout'
  | 'unauthorized'
  | 'not-sonarr'
  | 'unsupported-version'
  | 'http';

export class SonarrError extends Error {
  kind: SonarrErrorKind;
  status?: number;
  https?: boolean;

  constructor(kind: SonarrErrorKind, opts: { status?: number; https?: boolean } = {}) {
    super(kind);
    this.name = 'SonarrError';
    this.kind = kind;
    this.status = opts.status;
    this.https = opts.https;
    Object.setPrototypeOf(this, SonarrError.prototype);
  }
}

const REACH_DETAIL =
  'Check the address and port, and make sure your phone is on your home network or VPN.';
const REACH_DETAIL_HTTPS =
  "Check the address and that you're on your home network or VPN. If your server uses HTTPS, self-signed certificates aren't supported.";

export function userMessage(e: unknown): { title: string; detail: string } {
  if (!(e instanceof SonarrError)) {
    return { title: 'Something went wrong', detail: 'Please try again.' };
  }
  const reach = e.https ? REACH_DETAIL_HTTPS : REACH_DETAIL;
  switch (e.kind) {
    case 'invalid-url':
      return {
        title: "That address doesn't look right",
        detail: 'Use something like http://192.168.1.50:8989',
      };
    case 'unreachable':
      return { title: "Can't reach Sonarr", detail: reach };
    case 'timeout':
      return { title: 'Sonarr took too long to answer', detail: reach };
    case 'unauthorized':
      return {
        title: 'API key was rejected',
        detail: 'Copy it from Sonarr → Settings → General → Security.',
      };
    case 'not-sonarr':
      return {
        title: "That isn't a Sonarr server",
        detail: 'Check the port and any URL base (like /sonarr).',
      };
    case 'unsupported-version':
      return {
        title: 'Unsupported Sonarr version',
        detail: 'This app supports Sonarr v3 and v4.',
      };
    case 'http':
      return { title: 'Sonarr returned an error', detail: `HTTP ${e.status}` };
  }
}
