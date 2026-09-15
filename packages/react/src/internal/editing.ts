/**
 * What typing into the drawn document does to the Markdown behind it.
 *
 * The document on screen is a drawing of a string, and the string is what is
 * true. So every `beforeinput` is refused, turned into an edit to that string,
 * and the document is drawn again from what the string became. Nothing is ever
 * read back out of the tree the browser would have changed, which is the whole
 * point: there is one parser, one renderer, and no second implementation
 * turning a page back into Markdown and disagreeing with the first.
 *
 * Everything here works in the two coordinate systems at once — a place on the
 * page and a place in the document — and `position.ts` is what moves between
 * them. The rules that look odd are the ones where those two disagree: the
 * character before a caret at the start of a paragraph is in the paragraph
 * above, and the thing between them is a blank line rather than a character, so
 * backspace there removes a separator rather than a letter.
 */

import { continueList, continueTable } from './commands.js';
import type { MdRange } from './markdown/ast.js';
import { parseMarkdown, type MarkdownOptions } from './markdown/parse.js';
import { markdownFromHtml } from './markdown/paste.js';
import { rangeOf, sourceAt } from './position.js';
import { ruleFor } from './rules.js';

/**
 * A caret the page had nowhere to draw, and the place it settled for.
 *
 * Markdown does not keep the whitespace at the end of a line, so a space typed
 * at the end of a paragraph is in the file and is drawn nowhere at all. The
 * caret comes back in front of it, because in front of it is the only place on
 * the page there is — and read back from there, the next thing typed goes in
 * front of the space as well, which leaves the space at the end for good and
 * makes `One two` impossible to type a word at a time.
 *
 * So the place the caret was *meant* to be is kept beside the place it went,
 * and is answered with instead for as long as the caret has not moved off that
 * spot and the document is still the one it was measured against.
 */
export interface MawyAim {
  /** The document this was measured against. */
  value: string;
  /** Where the caret was meant to be, in that document. */
  at: number;
  node: Node;
  offset: number;
}

/**
 * A run of text a drag has taken out of the document but not yet put back.
 *
 * Dragging a run from one place in the drawn document to another arrives as
 * two input events, one after the other and both measured against the document
 * as it stands: the taking out, and then the putting in. Answering them one at
 * a time means answering the second against a document the first had already
 * changed — so the second wins, nothing is taken out, and the run is copied
 * rather than moved.
 *
 * So the first is written down here instead of done, and the two become one
 * edit when the second arrives. Anything else that happens first clears it,
 * which is what keeps a drag that ended somewhere else from taking a bite out
 * of the document later.
 */
export interface MawyDrag {
  taken: { start: number; end: number } | null;
}

/** A document after an edit, and where the caret goes once it is drawn again. */
export interface MawyEdit {
  value: string;
  caret: number;
  /**
   * The caret ended up between two blocks, where nothing is drawn yet. Markdown
   * has no way to write an empty paragraph — a blank line is a separator and
   * two of them are the same separator — so the surface draws one, in that one
   * place, until there is something in it.
   */
  betweenBlocks?: boolean;
}

/**
 * The smallest thing on the page that holds a run of text of its own.
 *
 * Not the outermost block: a list item is one of these and so is each paragraph
 * inside a loose one, because what this answers is "are these two places in the
 * same run of text", and backspace at the start of the second of them is a
 * question about the boundary rather than about a character.
 */
const BLOCKS =
  'p, h1, h2, h3, h4, h5, h6, li, dt, dd, td, th, blockquote, pre, .mawy-md-html-source, ' +
  '.mawy-md-directive-source, .mawy-md-source';

/**
 * Where an edit cannot go, whatever it is.
 *
 * Raw HTML that is being *drawn* rather than shown reached the page through
 * `dangerouslySetInnerHTML`, which means React does not know what is inside it
 * and could not put it back. The caret does not rest in one — the drawn surface
 * writes out whatever it is inside, and markup written out is
 * `.mawy-md-source`, which is on the list above — but a click lands in the
 * drawn form for the render it takes to notice, and this is what says no in the
 * meantime.
 *
 * `.mawy-md-html-source` and `.mawy-md-directive-source` are on that list for
 * the better reason: what is drawn there is the characters of the source, one
 * for one, so a position inside it is a position inside the document and an
 * edit lands exactly where it was typed.
 */
const INERT = '.mawy-md-html';

/** Blocks nothing joins across: the edge of one is not a character. */
const CLOSED = /^(?:TD|TH|PRE)$/;

export function blockAt(root: HTMLElement, node: Node): HTMLElement | null {
  const from = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;

  if (!from || from.closest(INERT)) {
    return null;
  }

  const block = from.closest<HTMLElement>(BLOCKS);

  return block && root.contains(block) ? block : null;
}

/** Whether what lies between two blocks is something to delete. */
function joins(here: HTMLElement | null, there: HTMLElement | null): boolean {
  return Boolean(here && there && !CLOSED.test(here.tagName) && !CLOSED.test(there.tagName));
}

function splice(value: string, start: number, end: number, text: string): MawyEdit {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}

/**
 * Where the blank lines between the document's blocks are drawn as empty
 * paragraphs, as the offsets a caret in each of them is at.
 *
 * Markdown has no empty paragraph, and a drawn document that only ever showed
 * one — where the caret had just been left — disagreed with its own source:
 * `Enter` three times wrote six line endings and drew one paragraph, and the
 * one it drew was gone as soon as the caret went anywhere else. So the blank
 * lines are what is drawn. A blank line between two blocks is the separator
 * they need and is nothing on the page; every second blank line past that is
 * a paragraph with nothing in it, which is exactly the shape `Enter` at the end
 * of a paragraph writes — a line to type on and a blank line under it.
 *
 * At the start and at the end of the document there is nothing on one side to
 * be separated from, so the first blank line counts, and a document that is
 * nothing but blank lines is a paragraph on every other one of them. The line
 * ending a file closes with is not a paragraph, and neither is a second blank
 * line somebody left between two sections by hand: an even count past the
 * separator is the only one read as an empty paragraph.
 *
 * Only lines outside every block count. A blank line inside a list or a code
 * block is that block's own, and the parser has already said where each block
 * starts and ends.
 */
export function blankParagraphs(value: string, blocks: readonly { range: MdRange }[]): number[] {
  const out: number[] = [];
  let run: number[] = [];
  let block = 0;
  /** Whether anything that is not a blank line came before the run. */
  let before = false;

  const close = (after: boolean) => {
    const count =
      !before && !after
        ? Math.ceil(run.length / 2)
        : before && after
          ? Math.floor((run.length - 1) / 2)
          : Math.floor(run.length / 2);

    for (let index = 0; index < count; index += 1) {
      out.push(run[(before ? 1 : 0) + index * 2]);
    }

    run = [];
  };

  for (let start = 0; ;) {
    const newline = value.indexOf('\n', start);
    const end = newline === -1 ? value.length : newline;

    while (block < blocks.length && blocks[block].range.end <= start) {
      block += 1;
    }

    const inside = block < blocks.length && blocks[block].range.start <= end;

    if (!inside && !value.slice(start, end).trim()) {
      run.push(start);
    } else {
      close(true);
      before = true;
    }

    if (newline === -1) {
      break;
    }

    start = newline + 1;
  }

  close(false);

  return out;
}

/** The element drawn straight under the document that holds this node. */
function topOf(root: HTMLElement, node: Node): HTMLElement | null {
  let at: Node | null = node;

  while (at && at.parentNode !== root) {
    at = at.parentNode;
  }

  return at?.nodeType === 1 ? (at as HTMLElement) : null;
}

/**
 * Where an empty paragraph drawn straight under the document is, or `null` for
 * anything else — which is what a blank line and the caret's own room are both
 * drawn as. See `blankParagraphs`.
 */
function emptyAt(element: Element | null): number | null {
  if (element?.tagName !== 'P' || element.firstChild) {
    return null;
  }

  const range = rangeOf(element);

  return range && range.start === range.end ? range.start : null;
}

/**
 * What a block drawn straight under the document was drawn from.
 *
 * Its own range, or the first one inside it for the box a wide table scrolls
 * inside, which the renderer put in and which says nothing.
 */
function topRange(element: Element | null): MdRange | null {
  if (!element) {
    return null;
  }

  const inner = rangeOf(element) ? element : element.querySelector('[data-mawy-range]');

  return inner ? rangeOf(inner) : null;
}

/**
 * A place in an empty paragraph, with whatever blank lines it needs to stay one
 * once something is written into it.
 *
 * One drawn for a blank line has them already, and comes back unchanged. One
 * drawn only for the caret may not: a list item given up leaves the caret on
 * the line under the list, and `x` written there is the item's lazy
 * continuation rather than a paragraph — the letter lands in the list the
 * reader just left.
 */
export function openedAt(
  root: HTMLElement,
  node: Node,
  value: string,
  at: number
): { value: string; at: number } {
  const lineStart = at > 0 ? value.lastIndexOf('\n', at - 1) + 1 : 0;

  // After a container's own prefix — a quotation's `> `, a list item's
  // indentation — the caret was put there to write inside that container, and
  // what is written belongs on that line as it is.
  if (lineStart !== at || emptyAt(topOf(root, node)) === null) {
    return { value, at };
  }
  const above =
    lineStart > 0 ? value.slice(value.lastIndexOf('\n', lineStart - 2) + 1, lineStart - 1) : '';
  const newline = value.indexOf('\n', at);
  const rest = value.slice(at, newline === -1 ? value.length : newline);
  const next = newline === -1 ? -1 : value.indexOf('\n', newline + 1);
  const below = newline === -1 ? '' : value.slice(newline + 1, next === -1 ? value.length : next);
  const prefix = above.trim() ? '\n' : '';
  const suffix = rest.trim() ? '\n\n' : below.trim() ? '\n' : '';

  if (!prefix && !suffix) {
    return { value, at };
  }

  return {
    value: value.slice(0, at) + prefix + suffix + value.slice(at),
    at: at + prefix.length
  };
}

/**
 * An edit that leaves the caret between blocks, moved onto an empty paragraph.
 *
 * `Enter` on an item still empty gives its marker up and leaves the caret on
 * the line under the list, where nothing is drawn, because one line ending is
 * not a blank line to be a paragraph on. One more makes it one, and the drawn
 * paragraph is then the document's own rather than a room kept for as long as
 * the caret stays. Where no number of line endings makes one — inside a list
 * that goes on below — the edit is left as it was, and the caret's room is what
 * is drawn.
 */
function settle(edit: MawyEdit, options: MarkdownOptions): MawyEdit {
  const lineStart = edit.caret > 0 ? edit.value.lastIndexOf('\n', edit.caret - 1) + 1 : 0;

  // A caret after a container's prefix was left inside that container on
  // purpose, and a blank line would take it out.
  if (!edit.betweenBlocks || lineStart !== edit.caret) {
    return edit;
  }

  for (const extra of ['', '\n', '\n\n']) {
    const value = edit.value.slice(0, edit.caret) + extra + edit.value.slice(edit.caret);
    const caret = edit.caret + extra.length;
    const blocks = parseMarkdown(value, options).root.children;

    if (!extra && blocks.some((block) => block.range.start <= caret && caret <= block.range.end)) {
      return edit;
    }

    if (blankParagraphs(value, blocks).includes(caret)) {
      return { value, caret, betweenBlocks: true };
    }
  }

  return edit;
}

/**
 * The run of text drawn on the other side of this node, either way.
 *
 * Stepped to rather than collected: a walker put down on the node and moved one
 * place answers in the distance between the two, which for backspace at the
 * start of a paragraph is the end of the one above it. Building the list first
 * would make every one of those cost the length of the document.
 *
 * Runs with nothing in them are stepped over. React leaves empty text nodes
 * behind, and a caret cannot be put inside one.
 */
function neighbour(root: HTMLElement, node: Node, back: boolean): Text | null {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const step = () => (back ? walker.previousNode() : walker.nextNode());

  walker.currentNode = node;

  for (let at = step(); at; at = step()) {
    if ((at as Text).data.length) {
      return at as Text;
    }
  }

  return null;
}

/** The place one drawn character before this one, or `null` at the very start. */
function before(
  root: HTMLElement,
  node: Node,
  offset: number
): { node: Text; offset: number } | null {
  if (node.nodeType === 3 && offset > 0) {
    return { node: node as Text, offset: offset - 1 };
  }

  const previous = neighbour(root, node, true);

  return previous ? { node: previous, offset: previous.data.length - 1 } : null;
}

/** The place one drawn character after this one, or `null` at the very end. */
function after(
  root: HTMLElement,
  node: Node,
  offset: number
): { node: Text; offset: number } | null {
  if (node.nodeType === 3 && offset < (node as Text).data.length) {
    return { node: node as Text, offset };
  }

  const next = neighbour(root, node, false);

  return next ? { node: next, offset: 0 } : null;
}

/**
 * A drawn thing with no text in it, next to a place on the page.
 *
 * An image and a hard break are one character to a reader and none at all to a
 * walk over the runs of text — so without this, backspace beside an image would
 * find the letter on the other side of it and take that instead.
 */
function atomAt(root: HTMLElement, node: Node, offset: number, back: boolean): HTMLElement | null {
  const beside =
    node.nodeType === 3
      ? (back ? offset === 0 : offset === (node as Text).data.length)
        ? back
          ? node.previousSibling
          : node.nextSibling
        : null
      : node.nodeType === 1
        ? node.childNodes[back ? offset - 1 : offset]
        : null;

  return beside?.nodeType === 1 &&
    !beside.textContent &&
    (beside as HTMLElement).hasAttribute('data-mawy-range') &&
    root.contains(beside)
    ? (beside as HTMLElement)
    : null;
}

/** Everything an atom was written with, taken out in one go. */
function removeAtom(value: string, atom: HTMLElement): MawyEdit | null {
  const range = rangeOf(atom);

  return range
    ? { value: value.slice(0, range.start) + value.slice(range.end), caret: range.start }
    : null;
}

/**
 * Backspace.
 *
 * One drawn character goes, which is not the same as one written character:
 * the `d` at the end of `**bold**` is one of eight, and taking the two before
 * the caret would leave the emphasis unclosed. When the character before the
 * caret turns out to be in another block, what lies between the two is the
 * blank line separating them and this block's own markers, and taking *that*
 * out is what joins them — which is what backspace at the start of a paragraph
 * is for.
 */
function deleteBefore(
  root: HTMLElement,
  value: string,
  node: Node,
  offset: number,
  caret: number
): MawyEdit | null {
  const drawn = sourceAt(root, node, offset, value);

  if (drawn !== null && drawn < caret) {
    // The caret is past the last character the page can draw — the whitespace
    // at the end of a line, which Markdown does not keep and which is therefore
    // in the file and nowhere else. There is no drawn character to take, so the
    // written one goes. See `MawyAim`.
    return splice(value, caret - 1, caret, '');
  }

  const atom = atomAt(root, node, offset, true);

  if (atom) {
    return removeAtom(value, atom);
  }

  const top = topOf(root, node);
  const empty = emptyAt(top);

  // In an empty paragraph, the paragraph goes: what lies between the end of
  // whatever is drawn above it and the paragraph itself, which is its blank line
  // and its separator. The caret lands at that end. Joining the paragraph to
  // the text above, which is what the walk below does, would take every other
  // empty paragraph between the two with it.
  if (top && empty !== null) {
    const above = topRange(top.previousElementSibling);

    return above && above.end < empty
      ? { value: value.slice(0, above.end) + value.slice(empty), caret: above.end }
      : null;
  }

  const back = before(root, node, offset);

  // At the start of a block with an empty paragraph above it, the empty
  // paragraph goes and the block stays what it is.
  if (top && (!back || !top.contains(back.node))) {
    const above = emptyAt(top.previousElementSibling);
    const range = topRange(top);

    if (above !== null && range && above < range.start) {
      return {
        value: value.slice(0, above) + value.slice(range.start),
        caret: caret - (range.start - above)
      };
    }
  }

  if (!back) {
    return null;
  }

  const from = sourceAt(root, back.node, back.offset, value);
  const to = sourceAt(root, back.node, back.offset + 1, value);

  if (from === null || to === null) {
    return null;
  }

  const here = blockAt(root, node);
  const there = blockAt(root, back.node);

  if (here !== there) {
    return joins(here, there) && to < caret ? splice(value, to, caret, '') : null;
  }

  return splice(value, from, Math.max(to, from + 1), '');
}

/** Delete, which is the same rule read the other way. */
function deleteAfter(
  root: HTMLElement,
  value: string,
  node: Node,
  offset: number,
  caret: number
): MawyEdit | null {
  const atom = atomAt(root, node, offset, false);

  if (atom) {
    return removeAtom(value, atom);
  }

  const top = topOf(root, node);
  const empty = emptyAt(top);

  // `Backspace`'s two rules for an empty paragraph, read from the other side:
  // in one, it goes and the caret is where the next block starts; at the end
  // of a block with one under it, that one goes.
  if (top && empty !== null) {
    const below = topRange(top.nextElementSibling);

    return below && below.start > empty
      ? { value: value.slice(0, empty) + value.slice(below.start), caret: empty }
      : null;
  }

  const ahead = after(root, node, offset);

  if (top && (!ahead || !top.contains(ahead.node))) {
    const below = emptyAt(top.nextElementSibling);
    const range = topRange(top);
    const from = range ? Math.max(caret, range.end) : caret;

    if (below !== null && below > from) {
      return { value: value.slice(0, from) + value.slice(below), caret };
    }
  }

  if (!ahead) {
    return null;
  }

  const from = sourceAt(root, ahead.node, ahead.offset, value);
  const to = sourceAt(root, ahead.node, ahead.offset + 1, value);

  if (from === null || to === null) {
    return null;
  }

  const here = blockAt(root, node);
  const there = blockAt(root, ahead.node);

  if (here !== there) {
    return joins(here, there) && from > caret
      ? { value: value.slice(0, caret) + value.slice(from), caret }
      : null;
  }

  return { value: value.slice(0, from) + value.slice(Math.max(to, from + 1)), caret };
}

/** A quotation carries its own marker down the way a list carries a bullet. */
const QUOTED = /^((?:[ \t]*>[ \t]?)+)(.*)$/;

function continueQuote(value: string, caret: number): MawyEdit | null {
  const from = value.lastIndexOf('\n', caret - 1) + 1;
  const quote = QUOTED.exec(value.slice(from, caret));

  if (!quote) {
    return null;
  }

  const [, marker, content] = quote;

  if (!content.trim()) {
    // An empty quoted line: the marker goes, the same way an empty list item
    // gives its bullet up rather than making another one.
    return { value: value.slice(0, from) + value.slice(caret), caret: from, betweenBlocks: true };
  }

  // Two lines rather than one, and the middle one blank. A quotation's lines
  // run on into a single paragraph, so `> a` under `> b` is one paragraph with
  // a soft break in it — and `Enter` in a drawn document is meant to end the
  // paragraph, not wrap it.
  const text = `\n${marker}\n${marker}`;

  return { value: value.slice(0, caret) + text + value.slice(caret), caret: caret + text.length };
}

/**
 * `Enter`, which is a different thing in every container it is pressed in.
 *
 * A blank line separates two blocks, and that is the answer only where the
 * caret is between blocks to begin with. Inside a list it is a new item with
 * the marker carried down; inside a quotation it is a new quoted line; inside a
 * code block it is a newline and nothing else, because everything in there is
 * the characters it is. In a table it is the list's rule said about rows: a new
 * row, and on a row still empty, a way out. See `continueTable`.
 */
function breakAt(
  root: HTMLElement,
  value: string,
  start: number,
  end: number,
  node: Node,
  options: MarkdownOptions
): MawyEdit | null {
  const block = blockAt(root, node);
  const tag = block?.tagName;

  if (tag === 'TD' || tag === 'TH') {
    const row = continueTable({ value, start, end });

    // A row carried down keeps the caret in the table; a row given up leaves it
    // on a line of its own after it, where nothing is drawn yet — unless that
    // line is a quotation's `> `, which is drawn as its marker the way `Enter`
    // at the end of a quoted paragraph already leaves one.
    const line = row?.value.slice(row.value.lastIndexOf('\n', row.start - 1) + 1, row.start);

    return row
      ? settle({ value: row.value, caret: row.start, betweenBlocks: !line?.trim() }, options)
      : null;
  }

  if (tag === 'PRE') {
    return splice(value, start, end, '\n');
  }

  if (start === end) {
    const item = continueList({ value, start, end }, options.definitionLists ?? true);

    if (item) {
      return settle(
        {
          value: item.value,
          caret: item.start,
          // A marker given up leaves the caret where nothing is drawn any more,
          // which is the whole point of giving it up.
          betweenBlocks: item.value.length < value.length
        },
        options
      );
    }

    const quoted = continueQuote(value, start);

    if (quoted) {
      return settle(quoted, options);
    }
  }

  const opened = openedAt(root, node, value, start);
  const shift = opened.at - start;

  return settle(
    { ...splice(opened.value, start + shift, end + shift, '\n\n'), betweenBlocks: true },
    options
  );
}

/**
 * Where a place on the page is in the document, preferring the caret's own
 * answer over the page's wherever it has one. See `MawyAim`.
 */
export function documentAt(
  root: HTMLElement,
  node: Node,
  offset: number,
  value: string,
  aim: MawyAim | null
): number | null {
  return aim && aim.value === value && aim.node === node && aim.offset === offset
    ? aim.at
    : sourceAt(root, node, offset, value);
}

/**
 * The run an input event had decided to change, in the document's own offsets.
 *
 * `getTargetRanges` is the browser saying what it was about to do before it was
 * told no, and it is the only honest answer for a deletion that is not one
 * character: what a word is, and where a line ends on a screen, are the
 * platform's questions rather than this library's. Writing those rules again
 * here would be writing them differently from the keyboard the reader is
 * actually using.
 *
 * `null` where the browser offered nothing, which is a deletion that does not
 * happen rather than one that guesses.
 */
function targetOf(
  event: InputEvent,
  root: HTMLElement,
  value: string,
  aim: MawyAim | null
): { start: number; end: number } | null {
  const [range] = event.getTargetRanges();

  if (!range || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const head = documentAt(root, range.startContainer, range.startOffset, value, aim);
  const tail = documentAt(root, range.endContainer, range.endOffset, value, aim);

  if (head === null || tail === null) {
    return null;
  }

  return { start: Math.min(head, tail), end: Math.max(head, tail) };
}

/** Where the caret is, in the document and on the page, or `null` for nowhere. */
function placeOf(
  root: HTMLElement,
  value: string,
  aim: MawyAim | null
): { start: number; end: number; node: Node; offset: number } | null {
  const selection = root.ownerDocument.getSelection();

  if (!selection?.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer) ||
    !blockAt(root, range.startContainer) ||
    !blockAt(root, range.endContainer)
  ) {
    return null;
  }

  const head = documentAt(root, range.startContainer, range.startOffset, value, aim);
  const tail = documentAt(root, range.endContainer, range.endOffset, value, aim);

  if (head === null || tail === null) {
    return null;
  }

  return {
    start: Math.min(head, tail),
    end: Math.max(head, tail),
    node: range.startContainer,
    offset: range.startOffset
  };
}

/**
 * What was put on the clipboard, as Markdown where there is any to be made.
 *
 * Inside a code block it is the plain text and nothing else: everything in
 * there is the characters it is, and a pasted heading is a line beginning with
 * a hash rather than a heading.
 */
export function markdownFor(
  clipboard: { getData(kind: string): string } | null,
  literal: boolean
): string {
  const plain = clipboard?.getData('text/plain') ?? '';

  if (literal || !clipboard) {
    return plain;
  }

  return markdownFromHtml(clipboard.getData('text/html')) || plain;
}

/**
 * Text put in where the caret is, whatever brought it there.
 *
 * A paste arrives as its own event rather than through `beforeinput`, because
 * that is the one every browser puts the clipboard on.
 */
export function editForText(
  root: HTMLElement,
  value: string,
  text: string,
  aim: MawyAim | null
): MawyEdit | null {
  const place = placeOf(root, value, aim);

  if (!place || !text) {
    return null;
  }

  const opened =
    place.start === place.end
      ? openedAt(root, place.node, value, place.start)
      : { value, at: place.start };

  return splice(opened.value, opened.at, opened.at + (place.end - place.start), text);
}

/**
 * What an input event does to the document, or `null` for "not this one yet".
 *
 * `null` is refused rather than allowed: the event has already been prevented
 * by the time this is called, so an input type nothing here understands changes
 * nothing at all. That is the right way round — a surface that let the browser
 * have its way with the tree whenever it met something new would be a surface
 * whose document and drawing quietly stopped being the same thing.
 */
export function editFor(
  event: InputEvent,
  root: HTMLElement,
  value: string,
  aim: MawyAim | null,
  options: MarkdownOptions = {},
  drag: MawyDrag = { taken: null }
): MawyEdit | null {
  const place = placeOf(root, value, aim);
  // Whatever a drag left waiting is for the drop that follows it immediately,
  // and this is that drop or it is not. Read and cleared before anything else,
  // so that no later event can be answered with it.
  const dragged = drag.taken;

  drag.taken = null;

  if (!place) {
    return null;
  }

  const { start, end } = place;
  const range = { startContainer: place.node, startOffset: place.offset };

  switch (event.inputType) {
    case 'insertText': {
      if (event.data === null) {
        return null;
      }

      // A shorthand only means what it says where the line it is on is a line
      // of Markdown. Inside a code block every character is the character it
      // is, and a table cell has no room for a block of any kind.
      const block = blockAt(root, range.startContainer);
      const tag = block?.tagName;

      // An empty cell is spaces between two pipes, and the parser puts it after
      // all of them. Typed there as it is, `|  |` becomes `|  a|`; so the
      // spaces are given back around the words instead, the way a cell with
      // something in it is written.
      if (start === end && (tag === 'TD' || tag === 'TH') && !block?.textContent) {
        let from = start;

        while (from > 0 && (value[from - 1] === ' ' || value[from - 1] === '\t')) {
          from -= 1;
        }

        return {
          value: `${value.slice(0, from)} ${event.data} ${value.slice(start)}`,
          caret: from + 1 + event.data.length
        };
      }

      // Into an empty paragraph with the blank lines that keep it one, where it
      // has not got them. See `openedAt`.
      const opened =
        start === end ? openedAt(root, range.startContainer, value, start) : { value, at: start };
      const rule =
        start === end && tag !== 'PRE' && tag !== 'TD' && tag !== 'TH'
          ? ruleFor(opened.value, opened.at, event.data)
          : null;

      return rule ?? splice(opened.value, opened.at, opened.at + (end - start), event.data);
    }

    case 'insertReplacementText':
      return event.data === null ? null : splice(value, start, end, event.data);

    case 'insertParagraph':
      return breakAt(root, value, start, end, range.startContainer, options);

    case 'insertLineBreak': {
      const block = blockAt(root, range.startContainer);

      if (block?.tagName === 'TD' || block?.tagName === 'TH') {
        return null;
      }

      // Two spaces and a newline: the hard break nearly every Markdown file in
      // the world is written with, however invisible it is. Inside a code block
      // a newline is just a newline.
      return splice(value, start, end, block?.tagName === 'PRE' ? '\n' : '  \n');
    }

    case 'deleteContentBackward':
      return start === end
        ? deleteBefore(root, value, range.startContainer, range.startOffset, start)
        : splice(value, start, end, '');

    case 'deleteContentForward':
      return start === end
        ? deleteAfter(root, value, range.startContainer, range.startOffset, start)
        : splice(value, start, end, '');

    // The run is on the clipboard by the time this arrives — the browser puts
    // it there before it asks — so what is left is taking it out of the
    // document, which is the selection and nothing else. Without this the
    // event was refused like any other the switch did not name, and a cut was
    // a copy.
    case 'deleteByCut':
      return start === end ? null : splice(value, start, end, '');

    // A word, a line, or whatever the platform means by those on the keyboard
    // in front of the reader. The browser has already worked out which
    // characters it meant and says so in `getTargetRanges`; all that is left is
    // reading that back into the document. `Alt`+`Backspace` and
    // `Ctrl`+`Backspace` were doing nothing at all before this.
    case 'deleteWordBackward':
    case 'deleteWordForward':
    case 'deleteSoftLineBackward':
    case 'deleteSoftLineForward':
    case 'deleteHardLineBackward':
    case 'deleteHardLineForward':
    case 'deleteEntireSoftLine': {
      const target = start === end ? targetOf(event, root, value, aim) : { start, end };

      return target && target.start !== target.end
        ? splice(value, target.start, target.end, '')
        : null;
    }

    // Written down rather than done. The drop that goes with it is the very
    // next event and is measured against this same document, so the two are
    // answered together below. See `MawyDrag`.
    case 'deleteByDrag': {
      const taken = targetOf(event, root, value, aim) ?? (start === end ? null : { start, end });

      drag.taken = taken && taken.start !== taken.end ? taken : null;

      return null;
    }

    case 'insertFromDrop': {
      const block = blockAt(root, range.startContainer);
      const text = markdownFor(event.dataTransfer, block?.tagName === 'PRE');

      if (!text) {
        return null;
      }

      // A drop that came from somewhere else, or one held down as a copy: the
      // run is only put in, because nothing was taken out.
      //
      // A drop inside the run being dragged is the same answer. The browser
      // does not offer one, and a document that took the run out and then put
      // it back inside where it used to be would be a document with a hole in
      // it either way.
      if (!dragged || (start < dragged.end && dragged.start < end)) {
        return splice(value, start, end, text);
      }

      const short = value.slice(0, dragged.start) + value.slice(dragged.end);
      const gone = dragged.end - dragged.start;
      const from = start >= dragged.end ? start - gone : start;
      const to = end >= dragged.end ? end - gone : end;

      return splice(short, from, to, text);
    }

    default:
      return null;
  }
}
