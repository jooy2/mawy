import { describe, expect, it } from 'vitest';
import specText from 'commonmark-spec/spec.txt?raw';
import { specExamples, writeHtml } from '../../support/commonmark.js';

/**
 * The parser, against the specification it claims to read.
 *
 * "CommonMark" is written in the README, on the site and in the changelog, and
 * until this file existed it was a word rather than a number. It is 625 of the
 * specification's 652 examples — the other 34 are below, each one with the
 * reason it is there, so that the claim is checkable and a change to it is
 * deliberate.
 *
 * The examples come from `commonmark-spec`, which is the specification document
 * itself; `test/support/commonmark.ts` reads the examples out of it and writes
 * the parsed tree back out as HTML, because this library renders to React
 * elements and has no serialiser of its own to measure. Anything the writer
 * gets wrong lands here as a deviation that is not one, which is worth
 * remembering before reading the list as a list of bugs.
 *
 * The Dart parser is not run here and does not need to be: `tool/parity.dart`
 * diffs the two parsers' trees over every awkward case and every Markdown file
 * in the repository, so a tree that is right in TypeScript is the tree Dart
 * produces or the parity check is already red.
 */

const examples = specExamples(specText);

/**
 * Every example the parser does not answer the way the specification does, and
 * why.
 *
 * A line removed from here is a fix, and the test below fails if one is removed
 * without the parser having actually changed — so this list can only get
 * shorter on purpose.
 */
const DEVIATIONS = new Map<number, string>([
  /*
   * A tab is four columns of indentation to every rule that measures one, and
   * is otherwise left as the character it is. The specification expands it to
   * the next stop against the content of whatever contains it.
   */
  [6, 'a tab inside a block quote is not expanded to the next stop'],
  [7, 'a tab inside a list item is not expanded to the next stop'],

  /*
   * The character reference table is the names documents actually use rather
   * than all 2231 of HTML5's, which is a hundred kilobytes shipped to every
   * page for `&DifferentialD;`. Escapes and the references it does know are
   * read everywhere the specification asks for them — in a destination, a
   * title, a reference label and a fence's info string.
   */
  [25, 'a character reference outside the common names'],
  [28, 'a numeric reference past the last code point is drawn as U+FFFD'],
  [32, '`&ouml;` is outside the table, in a destination and a title'],
  [33, '`&ouml;` is outside the table, in a reference definition'],
  [34, '`&ouml;` is outside the table, in a fence info string'],
  [503, '`&auml;` is outside the table'],

  /*
   * An empty destination is a decision rather than a shortfall. `<a href="">`
   * is a control that does nothing, and the answer everywhere else in this
   * library for a destination it will not follow is to draw the words the
   * author wrote and leave the sentence readable.
   */
  [200, '[foo]: <> defines nothing'],
  [485, '[link]() is the words rather than a link to the page it is on'],
  [486, '[link](<>) likewise'],
  [487, '[]() likewise'],
  [567, 'an empty destination does not shadow a definition of the same label'],

  /*
   * Looseness, of which one is left: a blank line loosens a list where it
   * separates two blocks, and a reference definition is not a block. It is
   * taken off the paragraph before anything counts what is left, so an item
   * holding only one has nothing on the far side of the blank line.
   */
  [317, 'a reference definition alone in an item does not make the list loose'],

  /* A label is folded by case rather than by Unicode case folding. */
  [540, '`ẞ` and `SS` are one label to the specification and two here'],

  /* A link inside an image's description. */
  [520, 'a link inside an image description'],
  [575, 'a link inside an image description'],

  /* A line that continues a paragraph inside a container. */
  [60, '`* * *` inside a list is an item rather than a thematic break'],
  [93, 'a setext underline on a lazy continuation line'],
  [236, 'an indented line after a quoted indented code block'],
  [237, 'a line after an unclosed fence inside a quotation'],

  /* Two more about where a container ends. */
  [312, 'a fifth level of indentation opens a list rather than continuing one'],
  [318, 'blank lines before a fence closing inside an item'],
  [507, 'a non-breaking space does not separate a destination from a title'],

  /*
   * And three that are a decision rather than a shortfall. Every URL is checked
   * against a scheme allowlist, in Markdown as much as in HTML, and a refused
   * destination is drawn as the words the author wrote. That is the whole of
   * the safety story and it is not going to be given up for three examples.
   */
  [598, 'the scheme allowlist refuses `a+b+c:`'],
  [599, 'the scheme allowlist refuses `made-up-scheme:`'],
  [601, 'the scheme allowlist refuses `localhost:`']
]);

/** An example that came out wrong, in a shape somebody can read in a report. */
function report(example: {
  number: number;
  section: string;
  markdown: string;
  html: string;
}): string {
  return [
    `#${example.number} (${example.section})`,
    `  source:   ${JSON.stringify(example.markdown)}`,
    `  expected: ${JSON.stringify(example.html)}`,
    `  actual:   ${JSON.stringify(writeHtml(example.markdown))}`
  ].join('\n');
}

describe('CommonMark', () => {
  const differing = examples.filter((example) => writeHtml(example.markdown) !== example.html);

  it('reads the specification as one document of examples', () => {
    expect(examples.length).toBe(652);
    expect(examples.map((example) => example.number)).toEqual(
      Array.from({ length: examples.length }, (_, index) => index + 1)
    );
  });

  it('answers every example it does not deliberately differ on', () => {
    expect(differing.filter((example) => !DEVIATIONS.has(example.number)).map(report)).toEqual([]);
  });

  it('still differs on every example written down as a deviation', () => {
    const numbers = new Set(differing.map((example) => example.number));

    // A deviation that has been fixed is a line to delete rather than one to
    // leave lying, since what is left is the answer to "what does this parser
    // not do", and an answer with stale rows in it is not one.
    expect([...DEVIATIONS.keys()].filter((number) => !numbers.has(number))).toEqual([]);
  });

  it('reads 625 of the 652', () => {
    expect(examples.length - differing.length).toBe(625);
  });
});
