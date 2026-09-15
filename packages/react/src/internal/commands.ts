/**
 * What a formatting command does to a document.
 *
 * Pure functions over `{ value, start, end }` and nothing else: no element, no
 * event, no React. That is what makes them testable at all — the alternative is
 * a test that has to mount an editor to find out what Cmd+B does to a list
 * item — and it is also what will let the WYSIWYG surface reuse them.
 *
 * Every command is a *toggle*. Pressing Cmd+B on bold text unbolds it, which
 * sounds obvious and is the half people leave out.
 */

import type { MdCode, MdListItem, MdNode, MdTable } from './markdown/ast.js';
import { parseMarkdown } from './markdown/parse.js';

export interface EditState {
  value: string;
  start: number;
  end: number;
}

export type MawyCommand =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule';

/* -------------------------------------------------------------------------
 * Lines
 * ---------------------------------------------------------------------- */

/**
 * Where the line an offset is on starts.
 *
 * Asked to look from before the start of a string, `lastIndexOf` looks at its
 * first character instead of finding nothing, so without the guard a document
 * that opens with a line ending has a first line that starts after it.
 */
function lineStartOf(value: string, offset: number): number {
  return offset > 0 ? value.lastIndexOf('\n', offset - 1) + 1 : 0;
}

/** The offsets of the first and last line the selection touches. */
function lineRange(value: string, start: number, end: number): [number, number] {
  const from = lineStartOf(value, start);
  const to = value.indexOf('\n', end);

  return [from, to === -1 ? value.length : to];
}

/**
 * Every line the selection touches, rewritten.
 *
 * The selection is put back around the whole of the rewritten block rather than
 * being tracked character by character. A command that changes the marker on
 * four lines has no honest answer for "where was the caret" anyway, and leaving
 * the block selected is what lets the next command act on the same lines.
 */
function mapLines(state: EditState, rewrite: (lines: string[]) => string[]): EditState {
  const [from, to] = lineRange(state.value, state.start, state.end);
  const before = state.value.slice(from, to);
  const block = rewrite(before.split('\n')).join('\n');
  const value = state.value.slice(0, from) + block + state.value.slice(to);

  // A caret, or a selection inside one line, is somewhere in the words rather
  // than around a block, and stays there: moved along by whatever the marker in
  // front of the words became. A caret selected into the whole line was typed
  // over by the next letter, which on the drawn document is the marker and all.
  // A whole line selected stays selected, so the next command acts on it too.
  if (!before.includes('\n') && !(state.start === from && state.end === to && from !== to)) {
    return {
      value,
      start: from + shifted(before, block, state.start - from),
      end: from + shifted(before, block, state.end - from)
    };
  }

  return { value, start: from, end: from + block.length };
}

/**
 * Where a place in a line is once only the front of the line has changed.
 *
 * What the commands rewrite is a marker, and what comes after it is left as it
 * was, so the words the two lines end with are the same words. A place in them
 * moves by however much longer the front became; a place in the old marker is
 * at the end of the new one.
 */
function shifted(was: string, now: string, at: number): number {
  let same = 0;

  while (
    same < was.length &&
    same < now.length &&
    was[was.length - 1 - same] === now[now.length - 1 - same]
  ) {
    same += 1;
  }

  const old = was.length - same;
  const fresh = now.length - same;

  return at <= old ? fresh : at + fresh - old;
}

/** The indentation a line opens with, so a marker goes after it and not before. */
function indentOf(line: string): string {
  return /^[ \t]*/.exec(line)?.[0] ?? '';
}

const MARKERS: Record<string, RegExp> = {
  quote: /^[ \t]*> ?/,
  bulletList: /^[ \t]*[-*+] (?!\[[ xX]\] )/,
  taskList: /^[ \t]*[-*+] \[[ xX]\] /,
  orderedList: /^[ \t]*\d{1,9}[.)] /,
  heading: /^[ \t]*#{1,6} /
};

/** Every marker off the front of a line, so one command can replace another. */
function bare(line: string): string {
  let out = line;

  for (const pattern of Object.values(MARKERS)) {
    out = out.replace(pattern, indentOf(out));
  }

  return out;
}

/**
 * A marker put on the front of every line the selection touches, or taken off.
 *
 * `blanks` says whether a line with nothing on it takes one too, and the two
 * answers are not a preference. A quotation has to write its marker on the
 * blank line between its paragraphs, or what was one quotation with a break in
 * it becomes two quotations. A list must not: a bullet with nothing after it is
 * an empty item somebody has to go back and delete, which is what quoting two
 * paragraphs as a list used to leave behind — and what `toggleOrdered` beside
 * this has always got right.
 */
function togglePrefix(
  state: EditState,
  kind: keyof typeof MARKERS,
  prefix: string,
  blanks: boolean
): EditState {
  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => MARKERS[kind].test(line));

    return lines.map((line) => {
      if (on) {
        return bare(line);
      }

      if (!line.trim()) {
        // A line of its own is where the caret is, and a marker is what was
        // asked for there — the empty item or quotation the next words go in.
        // Among other lines it is the marker without the space after it, there
        // being nothing for the space to be in front of.
        return lines.length === 1
          ? indentOf(line) + prefix
          : blanks
            ? indentOf(line) + prefix.trimEnd()
            : line;
      }

      return indentOf(line) + prefix + bare(line).trimStart();
    });
  });
}

function toggleOrdered(state: EditState): EditState {
  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => MARKERS.orderedList.test(line));
    let number = 0;

    return lines.map((line) => {
      if (on) {
        return bare(line);
      }

      // Blank lines inside the block keep their place and do not take a number,
      // and a blank line on its own is the first item, still to be written.
      if (!line.trim()) {
        return lines.length === 1 ? `${indentOf(line)}1. ` : line;
      }

      number += 1;

      return `${indentOf(line)}${number}. ${bare(line).trimStart()}`;
    });
  });
}

/**
 * A heading of this depth over every line the selection touches, or off it.
 *
 * Whether it is already on is read from the lines with something on them, the
 * way it is for every other marker: a blank line is not a heading that failed
 * to be one, and counting it as a line that did not match made a selection with
 * a paragraph break in it impossible to toggle off. A blank line is left alone
 * on the way in, too — `# ` on its own is a heading with nothing in it.
 */
export function toggleHeading(state: EditState, depth: number): EditState {
  // A heading is a block, and a cell of a table holds none. See `BLOCK_COMMANDS`.
  if (inTable(state)) {
    return state;
  }

  const hashes = '#'.repeat(depth);
  const already = new RegExp(`^[ \\t]*${hashes} `);

  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => already.test(line));

    return lines.map((line) => {
      if (on || depth === 0) {
        return bare(line);
      }

      return line.trim()
        ? `${indentOf(line)}${hashes} ${bare(line).trimStart()}`
        : lines.length === 1
          ? `${indentOf(line)}${hashes} `
          : line;
    });
  });
}

/* -------------------------------------------------------------------------
 * Wrapping
 * ---------------------------------------------------------------------- */

/**
 * A marker put around the selection, or taken back off it.
 *
 * Both sides of "already wrapped" are checked: the markers may be inside the
 * selection, because the reader selected them, or outside it, because they
 * double-clicked the word between them. Only the second is ever thought of.
 */
function toggleWrap(state: EditState, marker: string): EditState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);
  const width = marker.length;

  if (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(width, -width);

    return {
      value: value.slice(0, start) + inner + value.slice(end),
      start,
      end: start + inner.length
    };
  }

  if (value.slice(start - width, start) === marker && value.slice(end, end + width) === marker) {
    return {
      value: value.slice(0, start - width) + selected + value.slice(end + width),
      start: start - width,
      end: end - width
    };
  }

  return {
    value: value.slice(0, start) + marker + selected + marker + value.slice(end),
    // An empty selection leaves the caret between the two markers, ready to
    // type; a real one stays around the words it was around.
    start: start + width,
    end: end + width
  };
}

/**
 * A link, or an image, which is a link written with a `!` in front of it.
 *
 * The same command twice over rather than two of them, because the only
 * difference between what they write is that one character — and the halves
 * mean the same things: a URL selected becomes the destination, and anything
 * else becomes the words, or the description a reader who cannot see the
 * image is given.
 */
function insertLink(state: EditState, image: boolean): EditState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);
  const isUrl = /^(?:https?:\/\/|mailto:|\/|\.\/|#)\S*$/.test(selected.trim());

  const mark = image ? '!' : '';
  const label = isUrl ? '' : selected;
  const url = isUrl ? selected.trim() : 'url';
  const text = `${mark}[${label}](${url})`;
  // Whichever half is the placeholder is what comes out selected, so the next
  // thing typed replaces it.
  const at = start + mark.length + (isUrl ? 1 : label.length + 3);

  return {
    value: value.slice(0, start) + text + value.slice(end),
    start: at,
    end: isUrl ? at : at + url.length
  };
}

/**
 * A fence put around the lines the selection touches, or taken off the fenced
 * block the caret is in.
 *
 * Off from anywhere inside the block, rather than only from a selection that
 * holds both fences: a caret inside a code block asking for a code block is
 * asking for it to stop being one, and wrapping the line it is on in fences of
 * its own writes a second block into the middle of the first.
 *
 * A caret stays among the characters it was among, inside the fences on the way
 * in and out of them on the way back — a caret selected around the whole block
 * on the drawn document was one the next letter typed over, fences and all.
 */
function toggleCodeBlock(state: EditState): EditState {
  const { value, start, end } = state;
  const code = fencedAt(value, start);

  if (code && start === end) {
    const { range, content } = code;
    const opening = content.start - range.start;
    const inner = value.slice(content.start, content.end).replace(/\n$/, '');
    const at = Math.min(Math.max(start - opening, range.start), range.start + inner.length);

    return {
      value: value.slice(0, range.start) + inner + value.slice(range.end),
      start: at,
      end: at
    };
  }

  const [from, to] = lineRange(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split('\n');
  const fenced =
    lines.length > 1 && /^ {0,3}```/.test(lines[0]) && /^ {0,3}```/.test(lines[lines.length - 1]);
  const inner = fenced ? lines.slice(1, -1).join('\n') : `\`\`\`\n${block}\n\`\`\``;

  if (start === end) {
    return {
      value: value.slice(0, from) + inner + value.slice(to),
      start: start + 4,
      end: start + 4
    };
  }

  return {
    value: value.slice(0, from) + inner + value.slice(to),
    start: from,
    end: from + inner.length
  };
}

/**
 * The fenced code block a place is inside, between its fences, or `null`.
 *
 * On the fence lines themselves as well, since the opening fence is what a
 * caret put at the start of the block sits on. Not an indented block, which has
 * no fence to take off, and not a document with no fence in it at all, which is
 * the common case and is answered without a parse.
 */
export function fencedAt(value: string, offset: number): MdCode | null {
  if (!value.includes('```') && !value.includes('~~~')) {
    return null;
  }

  const document = parseMarkdown(value);

  return codeNodeAt([...document.root.children, ...document.footnotes], offset);
}

function codeNodeAt(nodes: readonly MdNode[], offset: number): MdCode | null {
  for (const node of nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    if (node.type === 'code') {
      return node.content.start > node.range.start ? node : null;
    }

    const inside = 'children' in node ? codeNodeAt(node.children as MdNode[], offset) : null;

    if (inside) {
      return inside;
    }
  }

  return null;
}

function insertRule(state: EditState): EditState {
  const { value, start, end } = state;
  const before = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
  const after = end < value.length && value[end] !== '\n' ? '\n\n' : '\n';
  const text = `${before}---${after}`;

  return {
    value: value.slice(0, start) + text + value.slice(end),
    start: start + text.length,
    end: start + text.length
  };
}

/* -------------------------------------------------------------------------
 * The table of them
 * ---------------------------------------------------------------------- */

/**
 * The commands that make a block of the lines they touch, rather than mark up
 * the words.
 *
 * A cell of a table holds one line of words and nothing else — a row is one
 * line of the file — so none of these has anything to make there. Run from a
 * cell, each wrote its marker at the front of the row, and a row that opens
 * with `- ` is not a row: the table ended on that line. So from a table they do
 * nothing, and `blockCommand` is what a toolbar asks to draw them disabled.
 */
const BLOCK_COMMANDS: ReadonlySet<MawyCommand> = new Set<MawyCommand>([
  'heading1',
  'heading2',
  'heading3',
  'paragraph',
  'quote',
  'bulletList',
  'orderedList',
  'taskList',
  'codeBlock',
  'rule'
]);

/** Whether a command makes a block of its lines. See `BLOCK_COMMANDS`. */
export function blockCommand(command: MawyCommand): boolean {
  return BLOCK_COMMANDS.has(command);
}

/** Whether either end of the selection is in a table. */
function inTable(state: EditState): boolean {
  return (
    tableAt(state.value, state.start) !== null ||
    (state.end !== state.start && tableAt(state.value, state.end) !== null)
  );
}

export function runCommand(command: MawyCommand, state: EditState): EditState {
  if (BLOCK_COMMANDS.has(command) && inTable(state)) {
    return state;
  }

  switch (command) {
    case 'bold':
      return toggleWrap(state, '**');
    case 'italic':
      return toggleWrap(state, '_');
    case 'strikethrough':
      return toggleWrap(state, '~~');
    case 'code':
      return toggleWrap(state, '`');
    case 'link':
      return insertLink(state, false);
    case 'image':
      return insertLink(state, true);
    case 'heading1':
      return toggleHeading(state, 1);
    case 'heading2':
      return toggleHeading(state, 2);
    case 'heading3':
      return toggleHeading(state, 3);
    case 'paragraph':
      return toggleHeading(state, 0);
    case 'quote':
      return togglePrefix(state, 'quote', '> ', true);
    case 'bulletList':
      return togglePrefix(state, 'bulletList', '- ', false);
    case 'taskList':
      return togglePrefix(state, 'taskList', '- [ ] ', false);
    case 'orderedList':
      return toggleOrdered(state);
    case 'codeBlock':
      return toggleCodeBlock(state);
    case 'rule':
      return insertRule(state);
    default:
      return state;
  }
}

/**
 * Whether every line the selection touches that has anything on it matches.
 *
 * A line at a time, stopping at the first one that does not — rather than
 * cutting the whole selection into lines and then asking about them. The answer
 * is usually no on the first line, and cutting it up first is the work of the
 * whole selection either way.
 */
function everyLineIs(state: EditState, pattern: RegExp): boolean {
  const [from, to] = lineRange(state.value, state.start, state.end);
  let at = from;
  let any = false;

  while (at < to) {
    const newline = state.value.indexOf('\n', at);
    const end = newline === -1 || newline > to ? to : newline;
    const line = state.value.slice(at, end);

    if (line.trim()) {
      if (!pattern.test(line)) {
        return false;
      }

      any = true;
    }

    at = end + 1;
  }

  return any;
}

/**
 * Whether the selection is already a heading of this depth, for any of the six.
 *
 * `commandActive` answers for the three the default menu offers; an editor told
 * to offer others asks this instead. `toggleHeading` is the command for all six.
 */
export function headingActive(state: EditState, depth: number): boolean {
  return everyLineIs(state, new RegExp(`^[ \\t]*${'#'.repeat(depth)} `));
}

/**
 * Whether the selection is already what the command would make it.
 *
 * This is what lets a toolbar button be drawn as pressed, and it matters more
 * than it looks: a toggle that never shows its state is a button you have to
 * press to find out what it does.
 */
export function commandActive(command: MawyCommand, state: EditState): boolean {
  // Read at the edges of the selection rather than by copying what is between
  // them. A selection can be the whole document, and this runs once for every
  // button on the toolbar every time the caret moves.
  const wrapped = (marker: string): boolean => {
    const { value, start, end } = state;
    const width = marker.length;

    return (
      (end - start >= width * 2 &&
        value.startsWith(marker, start) &&
        value.startsWith(marker, end - width)) ||
      (value.slice(start - width, start) === marker && value.slice(end, end + width) === marker)
    );
  };

  const everyLine = (pattern: RegExp): boolean => everyLineIs(state, pattern);

  switch (command) {
    case 'bold':
      return wrapped('**');
    case 'italic':
      return wrapped('_');
    case 'strikethrough':
      return wrapped('~~');
    case 'code':
      return wrapped('`');
    case 'heading1':
      return everyLine(/^[ \t]*# /);
    case 'heading2':
      return everyLine(/^[ \t]*## /);
    case 'heading3':
      return everyLine(/^[ \t]*### /);
    case 'quote':
      return everyLine(MARKERS.quote);
    case 'bulletList':
      return everyLine(MARKERS.bulletList);
    case 'orderedList':
      return everyLine(MARKERS.orderedList);
    case 'taskList':
      return everyLine(MARKERS.taskList);
    case 'codeBlock':
      return state.start === state.end && fencedAt(state.value, state.start) !== null;
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------
 * Enter, inside a list
 * ---------------------------------------------------------------------- */

/**
 * A line that carries a marker down when `Enter` is pressed on it.
 *
 * The `:` is a definition's, and it is on this list rather than beside it
 * because it behaves identically: the next line takes the same marker, and an
 * item still empty gives it up. `:` needs the space after it to be one at all,
 * which is what keeps `:warning:` from being a definition of the line above.
 */
const ITEM = /^([ \t]*)([-*+]|:|(\d{1,9})[.)])([ \t]+)(\[[ xX]\][ \t]+)?(.*)$/;

/**
 * What Enter should do, when the line it was pressed on is a list item.
 *
 * Two behaviours, and the second is the one that makes the first bearable:
 * a new item carries the marker down, and pressing Enter on an item that is
 * still empty takes the marker away instead of making another empty one. Without
 * that, leaving a list means deleting the bullet the editor just helpfully
 * added.
 *
 * `null` when the line is not a list item at all, and Enter is just Enter.
 *
 * `definitionLists` is the parser's own option, and it is here because the `:`
 * on the list above is only a marker where the parser reads one. An editor
 * told not to read definition lists would otherwise carry a marker down a line
 * the document it is editing does not think is a definition at all.
 */
export function continueList(state: EditState, definitionLists = true): EditState | null {
  if (state.start !== state.end) {
    return null;
  }

  const from = lineStartOf(state.value, state.start);
  const line = state.value.slice(from, state.start);
  const own = ITEM.exec(line);
  const item = own ?? ownerOf(state.value, from, state.start)?.item;

  if (!item) {
    return null;
  }

  const [, indent, marker, ordinal, space, task, content] = item;

  if (marker === ':' && !definitionLists) {
    return null;
  }

  if (own && !content.trim()) {
    // An empty item: the marker goes, and so does the list.
    return {
      value: state.value.slice(0, from) + state.value.slice(state.start),
      start: from,
      end: from
    };
  }

  const next = ordinal
    ? `${indent}${Number.parseInt(ordinal, 10) + 1}${marker.slice(ordinal.length)}${space}`
    : `${indent}${marker}${space}`;
  // A checked box does not carry its tick down to the next line.
  const text = `\n${next}${task ? '[ ] ' : ''}`;

  return {
    value: state.value.slice(0, state.start) + text + state.value.slice(state.start),
    start: state.start + text.length,
    end: state.start + text.length
  };
}

/** A line that might open a list item, somewhere in a document. */
const ANY_ITEM = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]/m;

/**
 * The first line of the list item a line of words carries on, read the way
 * `ITEM` reads a line that opens one, or `null`.
 *
 * An item's words can run over more than one line — a hard break, a line
 * wrapped by hand — and the second of those opens with no marker at all. `Enter`
 * at its end made a paragraph under the list rather than the next item, which
 * is the one place in a list where a list was not carried on. The parser says
 * which item the line is in, so the marker is read off that item's first line.
 *
 * A blank line carries nothing on, and neither does code inside the item: a
 * line of code is the characters it is. Only asked where a document has a line
 * that could open a list somewhere in it, which is what spares the parse
 * everywhere else.
 */
function ownerOf(
  value: string,
  from: number,
  at: number
): { first: number; item: RegExpExecArray } | null {
  if (!value.slice(from, at).trim() || !ANY_ITEM.test(value)) {
    return null;
  }

  const document = parseMarkdown(value);
  const blocks = [...document.root.children, ...document.footnotes];
  const owner = verbatimAt(blocks, at) ? null : itemNodeAt(blocks, at);

  if (!owner) {
    return null;
  }

  const first = lineStartOf(value, owner.range.start);
  const end = value.indexOf('\n', first);
  const item =
    first === from ? null : ITEM.exec(value.slice(first, end === -1 ? value.length : end));

  return item ? { first, item } : null;
}

/** The innermost list item a place is inside. */
function itemNodeAt(nodes: readonly MdNode[], offset: number): MdListItem | null {
  for (const node of nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    const inside = 'children' in node ? itemNodeAt(node.children as MdNode[], offset) : null;

    if (inside) {
      return inside;
    }

    if (node.type === 'listItem') {
      return node;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Indentation
 * ---------------------------------------------------------------------- */

/**
 * Two spaces, which is what a nested list item needs and not one more.
 *
 * Markdown counts columns rather than characters, and a nested item has to be
 * indented past its parent's marker: under `- ` that is two, and two is what
 * every Markdown document already written is indented by. Four would be an
 * indented code block the moment the list above it ends, which is the failure
 * this width exists to avoid.
 */
const INDENT = '  ';

/** How much of a line's indentation to take off, in the width above. */
function outdentOf(line: string): number {
  const indent = indentOf(line);

  if (indent.startsWith('\t')) {
    return 1;
  }

  return Math.min(indent.length, INDENT.length);
}

/**
 * `Tab` and `Shift`+`Tab`, over whatever the selection touches.
 *
 * A caret with nothing selected puts the indentation in where it is, the way
 * typing two spaces would, so `Tab` in the middle of a word is two spaces in
 * the middle of a word — that is what was pressed. Anything *selected* moves
 * the lines it touches instead of being replaced by two spaces: a `Tab` that
 * eats the paragraph somebody had selected is the behaviour every editor gave
 * up. The same lines stay selected, so it can be pressed again.
 *
 * Outdenting takes a tab or up to two spaces off the front of each line, and a
 * line with no indentation left is not an error — the rest of the block still
 * moves.
 */
export function indent(state: EditState, out: boolean): EditState {
  const nested = nest(state, out);

  if (nested) {
    return nested;
  }

  const spans = state.value.slice(state.start, state.end).includes('\n');

  if (!out && !spans && state.start === state.end) {
    return {
      value: state.value.slice(0, state.start) + INDENT + state.value.slice(state.end),
      start: state.start + INDENT.length,
      end: state.start + INDENT.length
    };
  }

  return mapLines(state, (lines) =>
    lines.map((line) => (out ? line.slice(outdentOf(line)) : INDENT + line))
  );
}

/** A line that opens a list item, cut into the parts `nest` moves and counts. */
const ITEM_LINE = /^( *)(?:[-*+]|(\d{1,9})([.)]))[ \t]+/;

/** The lines of a document, each with where it starts. */
function linesOf(value: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let start = 0;

  for (const text of value.split('\n')) {
    out.push({ start, text });
    start += text.length + 1;
  }

  return out;
}

/** How many spaces a line opens with. */
function spacesOf(text: string): number {
  return /^ */.exec(text)?.[0].length ?? 0;
}

/**
 * `Tab` on a list item, which makes it an item of the one above it, and
 * `Shift`+`Tab`, which makes it that one's sibling again — or `null` where the
 * caret is not on an item, and the plain rules below apply.
 *
 * Two spaces is the width of a bullet and not of a number: `1. ` is three
 * columns, and an item indented two under it is still an item of the outer
 * list. So an item goes in to where the words of the item above it start, and
 * back out to where the item it is in starts. Whatever the item holds goes with
 * it — the lines it runs on over and the items nested in it — or they would be
 * left behind in the item it came from.
 *
 * A number is counted rather than kept: an item that becomes the first of a
 * list inside another is `1.`, one that joins a list already there is the next
 * number of it, and one that comes back out is the number after the item it
 * was in.
 *
 * The first item of a list has no item above it to go into, and `Tab` there
 * does nothing, rather than writing two spaces into the words. An item
 * indented by a tab is left to the plain rules, since what a tab is worth in
 * columns is the parser's question.
 */
function nest(state: EditState, out: boolean): EditState | null {
  const { value, start, end } = state;

  if (value.slice(start, end).includes('\n')) {
    return null;
  }

  const lines = linesOf(value);
  let at = lines.findIndex(
    (line, index) => index === lines.length - 1 || lines[index + 1].start > start
  );
  let item = ITEM_LINE.exec(lines[at].text);

  // A line the item runs on over is that item's, for `Tab` as for `Enter`.
  if (!item) {
    const owner = ownerOf(value, lines[at].start, start);

    at = owner ? lines.findIndex((line) => line.start === owner.first) : -1;
    item = at === -1 ? null : ITEM_LINE.exec(lines[at].text);

    if (!item) {
      return null;
    }
  }

  if (/^[ \t]*\t/.test(lines[at].text)) {
    return null;
  }

  const own = item[1].length;
  let last = at;

  // What the item holds: the lines under it indented past it, and the blank
  // lines between those.
  for (let index = at + 1; index < lines.length; index += 1) {
    const text = lines[index].text;

    if (!text.trim()) {
      continue;
    }

    if (spacesOf(text) <= own) {
      break;
    }

    last = index;
  }

  let target = -1;
  let number: number | null = null;

  if (!out) {
    /** The last number of each list the item above holds, by how far in it is. */
    const counted = new Map<number, number | null>();

    for (let index = at - 1; index >= 0; index -= 1) {
      const text = lines[index].text;

      if (!text.trim()) {
        continue;
      }

      const spaces = spacesOf(text);
      const above = ITEM_LINE.exec(text);

      if (spaces > own) {
        // Met from below, so the first item at a depth is the last of its list.
        if (above && !counted.has(spaces)) {
          counted.set(spaces, above[2] ? Number.parseInt(above[2], 10) : null);
        }

        continue;
      }

      if (spaces < own || !above) {
        return state;
      }

      target = above[0].length;
      break;
    }

    if (target === -1) {
      return state;
    }

    const before = counted.get(target);

    number = item[2] ? (before === undefined || before === null ? 1 : before + 1) : null;
  } else {
    for (let index = at - 1; index >= 0; index -= 1) {
      const text = lines[index].text;

      if (!text.trim()) {
        continue;
      }

      const spaces = spacesOf(text);

      if (spaces >= own) {
        continue;
      }

      const above = ITEM_LINE.exec(text);

      if (!above || above[0].length > own) {
        return null;
      }

      target = spaces;
      number = item[2]
        ? above[2]
          ? Number.parseInt(above[2], 10) + 1
          : Number.parseInt(item[2], 10)
        : null;
      break;
    }

    // An item of the outermost list has nowhere further out to go, and its
    // indentation, and that of the lines it runs on over, is the item's own.
    if (target === -1) {
      return state;
    }
  }

  const shift = target - own;
  const moved = lines.slice(at, last + 1).map((line, index) => {
    let text =
      shift > 0
        ? ' '.repeat(shift) + line.text
        : line.text.slice(Math.min(-shift, spacesOf(line.text)));

    if (index === 0 && number !== null) {
      text = text.replace(/\d{1,9}(?=[.)])/, String(number));
    }

    return { start: line.start, was: line.text, text };
  });
  const from = lines[at].start;
  const to = lines[last].start + lines[last].text.length;
  const block = moved.map((line) => line.text).join('\n');

  /** A place in the document, carried to the line it was on once that has moved. */
  const carry = (offset: number): number => {
    let before = from;

    for (const line of moved) {
      if (offset <= line.start + line.was.length) {
        return before + shifted(line.was, line.text, Math.max(0, offset - line.start));
      }

      before += line.text.length + 1;
    }

    return offset + block.length - (to - from);
  };

  return {
    value: value.slice(0, from) + block + value.slice(to),
    start: carry(start),
    end: carry(end)
  };
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

/**
 * What can be done to a table's shape.
 *
 * Its own list rather than more of `MawyCommand`, because none of these is a
 * toggle and none of them always applies: a row cannot go above the header, and
 * the last column cannot be taken away. So each answers `null` where it has
 * nothing to do, which is also how the toolbar knows which of them to offer.
 */
export type MawyTableCommand =
  | 'insertTable'
  | 'addRowBelow'
  | 'addRowAbove'
  | 'addColumnAfter'
  | 'addColumnBefore'
  | 'removeRow'
  | 'removeColumn'
  | 'clearCells';

/** One line of a table, and where each of its cells is written. */
interface TableLine {
  /** Where the row's own characters start, after whatever holds the table. */
  start: number;
  end: number;
  /** Where the line itself starts, which is before a quotation's `>`. */
  lineStart: number;
  /** Each cell's run, between the pipes and not including them. */
  cells: { from: number; to: number }[];
  /** Whether the row opens with a pipe of its own. */
  opened: boolean;
  /** Whether it closes with one. */
  closed: boolean;
}

interface TableAt {
  /** The header, the delimiter row, and the body, in that order. */
  lines: TableLine[];
  /** Which line the caret is on, with the delimiter row counted as the header. */
  row: number;
  /** Which cell it is in. */
  column: number;
  columns: number;
  /** What a line of this table has to start with to still be in it. */
  prefix: string;
}

/**
 * A row, cut at its unescaped pipes the way the parser cuts it.
 *
 * `splitRow` in `block.ts` is the rule, and this is it again with the offsets
 * kept rather than the text. It has to agree exactly: a pipe this counted and
 * the parser did not is a cell written into the middle of another one.
 */
function tableLine(value: string, start: number, end: number): TableLine {
  const lineStart = lineStartOf(value, start);
  const text = value.slice(start, end);
  let from = start + (text.length - text.trimStart().length);
  let stop = end - (text.length - text.trimEnd().length);
  const opened = value[from] === '|' && from < stop;

  if (opened) {
    from += 1;
  }

  const closed = /(?:^|[^\\])\|$/.test(value.slice(from, stop));

  if (closed) {
    stop -= 1;
  }

  const cells: { from: number; to: number }[] = [];
  let cell = from;

  for (let at = from; at < stop; at += 1) {
    if (value[at] === '\\' && value[at + 1] === '|' && at + 1 < stop) {
      at += 1;
      continue;
    }

    if (value[at] === '|') {
      cells.push({ from: cell, to: at });
      cell = at + 1;
    }
  }

  // In order even for a row that trims away to nothing, which a no-break space
  // on its own does: the parser still reads it as a row.
  cells.push({ from: cell, to: Math.max(cell, stop) });

  return { start, end, lineStart, cells, opened, closed };
}

/** The table a place in the tree is inside, if it is inside one. */
function tableNodeAt(nodes: readonly MdNode[], offset: number): MdTable | null {
  for (const node of nodes) {
    if (offset < node.range.start || offset > node.range.end) {
      continue;
    }

    if (node.type === 'table') {
      return node;
    }

    const inside = 'children' in node ? tableNodeAt(node.children as MdNode[], offset) : null;

    if (inside) {
      return inside;
    }
  }

  return null;
}

/**
 * The table the caret is in, read with the parser, or `null`.
 *
 * The parser rather than a look at the lines around the caret, because a line
 * with a pipe in it is a table row only where the parser says so: inside a code
 * block it is code, and the line after a table with no pipe in it at all is one
 * of its rows. What the commands change has to be what is drawn as a table.
 */
function tableAt(value: string, offset: number): TableAt | null {
  if (!value.includes('|')) {
    return null;
  }

  const document = parseMarkdown(value);
  const table = tableNodeAt([...document.root.children, ...document.footnotes], offset);

  if (!table) {
    return null;
  }

  const [header, ...body] = table.children;
  const delimiterStart = value.indexOf('\n', header.range.end) + 1;
  const delimiterEnd = value.indexOf('\n', delimiterStart);
  const delimiterLine = value.slice(delimiterStart, delimiterEnd === -1 ? undefined : delimiterEnd);
  const quoted = /^(?:[ \t]*>)*/.exec(delimiterLine)?.[0].length ?? 0;
  const lines = [
    tableLine(value, header.range.start, header.range.end),
    tableLine(value, delimiterStart + quoted, delimiterEnd === -1 ? value.length : delimiterEnd),
    ...body.map((row) => tableLine(value, row.range.start, row.range.end))
  ];
  const on = lines.findIndex((line) => line.lineStart <= offset && offset <= line.end);

  if (on === -1) {
    return null;
  }

  const delimiter = lines[1];
  const cells = lines[on].cells;
  const column = cells.findIndex((cell) => offset <= cell.to);

  return {
    lines,
    row: on === 1 ? 0 : on,
    column: column === -1 ? cells.length - 1 : column,
    columns: table.align.length,
    prefix: value.slice(delimiter.lineStart, delimiter.cells[0].from - (delimiter.opened ? 1 : 0))
  };
}

/**
 * Where a caret goes in a cell: after what is written in it, or at the end of an
 * empty one, which is where the parser says an empty cell is and so where the
 * drawn document can put a caret into it.
 */
function caretInCell(value: string, cell: { from: number; to: number }): number {
  let at = cell.to;

  while (at > cell.from && value[at - 1] === ' ') {
    at -= 1;
  }

  return at === cell.from ? cell.to : at;
}

/** The same table read again after a change, and a caret put in one of its cells. */
function caretAfter(value: string, anchor: number, row: number, column: number): EditState {
  const table = tableAt(value, anchor);
  const line = table?.lines[row];
  const cell = line?.cells[Math.min(column, line.cells.length - 1)];
  const at = cell ? caretInCell(value, cell) : anchor;

  return { value, start: at, end: at };
}

/** Every line of the table rewritten, from the last so the offsets hold. */
function rewriteLines(
  value: string,
  lines: readonly TableLine[],
  rewrite: (text: string, line: TableLine, index: number) => string
): string {
  let out = value;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const text = value.slice(line.start, line.end);

    out = out.slice(0, line.start) + rewrite(text, line, index) + out.slice(line.end);
  }

  return out;
}

/** A row with nothing in any of its cells, which every new one is. */
function emptyRow(columns: number): string {
  return `|${'  |'.repeat(columns)}`;
}

/**
 * A line taken apart into what its containers wrote and what is left.
 *
 * `lead` is the prefix as it was typed and `carry` is the prefix the *next*
 * line of the same containers takes: a quotation writes its `>` on every line
 * of itself, and a list item writes its bullet once and indents the rest.
 *
 * Read off the characters rather than out of the parser, which is right for
 * the two places that ask. Both are writing lines into the containers the
 * caret's own line opens with, and what those lines have to start with is what
 * this line started with.
 */
export function containerOf(head: string): { lead: string; carry: string; mark: string } {
  let lead = '';
  let carry = '';
  let rest = head;

  for (;;) {
    const indent = /^[ \t]*/.exec(rest)?.[0] ?? '';

    rest = rest.slice(indent.length);
    lead += indent;
    carry += indent;

    const quote = /^>[ \t]?/.exec(rest)?.[0];

    if (quote) {
      rest = rest.slice(quote.length);
      lead += quote;
      carry += quote;
      continue;
    }

    const item = /^(?:[-*+]|\d{1,9}[.)])[ \t]+/.exec(rest)?.[0];

    if (!item) {
      return { lead, carry, mark: rest };
    }

    rest = rest.slice(item.length);
    lead += item;
    carry += ' '.repeat(item.length);
  }
}

/**
 * Whether a place is inside a block whose lines are its own characters: code,
 * or HTML.
 *
 * Strictly inside, so the end of a closing fence is after the block and a
 * caret there can still put something under it — except for code nothing
 * closes, a fence with no second fence or an indented block, whose last line is
 * still code. A container is looked inside at its end as well, because that end
 * can be the end of such code.
 */
function verbatimAt(nodes: readonly MdNode[], offset: number): boolean {
  for (const node of nodes) {
    const { start, end } = node.range;

    if (offset <= start || offset > end) {
      continue;
    }

    if (node.type === 'code' || node.type === 'html') {
      const open = node.type === 'code' && node.content.end === end && node.content.start > start;

      if (offset < end || open) {
        return true;
      }

      continue;
    }

    if ('children' in node && verbatimAt(node.children as MdNode[], offset)) {
      return true;
    }
  }

  return false;
}

/**
 * A table of two columns, a header and one row, where the caret is.
 *
 * With a blank line either side of it, because a table has to be a block of its
 * own to be one. Empty rather than filled with column names: whatever words it
 * came with would be in the interface's language and in the document for good.
 *
 * Inside a quotation or a list item every line of it, and the blank lines
 * around it, carry that container's prefix, or the first line without one
 * would end the container and the table would land after it. Inside a code
 * block there is nothing to do: a table there is characters, and splitting the
 * block around one would change what the rest of the code is.
 */
function insertTable(state: EditState, columns = 2, rows = 2): EditState | null {
  const { value, start, end } = state;

  if (tableAt(value, start)) {
    return null;
  }

  const document = parseMarkdown(value);
  const blocks = [...document.root.children, ...document.footnotes];

  if (verbatimAt(blocks, start) || verbatimAt(blocks, end)) {
    return null;
  }

  const from = lineStartOf(value, start);
  const { lead: opened, carry, mark } = containerOf(value.slice(from, start));
  const blank = carry.trimEnd();
  const stop = value.indexOf('\n', end);
  const rest = value.slice(end, stop === -1 ? value.length : stop);
  const above = from > 0 ? value.slice(lineStartOf(value, from - 1), from - 1) : '';
  const next = stop === -1 ? -1 : value.indexOf('\n', stop + 1);
  const below = stop === -1 ? '' : value.slice(stop + 1, next === -1 ? value.length : next);

  // Words before the caret end their line, and a blank line of the same
  // containers comes between them and the table. With none, the line is the
  // table's own, and needs a blank line above it only where the line above has
  // something on it — and not at all where this line opens a list item, which
  // a table can be the first thing in.
  const lead = mark.trim()
    ? `\n${blank}\n${carry}`
    : from > 0 && opened === carry && containerOf(above).mark.trim()
      ? `\n${carry}`
      : '';
  const tail = rest.trim()
    ? `\n${blank}\n${carry}`
    : stop !== -1 && containerOf(below).mark.trim()
      ? `\n${blank}`
      : '';
  const across = Math.max(1, Math.floor(columns));
  const down = Math.max(1, Math.floor(rows));
  const body = Array.from({ length: down - 1 }, () => `\n${carry}${emptyRow(across)}`).join('');
  const text = `${lead}${emptyRow(across)}\n${carry}|${' --- |'.repeat(across)}${body}${tail}`;
  const caret = start + lead.length + 3;

  return { value: value.slice(0, start) + text + value.slice(end), start: caret, end: caret };
}

/**
 * The cells a selection covers in a table, as the rectangle between the cell
 * its start is in and the cell its end is in.
 *
 * Rows are counted as `tableAt` counts them, the delimiter row being the
 * header's, so `top` and `bottom` are lines of the table. A selection whose end
 * is outside the table the start is in covers the start's cell alone.
 */
interface TableSpan {
  table: TableAt;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function spanAt(value: string, start: number, end: number): TableSpan | null {
  const table = tableAt(value, start);

  if (!table) {
    return null;
  }

  const other = start === end ? table : tableAt(value, end);
  const same = other && other.lines[0].start === table.lines[0].start ? other : table;

  return {
    table,
    top: Math.min(table.row, same.row),
    bottom: Math.max(table.row, same.row),
    left: Math.min(table.column, same.column, table.columns - 1),
    right: Math.min(Math.max(table.column, same.column), table.columns - 1)
  };
}

/** How many rows a span covers, the delimiter row not being one. */
function rowsIn(span: TableSpan): number {
  return (span.top === 0 ? 1 : 0) + Math.max(0, span.bottom - Math.max(span.top, 2) + 1);
}

/**
 * How many rows and columns of a table a selection covers, or `null` where it
 * does not start in one.
 *
 * What the controls beside a table count in their names, and what the drawn
 * document marks as cells rather than as text when it is more than one.
 */
export function tableSpanAt(
  value: string,
  start: number,
  end: number
): {
  top: number;
  bottom: number;
  left: number;
  right: number;
  rows: number;
  columns: number;
} | null {
  const span = spanAt(value, start, end);

  return span
    ? {
        top: span.top,
        bottom: span.bottom,
        left: span.left,
        right: span.right,
        rows: rowsIn(span),
        columns: span.right - span.left + 1
      }
    : null;
}

/**
 * Rows under the rows the selection covers, or over them, as many as it covers.
 * Never over the header.
 */
function addRow(state: EditState, below: boolean): EditState | null {
  const span = spanAt(state.value, state.start, state.end);

  if (!span || (!below && span.top === 0)) {
    return null;
  }

  const { value } = state;
  const { table } = span;
  // Under the header is under the delimiter row, which belongs to it.
  const next = table.lines[below ? Math.max(span.bottom, 1) : span.top];
  const text = Array.from(
    { length: rowsIn(span) },
    () => `${table.prefix}${emptyRow(table.columns)}`
  ).join('\n');
  const at = below ? next.end : next.lineStart;
  const written = below ? `\n${text}` : `${text}\n`;
  const opens = below ? at + 1 : at;
  const caret = opens + table.prefix.length + 3 + 3 * span.left;

  return { value: value.slice(0, at) + written + value.slice(at), start: caret, end: caret };
}

/** The rows the selection covers, taken out. Never the header. */
function removeRow(state: EditState): EditState | null {
  const span = spanAt(state.value, state.start, state.end);

  if (!span || span.top === 0) {
    return null;
  }

  const { value } = state;
  const { table } = span;
  const next =
    value.slice(0, table.lines[span.top].lineStart - 1) + value.slice(table.lines[span.bottom].end);
  // The row that moved up into its place, or the one above where there is none.
  const row = span.bottom < table.lines.length - 1 ? span.top : span.top - 1;

  return caretAfter(next, table.lines[0].start, row === 1 ? 0 : row, span.left);
}

/** One empty column put into every line of the table beside `column`. */
function columnPutIn(value: string, anchor: number, column: number, after: boolean): string {
  const table = tableAt(value, anchor);

  if (!table) {
    return value;
  }

  return rewriteLines(value, table.lines, (text, line, index) => {
    const cell = line.cells[column];

    // A row shorter than the column is already empty there.
    if (!cell) {
      return text;
    }

    const content = index === 1 ? '---' : '';
    const last = column === line.cells.length - 1;
    // A row with no pipe on the side the cell goes on has to be given one, or
    // an empty cell at either end is read as no cell at all.
    const at = (after ? cell.to : cell.from) - line.start;
    const written = after
      ? !last || line.closed
        ? `| ${content} `
        : ` | ${content} |`
      : column > 0 || line.opened
        ? ` ${content} |`
        : `| ${content} | `;

    return text.slice(0, at) + written + text.slice(at);
  });
}

/** Columns after the columns the selection covers, or before them, as many as it covers. */
function addColumn(state: EditState, after: boolean): EditState | null {
  const span = spanAt(state.value, state.start, state.end);

  if (!span) {
    return null;
  }

  const anchor = span.table.lines[0].start;
  let next = state.value;

  for (let count = span.left; count <= span.right; count += 1) {
    next = columnPutIn(next, anchor, after ? span.right : span.left, after);
  }

  return caretAfter(next, anchor, span.table.row, after ? span.right + 1 : span.left);
}

/** One column taken out of every line of the table. */
function columnTakenFrom(value: string, anchor: number, column: number): string {
  const table = tableAt(value, anchor);

  if (!table) {
    return value;
  }

  return rewriteLines(value, table.lines, (text, line, index) => {
    const cell = line.cells[column];

    if (!cell) {
      return text;
    }

    const from = cell.from - line.start;
    const to = cell.to - line.start;
    let out: string;

    if (line.cells.length === 1) {
      // A short row with nothing else in it keeps a pipe, or it would be a
      // blank line and the end of the table.
      out = text.slice(0, from) + (line.opened || line.closed ? ' ' : '|') + text.slice(to);
    } else if (column < line.cells.length - 1 || line.closed) {
      out = text.slice(0, from) + text.slice(to + 1);
    } else {
      out = text.slice(0, from - 1).trimEnd() + text.slice(to);
    }

    // A header row with no pipe left in it is not a table's header any more.
    return index === 0 && !out.includes('|') ? `${out.trimEnd()} |` : out;
  });
}

/** The columns the selection covers, taken out. Never every column. */
function removeColumn(state: EditState): EditState | null {
  const span = spanAt(state.value, state.start, state.end);

  if (!span || span.right - span.left + 1 >= span.table.columns) {
    return null;
  }

  const anchor = span.table.lines[0].start;
  let next = state.value;

  for (let count = span.left; count <= span.right; count += 1) {
    next = columnTakenFrom(next, anchor, span.left);
  }

  return caretAfter(next, anchor, span.table.row, Math.max(0, span.left - 1));
}

/**
 * What is written in the cells the selection covers, taken out, and the cells
 * left where they are.
 *
 * What `Delete` does to cells selected on the drawn document. Deleting the
 * characters between two places in a table takes the pipes between them and
 * the line endings between its rows, which is a table cut in half rather than
 * cells emptied. A cell at the open edge of a row written without its outer
 * pipe is given the pipe, or an empty cell there is no cell.
 */
function clearCells(state: EditState): EditState | null {
  const span = spanAt(state.value, state.start, state.end);

  if (!span) {
    return null;
  }

  const { table } = span;
  const next = rewriteLines(state.value, table.lines, (text, line, index) => {
    if (index === 1 || index < span.top || index > span.bottom || !line.cells.length) {
      return text;
    }

    let out = text;
    const last = Math.min(span.right, line.cells.length - 1);

    for (let column = last; column >= span.left; column -= 1) {
      const cell = line.cells[column];

      out = out.slice(0, cell.from - line.start) + '  ' + out.slice(cell.to - line.start);
    }

    if (span.left === 0 && !line.opened) {
      out = `|${out}`;
    }

    if (last === line.cells.length - 1 && span.right >= last && !line.closed) {
      out = `${out}|`;
    }

    return out;
  });

  return caretAfter(next, table.lines[0].start, span.top, span.left);
}

/**
 * `Tab` in a table, which is the next cell, and `Shift`+`Tab`, the one before —
 * or `null` outside a table, where `Tab` is what it is everywhere else.
 *
 * Across the row and then down to the first cell of the next, the way a table
 * is read. `Tab` in the last cell adds a row under it and goes to the row's
 * first cell, which is how a table is grown without taking a hand off the keys;
 * `Shift`+`Tab` in the first cell stays there. The caret lands after what is in
 * the cell it arrives at, where the next letter carries on the words. A
 * selection over more than one line is not in a cell and is left to `indent`.
 */
export function nextCell(state: EditState, back: boolean): EditState | null {
  const { value, start, end } = state;

  if (value.slice(start, end).includes('\n')) {
    return null;
  }

  const table = tableAt(value, start);

  if (!table) {
    return null;
  }

  const anchor = table.lines[0].start;
  // The rows a caret can be in, which is every line but the delimiter row's.
  const rows = table.lines.map((_, index) => index).filter((index) => index !== 1);
  const at = rows.indexOf(table.row);
  const last = table.columns - 1;

  if (back) {
    if (table.column > 0) {
      return caretAfter(value, anchor, table.row, Math.min(table.column, last) - 1);
    }

    return at > 0 ? caretAfter(value, anchor, rows[at - 1], last) : { value, start, end: start };
  }

  if (table.column < last) {
    return caretAfter(value, anchor, table.row, table.column + 1);
  }

  if (at < rows.length - 1) {
    return caretAfter(value, anchor, rows[at + 1], 0);
  }

  const grown = addRow({ value, start, end: start }, true);

  return grown && caretAfter(grown.value, anchor, table.row === 0 ? 2 : table.row + 1, 0);
}

/**
 * A table of this many columns and rows, the header counted among the rows,
 * where the caret is — or `null` where `insertTable` has nowhere to put one.
 *
 * What the toolbar's grid inserts. The keyboard's `Mod`+`Alt`+`T` is the two by
 * two `insertTable` writes.
 */
export function tableOfSize(state: EditState, columns: number, rows: number): EditState | null {
  return insertTable(state, columns, rows);
}

/**
 * Where the table a place is inside starts and ends, or `null` outside one.
 *
 * What the editor hangs the table's own controls from. Answered without a parse
 * for a document with no pipe in it, which is most of them.
 */
export function tableRangeAt(value: string, offset: number): { start: number; end: number } | null {
  if (!value.includes('|')) {
    return null;
  }

  const document = parseMarkdown(value);
  const table = tableNodeAt([...document.root.children, ...document.footnotes], offset);

  return table ? { start: table.range.start, end: table.range.end } : null;
}

/** A table command, or `null` where it has nothing to do. */
export function runTableCommand(command: MawyTableCommand, state: EditState): EditState | null {
  switch (command) {
    case 'insertTable':
      return insertTable(state);
    case 'addRowBelow':
      return addRow(state, true);
    case 'addRowAbove':
      return addRow(state, false);
    case 'addColumnAfter':
      return addColumn(state, true);
    case 'addColumnBefore':
      return addColumn(state, false);
    case 'removeRow':
      return removeRow(state);
    case 'removeColumn':
      return removeColumn(state);
    case 'clearCells':
      return clearCells(state);
    default:
      return null;
  }
}
