import config from '../app.config';
const c = config({ config: {} } as any) as any;
test('identity', () => {
  expect(c.name).toBe('Remote for Sonarr');
  expect(c.ios.bundleIdentifier).toBe('com.remoteforsonarr.app');
  expect(c.android.package).toBe('com.remoteforsonarr.app');
});
test('ios allows http to user hosts and explains local network', () => {
  // Exactly this: NSAllowsLocalNetworking alongside it makes iOS 10+ ignore NSAllowsArbitraryLoads.
  expect(c.ios.infoPlist.NSAppTransportSecurity).toEqual({ NSAllowsArbitraryLoads: true });
  expect(c.ios.infoPlist.NSLocalNetworkUsageDescription).toMatch(/Sonarr server on your home network or VPN/);
});
test('android allows cleartext via expo-build-properties', () => {
  const bp = c.plugins.find((p: any) => Array.isArray(p) && p[0] === 'expo-build-properties');
  expect(bp[1].android.usesCleartextTraffic).toBe(true);
});
test('no over-the-air updates', () => {
  expect(JSON.stringify(c.plugins)).not.toMatch(/expo-updates/);
  expect(c.updates?.enabled ?? false).toBe(false);
});
test('store build numbers are set', () => {
  expect(c.android.versionCode).toBe(1);
  expect(c.ios.buildNumber).toBe('1');
});
