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
  MdContainerDirective,
  MdDefinition,
  MdDefinitionDescription,
  MdDefinitionTerm,
  MdFootnoteDefinition,
  MdHeading,
  MdInline,
  MdLeafDirective,
  MdListItem,
  MdParagraph,
  MdRange,
  MdTableCell,
  MdTableRow
} from './ast.js';
import { readDirectiveHead, type DirectiveHead } from './directive.js';
import { decodeEntities } from './entities.js';
import { normalizeLabel, unescaped } from './inline.js';
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
  /** The empty list the parsed nodes are put into. */
  target: MdInline[];
}

export interface BlockContext {
  gfm: boolean;
  /** Whether `Term` over `: what it means` is a definition list. */
  definitionLists: boolean;
  definitions: Map<string, MdDefinition>;
  /** Footnotes, lifted out of the flow wherever in the document they were written. */
  footnotes: Map<string, MdFootnoteDefinition>;
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
const FOOTNOTE = /^ {0,3}\[\^([^\]\n]+)\]:[ \t]*/;
/**
 * What opens a definition's meaning.
 *
 * The space after the colon is not decoration. `:warning:` at the start of a
 * line under a sentence is an emoji shortcode in half the documents on the
 * internet, and without the space every one of them would become a definition
 * list with the sentence above as its term.
 */
const DESCRIBES = /^ {0,3}:[ \t]+/;
const DIRECTIVE_INDENT = /^ {0,3}/;
const TRAILING = /^[ \t]*$/;

/** How far a block that opened on one line has to be indented to carry on. */
const CONTINUATION = 4;

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

interface DirectiveLine {
  /** How many colons opened it: two is a leaf, three or more a container. */
  colons: number;
  indent: number;
  head: DirectiveHead;
}

/**
 * A line that is a directive and nothing else.
 *
 * The colons have to be followed immediately by the name — `::: tip` with a
 * space is a paragraph, which is what it was before this syntax existed and
 * what every document that already writes containers that way still means —
 * and nothing but whitespace may follow the head, because a line with words
 * after it is a line of prose that happens to start with punctuation.
 */
function directiveAt(line: string): DirectiveLine | null {
  const indent = DIRECTIVE_INDENT.exec(line)![0].length;
  let at = indent;
  let colons = 0;

  while (line[at] === ':') {
    colons += 1;
    at += 1;
  }

  if (colons < 2) {
    return null;
  }

  const head = readDirectiveHead(line, at);

  return head && TRAILING.test(line.slice(head.end)) ? { colons, indent, head } : null;
}

const RAW_TEXT = /^ {0,3}<(script|pre|style|textarea)(?:[\s>]|$)/i;
const BLOCK_TAGS = new Set(
  (
    'address article aside base basefont blockquote body caption center col colgroup dd details ' +
    'dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 ' +
    'h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup ' +
    'option p param search section summary table tbody td tfoot th thead title tr track ul'
  ).split(' ')
);
// The attribute name is the specification's, the same as in `inline.ts` and
// for the same reason: a line reading `<a h*#ref="hi">` is a paragraph about a
// tag rather than a block of HTML.
const ANY_TAG =
  /^ {0,3}(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[A-Za-z_:][A-Za-z\d_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<\/[A-Za-z][A-Za-z\d-]*\s*>)[ \t]*$/;

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

// The label may run over more than one line, and may not hold a bracket of
// either kind unescaped. Both are the specification's: a paragraph has no blank
// line in it, so "any character but a bracket" cannot run away, and `[ref[]` is
// a label with an unmatched bracket in it and therefore not a definition at
// all.
const DEFINITION =
  /^ {0,3}\[((?:[^[\]\\]|\\.)+)\]:[ \t]*\n?[ \t]*(<[^<>\n]*>|[^\s<][^\s]*)(?:[ \t\n]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?[ \t]*(?:\n|$)/;

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

    // A label of nothing but whitespace is not a label, and the line it is
    // written on is not a definition: it stays the paragraph it was. Taking it
    // off and dropping it on the floor would lose the line.
    if (!label) {
      break;
    }

    // The scan keeps the characters as written, so the escapes and the
    // references in a destination and a title are read here — the same reading
    // an inline `(url "title")` gets while it is being scanned.
    const raw = match[2].startsWith('<') ? match[2].slice(1, -1) : match[2];
    const url = decodeEntities(unescaped(raw));
    const title = match[3] ? decodeEntities(unescaped(match[3].slice(1, -1))) : null;

    // First definition wins, which is what every other implementation does.
    if (!into.has(label)) {
      into.set(label, { url, title });
    }

    taken += match[0].length;
  }

  return taken === 0 ? paragraph : slice(paragraph, taken, paragraph.text.length);
}

/* -------------------------------------------------------------------------
 * Blocks that open on one line and carry on indented
 * ---------------------------------------------------------------------- */

/**
 * The lines belonging to something that opened on this one.
 *
 * A footnote's second paragraph and a definition's second block are both this
 * shape: indented far enough to be inside, blank lines kept because they
 * separate the blocks in there, and a line that is neither taken anyway if the
 * paragraph above it is still open — which is the lazy continuation every
 * container in Markdown allows and every reader relies on without knowing.
 */
function takeIndented(
  lines: Line[],
  from: number,
  width: number,
  opened: boolean
): { body: Line[]; at: number } {
  const body: Line[] = [];
  let at = from;
  let blankInside = false;
  let running = opened;

  while (at < lines.length) {
    const next = lines[at];

    if (BLANK.test(next.text)) {
      body.push({ text: '', start: next.start });
      blankInside = true;
      running = false;
      at += 1;
      continue;
    }

    if (indentOf(next.text) >= width) {
      body.push(unindent(next, width));
      blankInside = false;
      running = true;
      at += 1;
      continue;
    }

    if (!running || blankInside || interrupts(next.text) || DESCRIBES.test(next.text)) {
      break;
    }

    body.push({ ...advance(next, next.text.length - next.text.trimStart().length), lazy: true });
    at += 1;
  }

  while (body.length && BLANK.test(body[body.length - 1].text)) {
    body.pop();
    at -= 1;
  }

  return { body, at };
}

/**
 * Whether a definition list starts here.
 *
 * A term looks exactly like a paragraph until the line under it opens with a
 * colon, so the only way to know is to read ahead — over as many terms as were
 * written, and over the one blank line that is allowed between the last of them
 * and the first meaning.
 */
function describesAhead(lines: Line[], from: number): boolean {
  let at = from;
  let terms = 0;

  while (at < lines.length && terms < 8) {
    const text = lines[at].text;

    if (DESCRIBES.test(text)) {
      return terms > 0;
    }

    if (BLANK.test(text)) {
      // One blank line, and only after a term: two is the end of the paragraph.
      return terms > 0 && at + 1 < lines.length && DESCRIBES.test(lines[at + 1].text);
    }

    if (terms > 0 && interrupts(text)) {
      return false;
    }

    terms += 1;
    at += 1;
  }

  return false;
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

/**
 * Whether a blank line inside an item is one that separates what is in it.
 *
 * The question looseness turns on. A list item holds every line under it,
 * including the ones inside whatever is nested there, and a blank line in the
 * middle of a fenced block says nothing about the item — so the line has to be
 * past the end of one of the item's own blocks to count.
 *
 * Past the end of one and inside none of them, rather than between two, which
 * is a difference of one example: an item whose last lines are a reference
 * definition has a blank line with a block above it and nothing below, because
 * a definition is taken off the paragraph before anything here counts what is
 * left. The blank line is still a blank line, and the list is still loose.
 * Blank lines at the end of an item are gone by the time this is asked, so
 * there is always something under one that is left.
 */
function separates(line: Line, blocks: MdBlock[]): boolean {
  if (!BLANK.test(line.text)) {
    return false;
  }

  // Inside one of them is the nested list's blank line rather than this item's,
  // and it loosens that list where it is counted rather than this one.
  if (blocks.some((block) => block.range.start <= line.start && line.start < block.range.end)) {
    return false;
  }

  return blocks.some((block) => block.range.end <= line.start);
}

/** Whether a line may cut a paragraph short. */
function interrupts(line: string): boolean {
  if (THEMATIC.test(line) || atxAt(line) || FENCE.test(line) || QUOTE.test(line)) {
    return true;
  }

  if (directiveAt(line)) {
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

/**
 * What a container has open, at the end of the lines it has taken so far.
 *
 * Only a paragraph may be continued lazily — a line that arrived without the
 * `>` its quotation is written with belongs to the quotation because there is
 * a paragraph up there still waiting for its next line, and for no other
 * reason. A fence the quotation opened, or code it indented, is not waiting
 * for anything: the line below belongs to whatever is beside the quotation.
 *
 * This is a reading of the lines rather than a parse of them, which is what
 * makes it affordable — the quotation is scanned once, a line at a time, as it
 * is taken. It stops reading at the first line that opens a container of its
 * own: what is open inside a list inside a quotation is a question about the
 * list, and answering it here would be the block scanner written twice. There
 * the answer is `unknown`, and an unknown carries on running the line the way
 * it always has.
 */
interface Opened {
  what: 'paragraph' | 'other' | 'unknown';
  /** What would close the fenced block, while one is open. */
  fence: RegExp | null;
}

const NOTHING_OPEN: Opened = { what: 'other', fence: null };

function opened(state: Opened, text: string): Opened {
  if (state.fence) {
    return state.fence.test(text) ? NOTHING_OPEN : state;
  }

  if (state.what === 'unknown') {
    return state;
  }

  if (BLANK.test(text)) {
    return NOTHING_OPEN;
  }

  const fence = indentOf(text) < 4 ? FENCE.exec(text) : null;

  if (fence && (fence[2][0] !== '`' || !fence[3].includes('`'))) {
    return {
      what: 'other',
      fence: new RegExp(`^ {0,3}${fence[2][0]}{${fence[2].length},}[ \\t]*$`)
    };
  }

  // A container of its own, and the end of what this can say about the lines.
  if (QUOTE.test(text) || markerAt(text) || FOOTNOTE.test(text) || DESCRIBES.test(text)) {
    return { what: 'unknown', fence: null };
  }

  if (state.what === 'paragraph') {
    return interrupts(text) ? NOTHING_OPEN : { what: 'paragraph', fence: null };
  }

  // Nothing was open, so four columns of indentation is code rather than the
  // start of a paragraph — which is the one thing about a lazy continuation
  // that is easy to get wrong and impossible to see.
  if (indentOf(text) >= 4 || interrupts(text)) {
    return NOTHING_OPEN;
  }

  return { what: 'paragraph', fence: null };
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
    context.pending.push({ raw, target: node.children });

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

    // A backtick fence's info string may not hold a backtick, and a line that
    // breaks that rule is not a fence at all — it is the paragraph it looks
    // like, with a code span somewhere in it. ``` ``` ``` on a line of its own
    // is a span holding one space, and reading it as an empty code block would
    // swallow everything under it until something closed the fence.
    if (fence && (fence[2][0] !== '`' || !fence[3].includes('`'))) {
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
        // A tilde fence may have a backtick in its info string, and then it is
        // part of the language rather than a span: this is only reached at all
        // when the fence allowed it.
        lang: words[0] ? decodeEntities(unescaped(words[0])) : null,
        meta: words.length > 1 ? words.slice(1).join(' ') : null,
        value: body.map((each) => each.text).join('\n')
      });
      continue;
    }

    /* A directive, which is a shape rather than a meaning. */
    const directive = directiveAt(line.text);

    if (directive) {
      const { colons, indent, head } = directive;
      const opened = at;
      /** The `[label]`, in the document's own offsets. */
      const label = head.label
        ? fromText(line.text.slice(head.label.start, head.label.end), line.start + head.label.start)
        : null;

      at += 1;

      if (colons === 2) {
        const node: MdLeafDirective = {
          type: 'leafDirective',
          range: across(opened, opened),
          name: head.name,
          attributes: head.attributes,
          children: []
        };

        if (label) {
          context.pending.push({ raw: label, target: node.children });
        }

        blocks.push(node);
        continue;
      }

      const body: Line[] = [];
      // At least as many colons as opened it and nothing else on the line,
      // which is what lets `::::` hold a `:::` without being closed by it.
      const closing = new RegExp(`^ {0,3}:{${colons},}[ \\t]*$`);
      let last = opened;

      while (at < lines.length) {
        last = at;

        if (closing.test(lines[at].text)) {
          at += 1;
          break;
        }

        body.push(unindent(lines[at], indent));
        at += 1;
      }

      const node: MdContainerDirective = {
        type: 'containerDirective',
        range: across(opened, last),
        name: head.name,
        attributes: head.attributes,
        label: [],
        children: parseBlocks(body, context)
      };

      if (label) {
        context.pending.push({ raw: label, target: node.label });
      }

      blocks.push(node);
      continue;
    }

    if (QUOTE.test(line.text)) {
      const inner: Line[] = [];
      const from = at;
      let inside: Opened = NOTHING_OPEN;

      while (at < lines.length) {
        const current = lines[at];

        if (QUOTE.test(current.text)) {
          const prefix = QUOTE_PREFIX.exec(current.text);
          const taken = advance(current, prefix ? prefix[0].length : 0);

          inside = opened(inside, taken.text);
          inner.push(taken);
          at += 1;
          continue;
        }

        // A quotation runs on across a line that forgot its `>`, but only while
        // there is a paragraph inside it still waiting for its next line.
        if (BLANK.test(current.text) || inside.what === 'other' || interrupts(current.text)) {
          break;
        }

        inside = opened(inside, current.text);
        inner.push({ ...current, lazy: true });
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
        range: across(from, at - 1),
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
        // A thematic break wins wherever both readings are possible, inside a
        // list as much as outside one: `* * *` on the second line of a list of
        // `*` items is a rule that ends the list, not an item with two more
        // bullets in it.
        if (THEMATIC.test(lines[at].text)) {
          break;
        }

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
        /** Whether blank lines ended the item rather than being inside it. */
        let endedOnBlank = false;

        while (at < lines.length) {
          const next = lines[at];

          if (BLANK.test(next.text)) {
            // An item may begin with at most one blank line. One that is still
            // empty when a second arrives has ended, and what comes after it is
            // beside the list rather than inside the item — but the blank lines
            // belong to the *list*, which is why they are taken here rather
            // than left for whatever comes next, and why they still separate
            // this item from the one below it.
            if (body.every((each) => BLANK.test(each.text))) {
              while (at < lines.length && BLANK.test(lines[at].text)) {
                at += 1;
              }

              endedOnBlank = true;
              break;
            }

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

          body.push({
            ...advance(next, next.text.length - next.text.trimStart().length),
            lazy: true
          });
          at += 1;
        }

        let trailing = false;

        while (body.length && BLANK.test(body[body.length - 1].text)) {
          body.pop();
          trailing = true;
        }

        // An item with nothing in it and no blank line after it does not
        // separate itself from the item below: the emptiness is the item rather
        // than a gap, and a list of empty items is a tight list.
        separated = endedOnBlank || (trailing && body.length > 0);

        let checked: boolean | null = null;
        const task = /^\[([ xX])\](?=[ \t]|$)[ \t]*/.exec(body[0]?.text ?? '');

        if (task && context.gfm) {
          checked = task[1] !== ' ';
          body[0] = advance(body[0], task[0].length);
        }

        const children = parseBlocks(body, context);

        if (body.some((each) => separates(each, children))) {
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

    /* A footnote, which is written here and read at the bottom. */
    const footnote = FOOTNOTE.exec(line.text);

    if (footnote) {
      const opened = at;
      const first = advance(line, footnote[0].length);
      const body: Line[] = first.text.trim() ? [first] : [];

      at += 1;

      const rest = takeIndented(lines, at, CONTINUATION, body.length > 0);

      body.push(...rest.body);
      at = rest.at;

      const label = normalizeLabel(footnote[1]);
      const last = body[body.length - 1];

      // First definition wins, as it does for a link reference: two footnotes
      // with the same name are one footnote and a mistake.
      if (label && !context.footnotes.has(label)) {
        context.footnotes.set(label, {
          type: 'footnoteDefinition',
          range: { start: line.start, end: last ? lineEnd(last) : lineEnd(line) },
          label,
          slug: '',
          number: 0,
          children: parseBlocks(body, context)
        });
      }

      // Nothing is pushed: a footnote is not where it was written. If the label
      // was unreadable the lines are gone with it, which is the same thing that
      // happens to a link reference definition nobody can use.
      if (at === opened) {
        at += 1;
      }

      continue;
    }

    /* A term and what it means, if the line under this one opens with a colon. */
    if (context.definitionLists && !DESCRIBES.test(line.text) && describesAhead(lines, at)) {
      const opened = at;
      const children: (MdDefinitionTerm | MdDefinitionDescription)[] = [];
      let loose = false;
      let last = line;

      while (at < lines.length) {
        const round = at;
        const terms: Line[] = [];

        while (
          at < lines.length &&
          !BLANK.test(lines[at].text) &&
          !DESCRIBES.test(lines[at].text)
        ) {
          if (terms.length && interrupts(lines[at].text)) {
            break;
          }

          terms.push(lines[at]);
          at += 1;
        }

        // A blank line between a term and its meaning is what makes the whole
        // list loose, exactly as it is in a bullet list.
        if (
          at < lines.length &&
          BLANK.test(lines[at].text) &&
          DESCRIBES.test(lines[at + 1]?.text ?? '')
        ) {
          loose = true;
          at += 1;
        }

        if (!DESCRIBES.test(lines[at]?.text ?? '')) {
          at = round;
          break;
        }

        for (const term of terms) {
          children.push(
            withInline<MdDefinitionTerm>(
              {
                type: 'definitionTerm',
                range: { start: term.start, end: lineEnd(term) },
                children: []
              },
              fromText(
                term.text.trim(),
                term.start + (term.text.length - term.text.trimStart().length)
              )
            )
          );
          last = term;
        }

        while (at < lines.length) {
          const marker = DESCRIBES.exec(lines[at].text);

          if (!marker) {
            break;
          }

          const from = lines[at];
          const head = advance(from, marker[0].length);
          const body: Line[] = head.text.trim() ? [head] : [];

          at += 1;

          const rest = takeIndented(lines, at, CONTINUATION, body.length > 0);

          body.push(...rest.body);
          at = rest.at;
          last = body[body.length - 1] ?? from;

          children.push({
            type: 'definitionDescription',
            range: { start: from.start, end: lineEnd(last) },
            children: parseBlocks(body, context)
          });

          if (at < lines.length && BLANK.test(lines[at].text)) {
            if (DESCRIBES.test(lines[at + 1]?.text ?? '')) {
              loose = true;
              at += 1;
            } else {
              break;
            }
          }
        }

        // A blank line and then another term is the same list, spaced out —
        // and spaced out is what a loose list is, exactly as it is for bullets.
        if (at < lines.length && BLANK.test(lines[at].text) && describesAhead(lines, at + 1)) {
          loose = true;
          at += 1;
          continue;
        }

        if (!(at < lines.length && !BLANK.test(lines[at].text) && describesAhead(lines, at))) {
          break;
        }
      }

      if (children.length) {
        blocks.push({
          type: 'definitionList',
          range: { start: lines[opened].start, end: lineEnd(last) },
          loose,
          children
        });

        continue;
      }

      at = opened;
    }

    /* Everything else is a paragraph, up to the first line that is not. */
    const paragraph: Line[] = [line];
    at += 1;

    while (at < lines.length) {
      const next = lines[at];

      if (BLANK.test(next.text)) {
        break;
      }

      // A setext underline cannot be a lazy continuation line. `> foo`, then
      // `bar`, then `===` is a quoted paragraph of three lines and not a
      // heading: the `===` arrived without the `>` that would have made it a
      // line of the quotation in its own right, and a line taken that way is
      // the paragraph's next line and nothing else.
      const setext = next.lazy ? null : SETEXT.exec(next.text);

      if (setext) {
        const underline = lines[at];
        at += 1;
        const text = trim(takeDefinitions(fromLines(paragraph), context.definitions));

        if (!text.text) {
          // The paragraph was nothing but definitions, and a definition is not
          // something an underline can underline. So there is no heading here:
          // the line of `=` is the first line of the paragraph that follows.
          paragraph.length = 0;
          paragraph.push(underline);
          continue;
        }

        blocks.push(
          withInline<MdHeading>(
            {
              type: 'heading',
              // Both lines: the underline is as much the heading as the words
              // above it, and a range that stopped short would leave it out of
              // whatever the heading is replaced by.
              range: { start: rangeOf(text, 0, 0).start, end: lineEnd(underline) },
              depth: setext[1][0] === '=' ? 1 : 2,
              children: [],
              slug: ''
            },
            text
          )
        );

        paragraph.length = 0;
        break;
      }

      // A lazily taken line cannot cut the paragraph short either, for the
      // same reason it cannot underline it: it is here *because* the paragraph
      // is open, and a container hands it over with its indentation gone —
      // which is how ` - e`, four columns in and not a marker where it was
      // written, arrives looking like one.
      if (!next.lazy && interrupts(next.text)) {
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
