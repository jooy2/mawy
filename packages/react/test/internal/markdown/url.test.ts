import { describe, expect, it } from 'vitest';
import { imageUrls } from '../../../src/internal/markdown/images.js';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import {
  dataImageBytes,
  isRelativeUrl,
  writtenDestination
} from '../../../src/internal/markdown/url.js';

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

/**
 * An address the editor was handed, written into a document.
 *
 * What matters is what the parser reads back: an address that comes back as a
 * different one is a picture fetched from somewhere else or a link that goes
 * somewhere else, with nothing on the page to say so.
 */
describe('writing an address as a destination', () => {
  it('leaves an address with nothing in it to misread as it is', () => {
    expect(writtenDestination('https://example.com/a.png?b=1&c=2')).toBe(
      'https://example.com/a.png?b=1&c=2'
    );
  });

  it('puts one with a space, a parenthesis or an angle bracket inside angle brackets', () => {
    expect(writtenDestination('/a b.png')).toBe('</a b.png>');
    expect(writtenDestination('/wiki/A_(b')).toBe('</wiki/A_(b>');
    expect(writtenDestination('<a>.png')).toBe('<\\<a\\>.png>');
  });

  it('escapes a backslash, a line ending and a run that looks like a reference', () => {
    expect(writtenDestination('/a\\*b.png')).toBe('/a\\\\*b.png');
    expect(writtenDestination('/a\nb.png')).toBe('/a%0Ab.png');
    expect(writtenDestination('/a?b=1&amp;c=2')).toBe('/a?b=1&amp;amp;c=2');
  });

  it('is read back as the address it was', () => {
    for (const url of [
      'https://example.com/a.png?b=1&c=2',
      '/a b.png',
      '/wiki/A_(b',
      '/wiki/A_(b)',
      '<a>.png',
      '/a\\*b.png',
      '/a b\\<c.png',
      '/a?b=1&amp;c=2',
      '/a&copy;b&#65;c&nope;.png',
      '/a b&amp;c.png'
    ]) {
      expect(imageUrls(parseMarkdown(`![a](${writtenDestination(url)})`)), url).toEqual([url]);
    }
  });
});
