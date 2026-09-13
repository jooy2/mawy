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

import type { MdNode, MdTable } from './markdown/ast.js';
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
  const block = rewrite(state.value.slice(from, to).split('\n')).join('\n');

  return {
    value: state.value.slice(0, from) + block + state.value.slice(to),
    start: from,
    end: from + block.length
  };
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
        // The marker without the space after it, there being nothing for the
        // space to be in front of.
        return blanks ? indentOf(line) + prefix.trimEnd() : line;
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

      // Blank lines inside the block keep their place and do not take a number.
      if (!line.trim()) {
        return line;
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
  const hashes = '#'.repeat(depth);
  const already = new RegExp(`^[ \\t]*${hashes} `);

  return mapLines(state, (lines) => {
    const content = lines.filter((line) => line.trim());
    const on = content.length > 0 && content.every((line) => already.test(line));

    return lines.map((line) => {
      if (on || depth === 0) {
        return bare(line);
      }

      return line.trim() ? `${indentOf(line)}${hashes} ${bare(line).trimStart()}` : line;
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

function toggleCodeBlock(state: EditState): EditState {
  const [from, to] = lineRange(state.value, state.start, state.end);
  const block = state.value.slice(from, to);
  const lines = block.split('\n');
  const fenced =
    lines.length > 1 && /^ {0,3}```/.test(lines[0]) && /^ {0,3}```/.test(lines[lines.length - 1]);
  const inner = fenced ? lines.slice(1, -1).join('\n') : `\`\`\`\n${block}\n\`\`\``;

  return {
    value: state.value.slice(0, from) + inner + state.value.slice(to),
    start: from,
    end: from + inner.length
  };
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

export function runCommand(command: MawyCommand, state: EditState): EditState {
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
  const item = ITEM.exec(line);

  if (!item) {
    return null;
  }

  const [, indent, marker, ordinal, space, task, content] = item;

  if (marker === ':' && !definitionLists) {
    return null;
  }

  if (!content.trim()) {
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
  | 'removeColumn';

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
 * caret there can still put something under it — except for a fence nothing
 * closes, whose last line is still code.
 */
function verbatimAt(nodes: readonly MdNode[], offset: number): boolean {
  for (const node of nodes) {
    const { start, end } = node.range;
    const open = node.type === 'code' && node.content.end === end && node.content.start > start;

    if (offset <= start || offset > end || (offset === end && !open)) {
      continue;
    }

    if (node.type === 'code' || node.type === 'html') {
      return true;
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
function insertTable(state: EditState): EditState | null {
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
  const text = `${lead}${emptyRow(2)}\n${carry}| --- | --- |\n${carry}${emptyRow(2)}${tail}`;
  const caret = start + lead.length + 3;

  return { value: value.slice(0, start) + text + value.slice(end), start: caret, end: caret };
}

function addRow(state: EditState, below: boolean): EditState | null {
  const table = tableAt(state.value, state.start);

  if (!table || (!below && table.row === 0)) {
    return null;
  }

  const { value } = state;
  // Under the header is under the delimiter row, which belongs to it.
  const next = table.lines[table.row === 0 ? 1 : table.row];
  const text = `${table.prefix}${emptyRow(table.columns)}`;
  const at = below ? next.end : next.lineStart;
  const written = below ? `\n${text}` : `${text}\n`;
  const opens = below ? at + 1 : at;
  const caret = opens + table.prefix.length + 3 + 3 * Math.min(table.column, table.columns - 1);

  return { value: value.slice(0, at) + written + value.slice(at), start: caret, end: caret };
}

function removeRow(state: EditState): EditState | null {
  const table = tableAt(state.value, state.start);

  if (!table || table.row === 0) {
    return null;
  }

  const { value } = state;
  const line = table.lines[table.row];
  const next = value.slice(0, line.lineStart - 1) + value.slice(line.end);
  // The row that moved up into its place, or the one above where there is none.
  const row = table.row < table.lines.length - 1 ? table.row : table.row - 1;

  return caretAfter(next, table.lines[0].start, row === 1 ? 0 : row, table.column);
}

function addColumn(state: EditState, after: boolean): EditState | null {
  const table = tableAt(state.value, state.start);

  if (!table) {
    return null;
  }

  const { column } = table;
  const next = rewriteLines(state.value, table.lines, (text, line, index) => {
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

  return caretAfter(next, table.lines[0].start, table.row, after ? column + 1 : column);
}

function removeColumn(state: EditState): EditState | null {
  const table = tableAt(state.value, state.start);

  if (!table || table.columns < 2) {
    return null;
  }

  const { column } = table;
  const next = rewriteLines(state.value, table.lines, (text, line, index) => {
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

  return caretAfter(next, table.lines[0].start, table.row, Math.max(0, column - 1));
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
    default:
      return null;
  }
}

/**
 * What `Enter` does in a table, which is what it does in a list.
 *
 * A cell holds one line, so there is nowhere in the file for `Enter` to put a
 * second one. What it does instead is the list's rule said about rows: a new
 * row under this one, with the caret in the same column, and on a row that is
 * still empty the row goes and the caret goes to a line of its own after the
 * table, still inside the quotation or the list item the table is in. That second half is the way out of a table at the end of a document,
 * which otherwise has nowhere after it for a caret to be.
 *
 * `null` outside a table, and for a selection, which `Enter` has no business
 * replacing with a row.
 */
export function continueTable(state: EditState): EditState | null {
  const table = state.start === state.end ? tableAt(state.value, state.start) : null;

  if (!table) {
    return null;
  }

  const { value } = state;
  const line = table.lines[table.row];
  const empty = line.cells.every((cell) => !value.slice(cell.from, cell.to).trim());

  if (table.row === 0 || !empty) {
    return addRow(state, true);
  }

  const last = table.lines[table.lines.length - 1];
  const removed = line.end - line.lineStart + 1;
  const end = line === last ? line.lineStart - 1 : last.end - removed;
  const without = value.slice(0, line.lineStart - 1) + value.slice(line.end);
  // A line of its own after the table, and inside whatever holds it: a
  // quotation's blank line is `>`, and a list item's next line is indented.
  const text = `\n${table.prefix.trimEnd()}\n${table.prefix}`;
  const caret = end + text.length;

  return { value: without.slice(0, end) + text + without.slice(end), start: caret, end: caret };
}
