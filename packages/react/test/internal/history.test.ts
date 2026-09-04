import { describe, expect, it } from 'vitest';
import {
  difference,
  emptyHistory,
  record,
  redo,
  undo,
  type MawyStep
} from '../../src/internal/history.js';

/**
 * Undo, as arithmetic.
 *
 * What makes an undo history good or unusable is entirely in what it decides is
 * one step, so that is what this file is about. None of it needs a browser: a
 * step is a document and a caret, and the question is only ever which changes
 * belong to the same one.
 */

const at = (value: string, caret = value.length): MawyStep => ({
  value,
  start: caret,
  end: caret
});

describe('the smallest run that differs', () => {
  it('finds what was put in, what was taken out, and what was swapped', () => {
    expect(difference('abc', 'abXc')).toEqual({ at: 2, removed: 0, inserted: 'X' });
    expect(difference('abc', 'ac')).toEqual({ at: 1, removed: 1, inserted: '' });
    expect(difference('abc', 'aXc')).toEqual({ at: 1, removed: 1, inserted: 'X' });
    expect(difference('abc', 'abc')).toEqual({ at: 3, removed: 0, inserted: '' });
  });
});

describe('what counts as one step', () => {
  it('joins characters typed one after another', () => {
    const history = emptyHistory();

    record(history, at('a'), 'ab', 1000);
    record(history, at('ab'), 'abc', 1100);
    record(history, at('abc'), 'abcd', 1200);

    expect(history.past).toHaveLength(1);
    expect(history.past[0].value).toBe('a');
  });

  it('breaks the run when the typing stopped for long enough', () => {
    const history = emptyHistory();

    record(history, at('a'), 'ab', 1000);
    record(history, at('ab'), 'abc', 3000);

    expect(history.past.map((step) => step.value)).toEqual(['a', 'ab']);
  });

  it('breaks the run at a line ending', () => {
    const history = emptyHistory();

    record(history, at('a'), 'ab', 1000);
    record(history, at('ab'), 'ab\n', 1050);
    record(history, at('ab\n'), 'ab\nc', 1100);

    expect(history.past.map((step) => step.value)).toEqual(['a', 'ab', 'ab\n']);
  });

  it('breaks the run when the caret went somewhere else', () => {
    const history = emptyHistory();

    record(history, at('abc'), 'abcd', 1000);
    // Typed at the front instead, which is a different thought.
    record(history, at('abcd', 0), 'Xabcd', 1050);

    expect(history.past.map((step) => step.value)).toEqual(['abc', 'abcd']);
  });

  it('keeps deleting apart from typing, and joins deletes to each other', () => {
    const history = emptyHistory();

    record(history, at('abc'), 'abcd', 1000);
    record(history, at('abcd'), 'abc', 1050);
    record(history, at('abc'), 'ab', 1100);

    expect(history.past.map((step) => step.value)).toEqual(['abc', 'abcd']);
  });

  it('takes a syllable being composed as more of the same typing', () => {
    const history = emptyHistory();

    // What a Korean keyboard does: each keystroke rewrites the syllable it is
    // building rather than adding to it.
    record(history, at('ab'), 'abㅎ', 1000);
    record(history, at('abㅎ'), 'ab하', 1050);
    record(history, at('ab하'), 'ab한', 1100);
    record(history, at('ab한'), 'ab한ㄱ', 1150);
    record(history, at('ab한ㄱ'), 'ab한그', 1200);
    record(history, at('ab한그'), 'ab한글', 1250);

    expect(history.past.map((step) => step.value)).toEqual(['ab']);
  });
});

describe('going back, and forward again', () => {
  it('gives the document back and then takes it away again', () => {
    const history = emptyHistory();

    record(history, at('a'), 'ab', 1000);
    record(history, at('ab'), 'ab\nc', 3000);

    expect(undo(history, at('ab\nc'))?.value).toBe('ab');
    expect(undo(history, at('ab'))?.value).toBe('a');
    expect(undo(history, at('a'))).toBeNull();

    expect(redo(history, at('a'))?.value).toBe('ab');
    expect(redo(history, at('ab'))?.value).toBe('ab\nc');
    expect(redo(history, at('ab\nc'))).toBeNull();
  });

  it('puts the caret back where it was, not where it ended up', () => {
    const history = emptyHistory();

    record(history, { value: 'one two', start: 3, end: 3 }, 'one X two', 1000);

    expect(undo(history, at('one X two'))).toMatchObject({ start: 3, end: 3 });
  });

  it('forgets the way forward once something new is typed', () => {
    const history = emptyHistory();

    record(history, at('a'), 'ab', 1000);
    undo(history, at('ab'));

    expect(history.future).toHaveLength(1);

    record(history, at('a'), 'aZ', 5000);

    expect(history.future).toHaveLength(0);
  });

  it('says nothing happened when nothing did', () => {
    const history = emptyHistory();

    record(history, at('a'), 'a', 1000);

    expect(history.past).toHaveLength(0);
  });
});

/**
 * What the history is allowed to hold on to.
 *
 * Each step is the whole document, so a depth is a count of steps and not a
 * size — five hundred of them is a hundred megabytes for a hundred-kilobyte
 * file and five gigabytes for a five-megabyte one. The second ceiling is in
 * characters, and these are the two ends of what it has to do: hold the far end
 * down, and never hold it down to nothing.
 */
describe('what it keeps', () => {
  /** Distinct documents of the same size, none of them joining the last. */
  const huge = (count: number, each: number) =>
    Array.from({ length: count }, (_, index) => String(index) + 'a'.repeat(each));

  /** Each one recorded a second after the last, so no two of them join. */
  const recordAll = (history: ReturnType<typeof emptyHistory>, documents: string[]) => {
    documents.forEach((value, index) => {
      record(history, { value, start: 0, end: 0 }, documents[index + 1] ?? 'end', index * 1000);
    });
  };

  it('drops the far end once the documents stop fitting', () => {
    const history = emptyHistory();
    const documents = huge(12, 2_000_000);

    recordAll(history, documents);

    const held = history.past.reduce((sum, step) => sum + step.value.length, 0);

    expect(history.past.length).toBeLessThan(documents.length);
    expect(held).toBeLessThanOrEqual(8_000_000);
    // What went is the far end, so the change just made is still the one undo
    // arrives at first.
    expect(history.past[history.past.length - 1].value).toBe(documents[documents.length - 1]);
  });

  it('keeps one step of a document too large to keep two', () => {
    const history = emptyHistory();
    const documents = huge(3, 9_000_000);

    recordAll(history, documents);

    expect(history.past.length).toBe(1);
    expect(undo(history, { value: 'end', start: 0, end: 0 })?.value).toBe(documents[2]);
  });

  it('stops at five hundred steps of a document small enough for more', () => {
    const history = emptyHistory();

    recordAll(
      history,
      Array.from({ length: 600 }, (_, index) => `step ${index}`)
    );

    expect(history.past.length).toBe(500);
    expect(history.past[0].value).toBe('step 100');
  });
});
