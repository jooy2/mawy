import { describe, expect, it } from 'vitest';
import { blankParagraphs } from '../../src/internal/editing.js';
import { parseMarkdown } from '../../src/internal/markdown/parse.js';

/**
 * Which blank lines the drawn document draws as empty paragraphs.
 *
 * `|` marks each place a paragraph is drawn, in the notation the commands and
 * the rules are written in, so a case reads as the document and the answer at
 * once.
 */
function drawn(source: string): string {
  const at = blankParagraphs(source, parseMarkdown(source).root.children);
  let out = source;

  for (const offset of [...at].reverse()) {
    out = `${out.slice(0, offset)}|${out.slice(offset)}`;
  }

  return out;
}

describe('the blank lines of a document', () => {
  it('draws nothing for the blank line two blocks need between them', () => {
    expect(drawn('One\n\nTwo')).toBe('One\n\nTwo');
    // Nor for a second one left by hand, which is a separator written twice.
    expect(drawn('One\n\n\nTwo')).toBe('One\n\n\nTwo');
    expect(drawn('One\n')).toBe('One\n');
  });

  it('draws every second blank line past the separator, which is what Enter writes', () => {
    expect(drawn('One\n\n\n\nTwo')).toBe('One\n\n|\n\nTwo');
    expect(drawn('One\n\n\n\n\n\nTwo')).toBe('One\n\n|\n\n|\n\nTwo');
  });

  it('counts the first blank line at either end, where there is nothing to separate', () => {
    expect(drawn('One\n\n')).toBe('One\n\n|');
    expect(drawn('One\n\n\n\n')).toBe('One\n\n|\n\n|');
    expect(drawn('\n\nOne')).toBe('|\n\nOne');
  });

  it('draws a document that is nothing but blank lines as a paragraph on every other one', () => {
    expect(drawn('')).toBe('|');
    expect(drawn('\n\n')).toBe('|\n\n|');
  });

  it('leaves the blank lines inside a block to the block', () => {
    expect(drawn('```\n\n\n\n```')).toBe('```\n\n\n\n```');
    expect(drawn('- one\n\n\n\n- two')).toBe('- one\n\n\n\n- two');
  });

  it('counts a line only blank lines are either side of, whatever else is between', () => {
    // A link definition draws nothing and is not a blank line either.
    expect(drawn('One\n\n\n\n[a]: /b\n\n\n\nTwo')).toBe('One\n\n|\n\n[a]: /b\n\n|\n\nTwo');
  });
});
