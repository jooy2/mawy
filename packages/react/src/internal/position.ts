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
 * the padding around a document, or on chrome that is not the document at all.
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

    const own = rangeOf(element) ?? range;

    return offset === 0 ? own.start : own.end;
  }

  const value = (node as Text).data;
  const floor = floorFor(host, node, range.start);
  const found = text.indexOf(value, floor);
  const at = found !== -1 && found + value.length <= range.end ? found : floor;

  return Math.min(at + offset, range.end);
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
