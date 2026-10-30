const fs = require('fs');
const path = require('path');
const { applyReleaseSigning } = require('../withAndroidReleaseSigning');

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'build.gradle'), 'utf8');

describe('applyReleaseSigning', () => {
  const out = applyReleaseSigning(fixture);

  it('adds a release signingConfig reading the four env vars', () => {
    const block = out.match(/signingConfigs\s*\{[\s\S]*?\n    \}\n    buildTypes/)[0];
    expect(block).toMatch(/release\s*\{/);
    for (const name of [
      'RFS_KEYSTORE_PATH',
      'RFS_KEYSTORE_PASSWORD',
      'RFS_KEY_ALIAS',
      'RFS_KEY_PASSWORD',
    ]) {
      expect(block).toContain(`System.getenv('${name}')`);
    }
    expect(block).toContain('debug {');
  });

  it('points buildTypes.release at the release config, falling back to debug', () => {
    const buildTypes = out.slice(out.indexOf('buildTypes {'));
    const release = buildTypes.slice(buildTypes.indexOf('release {'));
    expect(release).toMatch(/signingConfig .*signingConfigs\.release/);
    expect(release).toMatch(/signingConfigs\.debug/);
    // the debug build type is untouched
    expect(buildTypes.slice(0, buildTypes.indexOf('release {'))).toContain(
      'signingConfig signingConfigs.debug'
    );
  });

  it('is idempotent', () => {
    expect(applyReleaseSigning(out)).toBe(out);
  });

  it('throws when the gradle file has no signingConfigs block', () => {
    expect(() => applyReleaseSigning('android { }')).toThrow();
  });
});
