/**
 * A shorthand typed at the start of a line, and what it turns into.
 *
 * Most of Markdown's shorthands need nothing written here. The drawn document
 * is made again from the Markdown after every keystroke, so `# ` at the start
 * of a paragraph *is* a heading the moment the space lands — the parser had
 * already said so and the drawing only caught up. `- `, `* `, `1. `, `> ` and
 * `- [ ] ` are all that same story, and none of them is written down below.
 *
 * Two are, and they are the two where the marker changes the meaning of text
 * nobody is typing:
 *
 * - **A fence runs until one closes it.** Three backticks typed halfway down a
 *   document put everything under them inside a code block, and there they stay
 *   until the closing fence is typed, which is a long way to be wrong.
 * - **A break has no text in it.** `---` on its own line is a thematic break
 *   the moment the third dash lands, and the caret is then in a block that
 *   draws no characters at all, with nowhere on the page to be.
 *
 * So a fence is opened *closed*, with whatever was on the line inside it, and a
 * break is given a line under it to carry on typing on.
 */

import type { MawyEdit } from './editing.js';

/** Three backticks or three tildes, and nothing else left on the line. */
const FENCE = /^(?:`{3,}|~{3,})$/;

/** The three characters a break can be written with, spaces between allowed. */
const BREAK = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;

const INDENT = /^[ \t]*/;
const QUOTE = /^>[ \t]?/;
const ITEM = /^(?:[-*+]|\d{1,9}[.)])[ \t]+/;

/**
 * What the shorthand just completed turns into, or `null` for "not one".
 *
 * `text` is what is about to be inserted at `at`, and the line so far plus that
 * is what the patterns above are read against — a rule fires on the keystroke
 * that finishes it rather than on the one after.
 */
export function ruleFor(value: string, at: number, text: string): MawyEdit | null {
  const from = value.lastIndexOf('\n', at - 1) + 1;
  const head = value.slice(from, at) + text;
  const ending = value.indexOf('\n', at);
  const to = ending === -1 ? value.length : ending;
  const rest = value.slice(at, to);
  const { lead, carry, mark } = containerOf(head);

  if (FENCE.test(mark)) {
    // Whatever was on the line goes inside the fences, which makes this the
    // same thought as putting the caret on a line and pressing the code-block
    // button. The closing fence is the one that was typed, character for
    // character, and the two lines carry whatever the containers put on this
    // one — or the fence would close outside the list item it opened in.
    const block = `${lead}${mark}\n${carry}${rest}\n${carry}${mark}`;

    return {
      value: value.slice(0, from) + block + value.slice(to),
      caret: from + lead.length + mark.length + 1 + carry.length
    };
  }

  if (BREAK.test(head) && !rest.trim() && !continues(value, from)) {
    // A blank line under the break and the caret on the far side of it. A break
    // draws no characters of its own, so a caret left on one has nowhere to go;
    // this is the shape `Enter` at the end of a paragraph leaves, for the same
    // reason.
    const line = `${head}\n\n`;

    return {
      value: value.slice(0, from) + line + value.slice(to),
      caret: from + line.length,
      betweenBlocks: true
    };
  }

  return null;
}

/**
 * A line taken apart into what its containers wrote and what is left.
 *
 * `lead` is the prefix as it was typed and `carry` is the prefix the *next*
 * line of the same containers takes: a quotation writes its `>` on every line
 * of itself, and a list item writes its bullet once and indents the rest.
 *
 * Only the fence asks for this. Inside a container the characters a break is
 * written with are a bullet at least as often as they are a break, and telling
 * those two apart is the parser's job rather than a regular expression's.
 */
function containerOf(head: string): { lead: string; carry: string; mark: string } {
  let lead = '';
  let carry = '';
  let rest = head;

  for (;;) {
    const indent = INDENT.exec(rest)?.[0] ?? '';

    rest = rest.slice(indent.length);
    lead += indent;
    carry += indent;

    const quote = QUOTE.exec(rest)?.[0];

    if (quote) {
      rest = rest.slice(quote.length);
      lead += quote;
      carry += quote;
      continue;
    }

    const item = ITEM.exec(rest)?.[0];

    if (!item) {
      return { lead, carry, mark: rest };
    }

    rest = rest.slice(item.length);
    lead += item;
    carry += ' '.repeat(item.length);
  }
}

/**
 * Whether the line before this one is still going.
 *
 * `---` under a line of a paragraph is that paragraph's underline — a setext
 * heading — rather than a break, and the parser is right about that. A rule
 * firing there would be turning the line above into a heading while claiming to
 * have drawn a line under it.
 */
function continues(value: string, from: number): boolean {
  if (from === 0) {
    return false;
  }

  const start = value.lastIndexOf('\n', from - 2) + 1;

  return value.slice(start, from - 1).trim().length > 0;
}
