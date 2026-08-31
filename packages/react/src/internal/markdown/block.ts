/**
 * The block parser: what the document is made of before anything is read.
 *
 * Markdown's structure is decided a line at a time and its containers nest, so
 * this is a scanner with recursion rather than a grammar: each pass finds where
 * one block ends, strips whatever prefix its container puts on every line —
 * a `>`, an indent — and parses the inside the same way.
 *
 * Which is why a line here is a `Line` rather than a string. Stripping a prefix
 * makes a shorter line, and a shorter line has different offsets; carrying the
 * offset along means a block nested four containers deep still knows which
 * characters of the document it was read out of.
 *
 * Inline content is *not* parsed here. A link may be written as `[a][ref]` and
 * resolved by a definition that appears at the bottom of the file, so nothing
 * inside a paragraph can be read until every line of the document has been
 * seen. Blocks come out with their text held aside in `pending`, and
 * `parse.ts` reads it once the definitions are all in.
 */

import type {
  MdAlertKind,
  MdAlign,
  MdBlock,
  MdDefinition,
  MdHeading,
  MdInline,
  MdListItem,
  MdParagraph,
  MdRange,
  MdTableCell,
  MdTableRow
} from './ast.js';
import { normalizeLabel } from './inline.js';
import {
  advance,
  append,
  fromLines,
  fromText,
  lineEnd,
  rangeOf,
  slice,
  sourced,
  trim,
  type Line,
  type Sourced
} from './source.js';

/** Somewhere a run of inline nodes has to go once there is one. */
export interface PendingInline {
  raw: Sourced;
  target: { children: MdInline[] };
}

export interface BlockContext {
  gfm: boolean;
  definitions: Map<string, MdDefinition>;
  pending: PendingInline[];
}

/* -------------------------------------------------------------------------
 * Line shapes
 * ---------------------------------------------------------------------- */

const BLANK = /^[ \t]*$/;
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;
const FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;
const THEMATIC = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const QUOTE = /^ {0,3}>/;
const QUOTE_PREFIX = /^ {0,3}> ?/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const BULLET = /^( {0,3})([-+*])([ \t]+|$)/;
const ORDERED = /^( {0,3})(\d{1,9})([.)])([ \t]+|$)/;
const ALERT = /^\[!(note|tip|important|warning|caution)\][ \t]*$/i;

/** How far in a line's first non-space character sits, counting a tab as four. */
function indentOf(line: string): number {
  let width = 0;

  for (const character of line) {
    if (character === ' ') {
      width += 1;
    } else if (character === '\t') {
      width += 4 - (width % 4);
    } else {
      break;
    }
  }

  return width;
}

/** How many characters it takes to walk `width` columns of indentation. */
function indentTaken(line: string, width: number): number {
  let taken = 0;
  let at = 0;

  while (at < line.length && taken < width) {
    if (line[at] === ' ') {
      taken += 1;
    } else if (line[at] === '\t') {
      taken += 4 - (taken % 4);
    } else {
      break;
    }

    at += 1;
  }

  return at;
}

/** Leading indentation removed, up to `width` columns of it. */
function unindent(line: Line, width: number): Line {
  return advance(line, indentTaken(line.text, width));
}

interface Marker {
  ordered: boolean;
  /** `-`, `+`, `*` for a bullet; `.` or `)` for a number. */
  delimiter: string;
  number: number;
  indent: number;
  /** Where the item's content starts, in columns from the left of the line. */
  contentIndent: number;
  /** The line was the marker and nothing else. */
  empty: boolean;
}

function markerAt(line: string): Marker | null {
  const bullet = BULLET.exec(line);
  const ordered = bullet ? null : ORDERED.exec(line);

  if (!bullet && !ordered) {
    return null;
  }

  const indent = (bullet ?? ordered!)[1].length;
  const token = bullet ? bullet[2] : ordered![2];
  const delimiter = bullet ? bullet[2] : ordered![3];
  const width = indent + token.length + (bullet ? 0 : 1);
  const rest = line.slice(width);
  const empty = BLANK.test(rest);
  const padding = indentOf(rest);
  // One space is the marker's own separator. Two to four are the author lining
  // the content up. Five or more is an indented code block inside the item, and
  // only the first of them belongs to the marker.
  const spaces = empty || padding === 0 || padding > 4 ? 1 : padding;

  return {
    ordered: Boolean(ordered),
    delimiter,
    number: ordered ? Number.parseInt(ordered[2], 10) : 1,
    indent,
    contentIndent: width + spaces,
    empty
  };
}

/**
 * `# Heading ###` — the depth, what is left once the hashes come off, and how
 * far into the line that text begins.
 */
function atxAt(line: string): { depth: number; text: string; at: number } | null {
  const match = ATX.exec(line);

  if (!match) {
    return null;
  }

  const body = match[2] ?? '';
  const closed = body.replace(/(?:^|[ \t])#+[ \t]*$/, '');

  return {
    depth: match[1].length,
    text: closed.trim(),
    at: line.length - body.length + (closed.length - closed.trimStart().length)
  };
}

/* -------------------------------------------------------------------------
 * HTML blocks
 * ---------------------------------------------------------------------- */

const RAW_TEXT = /^ {0,3}<(script|pre|style|textarea)(?:[\s>]|$)/i;
const BLOCK_TAGS = new Set(
  (
    'address article aside base basefont blockquote body caption center col colgroup dd details ' +
    'dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 ' +
    'h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup ' +
    'option p param search section summary table tbody td tfoot th thead title tr track ul'
  ).split(' ')
);
const ANY_TAG =
  /^ {0,3}(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<\/[A-Za-z][A-Za-z\d-]*\s*>)[ \t]*$/;

interface HtmlStart {
  /** What ends the block, or `null` for "the next blank line". */
  closer: RegExp | null;
}

/**
 * Whether a line opens an HTML block, and what would close it.
 *
 * `interrupting` is the one bit of nuance: a lone `<span>` on a line after a
 * paragraph is part of that paragraph, not the start of an HTML block. Only the
 * six named shapes may cut a paragraph in half.
 */
function htmlStartAt(line: string, interrupting: boolean): HtmlStart | null {
  if (RAW_TEXT.test(line)) {
    return { closer: /<\/(?:script|pre|style|textarea)>/i };
  }

  if (/^ {0,3}<!--/.test(line)) {
    return { closer: /-->/ };
  }

  if (/^ {0,3}<\?/.test(line)) {
    return { closer: /\?>/ };
  }

  if (/^ {0,3}<!\[CDATA\[/.test(line)) {
    return { closer: /]]>/ };
  }

  if (/^ {0,3}<![A-Za-z]/.test(line)) {
    return { closer: />/ };
  }

  const tag = /^ {0,3}<\/?([A-Za-z][A-Za-z\d-]*)/.exec(line);

  if (tag && BLOCK_TAGS.has(tag[1].toLowerCase())) {
    return { closer: null };
  }

  if (!interrupting && ANY_TAG.test(line)) {
    return { closer: null };
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

const DELIMITER_ROW = /^ {0,3}\|?(?:[ \t]*:?-+:?[ \t]*\|)*[ \t]*:?-+:?[ \t]*\|?[ \t]*$/;

/**
 * A row split on its unescaped pipes, with the outer pair dropped.
 *
 * Each cell comes back knowing where it was written, and an escaped pipe is the
 * only thing that complicates it: `\|` is one character in the cell and two in
 * the document, so the run of text ends there and the next one starts at the
 * pipe the cell actually kept.
 */
function splitRow(line: Line): Sourced[] {
  const leading = line.text.length - line.text.trimStart().length;
  const cells: Sourced[] = [];
  let text = line.text.trim();
  let base = line.start + leading;
  let at = 0;

  if (text.startsWith('|')) {
    text = text.slice(1);
    base += 1;
  }

  if (/(?:^|[^\\])\|$/.test(text)) {
    text = text.slice(0, -1);
  }

  let cell = sourced(base);

  while (at < text.length) {
    const character = text[at];

    if (character === '\\' && text[at + 1] === '|') {
      append(cell, '|', base + at + 1);
      at += 2;
      continue;
    }

    if (character === '|') {
      cells.push(trim(cell));
      at += 1;
      cell = sourced(base + at);
      continue;
    }

    append(cell, character, base + at);
    at += 1;
  }

  cells.push(trim(cell));

  return cells;
}

function alignmentsOf(line: Line): MdAlign[] {
  return splitRow(line).map(({ text }) => {
    const left = text.startsWith(':');
    const right = text.endsWith(':');

    if (left && right) {
      return 'center';
    }

    return left ? 'left' : right ? 'right' : null;
  });
}

/* -------------------------------------------------------------------------
 * Link reference definitions
 * ---------------------------------------------------------------------- */

const DEFINITION =
  /^ {0,3}\[((?:[^\]\\\n]|\\.)+)\]:[ \t]*\n?[ \t]*(<[^<>\n]*>|[^\s<][^\s]*)(?:[ \t\n]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?[ \t]*(?:\n|$)/;

/**
 * Definitions taken off the front of a paragraph, and whatever is left of it.
 *
 * They are only definitions at the *start* of a paragraph — `[a]: /b` on the
 * third line of a sentence is that sentence's third line — which is why this
 * runs against the paragraph rather than against the document.
 */
function takeDefinitions(paragraph: Sourced, into: Map<string, MdDefinition>): Sourced {
  let taken = 0;

  for (
    let match = DEFINITION.exec(paragraph.text.slice(taken));
    match;
    match = DEFINITION.exec(paragraph.text.slice(taken))
  ) {
    const label = normalizeLabel(match[1]);
    const url = match[2].startsWith('<') ? match[2].slice(1, -1) : match[2];
    const title = match[3] ? match[3].slice(1, -1) : null;

    // First definition wins, which is what every other implementation does.
    if (label && !into.has(label)) {
      into.set(label, { url, title });
    }

    taken += match[0].length;
  }

  return taken === 0 ? paragraph : slice(paragraph, taken, paragraph.text.length);
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

/** Whether a line may cut a paragraph short. */
function interrupts(line: string): boolean {
  if (THEMATIC.test(line) || atxAt(line) || FENCE.test(line) || QUOTE.test(line)) {
    return true;
  }

  if (htmlStartAt(line, true)) {
    return true;
  }

  const marker = markerAt(line);

  // A list may cut a paragraph short, but only one that starts something: an
  // empty bullet, or an ordered list starting anywhere but 1, is far more often
  // a line of prose than a list the author meant to begin here.
  return Boolean(marker) && !marker!.empty && (!marker!.ordered || marker!.number === 1);
}

export function parseBlocks(lines: Line[], context: BlockContext): MdBlock[] {
  const blocks: MdBlock[] = [];
  let at = 0;

  /** From the start of one line to the end of another. */
  const across = (first: number, last: number): MdRange => ({
    start: lines[first].start,
    end: lineEnd(lines[last])
  });

  /** A block whose text is read later, once the definitions are all known. */
  const withInline = <T extends { children: MdInline[] }>(node: T, raw: Sourced): T => {
    context.pending.push({ raw, target: node });

    return node;
  };

  while (at < lines.length) {
    const line = lines[at];

    if (BLANK.test(line.text)) {
      at += 1;
      continue;
    }

    /* Thematic break — before lists, because `- - -` is a rule and not three
     * empty bullets. */
    if (THEMATIC.test(line.text)) {
      blocks.push({ type: 'thematicBreak', range: across(at, at) });
      at += 1;
      continue;
    }

    const atx = atxAt(line.text);

    if (atx) {
      blocks.push(
        withInline<MdHeading>(
          { type: 'heading', range: across(at, at), depth: atx.depth, children: [], slug: '' },
          fromText(atx.text, line.start + atx.at)
        )
      );
      at += 1;
      continue;
    }

    const fence = FENCE.exec(line.text);

    if (fence) {
      const [, indent, marker, info] = fence;
      const body: Line[] = [];
      const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*$`);
      const opened = at;
      let last = at;
      at += 1;

      while (at < lines.length) {
        last = at;

        if (closing.test(lines[at].text)) {
          at += 1;
          break;
        }

        body.push(unindent(lines[at], indent.length));
        at += 1;
      }

      const words = info.trim().split(/\s+/);

      const range = across(opened, last);
      // With nothing between the fences there is no line to point at, so the
      // content is the empty place just past the opening one — which is where
      // a caret typing into an empty code block has to land.
      const from = body[0]?.start ?? Math.min(lineEnd(lines[opened]) + 1, range.end);

      blocks.push({
        type: 'code',
        range,
        content: { start: from, end: body.length ? lineEnd(body[body.length - 1]) : from },
        lines: body.map((each) => each.start),
        // A backtick in an info string is not a language, it is an unclosed
        // span that happens to sit on the fence line.
        lang: words[0] && !words[0].includes('`') ? words[0] : null,
        meta: words.length > 1 ? words.slice(1).join(' ') : null,
        value: body.map((each) => each.text).join('\n')
      });
      continue;
    }

    if (QUOTE.test(line.text)) {
      const inner: Line[] = [];
      const opened = at;

      while (at < lines.length) {
        const current = lines[at];

        if (QUOTE.test(current.text)) {
          const prefix = QUOTE_PREFIX.exec(current.text);

          inner.push(advance(current, prefix ? prefix[0].length : 0));
          at += 1;
          continue;
        }

        // A quotation runs on across a line that forgot its `>`, but only while
        // the paragraph inside it is still open.
        if (
          BLANK.test(current.text) ||
          inner.length === 0 ||
          BLANK.test(inner[inner.length - 1].text) ||
          interrupts(current.text)
        ) {
          break;
        }

        inner.push(current);
        at += 1;
      }

      let alert: MdAlertKind | null = null;
      const first = ALERT.exec(inner[0]?.text ?? '');

      if (first) {
        alert = first[1].toLowerCase() as MdAlertKind;
        inner.shift();
      }

      blocks.push({
        type: 'blockquote',
        range: across(opened, at - 1),
        alert,
        children: parseBlocks(inner, context)
      });
      continue;
    }

    const marker = markerAt(line.text);

    if (marker) {
      const items: MdListItem[] = [];
      let loose = false;
      let separated = false;

      while (at < lines.length) {
        const current = markerAt(lines[at].text);

        if (
          !current ||
          current.ordered !== marker.ordered ||
          current.delimiter !== marker.delimiter
        ) {
          break;
        }

        if (separated) {
          loose = true;
        }

        const opened = at;
        const body = [advance(lines[at], Math.min(current.contentIndent, lines[at].text.length))];
        at += 1;

        let blankInside = false;

        while (at < lines.length) {
          const next = lines[at];

          if (BLANK.test(next.text)) {
            body.push({ text: '', start: next.start });
            blankInside = true;
            at += 1;
            continue;
          }

          if (indentOf(next.text) >= current.contentIndent) {
            body.push(unindent(next, current.contentIndent));
            at += 1;
            continue;
          }

          // Anything less indented either starts the next item, starts a new
          // block, or is a lazy continuation of a paragraph still open here.
          if (markerAt(next.text) || blankInside || interrupts(next.text)) {
            break;
          }

          body.push(advance(next, next.text.length - next.text.trimStart().length));
          at += 1;
        }

        let trailing = false;

        while (body.length && BLANK.test(body[body.length - 1].text)) {
          body.pop();
          trailing = true;
        }

        separated = trailing;

        let checked: boolean | null = null;
        const task = /^\[([ xX])\](?=[ \t]|$)[ \t]*/.exec(body[0]?.text ?? '');

        if (task && context.gfm) {
          checked = task[1] !== ' ';
          body[0] = advance(body[0], task[0].length);
        }

        const children = parseBlocks(body, context);

        if (children.length > 1 && body.some((each) => BLANK.test(each.text))) {
          loose = true;
        }

        items.push({
          type: 'listItem',
          range: {
            start: lines[opened].start,
            end: lineEnd(body[body.length - 1] ?? lines[opened])
          },
          checked,
          children
        });
      }

      blocks.push({
        type: 'list',
        range: { start: items[0].range.start, end: items[items.length - 1].range.end },
        ordered: marker.ordered,
        start: marker.ordered ? marker.number : 1,
        loose,
        children: items
      });
      continue;
    }

    const html = htmlStartAt(line.text, false);

    if (html) {
      const body: string[] = [];
      const opened = at;
      let last = at;

      while (at < lines.length) {
        if (html.closer === null && BLANK.test(lines[at].text)) {
          break;
        }

        body.push(lines[at].text);
        last = at;
        at += 1;

        if (html.closer && html.closer.test(body[body.length - 1])) {
          break;
        }
      }

      blocks.push({ type: 'html', range: across(opened, last), value: body.join('\n') });
      continue;
    }

    if (indentOf(line.text) >= 4) {
      const body: Line[] = [];
      const opened = at;

      while (at < lines.length && (BLANK.test(lines[at].text) || indentOf(lines[at].text) >= 4)) {
        body.push(unindent(lines[at], 4));
        at += 1;
      }

      while (body.length && BLANK.test(body[body.length - 1].text)) {
        body.pop();
      }

      blocks.push({
        type: 'code',
        range: {
          start: lines[opened].start,
          end: lineEnd(body[body.length - 1] ?? lines[opened])
        },
        // An indented block is its own content, four spaces in.
        content: {
          start: body[0]?.start ?? lines[opened].start,
          end: lineEnd(body[body.length - 1] ?? lines[opened])
        },
        lines: body.map((each) => each.start),
        lang: null,
        meta: null,
        value: body.map((each) => each.text).join('\n')
      });
      continue;
    }

    if (
      context.gfm &&
      line.text.includes('|') &&
      at + 1 < lines.length &&
      DELIMITER_ROW.test(lines[at + 1].text) &&
      splitRow(lines[at + 1]).length === splitRow(line).length
    ) {
      const align = alignmentsOf(lines[at + 1]);
      const rows: MdTableRow[] = [];
      const opened = at;

      const rowOf = (source: Line, header: boolean): MdTableRow => {
        const cells = splitRow(source);
        const children: MdTableCell[] = align.map((_, column) => {
          const cell = cells[column] ?? sourced(lineEnd(source));

          return withInline<MdTableCell>(
            { type: 'tableCell', range: rangeOf(cell, 0, cell.text.length), children: [] },
            cell
          );
        });

        return {
          type: 'tableRow',
          range: { start: source.start, end: lineEnd(source) },
          header,
          children
        };
      };

      rows.push(rowOf(line, true));
      at += 2;

      while (at < lines.length && !BLANK.test(lines[at].text) && !interrupts(lines[at].text)) {
        rows.push(rowOf(lines[at], false));
        at += 1;
      }

      blocks.push({ type: 'table', range: across(opened, at - 1), align, children: rows });
      continue;
    }

    /* Everything else is a paragraph, up to the first line that is not. */
    const paragraph: Line[] = [line];
    at += 1;

    while (at < lines.length) {
      const next = lines[at];

      if (BLANK.test(next.text)) {
        break;
      }

      const setext = SETEXT.exec(next.text);

      if (setext) {
        const underline = lines[at];
        at += 1;
        const text = trim(takeDefinitions(fromLines(paragraph), context.definitions));

        if (text.text) {
          blocks.push(
            withInline<MdHeading>(
              {
                type: 'heading',
                // Both lines: the underline is as much the heading as the words
                // above it, and a range that stopped short would leave it out
                // of whatever the heading is replaced by.
                range: { start: rangeOf(text, 0, 0).start, end: lineEnd(underline) },
                depth: setext[1][0] === '=' ? 1 : 2,
                children: [],
                slug: ''
              },
              text
            )
          );
        }

        paragraph.length = 0;
        break;
      }

      if (interrupts(next.text)) {
        break;
      }

      paragraph.push(next);
      at += 1;
    }

    if (paragraph.length) {
      const text = trim(takeDefinitions(fromLines(paragraph), context.definitions));

      if (text.text) {
        blocks.push(
          withInline<MdParagraph>(
            { type: 'paragraph', range: rangeOf(text, 0, text.text.length), children: [] },
            text
          )
        );
      }
    }
  }

  return blocks;
}
