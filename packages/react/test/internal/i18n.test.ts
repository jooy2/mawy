import { describe, expect, it } from 'vitest';
import { fill, withStrings } from '../../src/internal/i18n.js';

/** The interface's words, with an application's own over them. */
describe('strings', () => {
  it('takes what the application gave and the locale for the rest', () => {
    const strings = withStrings('ko', { bold: 'Fett' });

    expect(strings.bold).toBe('Fett');
    expect(strings.italic).toBe('기울임');
    expect(strings.lang).toBe('ko');
  });

  it('fills every placeholder it names, once, and leaves the rest as written', () => {
    expect(fill('%N of %T, %N again', { N: '2', T: '5' })).toBe('2 of 5, 2 again');
    // What is put in is not read again.
    expect(fill('Saved as %N', { N: '%T.md' })).toBe('Saved as %T.md');
    expect(fill('%X stays', { N: '1' })).toBe('%X stays');
  });
});
