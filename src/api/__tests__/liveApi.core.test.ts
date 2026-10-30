import { SonarrError, userMessage } from '../errors';
import { createLiveApi } from '../liveApi';

const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;
const html = () =>
  ({ ok: true, status: 200, text: async () => '<html></html>' }) as unknown as Response;
const mk = (impl: jest.Mock, baseUrl = 'http://h:8989', apiKey = 'k') =>
  createLiveApi({ baseUrl, apiKey }, impl as unknown as typeof fetch);

test('sends X-Api-Key header, trimmed key, to /api/v3/system/status', async () => {
  const f = jest.fn().mockResolvedValue(json({ appName: 'Sonarr', version: '4.0.9.2244' }));
  await mk(f, 'http://h:8989', ' abc ').testConnection();
  const [url, init] = f.mock.calls[0];
  expect(url).toBe('http://h:8989/api/v3/system/status');
  expect(url.toLowerCase()).not.toContain('apikey');
  expect(init.headers['X-Api-Key']).toBe('abc');
});

test.each(['3.0.10.1567', '4.0.9.2244'])('returns status for Sonarr %s', async (version) => {
  const f = jest.fn().mockResolvedValue(json({ appName: 'Sonarr', version }));
  await expect(mk(f).testConnection()).resolves.toEqual({ appName: 'Sonarr', version });
});

test.each(['5.0.0.1', '2.0.0.1'])('unsupported-version for %s', async (version) => {
  const f = jest.fn().mockResolvedValue(json({ appName: 'Sonarr', version }));
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'unsupported-version' });
});

test('not-sonarr when appName differs', async () => {
  const f = jest.fn().mockResolvedValue(json({ appName: 'Radarr', version: '5.0.0' }));
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'not-sonarr' });
});

test('not-sonarr when body is HTML', async () => {
  const f = jest.fn().mockResolvedValue(html());
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'not-sonarr' });
});

test('not-sonarr on 404', async () => {
  const f = jest.fn().mockResolvedValue(json({}, 404));
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'not-sonarr' });
});

test.each([401, 403])('unauthorized on %i', async (status) => {
  const f = jest.fn().mockResolvedValue(json({}, status));
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'unauthorized' });
});

test('unreachable when fetch rejects, with https flag', async () => {
  const f = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await expect(mk(f, 'https://h').testConnection()).rejects.toMatchObject({
    kind: 'unreachable',
    https: true,
  });
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'unreachable', https: false });
});

test('timeout after timeoutMs', async () => {
  jest.useFakeTimers();
  try {
    const f = jest.fn(() => new Promise<Response>(() => {}));
    const p = mk(f as unknown as jest.Mock).testConnection();
    const assertion = expect(p).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(15000);
    await assertion;
  } finally {
    jest.useRealTimers();
  }
});

test('http with status for 500', async () => {
  const f = jest.fn().mockResolvedValue(json({}, 500));
  await expect(mk(f).testConnection()).rejects.toMatchObject({ kind: 'http', status: 500 });
});

test('userMessage copy', () => {
  expect(userMessage(new SonarrError('unreachable'))).toEqual({
    title: "Can't reach Sonarr",
    detail: 'Check the address and port, and make sure your phone is on your home network or VPN.',
  });
  expect(userMessage(new SonarrError('unreachable', { https: true })).detail).toMatch(
    /self-signed certificates aren't supported/,
  );
  expect(userMessage(new SonarrError('http', { status: 500 }))).toEqual({
    title: 'Sonarr returned an error',
    detail: 'HTTP 500',
  });
});
