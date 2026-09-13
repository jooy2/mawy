import { describe, expect, it } from 'vitest';
import { dataImageBytes, isRelativeUrl } from '../../../src/internal/markdown/url.js';

/**
 * Which addresses a document writes that mean nothing on their own.
 *
 * `MawyUrlResolver` is offered exactly these, so the line drawn here is the
 * whole of what an application is asked about. Getting it wrong in either
 * direction is a bug a reader sees: too narrow and a picture beside the
 * document stays broken, too wide and a link to a heading in the same document
 * is sent somewhere else entirely.
 */
describe('telling a relative URL from one that says where it is', () => {
  it('answers yes to a path, with or without the shapes a path is written in', () => {
    for (const url of [
      'a.png',
      './a.png',
      '../up/a.png',
      '/docs/a.png',
      'guide.md#anchor',
      'guide.md?v=2',
      'folder/deep/one.md',
      'a file.png'
    ]) {
      expect(isRelativeUrl(url), url).toBe(true);
    }
  });

  it('answers no to anything that already says where it is', () => {
    for (const url of [
      'https://example.com/a.png',
      'http://example.com',
      'mailto:someone@example.com',
      'data:image/png;base64,AAAA',
      'tel:+1234',
      // Missing only its scheme, which the page supplies. Somewhere else, not
      // somewhere near the document.
      '//example.com/a.png'
    ]) {
      expect(isRelativeUrl(url), url).toBe(false);
    }
  });

  it('answers no to a place in this document, and to nothing at all', () => {
    // A `#` is the one relative-looking address that already means something.
    // Resolving it would take every link to a heading out of the document.
    for (const url of ['#section', '#', '', '   ']) {
      expect(isRelativeUrl(url), JSON.stringify(url)).toBe(false);
    }
  });

  it('is not fooled by a colon that comes after a path separator', () => {
    // `README.md#a:b` has a colon in it and no scheme: the colon is inside the
    // fragment, which `schemeOf` is written to notice.
    expect(isRelativeUrl('README.md#a:b')).toBe(true);
    expect(isRelativeUrl('a/b:c.png')).toBe(true);
  });
});

describe('the bytes a `data:` picture carries', () => {
  it('reads base64 and percent-encoded payloads', () => {
    expect([...(dataImageBytes('data:image/png;base64,AQID')?.bytes ?? [])]).toEqual([1, 2, 3]);
    expect(dataImageBytes('data:image/svg+xml,%3Csvg%3E')?.type).toBe('image/svg+xml');
  });

  it('has none for an address with no payload, or a payload it cannot read', () => {
    expect(dataImageBytes('data:image/svg+xml;utf8')).toBe(null);
    expect(dataImageBytes('data:image/png;base64,%%%')).toBe(null);
    expect(dataImageBytes('data:text/html,<b>x</b>')).toBe(null);
  });
});
