'use client';

import * as React from 'react';
import type {
  MawyDirectives,
  MawyHtmlPolicy,
  MawyImageProps,
  MawyImagePolicy,
  MawyLinkPolicy,
  MawyLinkRel,
  MawyLinkTarget,
  MawyParseOptions,
  MawyUrlResolver
} from '../../types.js';
import type { MawyCommand } from '../../internal/commands.js';
import type { MawyStrings } from '../../internal/i18n.js';
import type { MdBlock, MdNode, MdRange } from '../../internal/markdown/ast.js';
import { LIVE } from '../../internal/markdown/live.js';
import { parseMarkdown } from '../../internal/markdown/parse.js';
import {
  firstImage,
  isLineBreakHtml,
  renderBlocks,
  renderFootnotes,
  type RenderContext
} from '../../internal/markdown/render.js';
import {
  blankParagraphs,
  blockAt,
  documentAt,
  editFor,
  editForText,
  heldText,
  leadFor,
  markdownFor,
  openedAt,
  typedOver,
  type MawyAim,
  type MawyDrag,
  type MawyEdit
} from '../../internal/editing.js';
import { fileFromDataUrl, pastedImagesIn } from '../../internal/images.js';
import { pasteFromHtml } from '../../internal/markdown/paste.js';
import { caretFromPoint, domAt, rangeOf, sourceAt } from '../../internal/position.js';

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
  /** Where a link the document wrote opens. See `MawyViewer.linkTarget`. */
  linkTarget?: MawyLinkTarget;
  /** What such a link declares. See `MawyViewer.linkRel`. */
  linkRel?: MawyLinkRel;
  /** How such a link is drawn. See `MawyEditor.links`. */
  links?: MawyLinkPolicy;
  /** How a picture is drawn. See `MawyEditor.images`. */
  images?: MawyImagePolicy;
  /** What draws the constructs this package does not know about. */
  directives?: MawyDirectives;

  /**
   * What draws a picture the document points at.
   *
   * Absent, an `<img>` is written and the browser fetches it. Given one, the
   * application draws it instead:
   *
   * ```tsx
   * <MawyViewer value={document} image={({ src, alt }) => <Image src={src} alt={alt} />} />
   * ```
   *
   * Which is the only way to put a header on the request, send it through a
   * loader of the application's own, answer it out of a cache, or refuse it.
   * Which pictures an application is willing to fetch is not a viewer's
   * decision to make — a document from somewhere else has somebody else's URLs
   * in it, and fetching them all without asking tells whoever wrote them which
   * documents are being read.
   */
  image?: React.ComponentType<MawyImageProps>;

  /**
   * Where a relative URL points. See `MawyUrlResolver`.
   *
   * The drawn surface and the preview are both showing the document, so both
   * resolve its addresses the same way.
   */
  resolveUrl?: MawyUrlResolver;
  /** Put in front of every anchor this drawing gives. See `MawyEditor.anchorPrefix`. */
  anchorPrefix?: string;
  /** Which of `h1` to `h6` the document's own `#` is drawn as. */
  headingBase?: number;
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
   * What the first words written into an empty document are written after:
   * a heading's marker, or nothing. See `MawyEditor.startWithHeading`.
   */
  lead: string;
  /**
   * Formatting the caret has been told to hold until something is typed. See
   * `heldText`.
   */
  held: readonly MawyCommand[];
  /**
   * Files on the clipboard, put in as images. Absent when the application has
   * not said where an image goes, which is when there is nothing to be done
   * with one — see `MawyImageUpload`.
   */
  onImages?: (
    files: readonly File[],
    at: { start: number; end: number },
    after?: string | null
  ) => void;
}

/**
 * The blocks a marker on its own makes, and which draw none of it.
 *
 * `#` is an empty heading to CommonMark and the specification is right about
 * that — but on this surface it is a heading with nothing in it, which draws no
 * characters at all, so the `#` somebody typed disappears as they type it. `-`,
 * `>` and `1.` are the same story with a bullet, a bar or a number left where
 * the text went. See [emptyBlock].
 */
const EMPTIABLE = new Set(['heading', 'list', 'listItem', 'blockquote']);

/**
 * Whether a block is one of those and has nothing written in it yet.
 *
 * Recursive, so that a list holding one empty item is empty and is the node
 * revealed rather than the item inside it — revealing the item would leave the
 * bullet beside the `-` it is a drawing of.
 *
 * A code block is deliberately not on the list. With nothing between its fences
 * it draws nothing either, but the `code` element is a place a caret can be and
 * a keystroke lands in it; and `rules.ts` has already moved the caret off a
 * fence and off a thematic break by the time either could be asked about.
 */
function emptyBlock(node: MdNode): boolean {
  if (!EMPTIABLE.has(node.type)) {
    return false;
  }

  const children = 'children' in node ? (node.children as MdNode[]) : [];

  return children.every(emptyBlock);
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
 * A block written so far as a marker and nothing else is a fifth, for that same
 * reason said about a whole line: `#` draws an empty heading, and somebody who
 * typed it watched the character they typed vanish. Written out it is the `#`
 * again, and the space that would turn it into a heading is one keystroke away
 * rather than an undo away. The outermost such block rather than the innermost,
 * which is what [emptyBlock] recurses for.
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
      (node.type === 'inlineHtml' && !isLineBreakHtml(node)) ||
      emptyBlock(node)
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
 * keeping up. A link, an image and raw HTML being *drawn* rather than shown
 * have nothing on the page a caret can sit in, so the one the caret is inside is
 * written out as its own characters instead. See `revealedIn`.
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
      linkTarget,
      linkRel,
      links,
      images,
      directives,
      image,
      resolveUrl,
      anchorPrefix,
      headingBase,
      strings,
      room,
      aim,
      lead,
      held,
      onImages
    },
    ref
  ) {
    const root = React.useRef<HTMLDivElement>(null);
    const composing = React.useRef(false);
    /** The run a drag has taken out and not yet put back. See `MawyDrag`. */
    const drag = React.useRef<MawyDrag>({ taken: null });
    const composed = React.useRef<{
      host: Node;
      before: string;
      start: number;
      /** Where in the run the caret was when the composition began. */
      offset: number;
      /**
       * Whether the caret was between two things in an element with words in
       * it rather than inside a run of text — after a line break in a cell, at
       * the start of a cell a drag selected. What the browser writes there is a
       * run of text of its own, which nothing can take back out by hand.
       */
      between: boolean;
      /** The selection the composition began over, where it ran past one run of text. */
      over: { start: number; end: number } | null;
    } | null>(null);
    /** Bumped to throw the drawing away and make it again from the document. */
    const [generation, setGeneration] = React.useState(0);
    const gfm = parse?.gfm ?? true;
    const breaks = parse?.breaks ?? false;
    const definitionLists = parse?.definitionLists ?? true;

    /**
     * What the listeners below read, kept somewhere they can read it later.
     *
     * `beforeinput` is the one place the browser is told no, so it is a
     * listener on the element rather than a delegated one — and what it needs
     * to answer with is the document, which changes on every keystroke. An
     * effect that closed over the document would take both listeners off the
     * element and put them back for every character typed. They are bound once
     * and read the latest of these instead.
     *
     * Written in a layout effect rather than during the render: a render React
     * throws away must not be able to leave anything behind here, and a
     * keystroke cannot arrive between the tree being changed and this.
     */
    const options = React.useMemo(
      () => ({ gfm, breaks, definitionLists }),
      [gfm, breaks, definitionLists]
    );
    const latest = React.useRef({
      value,
      readOnly,
      onEdit,
      onSelect,
      onImages,
      options,
      lead,
      held
    });

    React.useLayoutEffect(() => {
      latest.current = { value, readOnly, onEdit, onSelect, onImages, options, lead, held };
    });

    React.useImperativeHandle(ref, () => root.current as HTMLElement);

    const document_ = React.useMemo(() => parseMarkdown(value, options), [value, options]);
    const blocks = React.useMemo(
      () => withRoom(document_.root.children, room, value),
      [document_, room, value]
    );
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
    /**
     * The spaces the caret is after at the end of a line, which the page is
     * told to draw. See `spaces` in `render.tsx`.
     *
     * Two numbers rather than an object, so that a caret moving about a
     * document with no such spaces in front of it does not draw the document
     * again at every step.
     */
    const [spacesFrom, spacesTo] = React.useMemo(() => {
      const at = selection.start;
      let from = at;

      while (from > 0 && (value[from - 1] === ' ' || value[from - 1] === '\t')) {
        from -= 1;
      }

      const stop = value.indexOf('\n', at);
      const rest = value.slice(at, stop === -1 ? value.length : stop);

      return focused && selection.end === at && from < at && /^[ \t]*(?:\||$)/.test(rest)
        ? [from, at]
        : [-1, -1];
    }, [focused, selection.end, selection.start, value]);
    const spaces = React.useMemo(
      () => (spacesFrom === -1 ? null : { start: spacesFrom, end: spacesTo }),
      [spacesFrom, spacesTo]
    );
    /** Which picture is fetched with the page rather than when it is reached. */
    const picture = React.useMemo(() => firstImage(document_.root.children), [document_]);
    const context: RenderContext = React.useMemo(
      () => ({
        html,
        strings,
        footnotes,
        directives,
        image,
        resolveUrl,
        anchorPrefix,
        headingBase,
        linkTarget,
        linkRel,
        links,
        images,
        firstImage: picture,
        source: value,
        reveal,
        spaces,
        live: LIVE,
        editing: true
      }),
      [
        html,
        strings,
        footnotes,
        directives,
        image,
        resolveUrl,
        anchorPrefix,
        headingBase,
        linkTarget,
        linkRel,
        links,
        images,
        picture,
        value,
        reveal,
        spaces
      ]
    );

    /**
     * The document, drawn.
     *
     * Kept until the blocks or the context change, which is the boundary the
     * viewer has had all along and this surface had not. This component
     * re-renders for everything the editor around it does — a caret moving, a
     * toolbar button lighting up, a query being typed into the find bar — and
     * every one of those was the whole document built again as elements. React
     * skips a subtree whose element it has already seen.
     */
    const content = React.useMemo(
      () => (
        <>
          {renderBlocks(blocks, context)}
          {renderFootnotes(document_.footnotes, context)}
        </>
      ),
      [blocks, document_, context]
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

        const now = latest.current;

        if (now.readOnly) {
          return;
        }

        const edit = editFor(
          event as InputEvent,
          element,
          now.value,
          aim.current,
          now.options,
          drag.current,
          now.lead,
          now.held
        );

        if (edit) {
          now.onEdit(edit);
        }
      };

      /**
       * A paste comes in as its own event rather than through `beforeinput`,
       * because that is the one every browser puts the clipboard on. What is on
       * it as HTML is read back as Markdown; what is on it as text is text.
       */
      const paste = (event: ClipboardEvent) => {
        event.preventDefault();

        const now = latest.current;

        if (now.readOnly) {
          return;
        }

        const selection = element.ownerDocument.getSelection();
        const where = selection?.anchorNode;
        const literal = Boolean(where && blockAt(element, where)?.tagName === 'PRE');
        const images = now.onImages && !literal ? pastedImagesIn(event.clipboardData) : [];

        /**
         * What is selected, in the document's offsets.
         *
         * The range rather than the anchor, which is the end of a selection made
         * backwards: what is selected is replaced, whichever way it was dragged.
         */
        const selected = () => {
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          const from =
            range &&
            documentAt(element, range.startContainer, range.startOffset, now.value, aim.current);
          const to =
            range &&
            documentAt(element, range.endContainer, range.endOffset, now.value, aim.current);
          const start = from ?? now.value.length;

          return { start, end: Math.max(start, to ?? start) };
        };

        if (images.length) {
          // A file on the clipboard with no markup beside it is a screenshot.
          // Inside a code block it is not one, because everything in there is
          // the characters it is.
          now.onImages?.(images, selected());

          return;
        }

        // Pictures carried inline, as bytes, go where the application says an
        // image goes. See `pasteFromHtml`.
        const pasted =
          now.onImages && !literal
            ? pasteFromHtml(
                event.clipboardData?.getData('text/html') ?? '',
                event.clipboardData?.getData('text/rtf') ?? ''
              )
            : null;

        if (pasted?.images.length) {
          const edit = pasted.markdown
            ? editForText(element, now.value, pasted.markdown, aim.current)
            : null;
          const start = edit ? edit.caret - pasted.markdown.length : 0;
          const range = edit ? null : selected();

          if (edit) {
            now.onEdit(edit);
          }

          for (const image of pasted.images) {
            const file = fileFromDataUrl(image.url, image.alt);

            if (file) {
              now.onImages?.(
                [file],
                range ?? { start: start + image.at, end: start + image.at },
                edit?.value ?? null
              );
            }
          }

          return;
        }

        // Into a table cell, on the one line a cell is: a line ending would end
        // the row, so each is the `<br>` a cell writes one with, and a pipe is
        // escaped, or it would be the edge of a cell of its own.
        const cell = Boolean(where && /^T[DH]$/.test(blockAt(element, where)?.tagName ?? ''));
        const text = markdownFor(event.clipboardData, literal);
        const edit = editForText(
          element,
          now.value,
          cell ? text.replace(/\r?\n/g, '<br>').replace(/(?<!\\)\|/g, '\\|') : text,
          aim.current
        );

        if (edit) {
          now.onEdit(edit);
        }
      };

      // A drag that ended without a drop in here — outside the surface, or
      // nowhere at all — leaves a run written down and nothing to do with it.
      // Forgotten here rather than at the next edit, so that a drop from
      // somewhere else later cannot be answered with it.
      const dragged = () => {
        drag.current.taken = null;
      };

      element.addEventListener('beforeinput', refuse);
      element.addEventListener('paste', paste);
      element.addEventListener('dragend', dragged);

      return () => {
        element.removeEventListener('beforeinput', refuse);
        element.removeEventListener('paste', paste);
        element.removeEventListener('dragend', dragged);
      };
    }, [aim]);

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

        const now = latest.current;
        const start = documentAt(
          element,
          range.startContainer,
          range.startOffset,
          now.value,
          aim.current
        );
        const end = documentAt(
          element,
          range.endContainer,
          range.endOffset,
          now.value,
          aim.current
        );

        if (start !== null && end !== null) {
          now.onSelect({ start: Math.min(start, end), end: Math.max(start, end) });
        }
      };

      owner.addEventListener('selectionchange', read);

      return () => owner.removeEventListener('selectionchange', read);
    }, [aim]);

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

        const selection = owner.getSelection();

        if (!selection?.rangeCount || !element.contains(selection.anchorNode)) {
          return;
        }

        // A selection across more than one run of text is taken out by the
        // browser to make room for what is composed, and what it takes is the
        // tree between the two ends: the pipes and rows between two cells, the
        // blocks between two paragraphs. That cannot be refused, so the
        // selection is closed onto its start before anything is composed, and
        // what was composed replaces it when the composition ends.
        let over: { start: number; end: number } | null = null;
        const range = selection.getRangeAt(0);

        if (
          !selection.isCollapsed &&
          (range.startContainer !== range.endContainer || range.startContainer.nodeType !== 3)
        ) {
          // A selection of everything starts and ends on the surface itself,
          // which is the start and the end of the document.
          const edge = (node: Node, offset: number) =>
            node !== element
              ? documentAt(element, node, offset, value, aim.current)
              : offset === 0
                ? 0
                : offset >= element.childNodes.length
                  ? value.length
                  : null;
          const from = edge(range.startContainer, range.startOffset);
          const to = edge(range.endContainer, range.endOffset);
          const place = from === null ? null : domAt(element, from, value);

          if (from === null || to === null || !place) {
            return;
          }

          over = { start: Math.min(from, to), end: Math.max(from, to) };
          selection.collapse(place.node, place.offset);
        }

        const node = selection.anchorNode;
        const at = selection.anchorOffset;

        // The run of text the caret is in; the empty block it is in, with
        // nothing to type into yet, which is where a composition straight
        // after `Enter` lands; or the element it is between two things in.
        if (!node || !element.contains(node) || !blockAt(element, node)) {
          return;
        }

        const between = node.nodeType === 1 && Boolean(node.textContent);
        // Where the run of text starts rather than where the caret is, so the
        // caret's own answer is not the one being asked for here. Between two
        // things there is no run, and the caret's place is the answer.
        const start = sourceAt(element, node, between ? at : 0, value);

        if (start === null) {
          return;
        }

        const before = owner.createRange();

        before.selectNodeContents(node);
        before.setEnd(node, at);

        composed.current = {
          host: node,
          before: contentOf(node),
          start,
          offset: node.nodeType === 3 ? at : between ? before.toString().length : 0,
          between,
          over
        };
      };

      const closed = (event: CompositionEvent) => {
        composing.current = false;

        const was = composed.current;

        composed.current = null;

        if (readOnly) {
          return;
        }

        if (!was || !element.contains(was.host)) {
          // Nothing was written down to read back, or the browser rearranged
          // the tree rather than changing one run of text inside it. The
          // drawing is thrown away and made again from the document, which is
          // still exactly what it was: a composition that cannot be read is a
          // composition that did not happen, and a tree React did not draw is
          // one the next render fails on.
          if (was || event.data) {
            setGeneration((each) => each + 1);
          }

          return;
        }

        const after = spacedBack(contentOf(was.host), was.before, value.slice(was.start));
        const grown = after.length - was.before.length;
        const typed =
          grown > 0 &&
          after.slice(0, was.offset) === was.before.slice(0, was.offset) &&
          after.slice(was.offset + grown) === was.before.slice(was.offset)
            ? after.slice(was.offset, was.offset + grown)
            : '';

        if (was.between || was.over) {
          // Between two things the browser wrote a run of text of its own, and
          // the drawing is made again rather than taken apart by hand. A run
          // that was only changed goes back to what React last drew.
          if (was.between) {
            setGeneration((each) => each + 1);
          } else {
            restore(was.host, was.before);
          }

          if (!typed) {
            return;
          }

          if (was.over) {
            onEdit(typedOver(value, was.over.start, was.over.end, typed));

            return;
          }

          onEdit(
            (held.length && blockAt(element, was.host)?.tagName !== 'PRE'
              ? heldText(value, was.start, typed, held)
              : null) ?? {
              value: value.slice(0, was.start) + typed + value.slice(was.start),
              caret: was.start + typed.length
            }
          );

          return;
        }

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

        // An empty table cell is spaces between two pipes, and composing into
        // one gives the spaces back around the words the way typing into one
        // does. See `editFor`.
        const tag = (was.host as Element).tagName;

        if (!was.before && (tag === 'TD' || tag === 'TH')) {
          let from = was.start;

          while (from > 0 && (value[from - 1] === ' ' || value[from - 1] === '\t')) {
            from -= 1;
          }

          onEdit({
            value: `${value.slice(0, from)} ${after} ${value.slice(was.start)}`,
            caret: from + 1 + (caret - was.start)
          });

          return;
        }

        // Formatting the caret was holding, around what was composed, the way it
        // is around a keystroke. See `heldText`.
        const formatted =
          held.length &&
          grown > 0 &&
          blockAt(element, was.host)?.tagName !== 'PRE' &&
          after.slice(0, was.offset) === was.before.slice(0, was.offset) &&
          after.slice(was.offset + grown) === was.before.slice(was.offset)
            ? heldText(
                value,
                was.start + was.offset,
                after.slice(was.offset, was.offset + grown),
                held
              )
            : null;

        if (formatted) {
          onEdit(formatted);

          return;
        }

        // Into an empty paragraph with the blank lines that keep it one, the way
        // a keystroke is. See `openedAt`.
        const opened = was.before
          ? { value, at: was.start }
          : openedAt(element, was.host, value, was.start);
        // And into an empty document after its heading's marker, the way a
        // keystroke is. See `MawyEditor.startWithHeading`.
        const heading = lead && !value.trim() && !was.before ? leadFor(lead, after) : '';
        const shift = opened.at - was.start + heading.length;

        onEdit({
          value:
            opened.value.slice(0, opened.at) +
            heading +
            after +
            opened.value.slice(opened.at + was.before.length),
          caret: caret + shift
        });
      };

      element.addEventListener('compositionstart', opened);
      element.addEventListener('compositionend', closed);

      return () => {
        element.removeEventListener('compositionstart', opened);
        element.removeEventListener('compositionend', closed);
      };
    }, [value, readOnly, onEdit, aim, lead, held]);

    /**
     * The caret, put down by a press rather than by the browser, and whether
     * there was a place in the document to put it.
     *
     * The editor is told where it went straight away rather than on the
     * `selectionchange` that follows. The press gave the editor the focus, and
     * the render the focus causes draws out the link the editor's own record of
     * the caret is inside and puts the caret back where that record says — which,
     * until the editor has been told, is where the caret was before the press.
     */
    const put = (element: HTMLElement, at: { node: Node; offset: number } | null): boolean => {
      const owner = element.ownerDocument;
      const offset = at && documentAt(element, at.node, at.offset, value, aim.current);

      if (!at || offset === null) {
        return false;
      }

      const range = owner.createRange();

      range.setStart(at.node, at.offset);
      range.collapse(true);
      owner.getSelection()?.removeAllRanges();
      owner.getSelection()?.addRange(range);
      onSelect({ start: offset, end: offset });

      return true;
    };

    /**
     * A press in a table cell, and a drag from it, answered here rather than by
     * the browser.
     *
     * A browser selecting text across a table selects the text: a drag from
     * one cell to another covers the rest of the first row and the start of the
     * last, and a drag that starts in the padding of a cell starts at the end
     * of the words in the cell before it. What the table's controls and
     * `Delete` act on is the rectangle of cells between the cell a selection
     * starts in and the cell it ends in, so a drag is made to start in the cell
     * under the pointer and, once it reaches another cell, to cover whole cells
     * from the first to the one under the pointer — the way a table is selected
     * in every editor that has tables. Inside the one cell it is a text
     * selection, as it always was.
     *
     * A second press, `Shift` or any other modifier is the browser's: a word
     * double-clicked, a selection extended.
     */
    const pressCell = (event: React.MouseEvent<HTMLElement>) => {
      const element = root.current;
      const cell = (event.target as Element | null)?.closest?.('td, th');
      const modified = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;

      if (
        !element ||
        !cell ||
        readOnly ||
        modified ||
        event.button !== 0 ||
        event.detail > 1 ||
        !element.contains(cell)
      ) {
        return;
      }

      const owner = element.ownerDocument;
      /** Where in a cell a point is, or its nearer edge where the browser says it is not in it. */
      const inCell = (target: Element, x: number, y: number) => {
        const point = caretFromPoint(x, y);

        if (point && target.contains(point.node)) {
          return point;
        }

        const box = target.getBoundingClientRect();

        return {
          node: target,
          offset: x < box.left + box.width / 2 ? 0 : target.childNodes.length
        };
      };
      const anchor = inCell(cell, event.clientX, event.clientY);

      event.preventDefault();
      element.focus({ preventScroll: true });
      put(element, anchor);

      const move = (moved: MouseEvent) => {
        if (!(moved.buttons & 1)) {
          up();

          return;
        }

        const over = owner.elementFromPoint(moved.clientX, moved.clientY)?.closest('td, th');
        const selection = owner.getSelection();

        if (!selection) {
          return;
        }

        if (over && over !== cell && over.closest('table') === cell.closest('table')) {
          selection.setBaseAndExtent(cell, 0, over, over.childNodes.length);
        } else if (over === cell) {
          const point = inCell(cell, moved.clientX, moved.clientY);

          selection.setBaseAndExtent(anchor.node, anchor.offset, point.node, point.offset);
        }
      };

      const up = () => {
        owner.removeEventListener('mousemove', move);
        owner.removeEventListener('mouseup', up);
      };

      owner.addEventListener('mousemove', move);
      owner.addEventListener('mouseup', up);
    };

    /**
     * A paragraph opened under the last block, or over the first, where that
     * block has no line of text around it for a caret to go to.
     *
     * A code block, a divider, raw HTML drawn as elements and a table all end
     * where their own characters end, and one of them ending the document left
     * nowhere after it: a press below put the caret back inside the block, or
     * on nothing at all under a divider, and the arrows stopped at its last
     * line. So the blank lines a paragraph is written with are written, and the
     * caret is put on it. `null` where the block has somewhere to go already.
     */
    const opened = (element: HTMLElement, below: boolean, tables = true): MawyEdit | null => {
      const edge = below ? lastBlock(element) : element.firstElementChild;
      const range = edge ? rangeOf(edge) : null;
      const kind = edge ? blockKind(edge) : '';

      if (!edge || !range || !CLOSED_BLOCK.test(kind) || (kind === 'table' && !tables)) {
        return null;
      }

      if (below) {
        if (value.slice(range.end).trim()) {
          return null;
        }

        const tail = value.endsWith('\n') ? '\n' : '\n\n';

        return { value: value + tail, caret: value.length + tail.length, betweenBlocks: true };
      }

      return value.slice(0, range.start).trim()
        ? null
        : { value: `\n\n${value}`, caret: 0, betweenBlocks: true };
    };

    /**
     * The arrows at the edges of what a caret can reach, and at the edges of a
     * run of formatting.
     *
     * Past the last line of a code block or the last row of a table that ends
     * the document, `ArrowDown` opens a paragraph under it, and `ArrowUp` over
     * the first block does the same above. See `opened`.
     *
     * At the end of a code span, a bold run or any other formatting, the caret
     * is at one place on the page and at two in the document — in front of the
     * closing marker and after it — and a caret put down there was always the
     * first of those, so a code span at the end of a paragraph could not be
     * typed out of. `ArrowRight` there moves the caret past the marker without
     * moving it on the page, the way a caret is kept beside a space the page
     * does not draw (see `MawyAim`), and the next `ArrowRight` goes on as
     * usual. `ArrowLeft` at the start is the same, read the other way.
     */
    const navigate = (event: React.KeyboardEvent<HTMLElement>): void => {
      const element = root.current;
      const selection = element?.ownerDocument.getSelection();
      const modified = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
      const node = selection?.anchorNode;

      if (
        !element ||
        readOnly ||
        modified ||
        composing.current ||
        !selection?.isCollapsed ||
        !node ||
        !element.contains(node) ||
        !/^Arrow(?:Up|Down|Left|Right)$/.test(event.key)
      ) {
        return;
      }

      const offset = selection.anchorOffset;
      const forwards = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const across = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const host = node.nodeType === 1 ? (node as Element) : node.parentElement;
      const cell = across ? null : host?.closest<HTMLTableCellElement>('td, th');

      // Up and down in a table, which is a line of the cell and then the cell
      // above or below. A browser asked to move a caret down out of a cell
      // moves it into the next cell of the same row, which is the next thing
      // after it in the tree and nowhere near under it.
      if (cell && element.contains(cell)) {
        const x = caretBox(selection)?.left ?? cell.getBoundingClientRect().left;

        event.preventDefault();

        if (lineInCell(selection, cell, forwards)) {
          return;
        }

        const row = cell.parentElement as HTMLTableRowElement;
        const edit = edgeOf(row, node, offset, forwards, false) ? opened(element, forwards) : null;

        if (edit) {
          onEdit(edit);

          return;
        }

        const place = cellBeside(cell, forwards, x) ?? pastTable(element, cell, forwards, x);

        if (place) {
          put(element, place);
        }

        return;
      }

      const holder = host?.closest('pre');

      if (holder && element.contains(holder) && edgeOf(holder, node, offset, forwards, across)) {
        const edit = opened(element, forwards);

        if (edit) {
          event.preventDefault();
          onEdit(edit);

          return;
        }
      }

      if (!across) {
        // Into a table from the line above it or below it, which a browser
        // takes to the last cell of the row it arrives in rather than the one
        // under the caret.
        const into = intoTable(element, selection, forwards);

        if (into) {
          event.preventDefault();
          put(element, into);
        }

        return;
      }

      const at = documentAt(element, node, offset, value, aim.current);

      for (
        let mark = host;
        mark && mark !== element && INLINE_MARK.test(mark.tagName) && !mark.closest('pre');
        mark = mark.parentElement
      ) {
        const probe = element.ownerDocument.createRange();

        probe.selectNodeContents(mark);

        if (forwards) {
          probe.setStart(node, offset);
        } else {
          probe.setEnd(node, offset);
        }

        if (probe.toString()) {
          return;
        }

        const range = rangeOf(mark);
        const past = range && (forwards ? range.end : range.start);

        if (
          past !== null &&
          past !== undefined &&
          at !== null &&
          (forwards ? at < past : at > past)
        ) {
          event.preventDefault();
          aim.current = { value, at: past, node, offset };
          onSelect({ start: past, end: past });

          return;
        }
      }
    };

    /** Whether a point on the page is lower than everything the document draws. */
    const belowAll = (element: HTMLElement, y: number) => {
      const last = element.lastElementChild;

      return !last || y > last.getBoundingClientRect().bottom;
    };

    /**
     * A press on the pane around the document, which takes no focus of its own.
     *
     * The document is as wide as the measure, and the pane is as wide as the
     * editor, so there is room either side of it that is not the document. A
     * press there put the caret nowhere, and what was typed next went nowhere
     * with it. Beside a line it is the line — the browser is asked about the
     * nearest point that is inside the document — and below the last block it is
     * the end, the way a press below the last line of a textarea is.
     *
     * `mousedown` with its default prevented, so the focus never leaves the
     * editor on its way back into it. A scroll bar is the pane too, and pressing
     * one is scrolling.
     */
    const pressPane = (event: React.MouseEvent<HTMLDivElement>) => {
      const element = root.current;
      const pane = event.currentTarget;
      const modified = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;

      if (!element || readOnly || event.target !== pane || event.button !== 0 || modified) {
        return;
      }

      const box = pane.getBoundingClientRect();
      const x = event.clientX - box.left - pane.clientLeft;
      const y = event.clientY - box.top - pane.clientTop;

      if (x < 0 || y < 0 || x >= pane.clientWidth || y >= pane.clientHeight) {
        return;
      }

      event.preventDefault();
      element.focus({ preventScroll: true });

      const inside = element.getBoundingClientRect();
      const point = belowAll(element, event.clientY)
        ? null
        : caretFromPoint(
            Math.min(Math.max(event.clientX, inside.left + 1), inside.right - 1),
            event.clientY
          );

      if (!point || !element.contains(point.node) || !put(element, point)) {
        const edit = opened(element, true, false);

        if (edit) {
          onEdit(edit);

          return;
        }

        put(element, domAt(element, value.length, value));
      }
    };

    /**
     * A click below the last block, on the document itself.
     *
     * The document is at least as tall as the pane, so a press below what is
     * written in it lands on it, and the browser puts the caret down — at the end
     * of the last paragraph or item, except below a table, where Chromium and
     * WebKit put it in the box the table scrolls inside and a keystroke has
     * nowhere to go. Moved to the end of the document on `click` rather than on
     * `mousedown`, so a drag that starts down there still selects, and only while
     * nothing is selected.
     */
    const clickBelow = (event: React.MouseEvent<HTMLDivElement>) => {
      const element = root.current;

      if (
        !element ||
        readOnly ||
        event.target !== element ||
        !element.ownerDocument.getSelection()?.isCollapsed ||
        !belowAll(element, event.clientY)
      ) {
        return;
      }

      // Below a code block, a divider or drawn HTML, a paragraph to type in.
      // Below a table the caret goes into its last cell, as it always has, and
      // `ArrowDown` from its last row is the way out of it.
      const edit = opened(element, true, false);

      if (edit) {
        onEdit(edit);

        return;
      }

      put(element, domAt(element, value.length, value));
    };

    return (
      // Both handlers are for a pointer, and neither is the only way in: the
      // document is a `textbox` a keyboard reaches with `Tab`.
      <div className="mawy-document" onMouseDown={pressPane} onClick={clickBelow}>
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
          onKeyDown={(event) => {
            navigate(event);
            onKeyDown(event);
          }}
          onMouseDown={pressCell}
          style={{ '--mawy-placeholder': JSON.stringify(placeholder ?? '') } as React.CSSProperties}
        >
          <React.Fragment key={generation}>{content}</React.Fragment>
        </div>
      </div>
    );
  }
);

/** The formatting a caret can be at the edge of, drawn as an element of its own. */
const INLINE_MARK = /^(?:CODE|STRONG|EM|DEL|S)$/;

/** The blocks with no line of text around them for a caret to go on to. See `opened`. */
const CLOSED_BLOCK = /^(?:code|rule|html|table)$/;

/** What kind of block an element drawn straight under the document is. */
function blockKind(element: Element): string {
  return element.matches('.mawy-md-pre')
    ? 'code'
    : element.matches('hr')
      ? 'rule'
      : element.matches('.mawy-md-html')
        ? 'html'
        : element.matches('table, .mawy-md-table-scroll')
          ? 'table'
          : '';
}

/** The last block the document draws, which is before the notes when there are any. */
function lastBlock(element: HTMLElement): Element | null {
  let last = element.lastElementChild;

  while (last && !last.hasAttribute('data-mawy-range')) {
    last = last.previousElementSibling;
  }

  return last;
}

/**
 * Where a caret is drawn, or the box of what it is beside where it is on an
 * element between two things and has no box of its own.
 */
function caretBox(selection: Selection): DOMRect | null {
  if (!selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const own = range.getClientRects()[0];

  if (own) {
    return own;
  }

  const node = range.startContainer;
  const beside = node.childNodes[range.startOffset] ?? node.childNodes[range.startOffset - 1];
  const holder = beside ?? node;

  if (holder.nodeType === 1) {
    return (holder as Element).getBoundingClientRect();
  }

  const around = node.ownerDocument?.createRange();

  around?.selectNodeContents(holder);

  return around?.getClientRects()[0] ?? null;
}

/**
 * The caret moved a line up or down inside the cell it is in, and whether there
 * was a line there to move it to.
 *
 * The browser's own step, because what a line is — a line break, words wrapped
 * at the edge of the cell — is the layout's question. It is taken back where it
 * left the cell or did not change the line.
 */
function lineInCell(selection: Selection, cell: Element, forwards: boolean): boolean {
  const node = selection.anchorNode;
  const offset = selection.anchorOffset;
  const was = caretBox(selection);

  if (!node || !was || typeof selection.modify !== 'function') {
    return false;
  }

  selection.modify('move', forwards ? 'forward' : 'backward', 'line');

  const now = caretBox(selection);

  if (
    selection.anchorNode &&
    cell.contains(selection.anchorNode) &&
    now &&
    (forwards ? now.top > was.top + 1 : now.top < was.top - 1)
  ) {
    return true;
  }

  selection.collapse(node, offset);

  return false;
}

/**
 * The place on the first line of a block, or its last, nearest a point across.
 *
 * Asked of the page at that point, and the block's own edge where the page
 * answers with somewhere else — a block out of view answers with nothing.
 */
function lineOf(block: Element, first: boolean, x: number): { node: Node; offset: number } {
  const box = block.getBoundingClientRect();
  const style = getComputedStyle(block);
  const length = (name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  const line = length('line-height') || length('font-size') * 1.5;
  const y = first
    ? box.top + length('border-top-width') + length('padding-top') + line / 2
    : box.bottom - length('border-bottom-width') - length('padding-bottom') - line / 2;
  const left = box.left + length('padding-left') + 1;
  const right = box.right - length('padding-right') - 1;
  const point = caretFromPoint(Math.min(Math.max(x, left), Math.max(left, right)), y);

  if (point && block.contains(point.node)) {
    return point;
  }

  block.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });

  return { node: block, offset: first ? 0 : block.childNodes.length };
}

/** The cell under a cell, or over it, in the same column. */
function cellBeside(
  cell: HTMLTableCellElement,
  forwards: boolean,
  x: number
): { node: Node; offset: number } | null {
  const row = cell.parentElement as HTMLTableRowElement;
  const rows = [...(cell.closest('table')?.rows ?? [])];
  const next = rows[rows.indexOf(row) + (forwards ? 1 : -1)];
  const into = next?.cells[Math.min(cell.cellIndex, next.cells.length - 1)];

  return into ? lineOf(into, forwards, x) : null;
}

/**
 * Where a line up or down from the caret is, where that line is in a table: the
 * cell of the table's first row or its last nearest the caret across. `null`
 * where the line is not in a table, with the caret left where it was.
 */
function intoTable(
  element: HTMLElement,
  selection: Selection,
  forwards: boolean
): { node: Node; offset: number } | null {
  const node = selection.anchorNode;
  const offset = selection.anchorOffset;
  const x = caretBox(selection)?.left;

  if (!node || x === undefined || typeof selection.modify !== 'function') {
    return null;
  }

  selection.modify('move', forwards ? 'forward' : 'backward', 'line');

  const landed = selection.anchorNode;
  const table = (landed?.nodeType === 1 ? (landed as Element) : landed?.parentElement)?.closest(
    'table'
  );

  selection.collapse(node, offset);

  const row =
    table && element.contains(table) ? table.rows[forwards ? 0 : table.rows.length - 1] : null;
  const cells = row ? [...row.cells] : [];
  const apart = (cell: Element) => {
    const box = cell.getBoundingClientRect();

    return x < box.left ? box.left - x : x > box.right ? x - box.right : 0;
  };
  const into = cells.reduce<HTMLTableCellElement | null>(
    (best, cell) => (!best || apart(cell) < apart(best) ? cell : best),
    null
  );

  return into ? lineOf(into, forwards, x) : null;
}

/**
 * The first place after a table a caret can be, going down from its last row,
 * or the last before it going up from its header.
 */
function pastTable(
  element: HTMLElement,
  cell: Element,
  forwards: boolean,
  x: number
): { node: Node; offset: number } | null {
  const table = cell.closest('.mawy-md-table-scroll') ?? cell.closest('table');

  if (!table) {
    return null;
  }

  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_ALL);

  walker.currentNode = table;

  for (
    let node = forwards ? walker.nextNode() : walker.previousNode();
    node;
    node = forwards ? walker.nextNode() : walker.previousNode()
  ) {
    if (table.contains(node) || node.contains(table)) {
      continue;
    }

    const block = blockAt(element, node);

    if (
      block &&
      ((node.nodeType === 3 && (node as Text).data.trim()) ||
        (node === block && !block.textContent))
    ) {
      return lineOf(block, forwards, x);
    }
  }

  return null;
}

/**
 * Whether a caret is on the last line of a code block or the last row of a
 * table, going down, or on the first going up — and, for the arrows across, at
 * the very end or the very start of it.
 */
function edgeOf(
  holder: Element,
  node: Node,
  offset: number,
  forwards: boolean,
  across: boolean
): boolean {
  if (holder.tagName === 'TR') {
    const rows = holder.closest('table')?.querySelectorAll('tr');

    return !across && Boolean(rows?.length) && rows![forwards ? rows!.length - 1 : 0] === holder;
  }

  const range = holder.ownerDocument.createRange();

  range.selectNodeContents(holder);

  if (forwards) {
    range.setStart(node, offset);
  } else {
    range.setEnd(node, offset);
  }

  const rest = range.toString();

  return across ? !rest.replace(/\n$/, '') : !rest.replace(/\n$/, '').includes('\n');
}

/**
 * A run of text as a composition left it, with the no-break spaces the page
 * drew for spaces in the document read back as the spaces they are. See
 * `spaces` in `render.tsx`.
 *
 * Only in what the composition did not change, found as the part at either end
 * that is still what the run said before it: a no-break space typed on purpose
 * is a no-break space.
 */
function spacedBack(after: string, before: string, source: string): string {
  if (
    !before.includes('\u00a0') ||
    source.slice(0, before.length).replace(/[ \t]/g, '\u00a0') !==
      before.replace(/[ \t]/g, '\u00a0')
  ) {
    return after;
  }

  let head = 0;

  while (head < before.length && head < after.length && after[head] === before[head]) {
    head += 1;
  }

  let tail = 0;

  while (
    tail < before.length - head &&
    tail < after.length - head &&
    after[after.length - 1 - tail] === before[before.length - 1 - tail]
  ) {
    tail += 1;
  }

  return (
    source.slice(0, head) +
    after.slice(head, after.length - tail) +
    source.slice(before.length - tail, before.length)
  );
}

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
 * The document's blocks, with a paragraph with nothing in it wherever the
 * source has one to draw and wherever the caret has nowhere else to be.
 *
 * Markdown cannot write an empty paragraph, but it can write blank lines, and
 * those are drawn: every second blank line past the one two blocks need
 * between them is an empty paragraph, so what `Enter` wrote is what is on the
 * page, and it stays there when the caret goes elsewhere. `blankParagraphs` has
 * the counting.
 *
 * The caret can still be left somewhere no blank line says anything — a list
 * that goes on under the item that was just given up — and one more is drawn
 * there, at the position the last edit left the caret, for as long as the caret
 * is in it.
 */
function withRoom(blocks: MdBlock[], room: number | null, value: string): MdBlock[] {
  const blanks = blankParagraphs(value, blocks);

  if (
    room !== null &&
    !blanks.includes(room) &&
    !blocks.some((block) => block.range.start <= room && room <= block.range.end)
  ) {
    // In place of a blank line's paragraph on the same line: a caret left after
    // a list item's indentation is on a line that is blank to the parser, and
    // one paragraph is drawn for it rather than two.
    const line = value.lastIndexOf('\n', room - 1) + 1;

    blanks.splice(0, blanks.length, ...blanks.filter((at) => at < line || at > room), room);
    blanks.sort((one, other) => one - other);
  }

  if (!blanks.length) {
    return blocks.length ? blocks : [empty(0)];
  }

  const out: MdBlock[] = [];
  let next = 0;

  for (const block of blocks) {
    while (next < blanks.length && blanks[next] < block.range.start) {
      out.push(empty(blanks[next]));
      next += 1;
    }

    out.push(block);
  }

  for (; next < blanks.length; next += 1) {
    out.push(empty(blanks[next]));
  }

  return out;
}

function empty(at: number): MdBlock {
  return { type: 'paragraph', range: { start: at, end: at }, children: [] };
}
