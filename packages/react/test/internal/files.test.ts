import { describe, expect, it } from 'vitest';
import {
  MAWY_ACCEPT,
  MAWY_MAX_FILE_SIZE,
  acceptsFile,
  fileNameFor,
  readTextFile
} from '../../src/internal/files.js';

/**
 * Reading a document off the disk, and deciding what to call it going back.
 *
 * The name is the half worth testing closely. It is built from text somebody
 * wrote in a document and handed to a filesystem, and every platform has its
 * own list of characters that make a name it will not accept.
 */

const file = (text: string, name = 'a.md') => new File([text], name, { type: 'text/markdown' });

describe('reading a file', () => {
  it('gives back what was in it', async () => {
    expect(await readTextFile(file('# Title'))).toEqual({ text: '# Title' });
  });

  it('refuses one too large to be a document anybody meant to open', async () => {
    const huge = new File(['x'.repeat(8)], 'big.md');

    Object.defineProperty(huge, 'size', { value: MAWY_MAX_FILE_SIZE + 1 });

    expect(await readTextFile(huge)).toEqual({ failed: 'tooLarge' });
  });
});

describe('naming a saved document', () => {
  it('takes the first heading, which is what the document calls itself', () => {
    expect(fileNameFor('# Getting started\n\nWords.')).toBe('Getting started.md');
    expect(fileNameFor('Words first.\n\n## Second\n\nMore.')).toBe('Second.md');
  });

  it('takes the closing hashes off, the way the parser does', () => {
    expect(fileNameFor('## Title ##')).toBe('Title.md');
  });

  it('drops the characters a filesystem will not have', () => {
    expect(fileNameFor('# a/b:c*d?e"f<g>h|i')).toBe('abcdefghi.md');
  });

  it('falls back to a name rather than to none', () => {
    // An empty name is a browser refusing to save at all.
    expect(fileNameFor('Just words, no heading.')).toBe('document.md');
    expect(fileNameFor('# ///')).toBe('document.md');
    expect(fileNameFor('')).toBe('document.md');
  });

  it('does not end in a space or a dot, which Windows refuses', () => {
    expect(fileNameFor('# Ready...')).toBe('Ready.md');
  });
});

describe('what a drop is allowed to be', () => {
  const file = (name: string, type = '') => new File(['x'], name, { type });

  it('takes what the picker offers', () => {
    expect(acceptsFile(file('notes.md'), MAWY_ACCEPT)).toBe(true);
    expect(acceptsFile(file('NOTES.MARKDOWN'), MAWY_ACCEPT)).toBe(true);
    expect(acceptsFile(file('notes.txt', 'text/plain'), MAWY_ACCEPT)).toBe(true);
  });

  it('takes anything the platform called text', () => {
    // The list is extensions and two media types; a platform that says `text/`
    // about something else has said enough.
    expect(acceptsFile(file('notes.rst', 'text/x-rst'), MAWY_ACCEPT)).toBe(true);
  });

  it('takes a file the platform said nothing about', () => {
    // A `README` with no extension and no type is a document often enough that
    // refusing it would be the more annoying mistake.
    expect(acceptsFile(file('README'), MAWY_ACCEPT)).toBe(true);
  });

  it('refuses what plainly says it is something else', () => {
    expect(acceptsFile(file('shot.png', 'image/png'), MAWY_ACCEPT)).toBe(false);
    expect(acceptsFile(file('archive.zip', 'application/zip'), MAWY_ACCEPT)).toBe(false);
    // Even where the platform said nothing: the extension did.
    expect(acceptsFile(file('archive.zip'), MAWY_ACCEPT)).toBe(false);
  });

  it('reads the list it is given rather than the default one', () => {
    expect(acceptsFile(file('notes.md'), '.mdx')).toBe(false);
    expect(acceptsFile(file('notes.mdx'), '.mdx')).toBe(true);
  });
});
