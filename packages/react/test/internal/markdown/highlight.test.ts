import { describe, expect, it } from 'vitest';
import {
  highlightMarkdown,
  type MdHighlightedLine
} from '../../../src/internal/markdown/highlight.js';

/**
 * The highlighter, which is not the parser and is allowed to be approximate.
 *
 * What it is not allowed to be is *misaligned*: the editor lays what this
 * produces underneath a textarea, and a token that runs past the end of its
 * line, or two that overlap, is a coloured run in the wrong place. So the
 * invariants are checked on every case rather than only the interesting ones.
 */

/** The kinds found on a line, in order — which is what a colour is chosen by. */
function kinds(line: MdHighlightedLine): string[] {
  return line.tokens.map((token) => token.kind);
}

/** The text each token actually covers, which is the thing that gets coloured. */
function spans(line: MdHighlightedLine): string[] {
  return line.tokens.map((token) => line.text.slice(token.start, token.end));
}

/** Sorted, inside the line, and never on top of one another. */
function sound(lines: MdHighlightedLine[]): true | string {
  for (const line of lines) {
    let previous = 0;

    for (const token of line.tokens) {
      if (token.start < previous) {
        return `overlapping or unsorted in ${JSON.stringify(line.text)}`;
      }

      if (token.end > line.text.length || token.start < 0 || token.end < token.start) {
        return `out of range in ${JSON.stringify(line.text)}`;
      }

      previous = token.end;
    }
  }

  return true;
}

const read = (source: string) => highlightMarkdown(source);
const one = (source: string) => read(source)[0];

describe('the shape of the output', () => {
  it('returns exactly one entry per line, including the empty ones', () => {
    const lines = read('a\n\nb\n');

    expect(lines.map((line) => line.text)).toEqual(['a', '', 'b', '']);
  });

  it('never produces a token that overlaps another or leaves its line', () => {
    const source = [
      '# Heading `code` and **bold**',
      '',
      '> quoted [link](https://a.example) with *emphasis*',
      '- [x] a task with `code` in it',
      '| a | b |',
      '| - | - |',
      '```ts',
      'const a = **not bold in here**;',
      '```',
      '[ref]: /somewhere "title"',
      'trailing \\* escape and <span> html'
    ].join('\n');

    expect(sound(read(source))).toBe(true);
  });
});

describe('blocks', () => {
  it('separates the hashes from what they are a heading of', () => {
    expect(kinds(one('## Title'))).toEqual(['marker', 'heading']);
    expect(spans(one('## Title'))).toEqual(['##', ' Title']);
  });

  it('keeps a fenced block coloured as code until it closes', () => {
    const lines = read('```ts\n# not a heading\n**not bold**\n```\n# a heading');

    expect(lines.map(kinds)).toEqual([
      ['fence'],
      ['code'],
      ['code'],
      ['fence'],
      ['marker', 'heading']
    ]);
  });

  it('does not close a fence with the wrong character or a shorter run', () => {
    const lines = read('````\n```\n~~~\n````');

    expect(lines.map(kinds)).toEqual([['fence'], ['code'], ['code'], ['fence']]);
  });

  it('marks a list bullet, and the box on a task', () => {
    expect(spans(one('- [ ] todo'))).toEqual(['-', '[ ]']);
    expect(spans(one('1. first'))).toEqual(['1.']);
  });

  it('marks the colon a definition opens with, and needs the space to do it', () => {
    expect(spans(one(': a fruit'))).toEqual([':']);
    // `:warning:` is an emoji shortcode in half the documents on the internet.
    expect(kinds(one(':warning: careful'))).toEqual([]);
  });

  it('marks a footnote where it is written', () => {
    expect(spans(one('[^one]: the note'))[0]).toBe('[^one]:');
  });

  it('marks a quotation, and reads the line inside it at the right offset', () => {
    const line = one('> a **bold** word');

    expect(kinds(line)).toEqual(['quote', 'strong']);
    expect(spans(line)).toEqual(['> ', '**bold**']);
  });

  it('marks a thematic break and a reference definition', () => {
    expect(kinds(one('---'))).toEqual(['rule']);
    expect(spans(one('[ref]: /a "t"'))[0]).toBe('[ref]:');
  });

  it('marks a table delimiter row whole, and the pipes of a data row', () => {
    expect(kinds(one('| - | - |'))).toEqual(['table']);
    expect(spans(one('| a | b |'))).toEqual(['|', '|', '|']);
  });
});

describe('inline', () => {
  it('lets a code span keep what is inside it', () => {
    const line = one('a `**not bold**` b');

    expect(kinds(line)).toEqual(['code']);
    expect(spans(line)).toEqual(['`**not bold**`']);
  });

  it('colours a link label and its destination differently', () => {
    const line = one('see [the docs](https://a.example) now');

    expect(kinds(line)).toEqual(['link', 'url']);
    expect(spans(line)).toEqual(['[the docs]', '(https://a.example)']);
  });

  it('reads an image as a link with its bang', () => {
    expect(spans(one('![alt](/i.png)'))).toEqual(['![alt]', '(/i.png)']);
  });

  it('tells strong from emphasis rather than reading two emphases', () => {
    expect(kinds(one('**bold**'))).toEqual(['strong']);
    expect(kinds(one('_soft_'))).toEqual(['emphasis']);
    expect(kinds(one('~~gone~~'))).toEqual(['strike']);
  });

  it('marks an escape and a raw tag', () => {
    expect(spans(one('a \\* b <span> c'))).toEqual(['\\*', '<span>']);
  });

  it('leaves an unclosed marker alone rather than colouring the rest of the line', () => {
    // Half-written is the state a line being typed is in most of the time.
    expect(kinds(one('**still typing'))).toEqual([]);
  });
});
