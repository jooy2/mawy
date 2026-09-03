/**
 * From a place on the page back to the place in the document.
 *
 * The renderer says where every element came from, which answers the question
 * for anything with a tag around it. Text is the half that cannot: a run of
 * characters has no attributes to carry a range in, and it is also the half
 * that matters, since a caret is almost always inside one.
 *
 * So a run of text is found rather than labelled. It is bounded on the left by
 * whichever element before it last said where it ended, and on the right by the
 * end of whatever element holds it, and the text itself is the search term — a
 * `<strong>` drawn from `**bold**` contains `bold` at exactly one place inside
 * those eight characters. That is exact for anything written as the characters
 * it reads as, and it falls back to the left-hand bound for the rest: a run
 * with a decoded `&amp;` or a backslash escape in it lands a character or two
 * early rather than in the wrong paragraph.
 */

import type { MdRange } from './markdown/ast.js';

/** The range an element says it was drawn from, if it says. */
export function rangeOf(element: Element): MdRange | null {
  const value = element.getAttribute('data-mawy-range');
  const comma = value ? value.indexOf(',') : -1;

  if (comma === -1) {
    return null;
  }

  const start = Number.parseInt(value!.slice(0, comma), 10);
  const end = Number.parseInt(value!.slice(comma + 1), 10);

  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}

/** The innermost element around a node that says where it came from. */
function hostOf(root: Element, node: Node): Element | null {
  let at: Node | null = node;

  while (at) {
    if (at.nodeType === 1 && (at as Element).hasAttribute('data-mawy-range')) {
      return at as Element;
    }

    if (at === root) {
      return null;
    }

    at = at.parentNode;
  }

  return null;
}

/**
 * How far into the document the search for a run of text may start.
 *
 * Everything inside `host` that comes before `node` and knows where it ended,
 * which for a paragraph is the emphasis or the link to the left of the caret.
 * Without it, `a **a** a` would find the first `a` three times.
 */
function floorFor(host: Element, node: Node, start: number): number {
  let floor = start;

  for (const element of host.querySelectorAll('[data-mawy-range]')) {
    if (node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
      const range = rangeOf(element);

      if (range && range.end > floor) {
        floor = range.end;
      }
    }
  }

  return floor;
}

/**
 * Where in `text` the position `(node, offset)` on the page came from.
 *
 * `null` when the node is not inside anything the renderer drew — a click on
 * the padding around a document, or on a control that is not the document at
 * all.
 */
export function sourceAt(root: Element, node: Node, offset: number, text: string): number | null {
  const host = hostOf(root, node);

  if (!host) {
    return null;
  }

  const range = rangeOf(host) as MdRange;

  if (node.nodeType !== 3) {
    const element = node as Element;
    const child = element.childNodes[offset];

    if (child) {
      // A position in an element means "before this child of it", and before
      // an element is outside it: a caret in front of a `<strong>` is in front
      // of the `**` as well, while one at the start of the `<strong>` itself is
      // after them. The two are different places and this is the difference.
      const inside = child.nodeType === 1 ? rangeOf(child as Element) : null;

      return inside ? inside.start : sourceAt(root, child, 0, text);
    }

    // Nothing in it, or nothing left of it: the caret is after whatever the
    // element is written with — after the bullet of an empty list item, after
    // the hashes of an empty heading. There is nowhere else in the file it
    // could be, and the start would be in front of the markers rather than in
    // the element at all.
    return (rangeOf(element) ?? range).end;
  }

  const rows = linesOf(host, node, text);

  for (const row of rows) {
    if (offset <= row.at + row.length) {
      return row.from + Math.max(offset - row.at, 0);
    }
  }

  return Math.min(floorFor(host, node, range.start) + offset, range.end);
}

/**
 * Where each line of a run of text sits in the document, found a line at a time.
 *
 * A run of text is usually the characters it was written with, and then finding
 * it is one search. It is not when the lines it runs across carry a container's
 * prefix: a paragraph inside a quotation reads as `one\ntwo` and is written as
 * `> one\n> two`, and searching for the whole of it finds nothing. So each line
 * is found on its own, starting after the last one — which is exact, and is
 * also how the offsets inside it stay right across the `> ` in the middle.
 *
 * What is left over is a line that is not the characters it was written with at
 * all, because a character reference or a backslash escape was decoded on the
 * way in. Nothing can say where those went; the search stops there and the
 * count carries on from the last thing that was certain.
 */
function linesOf(
  host: Element,
  node: Node,
  text: string
): { at: number; from: number; length: number }[] {
  const range = rangeOf(host) as MdRange;
  const value = (node as Text).data;
  const rows: { at: number; from: number; length: number }[] = [];
  let cursor = floorFor(host, node, range.start);
  let at = 0;

  for (const line of value.split('\n')) {
    const found = text.indexOf(line, cursor);

    if (found === -1 || found + line.length > range.end) {
      break;
    }

    rows.push({ at, from: found, length: line.length });
    at += line.length + 1;

    const newline = text.indexOf('\n', found + line.length);

    cursor = newline === -1 ? found + line.length : newline + 1;
  }

  return rows;
}

/**
 * The place on the page a position in the document is drawn at — `sourceAt`
 * read the other way, which is how a caret survives the document being parsed
 * and drawn again underneath it.
 *
 * The search is narrowed to the innermost element whose range holds the offset
 * before any text is looked at, so an edit in a long document does not walk it.
 * A position that falls inside markup rather than inside anything drawn — the
 * `**` of a bold run — comes back as the nearest place before it, which is
 * where a caret can actually go.
 */
export function domAt(
  root: Element,
  offset: number,
  text: string
): { node: Node; offset: number } | null {
  let host: Element = root;

  for (const element of root.querySelectorAll('[data-mawy-range]')) {
    const range = rangeOf(element);

    if (range && range.start <= offset && offset <= range.end && host.contains(element)) {
      host = element;
    }
  }

  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let fallback: { node: Node; offset: number } | null = null;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const inside = hostOf(root, node);

    if (!inside) {
      continue;
    }

    const rows = linesOf(inside, node, text);

    for (const row of rows) {
      if (offset >= row.from && offset <= row.from + row.length) {
        return { node, offset: row.at + (offset - row.from) };
      }
    }

    if (rows.length && rows[0].from <= offset) {
      fallback = { node, offset: (node as Text).data.length };
    }
  }

  return fallback ?? (host === root ? null : { node: host, offset: 0 });
}

/** The character a point on the page is over, in whichever way the browser has. */
export function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const owner = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const position = owner.caretPositionFromPoint?.(x, y);

  if (position) {
    return { node: position.offsetNode, offset: position.offset };
  }

  // Not a standard, and the only one WebKit had for years.
  const range = owner.caretRangeFromPoint?.(x, y);

  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}
