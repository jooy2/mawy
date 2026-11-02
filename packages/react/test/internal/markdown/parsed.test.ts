import { describe, expect, it } from 'vitest';
import { documentOf } from '../../../src/internal/markdown/parsed.js';

/**
 * The last few readings, kept.
 *
 * `cost.test.tsx` shows what this is for. This is what it promises: a kept tree
 * is never one that a different text or a different reading would have made.
 */
describe('the last readings of a document', () => {
  it('gives the same tree back for the same text', () => {
    expect(documentOf('# Kept')).toBe(documentOf('# Kept'));
  });

  it('does not give it back for a different text', () => {
    expect(documentOf('# One')).not.toBe(documentOf('# Two'));
  });

  it('tells two readings of one text apart', () => {
    const text = 'a\nb';

    expect(documentOf(text)).not.toBe(documentOf(text, { breaks: true }));
    expect(documentOf(text).root).not.toEqual(documentOf(text, { breaks: true }).root);
  });

  it('takes an option spelled out to be the one left out', () => {
    expect(documentOf('# Same')).toBe(documentOf('# Same', { gfm: true, breaks: false }));
  });

  it('forgets what has not been asked for lately', () => {
    const oldest = documentOf('# Oldest');

    for (const text of ['1', '2', '3', '4']) {
      documentOf(text);
    }

    expect(documentOf('# Oldest')).not.toBe(oldest);
  });

  it('keeps what is still being asked for', () => {
    const kept = documentOf('# Kept going');

    for (const text of ['5', '6', '7', '8']) {
      documentOf(text);
      documentOf('# Kept going');
    }

    expect(documentOf('# Kept going')).toBe(kept);
  });
});
