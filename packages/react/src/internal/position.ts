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
 * it reads as, and for a run with a backslash escape in it, and it falls back to
 * the left-hand bound for the rest: a run with a decoded `&amp;` in it lands a
 * character or two early rather than in the wrong paragraph.
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
 * A line with a backslash escape in it is not the characters it was written
 * with, since `\[` is drawn as `[`, and is found a second way: with a backslash
 * allowed in front of each character that can be escaped, and cut into a row
 * either side of each backslash the search stepped over. A caret beside the
 * bracket is then beside it in the document too, rather than wherever the count
 * from the start of the run had got to.
 *
 * What is left over is a line that is not the characters it was written with at
 * all, because a character reference was decoded on the way in. Nothing can say
 * where that went; the search stops there and the count carries on from the
 * last thing that was certain.
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
    // Spaces the editor draws where the page would not show one are no-break
    // spaces on the page and spaces in the document. See `spaces` in `render.tsx`.
    const spaced = line.includes('\u00a0') && !text.includes(line, cursor);
    const sought = spaced ? line.replace(/\u00a0/g, ' ') : line;
    const found = text.indexOf(sought, cursor);
    const escaped =
      found === -1 || found + line.length > range.end
        ? writtenLine(text, sought, cursor, range.end)
        : null;

    if (escaped) {
      rows.push(...escaped.pieces.map((piece) => ({ ...piece, at: at + piece.at })));
    } else if (found === -1 || found + line.length > range.end) {
      break;
    } else {
      rows.push({ at, from: found, length: line.length });
    }

    const end = escaped ? escaped.end : found + line.length;

    at += line.length + 1;

    const newline = text.indexOf('\n', end);

    cursor = newline === -1 ? end : newline + 1;
  }

  return rows;
}

/** What a backslash can escape in CommonMark: every ASCII punctuation character. */
const ESCAPABLE = /[!-/:-@[-`{-~]/;

/**
 * A run of characters, safe to put in a pattern.
 *
 * Only what has a meaning of its own outside a character class. A `-` must not
 * be on the list: it means nothing out here, and `\\-` is an invalid escape to a
 * pattern built with `u` rather than the hyphen it was meant to be — so a line
 * holding both a backslash escape and a hyphen threw instead of being found.
 */
function quoted(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

/**
 * What a character on the page could have been written as, where the answer is
 * anything other than itself.
 *
 * The typographer draws a mark the author had no key for, so a line with one in
 * it is not the characters it was written with and the plain search for it
 * finds nothing. This is the way back: each of these may also match the run
 * that stands in for it, and the walk below then knows the run was longer than
 * what it drew and cuts a row either side of it. Without it a caret anywhere
 * after the first dash in a line would be placed by counting from the start of
 * the run, which is a character or two out for every mark before it.
 *
 * The quotation marks are one for one and need no row of their own; they are
 * here for the pattern alone, and every mark `MawyQuotes` could be set to is on
 * the list rather than only the two English ones. What is *not* here is the
 * typographer's two collapsing rules — `????` to three and `,,` to one — since
 * a drawn `???` says nothing about how many were written. A line with one of
 * those in it is found by neither search and falls back to counting, the way a
 * line with a character reference in it already does.
 */
const WRITTEN_AS = new Map<string, string[]>([
  ['\u2014', ['---']],
  ['\u2013', ['--']],
  // Longest first: the walk takes the first form that fits, and `...` has to be
  // tried before the `..` inside it.
  ['\u2026', ['...', '..']],
  ['\u00a9', ['(c)', '(C)']],
  ['\u00ae', ['(r)', '(R)']],
  ['\u2122', ['(tm)', '(TM)']],
  ['\u00b1', ['+-']],
  ['\u201c', ['"']],
  ['\u201d', ['"']],
  ['\u201e', ['"']],
  ['\u201f', ['"']],
  ['\u00ab', ['"']],
  ['\u00bb', ['"']],
  ['\u2018', ["'"]],
  ['\u2019', ["'"]],
  ['\u201a', ["'"]],
  ['\u201b', ["'"]],
  ['\u2039', ["'"]],
  ['\u203a', ["'"]]
]);

/**
 * A line the document wrote differently from the way it is drawn — with
 * backslash escapes in it, or with marks the typographer put there — found at
 * or after `cursor` and ending by `limit`, as the rows either side of each
 * place the two disagree. `null` where it is not there that way either.
 */
function writtenLine(
  text: string,
  line: string,
  cursor: number,
  limit: number
): { pieces: { at: number; from: number; length: number }[]; end: number } | null {
  // Only as far as the element the line is drawn in reaches, which is what
  // keeps a line that is not in the document this way either from being a
  // search to the end of it.
  const within = text.slice(cursor, limit);

  if (!line || (!within.includes('\\') && ![...line].some((each) => WRITTEN_AS.has(each)))) {
    return null;
  }

  const pattern = [...line]
    .map((character) => {
      const forms = WRITTEN_AS.get(character);
      const literal = forms
        ? `(?:${[character, ...forms].map(quoted).join('|')})`
        : quoted(character);

      return ESCAPABLE.test(character) ? `\\\\?${literal}` : literal;
    })
    .join('');
  const match = new RegExp(pattern, 'u').exec(within);

  if (!match) {
    return null;
  }

  const start = cursor + match.index;
  const pieces: { at: number; from: number; length: number }[] = [];
  const written = match[0];
  let piece = { at: 0, from: start, length: 0 };

  for (let source = 0, drawn = 0; source < written.length;) {
    if (written[source] === '\\' && written[source + 1] === line[drawn] && line[drawn] !== '\\') {
      pieces.push(piece);
      source += 1;
      piece = { at: drawn, from: start + source, length: 0 };

      continue;
    }

    if (written[source] === '\\' && line[drawn] === '\\' && written[source + 1] === '\\') {
      pieces.push(piece);
      source += 1;
      piece = { at: drawn, from: start + source, length: 0 };
    }

    // A mark the typographer drew, standing for a run longer than itself. The
    // character is left out of both rows on purpose: a caret can be in front of
    // the run or after it and there is nowhere inside it to be.
    const form = WRITTEN_AS.get(line[drawn])?.find(
      (each) => each.length > 1 && written.startsWith(each, source)
    );

    if (form) {
      pieces.push(piece);
      source += form.length;
      drawn += 1;
      piece = { at: drawn, from: start + source, length: 0 };

      continue;
    }

    piece.length += 1;
    source += 1;
    drawn += 1;
  }

  pieces.push(piece);

  return { pieces, end: start + written.length };
}

/**
 * The innermost thing drawn from a place holding `offset`, inside this element.
 *
 * Descended into rather than searched for: an element that says which
 * characters it was drawn from was drawn from all of them, so nothing inside
 * one whose range misses the offset can hold it either, and that subtree is
 * stepped over whole. What is walked is the way down to the answer, not the
 * document.
 */
function drawnAt(element: Element, offset: number): Element | null {
  for (let child = element.firstElementChild; child; child = child.nextElementSibling) {
    const range = rangeOf(child);

    if (range && (offset < range.start || range.end < offset)) {
      continue;
    }

    // A wrapper the renderer put in — the box a wide table scrolls inside —
    // carries no range of its own and is not the answer, but what it holds may
    // be. Nothing found under one goes back to looking at its siblings.
    const deeper = drawnAt(child, offset);

    if (deeper) {
      return deeper;
    }

    if (range) {
      return child;
    }
  }

  return null;
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
  const host: Element = drawnAt(root, offset) ?? root;
  const own = host === root ? null : rangeOf(host);

  // The end of a drawn thing with no text of its own — a line break, a picture
  // — is after it rather than in it: a caret put inside a `<br>` is drawn in
  // front of it, on the line before the one the break starts.
  if (own && own.end === offset && atom(host) && host.parentNode) {
    return {
      node: host.parentNode,
      offset: [...host.parentNode.childNodes].indexOf(host as ChildNode) + 1
    };
  }

  // The root's own document rather than the global one, which is what every
  // other place in this library that reaches for a document uses. An editor
  // rendered through a portal into another window has a root whose document is
  // not this one.
  const walker = root.ownerDocument.createTreeWalker(host, NodeFilter.SHOW_TEXT);
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

  // Just after a drawn thing with no text of its own — a line break with
  // nothing written after it yet, at the end of a table cell — is a place of its
  // own, on the line the break starts, and the end of the text before the break
  // is on the line above it.
  for (const each of host.querySelectorAll(
    'br[data-mawy-range], img[data-mawy-range], [data-mawy-atom][data-mawy-range]'
  )) {
    const range = rangeOf(each);

    if (range && range.end === offset && each.parentNode) {
      return {
        node: each.parentNode,
        offset: [...each.parentNode.childNodes].indexOf(each as ChildNode) + 1
      };
    }
  }

  return fallback ?? (host === root ? null : { node: host, offset: 0 });
}

/**
 * What is drawn as one thing with no text of its own a caret goes into: a line
 * break, a picture, and whatever the renderer marks as one, which is the marker
 * of a line of a cell written as a list item.
 */
function atom(element: Element): boolean {
  return /^(?:BR|IMG)$/.test(element.tagName) || element.hasAttribute('data-mawy-atom');
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
