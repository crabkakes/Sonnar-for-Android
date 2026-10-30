import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as { load(src: string): any };

const file = join(__dirname, '..', '.github', 'workflows', 'test-apk.yml');
const text = readFileSync(file, 'utf8');
const wf = yaml.load(text);
const steps: any[] = Object.values<any>(wf.jobs).flatMap((j) => j.steps);

test('runs on manual dispatch and on pull requests', () => {
  expect(Object.keys(wf.on)).toEqual(expect.arrayContaining(['workflow_dispatch', 'pull_request']));
});

test('permissions are read-only contents', () => {
  expect(wf.permissions).toEqual({ contents: 'read' });
});

test('uses no secrets and no signing env, so the build is debug-signed', () => {
  expect(text).not.toMatch(/secrets\./);
  expect(text).not.toMatch(/RFS_/);
});

test('builds the release variant', () => {
  expect(steps.some((s) => /assembleRelease/.test(s.run ?? ''))).toBe(true);
});

test('uploads the APK and fails if it is missing', () => {
  const upload = steps.find((s) => String(s.uses).startsWith('actions/upload-artifact'));
  expect(upload.with.path).toMatch(/app-release\.apk$/);
  expect(upload.with['if-no-files-found']).toBe('error');
});
