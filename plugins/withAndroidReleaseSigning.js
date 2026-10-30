const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'RFS_KEYSTORE_PATH';

const RELEASE_CONFIG = `        release {
            if (System.getenv('RFS_KEYSTORE_PATH')) {
                storeFile file(System.getenv('RFS_KEYSTORE_PATH'))
                storePassword System.getenv('RFS_KEYSTORE_PASSWORD')
                keyAlias System.getenv('RFS_KEY_ALIAS')
                keyPassword System.getenv('RFS_KEY_PASSWORD')
            }
        }
`;

const RELEASE_SIGNING_LINE =
  "signingConfig System.getenv('RFS_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug";

/**
 * Adds a `release` signing config driven by RFS_* env vars and points the
 * release build type at it. Without the env vars it falls back to debug
 * signing so local builds keep working. Idempotent.
 */
function applyReleaseSigning(buildGradle) {
  if (buildGradle.includes(MARKER)) return buildGradle;

  // 1. Repoint buildTypes.release (first, so the new release signing config is not matched).
  const btStart = buildGradle.indexOf('buildTypes {');
  if (btStart === -1) throw new Error('withAndroidReleaseSigning: buildTypes block not found');
  const relStart = buildGradle.indexOf('release {', btStart);
  if (relStart === -1) throw new Error('withAndroidReleaseSigning: release build type not found');
  const before = buildGradle.slice(0, relStart);
  const after = buildGradle
    .slice(relStart)
    .replace(/signingConfig signingConfigs\.debug/, RELEASE_SIGNING_LINE);
  if (after.includes('signingConfig signingConfigs.debug') || !after.includes(RELEASE_SIGNING_LINE)) {
    throw new Error('withAndroidReleaseSigning: release signingConfig line not found');
  }
  let result = before + after;

  // 2. Add the release signing config at the end of the signingConfigs block.
  const scStart = result.indexOf('signingConfigs {');
  if (scStart === -1 || scStart > btStart) {
    throw new Error('withAndroidReleaseSigning: signingConfigs block not found');
  }
  const debugEnd = result.indexOf('\n        }\n', scStart);
  if (debugEnd === -1) throw new Error('withAndroidReleaseSigning: debug signing config not found');
  const insertAt = debugEnd + '\n        }\n'.length;
  result = result.slice(0, insertAt) + RELEASE_CONFIG + result.slice(insertAt);
  return result;
}

const withAndroidReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });

module.exports = withAndroidReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
