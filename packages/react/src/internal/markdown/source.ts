/**
 * Where the text a node was parsed from sits in the document.
 *
 * The parser reads Markdown by taking it apart. A blockquote hands its inside
 * to the block scanner with every `>` removed; a list item hands over its
 * content with the marker and the indent gone; a paragraph is a run of lines
 * joined back together before a single character inside it is read. Each of
 * those steps makes a *new* string, and an offset into a new string is no
 * longer an offset into the document.
 *
 * Which is a problem the moment anything wants to go the other way — a preview
 * that scrolls with the source, a rendered document edited in place — so the
 * two shapes below carry the document offset along with the text. `Line` is one
 * line after its container has taken its prefix off. `Sourced` is text
 * assembled out of several pieces, which is what a paragraph, a heading and a
 * table cell all are by the time the inline parser sees them.
 */

import type { MdRange } from './ast.js';

/* -------------------------------------------------------------------------
 * Lines
 * ---------------------------------------------------------------------- */

/** One line of the document, after whatever contains it took its prefix off. */
export interface Line {
  /** The line, without its newline. */
  text: string;
  /** Where `text[0]` sits in the document. */
  start: number;
  /**
   * Whether the container this line is inside took it without its prefix.
   *
   * The lazy continuation: a line under `> foo` that forgot its own `>` is
   * still part of the quotation, because the paragraph up there is still open.
   * It is *only* that, though — a lazily taken line is the paragraph's next
   * line and cannot be anything else, which is the whole reason this is
   * written down rather than inferred from the text.
   */
  lazy?: boolean;
}

/** Where a line's last character ends. */
export function lineEnd(line: Line): number {
  return line.start + line.text.length;
}

/** The same line with `count` characters taken off the front. */
export function advance(line: Line, count: number): Line {
  return { text: line.text.slice(count), start: line.start + count };
}

/* -------------------------------------------------------------------------
 * Assembled text
 * ---------------------------------------------------------------------- */

/** A run of assembled text that came from one unbroken run of the document. */
interface Span {
  /** Where the run starts in the assembled text. */
  at: number;
  /** Where it starts in the document. */
  from: number;
  length: number;
}

/**
 * Text built out of pieces of a document, which remembers where each came from.
 *
 * Every piece is a run the two strings agree on character for character, so a
 * position inside one is a position inside the other. Anything that rewrites
 * what it copies — a table cell turning `\|` into a pipe — ends the run and
 * starts the next one at the character it actually kept.
 */
export interface Sourced {
  text: string;
  spans: Span[];
}

/**
 * Empty text, anchored where it would start.
 *
 * The anchor is a span of no length, and it is there so that text which stays
 * empty — a table cell with nothing in it — still knows where in the document
 * it was not written.
 */
export function sourced(from = 0): Sourced {
  return { text: '', spans: [{ at: 0, from, length: 0 }] };
}

/**
 * Text known to be one unbroken run of the document, added to the end.
 *
 * Runs that turn out to continue each other are joined, so the common case —
 * a paragraph whose lines are simply the document's lines — ends up as one
 * span rather than one per line.
 */
export function append(into: Sourced, text: string, from: number): void {
  if (!text) {
    return;
  }

  const last = into.spans[into.spans.length - 1];

  if (last && last.from + last.length === from) {
    last.length += text.length;
  } else {
    into.spans.push({ at: into.text.length, from, length: text.length });
  }

  into.text += text;
}

/** One unbroken run of the document, on its own. */
export function fromText(text: string, from: number): Sourced {
  const out = sourced(from);

  append(out, text, from);

  return out;
}

/** A run of lines, joined back into the one text their newlines separate. */
export function fromLines(lines: Line[]): Sourced {
  const out = sourced(lines[0]?.start ?? 0);

  lines.forEach((line, index) => {
    if (index > 0) {
      append(out, '\n', lineEnd(lines[index - 1]));
    }

    append(out, line.text, line.start);
  });

  return out;
}

/** The last span starting at or before `index`, or `null` before the first. */
function spanAt(source: Sourced, index: number): Span | null {
  const { spans } = source;
  let low = 0;
  let high = spans.length - 1;
  let found: Span | null = null;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (spans[middle].at <= index) {
      found = spans[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/** Where the character at `index` sits in the document. */
export function startOffset(source: Sourced, index: number): number {
  const span = spanAt(source, index);

  if (!span) {
    return source.spans[0]?.from ?? 0;
  }

  return span.from + Math.min(index - span.at, span.length);
}

/**
 * Where the character *before* `index` ends.
 *
 * The two ends of a range are asked for differently on purpose. A position
 * between two spans belongs to the run that ended there when it closes a node
 * and to the run that starts there when it opens one, and taking the same
 * answer for both would give a node the gap between them.
 */
export function endOffset(source: Sourced, index: number): number {
  if (index <= 0) {
    return startOffset(source, 0);
  }

  const span = spanAt(source, index - 1);

  return span ? span.from + (index - span.at) : startOffset(source, index);
}

/** The document a slice of assembled text came from, as a range. */
export function rangeOf(source: Sourced, start: number, end: number): MdRange {
  const from = startOffset(source, start);

  return end <= start ? { start: from, end: from } : { start: from, end: endOffset(source, end) };
}

/** The part between two positions, still knowing where it came from. */
export function slice(source: Sourced, start: number, end: number): Sourced {
  const out: Sourced = { text: source.text.slice(start, end), spans: [] };

  for (const span of source.spans) {
    const from = Math.max(span.at, start);
    const to = Math.min(span.at + span.length, end);

    if (to > from) {
      out.spans.push({ at: from - start, from: span.from + (from - span.at), length: to - from });
    }
  }

  if (out.spans.length === 0) {
    out.spans.push({ at: 0, from: startOffset(source, start), length: 0 });
  }

  return out;
}

/** The same text with the whitespace at each end taken off. */
export function trim(source: Sourced): Sourced {
  const start = source.text.length - source.text.trimStart().length;
  const end = source.text.trimEnd().length;

  if (start === 0 && end === source.text.length) {
    return source;
  }

  return slice(source, start, Math.max(end, start));
}
