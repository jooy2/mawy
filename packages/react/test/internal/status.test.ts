import { describe, expect, it } from 'vitest';
import {
  caretAt,
  countBytes,
  countCharacters,
  countLines,
  countWords
} from '../../src/internal/status.js';

/**
 * What the editor counts along its bottom edge.
 *
 * The counts themselves are diffed against `lib/src/editor/status.dart` by the
 * parity check, so what is here is the handful of answers worth writing down in
 * words: the ones where "a character" means two different things depending on
 * who is asking.
 */

describe('counting', () => {
  it('counts a word in a language that spaces them and one that does not', () => {
    expect(countWords('one two three')).toBe(3);
    // Every dense character is a word, or a page of Chinese is one word.
    expect(countWords('안녕하세요 반갑습니다')).toBe(2);
    expect(countWords('日本語')).toBe(3);
    expect(countWords('日本語 and English')).toBe(5);
  });

  it('counts an emoji as the one character a reader sees', () => {
    expect(countCharacters('a🙂b')).toBe(3);
    expect('a🙂b'.length).toBe(4);
  });

  it('counts bytes as they would be on disk', () => {
    expect(countBytes('abc')).toBe(3);
    expect(countBytes('가')).toBe(3);
  });

  it('counts a document that ends in a newline as the lines it has', () => {
    expect(countLines('a\nb')).toBe(2);
    expect(countLines('a\nb\n')).toBe(3);
  });
});

describe('where the caret is', () => {
  it('counts from one, down and across', () => {
    expect(caretAt('one\ntwo', 5, 5)).toEqual({ line: 2, column: 2, selected: 0 });
    expect(caretAt('one\ntwo', 0, 0)).toEqual({ line: 1, column: 1, selected: 0 });
  });

  it('says the column in the same characters as the count beside it', () => {
    // Both are code points. An emoji is one character to a reader, and a column
    // that jumped by two while "1 selected" said one would be one of the two
    // numbers lying.
    expect(caretAt('🙂', 2, 2)).toEqual({ line: 1, column: 2, selected: 0 });
    expect(caretAt('🙂a', 2, 3)).toEqual({ line: 1, column: 2, selected: 1 });
  });
});
