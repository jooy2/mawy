'use client';

import * as React from 'react';
import { highlightMarkdown, type MdHighlightedLine } from '../../internal/markdown/highlight.js';
import type { MawyMatch } from '../../internal/search.js';

export interface MawyEditorSourceProps {
  value: string;
  onChange: (next: string) => void;
  onSelect: () => void;
  onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  /**
   * The textarea scrolled. It has to be handed down rather than caught on the
   * element around this one: `scroll` does not bubble, so a handler on a
   * container hears nothing at all when the box inside it moves.
   */
  onScroll: () => void;
  onPaste: React.ClipboardEventHandler<HTMLTextAreaElement>;
  gfm: boolean;
  lineNumbers: boolean;
  /**
   * What the find bar found, and which of them the caret is on.
   *
   * Drawn in the layer underneath rather than by selecting them, because a
   * textarea has one selection and the find bar has a field of its own to keep
   * the focus in — a reader typing a query would otherwise be typing into a
   * document that had just taken the focus back.
   */
  matches: readonly MawyMatch[];
  currentMatch: number;
  readOnly: boolean;
  label: string;
  /** How to leave, for a screen reader. `Tab` indents here. */
  escapeHint: string;
  placeholder?: string;
}

/**
 * The Markdown source, edited as text.
 *
 * A real `<textarea>` with a coloured copy of the same text laid exactly
 * underneath it, and that arrangement is the point rather than a trick. The
 * textarea keeps the things that are extremely hard to reimplement and
 * extremely obvious when they are missing: the native undo stack, the IME —
 * Korean is composed a jamo at a time and a `contenteditable` that fights the
 * composition eats characters — the mobile keyboard, autocorrect, spellcheck,
 * and every text-selection gesture the platform has.
 *
 * What it cannot do is colour anything. So the text in it is made transparent,
 * the caret and the selection are left visible, and a `<pre>` behind it draws
 * the same characters in colour. The two only stay aligned while they agree on
 * every property that affects layout — font, size, line height, letter
 * spacing, padding, wrapping, tab size — which is why those live in one place
 * in the stylesheet and are set on both.
 */
export const MawyEditorSource = React.forwardRef<HTMLTextAreaElement, MawyEditorSourceProps>(
  function MawyEditorSource(
    {
      value,
      onChange,
      onSelect,
      onKeyDown,
      onScroll,
      onPaste,
      gfm,
      lineNumbers,
      matches,
      currentMatch,
      readOnly,
      label,
      escapeHint,
      placeholder
    },
    ref
  ) {
    const back = React.useRef<HTMLDivElement>(null);
    const input = React.useRef<HTMLTextAreaElement>(null);
    // Two editors on one page would otherwise describe themselves with each
    // other's element, and `useId` is React's answer to exactly that.
    const hintId = `${React.useId()}-escape`;

    React.useImperativeHandle(ref, () => input.current as HTMLTextAreaElement);

    const lines = React.useMemo(() => highlightMarkdown(value, gfm), [value, gfm]);

    /** Where each line begins, so a match can be cut down to the line it is on. */
    const starts = React.useMemo(() => {
      const out: number[] = [];
      let at = 0;

      for (const line of lines) {
        out.push(at);
        at += line.text.length + 1;
      }

      return out;
    }, [lines]);

    /**
     * The two layers scroll as one, and the textarea is the one that scrolls.
     *
     * Not `scrollTop` on the layer below — a `transform`, because it does not
     * ask the browser for a layout on a keystroke and cannot be clamped to a
     * scroll range the copy underneath has not been given.
     */
    const sync = React.useCallback(() => {
      const source = input.current;
      const layer = back.current;

      if (source && layer) {
        layer.style.transform = `translate(${-source.scrollLeft}px, ${-source.scrollTop}px)`;
      }
    }, []);

    // A document that arrives already scrolled, or one that got shorter.
    React.useLayoutEffect(sync, [sync, value]);

    /**
     * The match being stepped through, brought into view.
     *
     * A textarea scrolls to its own selection, but only when it has the focus,
     * and while the find bar is open it deliberately does not have it. So the
     * scrolling is done from the layer underneath, where the match is an
     * element with a position — and moving the textarea moves both, since the
     * layer follows it.
     */
    React.useLayoutEffect(() => {
      const source = input.current;
      const mark = back.current?.querySelector<HTMLElement>('.mawy-find-hit[data-mawy-current]');

      if (!source || !mark) {
        return;
      }

      const view = source.getBoundingClientRect();
      const box = mark.getBoundingClientRect();
      // A line of slack, so the match lands inside the text rather than
      // against the edge it was just scrolled past.
      const room = Math.min(box.height, view.height / 3);

      if (box.top < view.top + room) {
        source.scrollTop -= view.top + room - box.top;
      } else if (box.bottom > view.bottom - room) {
        source.scrollTop += box.bottom - view.bottom + room;
      } else {
        return;
      }

      // The layer follows the textarea on the textarea's `scroll` event, and a
      // scroll set from here is one frame ahead of that event — so the two are
      // put back in step now rather than left crossed for a frame.
      sync();
    }, [sync, matches, currentMatch]);

    const scrolled = React.useCallback(() => {
      sync();
      onScroll();
    }, [sync, onScroll]);

    return (
      <div
        className="mawy-source"
        data-mawy-line-numbers={lineNumbers ? 'true' : undefined}
        // Monospace, so the gutter is exactly as wide as its widest number and
        // nothing has to be measured.
        style={{ '--mawy-gutter': `${String(lines.length).length}ch` } as React.CSSProperties}
      >
        <p id={hintId} className="mawy-visually-hidden">
          {escapeHint}
        </p>

        <div className="mawy-source-layer" aria-hidden="true">
          <div className="mawy-source-lines" ref={back}>
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                {lineNumbers ? <span className="mawy-source-number">{index + 1}</span> : null}
                <span className="mawy-source-line">
                  {renderLine(line, starts[index], matches, currentMatch)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <textarea
          ref={input}
          className="mawy-source-input"
          value={value}
          readOnly={readOnly}
          aria-label={label}
          aria-describedby={hintId}
          placeholder={placeholder}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="soft"
          onChange={(event) => onChange(event.currentTarget.value)}
          onScroll={scrolled}
          onSelect={onSelect}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      </div>
    );
  }
);

/**
 * One line, cut into the coloured runs the highlighter found and what the find
 * bar found, and then into the pieces where those two overlap.
 *
 * The two are separate answers about the same characters — one is what the
 * Markdown means and the other is what somebody is looking for — so the cuts
 * are taken from both and each piece is drawn with whichever of them it is
 * inside. A match is never split across lines: the query comes from a field
 * that has no newline in it.
 */
function renderLine(
  line: MdHighlightedLine,
  from: number,
  matches: readonly MawyMatch[],
  currentMatch: number
): React.ReactNode {
  const hits = matches
    .map((match, index) => ({
      start: match.start - from,
      end: match.end - from,
      current: index === currentMatch
    }))
    .filter((hit) => hit.end > 0 && hit.start < line.text.length);

  if (!line.tokens.length && !hits.length) {
    // An empty line still has to be a line, or the copy underneath drifts a row
    // out of step with the textarea for the whole rest of the file. The height
    // comes from `min-height` in the stylesheet rather than from a placeholder
    // character, which would be a character the textarea does not have.
    return line.text;
  }

  const cuts = new Set<number>([0, line.text.length]);

  for (const token of line.tokens) {
    cuts.add(Math.max(token.start, 0));
    cuts.add(Math.min(token.end, line.text.length));
  }

  for (const hit of hits) {
    cuts.add(Math.max(hit.start, 0));
    cuts.add(Math.min(hit.end, line.text.length));
  }

  const edges = [...cuts].sort((a, b) => a - b);
  const out: React.ReactNode[] = [];

  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index];
    const end = edges[index + 1];

    if (end <= start) {
      continue;
    }

    const piece = line.text.slice(start, end);
    const token = line.tokens.find((each) => each.start <= start && end <= each.end);
    const hit = hits.find((each) => each.start <= start && end <= each.end);

    if (!token && !hit) {
      out.push(piece);

      continue;
    }

    out.push(
      <span
        key={index}
        className={[token ? `mawy-tok mawy-tok-${token.kind}` : '', hit ? 'mawy-find-hit' : '']
          .filter(Boolean)
          .join(' ')}
        data-mawy-current={hit?.current ? 'true' : undefined}
      >
        {piece}
      </span>
    );
  }

  return out;
}
