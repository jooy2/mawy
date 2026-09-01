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

import { continueList } from './commands.js';
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

/** Every run of text in the document, in the order they are drawn. */
function runs(root: HTMLElement): Text[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node as Text).data.length) {
      out.push(node as Text);
    }
  }

  return out;
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

  let previous: Text | null = null;

  for (const run of runs(root)) {
    if (run === node) {
      break;
    }

    if (node.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_PRECEDING) {
      previous = run;
    } else {
      break;
    }
  }

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

  for (const run of runs(root)) {
    if (run !== node && node.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return { node: run, offset: 0 };
    }
  }

  return null;
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

  const back = before(root, node, offset);

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

  const ahead = after(root, node, offset);

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
 * the characters it is. In a table it is nothing at all: a row is a line, and
 * there is nowhere in the file for a second one to go.
 */
function breakAt(
  root: HTMLElement,
  value: string,
  start: number,
  end: number,
  node: Node
): MawyEdit | null {
  const block = blockAt(root, node);
  const tag = block?.tagName;

  if (tag === 'TD' || tag === 'TH') {
    return null;
  }

  if (tag === 'PRE') {
    return splice(value, start, end, '\n');
  }

  if (start === end) {
    const item = continueList({ value, start, end });

    if (item) {
      return {
        value: item.value,
        caret: item.start,
        // A marker given up leaves the caret where nothing is drawn any more,
        // which is the whole point of giving it up.
        betweenBlocks: item.value.length < value.length
      };
    }

    const quoted = continueQuote(value, start);

    if (quoted) {
      return quoted;
    }
  }

  return { ...splice(value, start, end, '\n\n'), betweenBlocks: true };
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

  return place && text ? splice(value, place.start, place.end, text) : null;
}

export function editFor(
  event: InputEvent,
  root: HTMLElement,
  value: string,
  aim: MawyAim | null
): MawyEdit | null {
  const place = placeOf(root, value, aim);

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
      const tag = blockAt(root, range.startContainer)?.tagName;
      const rule =
        start === end && tag !== 'PRE' && tag !== 'TD' && tag !== 'TH'
          ? ruleFor(value, start, event.data)
          : null;

      return rule ?? splice(value, start, end, event.data);
    }

    case 'insertReplacementText':
      return event.data === null ? null : splice(value, start, end, event.data);

    case 'insertParagraph':
      return breakAt(root, value, start, end, range.startContainer);

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

    case 'insertFromDrop': {
      const block = blockAt(root, range.startContainer);
      const text = markdownFor(event.dataTransfer, block?.tagName === 'PRE');

      return text ? splice(value, start, end, text) : null;
    }

    default:
      return null;
  }
}
