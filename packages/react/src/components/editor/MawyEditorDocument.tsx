'use client';

import * as React from 'react';
import type { MawyHtmlPolicy, MawyParseOptions } from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';
import type { MdBlock } from '../../internal/markdown/ast.js';
import { parseMarkdown } from '../../internal/markdown/parse.js';
import { renderBlocks, type RenderContext } from '../../internal/markdown/render.js';
import { editFor, type MawyEdit } from '../../internal/editing.js';
import { sourceAt } from '../../internal/position.js';

export interface MawyEditorDocumentProps {
  value: string;
  onEdit: (edit: MawyEdit) => void;
  /** Where the caret is, in the document's own offsets. */
  onSelect: (selection: { start: number; end: number }) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLElement>;
  readOnly: boolean;
  label: string;
  placeholder?: string;
  parse?: MawyParseOptions;
  html: MawyHtmlPolicy;
  strings: MawyStrings;
  /**
   * A place the caret was left where nothing is drawn, from the last edit. See
   * `withRoom` below for what is done about it.
   */
  room: number | null;
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
 * What this surface can edit so far is the text of paragraphs and headings:
 * typing, deleting, joining and splitting them. Everything else is refused
 * rather than half-done — a list, a quotation, a table or a code block still
 * draws and still reads, and typing in one does nothing at all until the rules
 * for putting that edit back are written.
 */
export const MawyEditorDocument = React.forwardRef<HTMLElement, MawyEditorDocumentProps>(
  function MawyEditorDocument(
    {
      value,
      onEdit,
      onSelect,
      onKeyDown,
      readOnly,
      label,
      placeholder,
      parse,
      html,
      strings,
      room
    },
    ref
  ) {
    const root = React.useRef<HTMLElement>(null);
    const gfm = parse?.gfm ?? true;
    const breaks = parse?.breaks ?? false;

    React.useImperativeHandle(ref, () => root.current as HTMLElement);

    const document_ = React.useMemo(
      () => parseMarkdown(value, { gfm, breaks }),
      [value, gfm, breaks]
    );
    const blocks = React.useMemo(() => withRoom(document_.root.children, room), [document_, room]);
    const context: RenderContext = React.useMemo(() => ({ html, strings }), [html, strings]);

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
        event.preventDefault();

        if (readOnly) {
          return;
        }

        const edit = editFor(event as InputEvent, element, value);

        if (edit) {
          onEdit(edit);
        }
      };

      element.addEventListener('beforeinput', refuse);

      return () => element.removeEventListener('beforeinput', refuse);
    }, [value, readOnly, onEdit]);

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

        if (!selection?.rangeCount) {
          return;
        }

        const range = selection.getRangeAt(0);

        if (!element.contains(range.startContainer)) {
          return;
        }

        const start = sourceAt(element, range.startContainer, range.startOffset, value);
        const end = sourceAt(element, range.endContainer, range.endOffset, value);

        if (start !== null && end !== null) {
          onSelect({ start: Math.min(start, end), end: Math.max(start, end) });
        }
      };

      owner.addEventListener('selectionchange', read);

      return () => owner.removeEventListener('selectionchange', read);
    }, [value, onSelect]);

    return (
      <div className="mawy-document">
        <article
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
          {renderBlocks(blocks, context)}
        </article>
      </div>
    );
  }
);

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
