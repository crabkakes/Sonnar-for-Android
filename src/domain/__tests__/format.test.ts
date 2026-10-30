import { episodeCode } from '../format';

test('episodeCode is S01E02 everywhere, padded to two digits, wider numbers kept', () => {
  expect(episodeCode({ seasonNumber: 1, episodeNumber: 2 })).toBe('S01E02');
  expect(episodeCode({ seasonNumber: 0, episodeNumber: 1 })).toBe('S00E01');
  expect(episodeCode({ seasonNumber: 12, episodeNumber: 105 })).toBe('S12E105');
});
