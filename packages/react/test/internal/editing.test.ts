import { describe, expect, it } from 'vitest';
import {
  blankParagraphs,
  fenceKept,
  heldText,
  marksAt,
  wrapRange
} from '../../src/internal/editing.js';
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

/**
 * The range a wrap command is run over on the drawn document.
 *
 * `«words»` is the selection, as everywhere else, and the answer is the same
 * document with the range the command would be given marked the same way.
 */
describe('a wrap over a selection made on the drawn document', () => {
  const over = (marked: string): string => {
    const start = marked.indexOf('«');
    const end = marked.indexOf('»') - 1;
    const value = marked.replace('«', '').replace('»', '');
    const range = wrapRange(value, start, end);

    return `${value.slice(0, range.start)}«${value.slice(range.start, range.end)}»${value.slice(range.end)}`;
  };

  it('widens out of a link the selection would cut in half', () => {
    // The drawn document shows `link` and writes `[link](…)`, so a selection
    // from its words to the words after it starts between the brackets.
    expect(over('one [«link](https://example.org) two»')).toBe(
      'one «[link](https://example.org) two»'
    );
    expect(over('«one [link](https://exa»mple.org) two')).toBe(
      '«one [link](https://example.org)» two'
    );
  });

  it('widens out of a code span, a bold run and the rest of the marked inlines', () => {
    expect(over('one `c«ode` two»')).toBe('one «`code` two»');
    expect(over('**o«ne** two»')).toBe('«**one** two»');
    expect(over('~~o«ne~~ two»')).toBe('«~~one~~ two»');
    expect(over('a ![p«ic](u) b»')).toBe('a «![pic](u) b»');
  });

  it('widens out of every inline the selection is still inside, not only the innermost', () => {
    expect(over('*a [l«ink](u)* b»')).toBe('«*a [link](u)* b»');
  });

  it('leaves a selection that is inside one inline where it is', () => {
    // `[**link**](url)` is a bold word among a link's words, which is what was
    // asked for.
    expect(over('one [«li»nk](https://example.org) two')).toBe(
      'one [«li»nk](https://example.org) two'
    );
    expect(over('a **b«ol»d** c')).toBe('a **b«ol»d** c');
  });

  it('leaves a selection with nothing in it, and one that cuts through nothing', () => {
    expect(over('one «two» three')).toBe('one «two» three');
    expect(over('one [link](u) «two»')).toBe('one [link](u) «two»');
  });
});

/**
 * A fence put inside a code block, which closes it unless the block's own
 * fences grow. See `fenceKept`.
 */
describe('a code block a fence went into', () => {
  /** What an edit inside the block at `at` comes out as, written `value|caret`. */
  const kept = (was: string, at: number, value: string, caret: number) => {
    const out = fenceKept(was, at, { value, caret });

    return `${out.value}|${out.caret}`;
  };

  it('grows both fences past the longest run inside the block', () => {
    expect(kept('```\ncode\n```', 8, '```\ncode\n```\n```', 12)).toBe('````\ncode\n```\n````|13');
    // Four inside wants five around it, and the caret moves by as much as the
    // opening fence grew.
    expect(kept('```\nc\n```', 5, '```\nc\n````\n```', 10)).toBe('`````\nc\n````\n`````|12');
  });

  it('leaves a run too short to close the block it is in', () => {
    expect(kept('````\ncode\n````', 9, '````\ncode\n```\n````', 13)).toBe(
      '````\ncode\n```\n````|13'
    );
    // And a tilde run in a block backticks fenced, which closes nothing.
    expect(kept('```\ncode\n```', 8, '```\ncode\n~~~\n```', 13)).toBe('```\ncode\n~~~\n```|13');
  });

  it('leaves an edit that is not inside a code block at all', () => {
    expect(kept('One.', 4, 'One.```', 7)).toBe('One.```|7');
    expect(kept('```\ncode\n```', 8, 'x', 1)).toBe('x|1');
  });
});
