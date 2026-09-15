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

import {
  containerOf,
  continueList,
  fencedAt,
  runCommand,
  runTableCommand,
  tableSpanAt,
  type MawyCommand
} from './commands.js';
import type { MdNode, MdRange } from './markdown/ast.js';
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

  // At the start of a code block the fences go, and what was in the block is a
  // paragraph — which is what `Backspace` at the start of any other block with
  // a marker does to the marker. There is no joining a code block to what is
  // above it, and with nothing to join and nothing to take, a block with
  // nothing in it could not be got rid of at all.
  const block = blockAt(root, node);

  if (block?.tagName === 'PRE') {
    const back = before(root, node, offset);

    if (!back || !block.contains(back.node)) {
      return fencedAt(value, caret) ? unfenced(value, caret) : null;
    }
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

/** The fenced code block a caret is in, taken off, with the caret kept among its characters. */
function unfenced(value: string, caret: number): MawyEdit {
  const after = runCommand('codeBlock', { value, start: caret, end: caret });

  return { value: after.value, caret: after.start };
}

/** A line that closes a fence, once whatever holds the block is taken off it. */
const CLOSING = /^(?:`{3,}|~{3,})[ \t]*$/;

/**
 * `Enter` on the last line of a code block, when that line is empty: the way
 * out of the block.
 *
 * Everything in a code block is the characters it is, so `Enter` there is a
 * line ending, and a block with nothing after it had nowhere below it for a
 * caret to go — what was typed next went into the block for good. The rule is
 * the list's: `Enter` on an item still empty gives the item up, and `Enter` on
 * a last line still empty gives that line up and leaves the caret on a
 * paragraph under the block, inside whatever holds the block.
 *
 * Not on the only line of a block, which is an empty block somebody has just
 * made and is about to type into.
 */
function leaveCode(
  value: string,
  start: number,
  end: number,
  options: MarkdownOptions
): MawyEdit | null {
  const code = start === end ? fencedAt(value, start) : null;

  if (!code) {
    return null;
  }

  const lineStart = start > 0 ? value.lastIndexOf('\n', start - 1) + 1 : 0;
  const newline = value.indexOf('\n', start);

  if (newline === -1 || lineStart <= code.content.start) {
    return null;
  }

  const next = value.indexOf('\n', newline + 1);
  const closing = value.slice(newline + 1, next === -1 ? value.length : next);
  const { carry, mark } = containerOf(closing);

  if (containerOf(value.slice(lineStart, newline)).mark.trim() || !CLOSING.test(mark)) {
    return null;
  }

  const without = value.slice(0, lineStart - 1) + value.slice(newline);
  const fenceEnd = lineStart + closing.length;
  const text = `\n${carry.trimEnd()}\n${carry}`;

  return settle(
    {
      value: without.slice(0, fenceEnd) + text + without.slice(fenceEnd),
      caret: fenceEnd + text.length,
      betweenBlocks: true
    },
    options
  );
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
 * the characters it is. In a table cell it is a line break inside the cell.
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

  // A line break, the one way a cell holds a second line. A row of a table is
  // one line of the file, so the line ending `Enter` writes everywhere else
  // would end the row; `<br>` is what every GitHub table writes instead, and
  // the renderer reads one in a cell as the break it is. `Mod`+`Enter` is the
  // row under this one, and `Tab` the next cell.
  if (tag === 'TD' || tag === 'TH') {
    return splice(value, start, end, '<br>');
  }

  if (tag === 'PRE') {
    return leaveCode(value, start, end, options) ?? splice(value, start, end, '\n');
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

/** The formatting that is written around the words it covers, by command. */
const WRAPS: Partial<Record<MawyCommand, MdNode['type']>> = {
  bold: 'strong',
  italic: 'emphasis',
  strikethrough: 'delete',
  code: 'inlineCode'
};

/** Whether a command is one of those, and so one a caret can hold until it types. */
export function wraps(command: MawyCommand): boolean {
  return command in WRAPS;
}

/**
 * The runs of formatting a place is inside, each with where its words start
 * and end — after its opening marker and before its closing one.
 *
 * Inside is between those two, inclusive: a caret at the end of a bold word is
 * in it, because what is typed there is bold. After the closing marker it is
 * not, which is where `ArrowRight` takes a caret. See `MawyEditorDocument`.
 */
function runsAt(
  value: string,
  offset: number
): { command: MawyCommand; range: MdRange; start: number; end: number; marker: string }[] {
  const out: {
    command: MawyCommand;
    range: MdRange;
    start: number;
    end: number;
    marker: string;
  }[] = [];
  const document = parseMarkdown(value);

  const walk = (nodes: readonly MdNode[]) => {
    for (const node of nodes) {
      if (offset < node.range.start || offset > node.range.end || node.type === 'code') {
        continue;
      }

      const command = (Object.keys(WRAPS) as MawyCommand[]).find(
        (each) => WRAPS[each] === node.type
      );

      if (command) {
        const character = value[node.range.start];
        let width = 0;

        while (
          width < node.range.end - node.range.start &&
          value[node.range.start + width] === character &&
          (command !== 'bold' || width < 2) &&
          (command !== 'italic' || width < 1)
        ) {
          width += 1;
        }

        const start = node.range.start + width;
        const end = node.range.end - width;

        if (start <= offset && offset <= end) {
          out.push({
            command,
            range: node.range,
            start,
            end,
            marker: value.slice(node.range.start, start)
          });
        }
      }

      if ('children' in node) {
        walk(node.children as MdNode[]);
      }
    }
  };

  walk([...document.root.children, ...document.footnotes]);

  return out;
}

/** The formatting commands already in force at a place. See `runsAt`. */
export function marksAt(value: string, offset: number): Set<MawyCommand> {
  return new Set(/[*_~`]/.test(value) ? runsAt(value, offset).map((run) => run.command) : []);
}

/**
 * Words typed where a caret was told to hold some formatting, with that
 * formatting written around them.
 *
 * A formatting button pressed with nothing selected used to write its markers
 * with the caret between them, which is a source editor's answer and the wrong
 * one on a drawn document: `****` on a line of its own is a divider, `~~~~` is
 * a code fence, and on any other line the four characters sat there drawn as
 * themselves until something was typed. So on the drawn document the caret
 * holds the command instead, and the markers are written with the first thing
 * typed — `**x**`, with the caret after the `x`, so what is typed next is bold
 * as well because it is inside the bold run.
 *
 * A command already in force where the caret is turns off the same way. At
 * the end of the run the words go after its closing marker; at the start,
 * before its opening one; in the middle the run is closed in front of them and
 * opened again after, which is the same `**x**` read the other way round.
 *
 * Italic is written with `*` where a letter is either side, since `_` inside a
 * word is not emphasis to CommonMark. `null` where nothing is held.
 */
export function heldText(
  value: string,
  at: number,
  text: string,
  held: readonly MawyCommand[]
): MawyEdit | null {
  const commands = held.filter(wraps);

  if (!commands.length || !text) {
    return null;
  }

  const runs = runsAt(value, at);
  let point = at;
  let before = '';
  let after = '';

  // What is being turned off first, innermost first, so a run the caret is
  // leaving by its edge moves the point before anything is wrapped around it.
  for (const run of [...runs].reverse()) {
    if (!commands.includes(run.command)) {
      continue;
    }

    if (!before && point === run.end) {
      point = run.range.end;
    } else if (!before && point === run.start) {
      point = run.range.start;
    } else {
      before += run.marker;
      after = run.marker + after;
    }
  }

  for (const command of commands) {
    if (runs.some((run) => run.command === command)) {
      continue;
    }

    const word = /\w/.test(value[point - 1] ?? '') || /\w/.test(value[point] ?? '');
    const marker =
      command === 'bold'
        ? '**'
        : command === 'strikethrough'
          ? '~~'
          : command === 'code'
            ? '`'
            : word
              ? '*'
              : '_';

    before += marker;
    after = marker + after;
  }

  return {
    value: value.slice(0, point) + before + text + after + value.slice(point),
    caret: point + before.length + text.length
  };
}

/**
 * The characters that open a line of Markdown as something other than a
 * paragraph, which a document is allowed to begin with. See `leadFor`.
 */
const OPENS_BLOCK = /^[#>*+\-`~|:<]/;

/**
 * The heading's marker the first words of an empty document are written
 * after, or nothing when those words begin a block of their own.
 *
 * `-` typed into an empty document is a list about to be written, `#` a
 * heading of a level somebody chose, and a heading's marker in front of either
 * would take that choice away. See `MawyEditor.startWithHeading`.
 */
export function leadFor(lead: string, text: string): string {
  return text.trim() && !OPENS_BLOCK.test(text) ? lead : '';
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

  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  if (range.collapsed) {
    const at = blockAt(root, range.startContainer)
      ? documentAt(root, range.startContainer, range.startOffset, value, aim)
      : null;

    return at === null
      ? null
      : { start: at, end: at, node: range.startContainer, offset: range.startOffset };
  }

  // Everything the document draws, from before its first character to after its
  // last, is the whole document: the heading's `#` in front of the first word
  // and the fence after the last line as well, which the drawn characters on
  // their own would have left behind. `Mod`+`A` selects this, and it ends
  // wherever the browser likes — on the document itself, or in the last note's
  // way back, which is in no block at all — so it is asked about by what is on
  // either side of it rather than by where it ends.
  if (
    !textBeside(root, range.startContainer, range.startOffset, true) &&
    !textBeside(root, range.endContainer, range.endOffset, false)
  ) {
    const first = textBeside(root, range.startContainer, range.startOffset, false);

    return first ? { start: 0, end: value.length, node: first, offset: 0 } : null;
  }

  // An end that is in no block is moved in, to the nearest run of text that is,
  // so a selection dragged out past a note or onto the document's own edge
  // still deletes what it covers.
  const head = endOf(root, range.startContainer, range.startOffset, value, aim, false);
  const tail = endOf(root, range.endContainer, range.endOffset, value, aim, true);

  if (!head || !tail) {
    return null;
  }

  return {
    start: Math.min(head.at, tail.at),
    end: Math.max(head.at, tail.at),
    node: head.node,
    offset: head.offset
  };
}

/** Whether a selection covers more than one cell of one table. */
function cellsSelected(value: string, start: number, end: number): boolean {
  const span = value.includes('|') ? tableSpanAt(value, start, end) : null;

  return Boolean(span && span.rows * span.columns > 1 && tableSpanAt(value, end, end));
}

/**
 * What an input does to cells selected on the drawn document.
 *
 * A deletion of any kind, a cut among them, empties the cells and leaves the
 * table its shape: the characters between two cells are pipes and line endings,
 * and taking those out was a table cut in half. Words typed over the cells
 * empty them and are written into the first, the way a cell is typed into with
 * nothing in it. Anything else, a drop or a line break, is refused.
 */
function inCells(event: InputEvent, value: string, start: number, end: number): MawyEdit | null {
  const cleared = runTableCommand('clearCells', { value, start, end });

  if (!cleared) {
    return null;
  }

  if (event.inputType.startsWith('delete') && event.inputType !== 'deleteByDrag') {
    return { value: cleared.value, caret: cleared.start };
  }

  const text =
    (event.inputType === 'insertText' || event.inputType === 'insertReplacementText') && event.data
      ? event.data
      : null;

  return text ? intoClearedCell(cleared.value, cleared.start, text) : null;
}

/**
 * Words written into a cell with nothing in it, between its spaces rather than
 * after them. `|  |` is where the parser says an empty cell's caret is, and a
 * letter typed there as it stands would be `|  a|`.
 */
function intoClearedCell(value: string, caret: number, text: string): MawyEdit {
  let from = caret;

  while (from > 0 && (value[from - 1] === ' ' || value[from - 1] === '\t')) {
    from -= 1;
  }

  return {
    value: `${value.slice(0, from)} ${text} ${value.slice(caret)}`,
    caret: from + 1 + text.length
  };
}

/** A run taken out, with the markers of anything it took whole. See `widened`. */
function deleted(value: string, start: number, end: number): MawyEdit {
  const run = widened(value, start, end);

  return splice(value, run.start, run.end, '');
}

/**
 * The run of text drawn beside a place, going either way, that is inside a
 * block — or `null` where there is none.
 *
 * A place can be between two elements rather than inside a run of text: a
 * selection of everything starts and ends on the document itself. What is
 * beside it is then what is in the child after the place, or before it.
 */
function textBeside(root: HTMLElement, node: Node, offset: number, back: boolean): Text | null {
  const place = root.ownerDocument.createRange();
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let found: Text | null = null;

  place.setStart(node, offset);

  for (let at = walker.nextNode() as Text | null; at; at = walker.nextNode() as Text | null) {
    if (!at.data.length || !blockAt(root, at)) {
      continue;
    }

    const beside =
      at === node
        ? back
          ? offset > 0
          : offset < at.data.length
        : back
          ? place.comparePoint(at, at.data.length) < 0
          : place.comparePoint(at, 0) > 0;

    if (beside) {
      found = at;

      // Going forwards the first is the answer; going back it is the last.
      if (!back) {
        break;
      }
    } else if (back && found) {
      break;
    }
  }

  return found;
}

/** One end of a selection in the document's offsets, moved into a block where it is not in one. */
function endOf(
  root: HTMLElement,
  node: Node,
  offset: number,
  value: string,
  aim: MawyAim | null,
  back: boolean
): { at: number; node: Node; offset: number } | null {
  if (blockAt(root, node)) {
    const at = documentAt(root, node, offset, value, aim);

    if (at !== null) {
      return { at, node, offset };
    }
  }

  const text = textBeside(root, node, offset, back);
  const edge = text ? (back ? text.data.length : 0) : 0;
  const at = text ? sourceAt(root, text, edge, value) : null;

  return text && at !== null ? { at, node: text, offset: edge } : null;
}

/**
 * A run being deleted, grown to take the markers of any formatting whose words
 * it takes all of.
 *
 * The drawn characters of `**bold**` are four of its eight, and selecting the
 * word and deleting it took those four and left `****` behind, drawn as
 * itself, or as a divider on a line of its own. A link's words taken whole
 * leave `[](url)` the same way. Only what is taken whole grows the run: part of
 * a bold word deleted is part of a bold word, and the rest of it stays bold.
 */
function widened(value: string, start: number, end: number): { start: number; end: number } {
  if (!/[*_~`[]/.test(value.slice(Math.max(0, start - 3), Math.min(value.length, end + 3)))) {
    return { start, end };
  }

  const document = parseMarkdown(value);
  let from = start;
  let to = end;

  const walk = (nodes: readonly MdNode[]) => {
    for (const node of nodes) {
      if (node.range.end < from || node.range.start > to) {
        continue;
      }

      const children = 'children' in node ? (node.children as MdNode[]) : [];
      let words: MdRange | null = null;

      if (node.type === 'inlineCode') {
        const ticks = /^`+/.exec(value.slice(node.range.start))?.[0].length ?? 1;

        words = { start: node.range.start + ticks, end: node.range.end - ticks };
      } else if (
        (node.type === 'strong' ||
          node.type === 'emphasis' ||
          node.type === 'delete' ||
          node.type === 'link') &&
        children.length
      ) {
        words = { start: children[0].range.start, end: children[children.length - 1].range.end };
      }

      if (words && words.start >= from && words.end <= to) {
        from = Math.min(from, node.range.start);
        to = Math.max(to, node.range.end);
      }

      walk(children);
    }
  };

  walk([...document.root.children, ...document.footnotes]);

  return { start: from, end: to };
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

  if (place.start !== place.end) {
    return typedOver(value, place.start, place.end, text);
  }

  const opened = openedAt(root, place.node, value, place.start);

  return splice(opened.value, opened.at, opened.at, text);
}

/**
 * Words put in place of a selection, whatever brought them: a paste, or a
 * composition that began over one.
 *
 * Over cells selected on the drawn document the cells are emptied and the words
 * go into the first, the way a keystroke over them goes. See `inCells`.
 */
export function typedOver(value: string, start: number, end: number, text: string): MawyEdit {
  const cleared = cellsSelected(value, start, end)
    ? runTableCommand('clearCells', { value, start, end })
    : null;

  return cleared
    ? intoClearedCell(cleared.value, cleared.start, text)
    : splice(value, start, end, text);
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
  drag: MawyDrag = { taken: null },
  lead = '',
  held: readonly MawyCommand[] = []
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

  // More than one cell of a table selected: what is deleted or typed is about
  // the cells rather than about the pipes and line endings between them. See
  // `inCells`.
  if (start !== end && cellsSelected(value, start, end)) {
    return inCells(event, value, start, end);
  }

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

      // The first words of an empty document, after its heading's marker.
      const heading = lead && !value.trim() ? leadFor(lead, event.data) : '';
      // Formatting the caret was told to hold, around what is typed. See
      // `heldText`.
      const formatted =
        start === end && tag !== 'PRE' ? heldText(value, start, event.data, held) : null;

      if (formatted) {
        return heading
          ? {
              value: formatted.value.slice(0, start) + heading + formatted.value.slice(start),
              caret: formatted.caret + heading.length
            }
          : formatted;
      }

      if (heading) {
        return splice(value, start, end, heading + event.data);
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
        return splice(value, start, end, '<br>');
      }

      // Two spaces and a newline: the hard break nearly every Markdown file in
      // the world is written with, however invisible it is. Inside a code block
      // a newline is just a newline.
      return splice(value, start, end, block?.tagName === 'PRE' ? '\n' : '  \n');
    }

    case 'deleteContentBackward':
      return start === end
        ? deleteBefore(root, value, range.startContainer, range.startOffset, start)
        : deleted(value, start, end);

    case 'deleteContentForward':
      return start === end
        ? deleteAfter(root, value, range.startContainer, range.startOffset, start)
        : deleted(value, start, end);

    // The run is on the clipboard by the time this arrives — the browser puts
    // it there before it asks — so what is left is taking it out of the
    // document, which is the selection and nothing else. Without this the
    // event was refused like any other the switch did not name, and a cut was
    // a copy.
    case 'deleteByCut':
      return start === end ? null : deleted(value, start, end);

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
        ? deleted(value, target.start, target.end)
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
