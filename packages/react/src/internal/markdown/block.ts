/**
 * The block parser: what the document is made of before anything is read.
 *
 * Markdown's structure is decided a line at a time and its containers nest, so
 * this is a scanner with recursion rather than a grammar: each pass finds where
 * one block ends, strips whatever prefix its container puts on every line —
 * a `>`, an indent — and parses the inside the same way.
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
  MdTableCell,
  MdTableRow
} from './ast.js';
import { normalizeLabel } from './inline.js';

/** Somewhere a run of inline nodes has to go once there is one. */
export interface PendingInline {
  raw: string;
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

/** Leading indentation removed, up to `width` columns of it. */
function unindent(line: string, width: number): string {
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

  return line.slice(at);
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

/** `# Heading ###` — the depth and what is left after the hashes come off. */
function atxAt(line: string): { depth: number; text: string } | null {
  const match = ATX.exec(line);

  if (!match) {
    return null;
  }

  const text = (match[2] ?? '').replace(/(?:^|[ \t])#+[ \t]*$/, '').trim();

  return { depth: match[1].length, text };
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

/** A row split on its unescaped pipes, with the outer pair dropped. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let at = 0;
  let text = line.trim();

  if (text.startsWith('|')) {
    text = text.slice(1);
  }

  if (/(?:^|[^\\])\|$/.test(text)) {
    text = text.slice(0, -1);
  }

  while (at < text.length) {
    const character = text[at];

    if (character === '\\' && text[at + 1] === '|') {
      cell += '|';
      at += 2;
      continue;
    }

    if (character === '|') {
      cells.push(cell.trim());
      cell = '';
      at += 1;
      continue;
    }

    cell += character;
    at += 1;
  }

  cells.push(cell.trim());

  return cells;
}

function alignmentsOf(line: string): MdAlign[] {
  return splitRow(line).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');

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
function takeDefinitions(text: string, into: Map<string, MdDefinition>): string {
  let rest = text;

  for (let match = DEFINITION.exec(rest); match; match = DEFINITION.exec(rest)) {
    const label = normalizeLabel(match[1]);
    const url = match[2].startsWith('<') ? match[2].slice(1, -1) : match[2];
    const title = match[3] ? match[3].slice(1, -1) : null;

    // First definition wins, which is what every other implementation does.
    if (label && !into.has(label)) {
      into.set(label, { url, title });
    }

    rest = rest.slice(match[0].length);
  }

  return rest;
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

export function parseBlocks(lines: string[], context: BlockContext): MdBlock[] {
  const blocks: MdBlock[] = [];
  let at = 0;

  /** A block whose text is read later, once the definitions are all known. */
  const withInline = <T extends { children: MdInline[] }>(node: T, raw: string): T => {
    context.pending.push({ raw, target: node });

    return node;
  };

  while (at < lines.length) {
    const line = lines[at];

    if (BLANK.test(line)) {
      at += 1;
      continue;
    }

    /* Thematic break — before lists, because `- - -` is a rule and not three
     * empty bullets. */
    if (THEMATIC.test(line)) {
      blocks.push({ type: 'thematicBreak' });
      at += 1;
      continue;
    }

    const atx = atxAt(line);

    if (atx) {
      blocks.push(
        withInline<MdHeading>(
          { type: 'heading', depth: atx.depth, children: [], slug: '' },
          atx.text
        )
      );
      at += 1;
      continue;
    }

    const fence = FENCE.exec(line);

    if (fence) {
      const [, indent, marker, info] = fence;
      const body: string[] = [];
      const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*$`);
      at += 1;

      while (at < lines.length) {
        if (closing.test(lines[at])) {
          at += 1;
          break;
        }

        body.push(unindent(lines[at], indent.length));
        at += 1;
      }

      const words = info.trim().split(/\s+/);

      blocks.push({
        type: 'code',
        // A backtick in an info string is not a language, it is an unclosed
        // span that happens to sit on the fence line.
        lang: words[0] && !words[0].includes('`') ? words[0] : null,
        meta: words.length > 1 ? words.slice(1).join(' ') : null,
        value: body.join('\n')
      });
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];

      while (at < lines.length) {
        const current = lines[at];

        if (QUOTE.test(current)) {
          inner.push(current.replace(/^ {0,3}> ?/, ''));
          at += 1;
          continue;
        }

        // A quotation runs on across a line that forgot its `>`, but only while
        // the paragraph inside it is still open.
        if (
          BLANK.test(current) ||
          inner.length === 0 ||
          BLANK.test(inner[inner.length - 1]) ||
          interrupts(current)
        ) {
          break;
        }

        inner.push(current);
        at += 1;
      }

      let alert: MdAlertKind | null = null;
      const first = ALERT.exec(inner[0] ?? '');

      if (first) {
        alert = first[1].toLowerCase() as MdAlertKind;
        inner.shift();
      }

      blocks.push({ type: 'blockquote', alert, children: parseBlocks(inner, context) });
      continue;
    }

    const marker = markerAt(line);

    if (marker) {
      const items: MdListItem[] = [];
      let loose = false;
      let separated = false;

      while (at < lines.length) {
        const current = markerAt(lines[at]);

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

        const body = [lines[at].slice(Math.min(current.contentIndent, lines[at].length))];
        at += 1;

        let blankInside = false;

        while (at < lines.length) {
          const next = lines[at];

          if (BLANK.test(next)) {
            body.push('');
            blankInside = true;
            at += 1;
            continue;
          }

          if (indentOf(next) >= current.contentIndent) {
            body.push(unindent(next, current.contentIndent));
            at += 1;
            continue;
          }

          // Anything less indented either starts the next item, starts a new
          // block, or is a lazy continuation of a paragraph still open here.
          if (markerAt(next) || blankInside || interrupts(next)) {
            break;
          }

          body.push(next.trimStart());
          at += 1;
        }

        let trailing = false;

        while (body.length && BLANK.test(body[body.length - 1])) {
          body.pop();
          trailing = true;
        }

        separated = trailing;

        let checked: boolean | null = null;
        const task = /^\[([ xX])\](?=[ \t]|$)[ \t]*/.exec(body[0] ?? '');

        if (task && context.gfm) {
          checked = task[1] !== ' ';
          body[0] = body[0].slice(task[0].length);
        }

        const children = parseBlocks(body, context);

        if (children.length > 1 && body.some((each) => BLANK.test(each))) {
          loose = true;
        }

        items.push({ type: 'listItem', checked, children });
      }

      blocks.push({
        type: 'list',
        ordered: marker.ordered,
        start: marker.ordered ? marker.number : 1,
        loose,
        children: items
      });
      continue;
    }

    const html = htmlStartAt(line, false);

    if (html) {
      const body: string[] = [];

      while (at < lines.length) {
        if (html.closer === null && BLANK.test(lines[at])) {
          break;
        }

        body.push(lines[at]);
        at += 1;

        if (html.closer && html.closer.test(body[body.length - 1])) {
          break;
        }
      }

      blocks.push({ type: 'html', value: body.join('\n') });
      continue;
    }

    if (indentOf(line) >= 4) {
      const body: string[] = [];

      while (at < lines.length && (BLANK.test(lines[at]) || indentOf(lines[at]) >= 4)) {
        body.push(unindent(lines[at], 4));
        at += 1;
      }

      while (body.length && BLANK.test(body[body.length - 1])) {
        body.pop();
      }

      blocks.push({ type: 'code', lang: null, meta: null, value: body.join('\n') });
      continue;
    }

    if (
      context.gfm &&
      line.includes('|') &&
      at + 1 < lines.length &&
      DELIMITER_ROW.test(lines[at + 1]) &&
      splitRow(lines[at + 1]).length === splitRow(line).length
    ) {
      const align = alignmentsOf(lines[at + 1]);
      const rows: MdTableRow[] = [];

      const rowOf = (source: string, header: boolean): MdTableRow => {
        const cells = splitRow(source);
        const children: MdTableCell[] = align.map((_, column) =>
          withInline<MdTableCell>({ type: 'tableCell', children: [] }, cells[column] ?? '')
        );

        return { type: 'tableRow', header, children };
      };

      rows.push(rowOf(line, true));
      at += 2;

      while (at < lines.length && !BLANK.test(lines[at]) && !interrupts(lines[at])) {
        rows.push(rowOf(lines[at], false));
        at += 1;
      }

      blocks.push({ type: 'table', align, children: rows });
      continue;
    }

    /* Everything else is a paragraph, up to the first line that is not. */
    const paragraph: string[] = [line];
    at += 1;

    while (at < lines.length) {
      const next = lines[at];

      if (BLANK.test(next)) {
        break;
      }

      const setext = SETEXT.exec(next);

      if (setext) {
        at += 1;
        const text = takeDefinitions(paragraph.join('\n'), context.definitions).trim();

        if (text) {
          blocks.push(
            withInline<MdHeading>(
              { type: 'heading', depth: setext[1][0] === '=' ? 1 : 2, children: [], slug: '' },
              text
            )
          );
        }

        paragraph.length = 0;
        break;
      }

      if (interrupts(next)) {
        break;
      }

      paragraph.push(next);
      at += 1;
    }

    if (paragraph.length) {
      const text = takeDefinitions(paragraph.join('\n'), context.definitions).trim();

      if (text) {
        blocks.push(withInline<MdParagraph>({ type: 'paragraph', children: [] }, text));
      }
    }
  }

  return blocks;
}
