import { describe, expect, it } from 'vitest';
import { lineAt, lineStarts, previewScrollFor } from '../../src/internal/scroll.js';

/**
 * The arithmetic behind the two panes of `split`.
 *
 * Reading the panes is in the editor's own file, because it needs two laid-out
 * boxes to read. What is here is what can be wrong without a browser: which
 * line an offset is on, and where a position between two anchors lands.
 */

describe('lines', () => {
  it('knows where each one starts', () => {
    expect(lineStarts('a\nbb\n\nc')).toEqual([0, 2, 5, 6]);
    expect(lineStarts('')).toEqual([0]);
    expect(lineStarts('a\n')).toEqual([0, 2]);
  });

  it('finds the line an offset is on, including the newline that ends it', () => {
    const starts = lineStarts('a\nbb\n\nc');

    expect([0, 1, 2, 3, 4, 5, 6].map((at) => lineAt(starts, at))).toEqual([0, 0, 1, 1, 1, 2, 3]);
  });

  it('holds an offset past the end on the last line', () => {
    expect(lineAt(lineStarts('a\nb'), 99)).toBe(1);
  });
});

describe('the preview position for a source position', () => {
  const anchors = [
    { from: 0, to: 0 },
    { from: 100, to: 400 },
    { from: 200, to: 500 },
    { from: 300, to: 900 }
  ];

  it('lands exactly on an anchor', () => {
    expect(previewScrollFor(anchors, 100)).toBe(400);
    expect(previewScrollFor(anchors, 200)).toBe(500);
  });

  it('runs straight between two of them', () => {
    // Half way through a stretch of source that is a quarter of the preview.
    expect(previewScrollFor(anchors, 150)).toBe(450);
    expect(previewScrollFor(anchors, 250)).toBe(700);
  });

  it('stays on the last one past the end', () => {
    expect(previewScrollFor(anchors, 4000)).toBe(900);
  });

  it('says zero for a document with nothing but its ends', () => {
    expect(previewScrollFor([{ from: 0, to: 0 }], 40)).toBe(0);
  });
});
