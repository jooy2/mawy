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

import { sourceAt } from './position.js';

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

/** The blocks whose text this surface knows how to put an edit back into. */
const EDITABLE = /^(?:P|H1|H2|H3|H4|H5|H6)$/;

/** The top-level block a place on the page is in, if it is one of those. */
export function blockAt(root: HTMLElement, node: Node): HTMLElement | null {
  let at: Node | null = node;

  while (at && at.parentNode && at.parentNode !== root) {
    at = at.parentNode;
  }

  return at?.parentNode === root && EDITABLE.test((at as HTMLElement).tagName)
    ? (at as HTMLElement)
    : null;
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
  const back = before(root, node, offset);

  if (!back) {
    return null;
  }

  const from = sourceAt(root, back.node, back.offset, value);
  const to = sourceAt(root, back.node, back.offset + 1, value);

  if (from === null || to === null) {
    return null;
  }

  if (blockAt(root, back.node) !== blockAt(root, node)) {
    return to < caret ? splice(value, to, caret, '') : null;
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
  const ahead = after(root, node, offset);

  if (!ahead) {
    return null;
  }

  const from = sourceAt(root, ahead.node, ahead.offset, value);
  const to = sourceAt(root, ahead.node, ahead.offset + 1, value);

  if (from === null || to === null) {
    return null;
  }

  if (blockAt(root, ahead.node) !== blockAt(root, node)) {
    return from > caret ? { value: value.slice(0, caret) + value.slice(from), caret } : null;
  }

  return { value: value.slice(0, from) + value.slice(Math.max(to, from + 1)), caret };
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
export function editFor(event: InputEvent, root: HTMLElement, value: string): MawyEdit | null {
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

  const head = sourceAt(root, range.startContainer, range.startOffset, value);
  const tail = sourceAt(root, range.endContainer, range.endOffset, value);

  if (head === null || tail === null) {
    return null;
  }

  const start = Math.min(head, tail);
  const end = Math.max(head, tail);

  switch (event.inputType) {
    case 'insertText':
    case 'insertReplacementText':
      return event.data === null ? null : splice(value, start, end, event.data);

    case 'insertParagraph':
      return { ...splice(value, start, end, '\n\n'), betweenBlocks: true };

    case 'insertLineBreak':
      // Two spaces and a newline: the hard break nearly every Markdown file in
      // the world is written with, however invisible it is.
      return splice(value, start, end, '  \n');

    case 'deleteContentBackward':
      return start === end
        ? deleteBefore(root, value, range.startContainer, range.startOffset, start)
        : splice(value, start, end, '');

    case 'deleteContentForward':
      return start === end
        ? deleteAfter(root, value, range.startContainer, range.startOffset, start)
        : splice(value, start, end, '');

    default:
      return null;
  }
}
