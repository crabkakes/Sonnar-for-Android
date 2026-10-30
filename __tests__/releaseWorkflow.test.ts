import { readFileSync } from 'fs';
import { join } from 'path';

// js-yaml ships with eslint/expo; it has no bundled types, so describe the one call used here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as { load(src: string): any };

const wf = yaml.load(readFileSync(join(__dirname, '..', '.github', 'workflows', 'release.yml'), 'utf8'));
const job = wf.jobs.android;
const steps = job.steps;
const indexOf = (pred: (s: any) => boolean) => steps.findIndex(pred);
const mentionsSecret = (o: unknown) => /RFS_|secrets\./.test(JSON.stringify(o ?? {}));

test('signing secrets are not exposed at workflow or job level', () => {
  expect(mentionsSecret(wf.env)).toBe(false);
  expect(mentionsSecret(job.env)).toBe(false);
});

test('only the Gradle step sees signing env, and it decodes the keystore itself', () => {
  const withSecrets = steps.filter((s: any) => mentionsSecret(s.env));
  expect(withSecrets).toHaveLength(1);
  const [build] = withSecrets;
  expect(build.run).toMatch(/gradlew/);
  expect(build.run).toMatch(/base64 -d > "\$RFS_KEYSTORE_PATH"/);
  expect(Object.keys(build.env).sort()).toEqual(
    ['RFS_KEYSTORE_BASE64', 'RFS_KEYSTORE_PATH', 'RFS_KEYSTORE_PASSWORD', 'RFS_KEY_ALIAS', 'RFS_KEY_PASSWORD'].sort(),
  );
});

test('lint runs in CI', () => {
  expect(indexOf((s) => s.run === 'npm run lint')).toBeGreaterThan(-1);
});

test('the AAB is uploaded before the GitHub release is created', () => {
  const upload = indexOf((s) => String(s.uses).startsWith('actions/upload-artifact'));
  const release = indexOf((s) => /gh release create/.test(s.run ?? ''));
  expect(upload).toBeGreaterThan(-1);
  expect(release).toBeGreaterThan(upload);
});
