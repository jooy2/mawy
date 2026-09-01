'use client';

import * as React from 'react';
import type { MawyDirectives, MawyHtmlPolicy, MawyParseOptions } from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';
import type { MdBlock, MdNode, MdRange } from '../../internal/markdown/ast.js';
import { parseMarkdown } from '../../internal/markdown/parse.js';
import {
  renderBlocks,
  renderFootnotes,
  type RenderContext
} from '../../internal/markdown/render.js';
import {
  blockAt,
  documentAt,
  editFor,
  editForText,
  markdownFor,
  type MawyAim,
  type MawyEdit
} from '../../internal/editing.js';
import { pastedImagesIn } from '../../internal/images.js';
import { domAt, sourceAt } from '../../internal/position.js';

export interface MawyEditorDocumentProps {
  value: string;
  onEdit: (edit: MawyEdit) => void;
  /** Where the caret is, in the document's own offsets. */
  onSelect: (selection: { start: number; end: number }) => void;
  /**
   * Where the caret is now, as the editor has it. Read to decide which link,
   * image or piece of markup, if any, is drawn as its own source — see
   * `revealedIn` below.
   */
  selection: { start: number; end: number };
  /**
   * Whether the editor has the focus anywhere in it.
   *
   * What is written out is "the thing the caret is inside", and an editor
   * nobody is typing in has no caret to be inside anything — a document that
   * opens with a link would otherwise show its brackets to a reader who has not
   * touched it. The editor rather than this surface, because pressing a button
   * on the toolbar takes the focus out of here and the caret it is about to act
   * on is still the caret.
   */
  focused: boolean;
  onKeyDown: React.KeyboardEventHandler<HTMLElement>;
  readOnly: boolean;
  label: string;
  placeholder?: string;
  parse?: MawyParseOptions;
  html: MawyHtmlPolicy;
  /** What draws the constructs this package does not know about. */
  directives?: MawyDirectives;
  strings: MawyStrings;
  /**
   * A place the caret was left where nothing is drawn, from the last edit. See
   * `withRoom` below for what is done about it.
   */
  room: number | null;
  /**
   * Where the last edit meant to leave the caret, when the page had nowhere to
   * draw it. A ref rather than a value: it is settled after the drawing, in a
   * layout effect, and what reads it is an event handler rather than a render.
   */
  aim: React.RefObject<MawyAim | null>;
  /**
   * Files on the clipboard, put in as images. Absent when the application has
   * not said where an image goes, which is when there is nothing to be done
   * with one — see `MawyImageUpload`.
   */
  onImages?: (files: readonly File[], at: number) => void;
}

/**
 * The range of the innermost thing a selection falls entirely inside that is
 * drawn as something other than its own characters, or `null`.
 *
 * Four kinds of node, and one reason: a link and an image draw their words and
 * never their `(url)`, and raw HTML that is being drawn rather than shown
 * reached the page through `dangerouslySetInnerHTML`, which is markup React
 * does not know the inside of. In each of them there is nothing on the page for
 * a caret to sit in that is a character of the document.
 *
 * Entirely inside, so that a range dragged across half a document does not turn
 * every link under it into markup — and so that the toolbar's `[](url)`, which
 * arrives with the placeholder already selected, is written out with it.
 *
 * A walk over the tree on every caret move, which sounds worse than it is: a
 * block whose range cannot hold the selection is skipped without being
 * descended into, so a caret in a long document reads one paragraph.
 */
function revealedIn(nodes: readonly MdNode[], start: number, end: number): MdRange | null {
  for (const node of nodes) {
    if (start < node.range.start || end > node.range.end) {
      continue;
    }

    if (
      node.type === 'link' ||
      node.type === 'image' ||
      node.type === 'html' ||
      node.type === 'inlineHtml'
    ) {
      return { start: node.range.start, end: node.range.end };
    }

    const children = 'children' in node ? (node.children as MdNode[]) : [];
    const inside = revealedIn(children, start, end);

    if (inside) {
      return inside;
    }
  }

  return null;
}

/**
 * The document, edited in place.
 *
 * What is on screen is a drawing of the Markdown, and the Markdown is what is
 * true. Every `beforeinput` is refused and turned into an edit to that string
 * instead, the string is parsed again, and the drawing is replaced — so the
 * document and the source cannot drift apart, because there is only ever one of
 * them. `internal/editing.ts` holds the rules and `internal/position.ts` moves
 * between the two ways of saying where something is.
 *
 * What this surface can edit is anywhere there is text to type in — a
 * paragraph, a heading, a list item, a quotation, a table cell, a code block —
 * along with the shorthands that turn into formatting as they are typed.
 * `internal/rules.ts` holds the two of those that are not simply the parser
 * keeping up. What is refused rather than half-done is an image, which has
 * nowhere for its bytes to go yet, and raw HTML being *drawn* rather than
 * shown, which React did not put on the page and could not put back.
 *
 * An input method is the one thing that cannot be refused, and it is handled
 * the other way round: the browser is left alone for the length of a
 * composition and what it did is read back when the composition ends. Korean is
 * composed a jamo at a time, and a surface that answered every one of them with
 * "no" would be a surface that cannot write Korean at all.
 */
export const MawyEditorDocument = React.forwardRef<HTMLElement, MawyEditorDocumentProps>(
  function MawyEditorDocument(
    {
      value,
      onEdit,
      onSelect,
      selection,
      focused,
      onKeyDown,
      readOnly,
      label,
      placeholder,
      parse,
      html,
      directives,
      strings,
      room,
      aim,
      onImages
    },
    ref
  ) {
    const root = React.useRef<HTMLDivElement>(null);
    const composing = React.useRef(false);
    const composed = React.useRef<{ host: Node; before: string; start: number } | null>(null);
    /** Bumped to throw the drawing away and make it again from the document. */
    const [generation, setGeneration] = React.useState(0);
    const gfm = parse?.gfm ?? true;
    const breaks = parse?.breaks ?? false;
    const definitionLists = parse?.definitionLists ?? true;

    React.useImperativeHandle(ref, () => root.current as HTMLElement);

    const document_ = React.useMemo(
      () => parseMarkdown(value, { gfm, breaks, definitionLists }),
      [value, gfm, breaks, definitionLists]
    );
    const blocks = React.useMemo(() => withRoom(document_.root.children, room), [document_, room]);
    const footnotes = React.useMemo(
      () => new Map(document_.footnotes.map((footnote) => [footnote.label, footnote])),
      [document_]
    );
    /**
     * The link or image the caret is inside, which is drawn as its own
     * characters rather than as what it means.
     *
     * A drawn `<a>` puts its words on the page and never its `(url)`, so a
     * destination has nowhere for a caret to be and nothing for a keystroke to
     * land on — which is why `[](url)` from the toolbar could not be typed
     * over. Written out, it is the source one character for one, and every rule
     * this surface already has works on it unchanged.
     *
     * Only the one the selection is entirely inside — a range dragged across
     * half a document turns nothing into markup under the pointer.
     */
    const reveal = React.useMemo(
      () => (focused ? revealedIn(document_.root.children, selection.start, selection.end) : null),
      [document_, focused, selection.start, selection.end]
    );
    const context: RenderContext = React.useMemo(
      () => ({ html, strings, footnotes, directives, source: value, reveal }),
      [html, strings, footnotes, directives, value, reveal]
    );

    /**
     * The caret, put back after a reveal changed what is under it.
     *
     * Drawing a link as markup and drawing it back again both replace the nodes
     * the selection was anchored in, and a selection whose nodes are gone is a
     * caret that has left the surface. Nothing was edited, so the editor's own
     * restoring — which runs after an edit — has nothing to run for; this is the
     * same job for the other reason.
     */
    const drawnReveal = React.useRef(reveal);

    React.useLayoutEffect(() => {
      const element = root.current;
      const was = drawnReveal.current;

      drawnReveal.current = reveal;

      if (!element || was === reveal || composing.current || !focused) {
        return;
      }

      const owner = element.ownerDocument;

      // Only when the caret was in here to begin with. A reveal that changed
      // because the document did, with the focus somewhere else entirely, has
      // no caret of ours to put back.
      if (!element.contains(owner.getSelection()?.anchorNode ?? null)) {
        return;
      }

      const at = domAt(element, selection.start, value);

      if (!at) {
        return;
      }

      const range = owner.createRange();

      range.setStart(at.node, at.offset);
      range.collapse(true);
      owner.getSelection()?.removeAllRanges();
      owner.getSelection()?.addRange(range);
    }, [focused, reveal, selection.start, value]);

    /**
     * `beforeinput` rather than React's `onBeforeInput`, and a listener of our
     * own rather than a delegated one: this is the only place the browser is
     * told no, and it has to be told before it touches the tree.
     */
    React.useEffect(() => {
      const element = root.current;

      if (!element) {
        return;
      }

      const refuse = (event: Event) => {
        // A composition is the one thing the browser is allowed to do to this
        // tree. Refusing an `insertCompositionText` is refusing the composition
        // itself, and an editor that does that to a Korean keyboard eats
        // characters. What it did is read back in `compositionend` below.
        if (composing.current) {
          return;
        }

        event.preventDefault();

        if (readOnly) {
          return;
        }

        const edit = editFor(event as InputEvent, element, value, aim.current);

        if (edit) {
          onEdit(edit);
        }
      };

      /**
       * A paste comes in as its own event rather than through `beforeinput`,
       * because that is the one every browser puts the clipboard on. What is on
       * it as HTML is read back as Markdown; what is on it as text is text.
       */
      const paste = (event: ClipboardEvent) => {
        event.preventDefault();

        if (readOnly) {
          return;
        }

        const selection = element.ownerDocument.getSelection();
        const where = selection?.anchorNode;
        const literal = Boolean(where && blockAt(element, where)?.tagName === 'PRE');
        const images = onImages ? pastedImagesIn(event.clipboardData) : [];

        if (images.length && !literal) {
          // A file on the clipboard with no markup beside it is a screenshot.
          // Inside a code block it is not one, because everything in there is
          // the characters it is.
          const at = where
            ? documentAt(element, where, selection?.anchorOffset ?? 0, value, aim.current)
            : null;

          onImages?.(images, at ?? value.length);

          return;
        }

        const edit = editForText(
          element,
          value,
          markdownFor(event.clipboardData, literal),
          aim.current
        );

        if (edit) {
          onEdit(edit);
        }
      };

      element.addEventListener('beforeinput', refuse);
      element.addEventListener('paste', paste);

      return () => {
        element.removeEventListener('beforeinput', refuse);
        element.removeEventListener('paste', paste);
      };
    }, [value, readOnly, onEdit, onImages, aim]);

    /**
     * `selectionchange` on the document rather than anything on the element:
     * a caret that merely moved fires nothing an element can hear.
     */
    React.useEffect(() => {
      const element = root.current;

      if (!element) {
        return;
      }

      const owner = element.ownerDocument;

      const read = () => {
        const selection = owner.getSelection();

        // A composition moves the caret on every keystroke and reporting each
        // one is a render in the middle of one, which is how a composition dies.
        if (composing.current || !selection?.rangeCount) {
          return;
        }

        const range = selection.getRangeAt(0);

        if (!element.contains(range.startContainer)) {
          return;
        }

        const start = documentAt(
          element,
          range.startContainer,
          range.startOffset,
          value,
          aim.current
        );
        const end = documentAt(element, range.endContainer, range.endOffset, value, aim.current);

        if (start !== null && end !== null) {
          onSelect({ start: Math.min(start, end), end: Math.max(start, end) });
        }
      };

      owner.addEventListener('selectionchange', read);

      return () => owner.removeEventListener('selectionchange', read);
    }, [value, onSelect, aim]);

    /**
     * A composition, from the outside.
     *
     * Nothing is stopped and nothing is drawn again while one is running: the
     * browser owns that run of text until it says it is finished, and any
     * render in between takes the half-composed syllable with it. When it ends,
     * the run is compared with what it said before and the difference is put
     * into the document at the place that run came from.
     */
    React.useEffect(() => {
      const element = root.current;

      if (!element) {
        return;
      }

      const owner = element.ownerDocument;

      const opened = () => {
        composing.current = true;
        composed.current = null;

        const node = owner.getSelection()?.anchorNode;

        // Either the run of text the caret is in, or — with nothing to type
        // into yet — the empty block it is in, which is where a composition
        // straight after `Enter` lands.
        const host =
          node?.nodeType === 3 ? node : node?.nodeType === 1 && !node.textContent ? node : null;

        if (!host || !element.contains(host) || !blockAt(element, host)) {
          return;
        }

        // Where the run of text starts rather than where the caret is, so the
        // caret's own answer is not the one being asked for here.
        const start = sourceAt(element, host, 0, value);

        if (start !== null) {
          composed.current = { host, before: contentOf(host), start };
        }
      };

      const closed = () => {
        composing.current = false;

        const was = composed.current;

        composed.current = null;

        if (!was || readOnly) {
          return;
        }

        if (!element.contains(was.host)) {
          // The browser rearranged the tree rather than changing one run of text
          // inside it, and there is nothing to read back from that. The drawing
          // is thrown away and made again from the document, which is still
          // exactly what it was: a composition that cannot be read is a
          // composition that did not happen.
          setGeneration((each) => each + 1);

          return;
        }

        const after = contentOf(was.host);

        if (after === was.before) {
          return;
        }

        const anchor = owner.getSelection()?.anchorNode;
        const caret =
          anchor?.nodeType === 3 && was.host.contains(anchor)
            ? was.start + (owner.getSelection()?.anchorOffset ?? 0)
            : was.start + after.length;

        // What was composed in goes back to what React last drew before the new
        // document is handed over. React compares what it drew against what it
        // is about to draw rather than against what is on the screen, so a run
        // the browser changed underneath it is a run it would not think to
        // change back.
        restore(was.host, was.before);

        onEdit({
          value: value.slice(0, was.start) + after + value.slice(was.start + was.before.length),
          caret
        });
      };

      element.addEventListener('compositionstart', opened);
      element.addEventListener('compositionend', closed);

      return () => {
        element.removeEventListener('compositionstart', opened);
        element.removeEventListener('compositionend', closed);
      };
    }, [value, readOnly, onEdit, aim]);

    return (
      <div className="mawy-document">
        {/*
          A `div` rather than an `article`, which is what this used to be: ARIA
          does not let a document section be a `textbox`, and a role a browser
          refuses is a role a screen reader does not read. The viewer's drawn
          document is still an `article`, because there it is one.
        */}
        <div
          ref={root}
          className="mawy-md mawy-document-body"
          contentEditable={!readOnly}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          onKeyDown={onKeyDown}
          style={{ '--mawy-placeholder': JSON.stringify(placeholder ?? '') } as React.CSSProperties}
        >
          <React.Fragment key={generation}>
            {renderBlocks(blocks, context)}
            {renderFootnotes(document_.footnotes, context)}
          </React.Fragment>
        </div>
      </div>
    );
  }
);

/** What a composition changed: a run of text, or an empty block's contents. */
function contentOf(host: Node): string {
  return host.nodeType === 3 ? (host as Text).data : (host.textContent ?? '');
}

function restore(host: Node, content: string): void {
  if (host.nodeType === 3) {
    (host as Text).data = content;
  } else {
    host.textContent = content;
  }
}

/**
 * A paragraph with nothing in it, where the caret has nowhere else to be.
 *
 * Markdown cannot write an empty paragraph. A blank line separates two blocks
 * and a second blank line separates the same two, so pressing Enter at the end
 * of one and expecting a place to type is asking for something the file cannot
 * say. The document has to draw one anyway, or the caret would sit at the end
 * of the paragraph above and Enter would look like it did nothing.
 *
 * So exactly one is drawn, at the position the last edit left the caret, and it
 * is gone the moment anything is typed into it — at which point the blank line
 * around it is doing the work and the paragraph is real.
 */
function withRoom(blocks: MdBlock[], room: number | null): MdBlock[] {
  if (!blocks.length) {
    return [empty(0)];
  }

  if (
    room === null ||
    blocks.some((block) => block.range.start <= room && room <= block.range.end)
  ) {
    return blocks;
  }

  const at = blocks.filter((block) => block.range.end < room).length;

  return [...blocks.slice(0, at), empty(room), ...blocks.slice(at)];
}

function empty(at: number): MdBlock {
  return { type: 'paragraph', range: { start: at, end: at }, children: [] };
}
