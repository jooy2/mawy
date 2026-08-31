import { describe, expect, it } from 'vitest';
import { findMatches, matchFrom, replaceAll, replaceMatch } from '../../src/internal/search.js';

/**
 * Finding and replacing, as arithmetic on a string.
 *
 * The awkward halves of this are the ones nobody writes a test for once it has
 * to be done through a mounted editor: what "replace all" does when the
 * replacement contains the thing being replaced, and where "next" goes from a
 * caret sitting in the middle of a match.
 */

const found = (value: string, query: string, matchCase = false) =>
  findMatches(value, query, matchCase).map((match) => [match.start, match.end]);

describe('finding', () => {
  it('finds every one, in the order they appear', () => {
    expect(found('a b a b a', 'a')).toEqual([
      [0, 1],
      [4, 5],
      [8, 9]
    ]);
  });

  it('ignores case unless it is asked not to', () => {
    expect(found('One one ONE', 'one')).toHaveLength(3);
    expect(found('One one ONE', 'one', true)).toEqual([[4, 7]]);
  });

  it('never overlaps, so `aa` in `aaaa` is two rather than three', () => {
    expect(found('aaaa', 'aa')).toEqual([
      [0, 2],
      [2, 4]
    ]);
  });

  it('finds nothing at all for an empty query', () => {
    expect(found('anything', '')).toEqual([]);
  });

  it('takes the query as the characters it is, never as a pattern', () => {
    // A Markdown document is full of these, and a find box that compiled them
    // would be one a writer cannot trust.
    expect(found('a.b and axb', 'a.b')).toEqual([[0, 3]]);
    expect(found('one (two)', '(two)')).toEqual([[4, 9]]);
    expect(found('**bold**', '**')).toEqual([
      [0, 2],
      [6, 8]
    ]);
  });
});

describe('going to the next one', () => {
  const matches = findMatches('a b a b a', 'a', false);

  it('finds the one at the caret going forwards, and the one before it going back', () => {
    expect(matchFrom(matches, 0, true)).toBe(0);
    expect(matchFrom(matches, 1, true)).toBe(1);
    expect(matchFrom(matches, 8, false)).toBe(1);
  });

  it('wraps at both ends, so a search never has to be scrolled back to finish', () => {
    expect(matchFrom(matches, 9, true)).toBe(0);
    expect(matchFrom(matches, 0, false)).toBe(2);
  });

  it('says there is nowhere to go when there is nothing to go to', () => {
    expect(matchFrom([], 0, true)).toBe(-1);
  });
});

describe('replacing', () => {
  it('puts one in, and says where the caret ends up', () => {
    expect(replaceMatch('one two', { start: 4, end: 7 }, 'three')).toEqual({
      value: 'one three',
      caret: 9
    });
  });

  it('replaces all of them against the document as it was', () => {
    // A match at a time would find its own replacement and replace that too,
    // for ever.
    expect(replaceAll('a a a', 'a', 'aa', false)).toEqual({ value: 'aa aa aa', count: 3 });
  });

  it('leaves the document alone when there is nothing to replace', () => {
    expect(replaceAll('one', 'two', 'three', false)).toEqual({ value: 'one', count: 0 });
  });

  it('replaces with nothing, which is how a thing is deleted everywhere', () => {
    expect(replaceAll('a-b-c', '-', '', false)).toEqual({ value: 'abc', count: 2 });
  });
});
