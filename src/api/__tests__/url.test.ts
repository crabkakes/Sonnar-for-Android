import { normalizeBaseUrl } from '../url';

test.each([
  ['192.168.1.50:8989', 'http://192.168.1.50:8989'],
  ['http://192.168.1.50:8989/', 'http://192.168.1.50:8989'],
  ['  HTTP://NAS.local:8989  ', 'http://nas.local:8989'],
  ['https://example.com/sonarr/', 'https://example.com/sonarr'],
  ['http://host:8989/sonarr/api/v3', 'http://host:8989/sonarr'],
  ['http://host:8989/api', 'http://host:8989'],
])('normalizes %s', (i, o) => expect(normalizeBaseUrl(i)).toBe(o));

test.each(['', 'ftp://x', 'http://', 'not a url'])('rejects %p', (i) =>
  expect(() => normalizeBaseUrl(i)).toThrow(expect.objectContaining({ kind: 'invalid-url' })),
);
