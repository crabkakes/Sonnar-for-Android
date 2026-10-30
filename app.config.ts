import type { ConfigContext, ExpoConfig } from 'expo/config';

// Single source of the app identity. Changing it after the first store upload is not possible.
export const APP_ID = 'com.remoteforsonarr.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Remote for Sonarr',
  slug: 'remote-for-sonarr',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'remoteforsonarr',
  userInterfaceStyle: 'automatic',
  updates: { enabled: false },
  ios: {
    bundleIdentifier: APP_ID,
    // Must increase on every App Store Connect upload.
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // NSAllowsArbitraryLoads only: on iOS 10+ adding NSAllowsLocalNetworking makes iOS ignore
      // NSAllowsArbitraryLoads, which blocks plain HTTP to VPN/DNS hostnames (MagicDNS, nas.lan).
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      NSLocalNetworkUsageDescription:
        'Remote for Sonarr connects to your Sonarr server on your home network or VPN.',
    },
  },
  android: {
    package: APP_ID,
    // Must increase on every Play upload.
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    './plugins/withAndroidReleaseSigning',
    ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    [
      'expo-splash-screen',
      { backgroundColor: '#208AEF', image: './assets/images/splash-icon.png', imageWidth: 76 },
    ],
  ],
  experiments: { typedRoutes: true },
});
