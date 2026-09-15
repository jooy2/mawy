import { describe, expect, it } from 'vitest';
import { blankParagraphs, heldText, marksAt } from '../../src/internal/editing.js';
import type { MawyCommand } from '../../src/internal/commands.js';
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

describe('formatting a caret holds', () => {
  /** What typing `text` at `|` writes, with these commands held, in the same notation. */
  const typed = (marked: string, text: string, held: MawyCommand[]) => {
    const at = marked.indexOf('|');
    const edit = heldText(marked.replace('|', ''), at, text, held);

    return edit && `${edit.value.slice(0, edit.caret)}|${edit.value.slice(edit.caret)}`;
  };

  it('writes the markers around what is typed, with the caret inside them', () => {
    // `****` on a line of its own is a divider, which is why nothing is written
    // until there is something to write them around.
    expect(typed('|', 'a', ['bold'])).toBe('**a|**');
    expect(typed('One |', 'a', ['strikethrough'])).toBe('One ~~a|~~');
    expect(typed('One |', 'a', ['bold', 'code'])).toBe('One **`a|`**');
  });

  it('writes italic with an asterisk inside a word, where an underscore is not emphasis', () => {
    expect(typed('One |', 'a', ['italic'])).toBe('One _a|_');
    expect(typed('wo|rd', 'a', ['italic'])).toBe('wo*a|*rd');
  });

  it('turns formatting off at either edge of a run, and in the middle of one', () => {
    expect(typed('**bold|**', 'a', ['bold'])).toBe('**bold**a|');
    expect(typed('**|bold**', 'a', ['bold'])).toBe('a|**bold**');
    expect(typed('**bo|ld**', 'a', ['bold'])).toBe('**bo**a|**ld**');
  });

  it('holds nothing for a command that is not written around words', () => {
    expect(typed('|', 'a', ['bulletList'])).toBeNull();
    expect(typed('|', 'a', [])).toBeNull();
  });

  it('reads which formatting a place is inside, to its closing marker and not past it', () => {
    expect([...marksAt('A **bold _both_** word', 11)].sort()).toEqual(['bold', 'italic']);
    expect([...marksAt('A `code` word', 7)]).toEqual(['code']);
    expect([...marksAt('A `code` word', 8)]).toEqual([]);
  });
});
