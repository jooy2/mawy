'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { highlightMarkdown, type MdHighlightedLine } from '../../internal/markdown/highlight.js';
import { lineAt, lineStarts } from '../../internal/scroll.js';
import { chunkCount, chunkOf, SOURCE_CHUNK, SOURCE_WINDOW_FROM } from '../../internal/source.js';
import type { MawyMatch } from '../../internal/search.js';

/** One match, in the coordinates of the line it is drawn on. */
interface LineHit {
  start: number;
  end: number;
  /** Which match this is, so the one being stepped through can be told apart. */
  index: number;
}

/** No matches on this line. Shared, so a document without a search allocates none. */
const NO_HITS: LineHit[] = [];

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
 *
 * What that copy is *made of* is the other half, and it is `internal/source.ts`:
 * a long document is cut into chunks, every chunk holds its own text, and only
 * the chunks near the view are a row per line with the syntax coloured in. The
 * rest are the same characters written as one run, which is the same height and
 * a fraction of the elements.
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
    const box = React.useRef<HTMLDivElement>(null);
    const input = React.useRef<HTMLTextAreaElement>(null);
    // Two editors on one page would otherwise describe themselves with each
    // other's element, and `useId` is React's answer to exactly that.
    const hintId = `${React.useId()}-escape`;

    React.useImperativeHandle(ref, () => input.current as HTMLTextAreaElement);

    const starts = React.useMemo(() => lineStarts(value), [value]);
    const chunks = chunkCount(starts.length);
    /** Whether the document is long enough to be worth drawing a part of. */
    const windowed = starts.length >= SOURCE_WINDOW_FROM;

    /**
     * Which chunks are coloured, as a half-open range of chunk indexes.
     *
     * Answered by the observer below rather than worked out from the scroll:
     * the browser already knows which boxes are near the view, and asking it is
     * the one way to get that answer without predicting how every line above
     * wrapped. It starts at the top because that is where a document opens.
     */
    const [warm, setWarm] = React.useState({ from: 0, to: 3 });

    const from = windowed ? Math.min(warm.from, chunks - 1) : 0;
    const to = windowed ? Math.min(Math.max(warm.to, from + 1), chunks) : chunks;
    const first = from * SOURCE_CHUNK;
    const last = Math.min(to * SOURCE_CHUNK, starts.length);

    const lines = React.useMemo(
      () => highlightMarkdown(value, gfm, { from: first, to: last }),
      [value, gfm, first, last]
    );

    /**
     * Which chunks the view is near, watched rather than measured.
     *
     * The layer is moved by a `transform` and the box around it is what clips
     * it, so that box is the root: a chunk intersecting it is a chunk with some
     * of itself on the screen. The margin is what buys the frames — two screens
     * either way are coloured before anybody scrolls to them, and a scroll fast
     * enough to outrun that shows plain text in the right place until the next
     * frame catches up.
     */
    React.useEffect(() => {
      const root = box.current;
      const layer = back.current;

      if (!windowed || !root || !layer || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const seen = new Set<number>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const at = Number((entry.target as HTMLElement).dataset.mawyChunk);

            if (entry.isIntersecting) {
              seen.add(at);
            } else {
              seen.delete(at);
            }
          }

          let low = Infinity;
          let high = -Infinity;

          for (const at of seen) {
            low = Math.min(low, at);
            high = Math.max(high, at);
          }

          if (low === Infinity) {
            return;
          }

          setWarm((held) =>
            held.from === low && held.to === high + 1 ? held : { from: low, to: high + 1 }
          );
        },
        { root, rootMargin: '200% 0px' }
      );

      for (const chunk of layer.children) {
        observer.observe(chunk);
      }

      return () => observer.disconnect();
    }, [windowed, chunks]);

    /**
     * Everything, while the page is being printed.
     *
     * What goes on the paper is the layer rather than the textarea, and the
     * paper has no scroll position for an observer to answer about — so the
     * window is opened all the way and the colour comes back before the first
     * page is composed. `flushSync`, because the browser does not wait for
     * React to get around to it.
     */
    React.useEffect(() => {
      const view = box.current?.ownerDocument.defaultView;

      if (!windowed || !view) {
        return;
      }

      const open = () => flushSync(() => setWarm({ from: 0, to: chunks }));

      view.addEventListener('beforeprint', open);

      return () => view.removeEventListener('beforeprint', open);
    }, [windowed, chunks]);

    /**
     * The chunk holding the match being stepped through, coloured.
     *
     * Next and previous walk the whole document, and the mark the scrolling
     * below looks for only exists where the colour does. So the window is moved
     * to the match before anything tries to find it.
     */
    React.useLayoutEffect(() => {
      const match = matches[currentMatch];

      if (!windowed || !match) {
        return;
      }

      const at = chunkOf(lineAt(starts, match.start));

      setWarm((held) => (at >= held.from && at < held.to ? held : { from: at, to: at + 1 }));
    }, [windowed, matches, currentMatch, starts]);

    /**
     * What the find bar found, handed to each drawn line already cut down to it.
     *
     * Both lists are in order, so this is one walk down the pair of them rather
     * than a look through every match for every line — which is the difference
     * between a keystroke costing the length of the document and costing the
     * length of the document times the number of matches in it.
     */
    const hits = React.useMemo(() => {
      const out: LineHit[][] = [];
      let at = 0;

      for (let index = first; index < last; index += 1) {
        const begin = starts[index];
        const end = begin + lines[index].text.length;
        const row: LineHit[] = [];

        while (at < matches.length && matches[at].end <= begin) {
          at += 1;
        }

        for (let each = at; each < matches.length && matches[each].start < end; each += 1) {
          row.push({
            start: matches[each].start - begin,
            end: matches[each].end - begin,
            index: each
          });
        }

        out.push(row);
      }

      return out;
    }, [lines, matches, starts, first, last]);

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
     *
     * The window is a dependency because the mark is drawn by the effect above
     * moving it: on the frame the match arrives there is nothing here to find,
     * and on the frame after there is.
     */
    React.useLayoutEffect(() => {
      const source = input.current;
      const mark = back.current?.querySelector<HTMLElement>('.mawy-find-hit[data-mawy-current]');

      if (!source || !mark) {
        return;
      }

      const view = source.getBoundingClientRect();
      const rect = mark.getBoundingClientRect();
      // A line of slack, so the match lands inside the text rather than
      // against the edge it was just scrolled past.
      const room = Math.min(rect.height, view.height / 3);

      if (rect.top < view.top + room) {
        source.scrollTop -= view.top + room - rect.top;
      } else if (rect.bottom > view.bottom - room) {
        source.scrollTop += rect.bottom - view.bottom + room;
      } else {
        return;
      }

      // The layer follows the textarea on the textarea's `scroll` event, and a
      // scroll set from here is one frame ahead of that event — so the two are
      // put back in step now rather than left crossed for a frame.
      sync();
    }, [sync, matches, currentMatch, first, last]);

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

        <div className="mawy-source-layer" ref={box} aria-hidden="true">
          <div className="mawy-source-lines" ref={back}>
            {Array.from({ length: chunks }, (unused, index) => {
              const begin = index * SOURCE_CHUNK;
              const end = Math.min(begin + SOURCE_CHUNK, starts.length);

              return (
                <div key={index} className="mawy-source-chunk" data-mawy-chunk={index}>
                  {index >= from && index < to ? (
                    lines.slice(begin, end).map((line, nth) => (
                      <React.Fragment key={nth}>
                        {lineNumbers ? (
                          <span className="mawy-source-number">{begin + nth + 1}</span>
                        ) : null}
                        <span className="mawy-source-line">
                          {renderLine(line, hits[begin + nth - first] ?? NO_HITS, currentMatch)}
                        </span>
                      </React.Fragment>
                    ))
                  ) : (
                    <span className="mawy-source-cold">
                      {value.slice(
                        starts[begin],
                        end < starts.length ? starts[end] - 1 : value.length
                      )}
                    </span>
                  )}
                </div>
              );
            })}
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
  hits: readonly LineHit[],
  currentMatch: number
): React.ReactNode {
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
  // The pieces come out left to right and both lists are already in that
  // order, so each of them is walked once across the whole line rather than
  // searched from the beginning for every piece.
  let nextToken = 0;
  let nextHit = 0;

  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = edges[index];
    const end = edges[index + 1];

    if (end <= start) {
      continue;
    }

    while (nextToken < line.tokens.length && line.tokens[nextToken].end <= start) {
      nextToken += 1;
    }

    while (nextHit < hits.length && hits[nextHit].end <= start) {
      nextHit += 1;
    }

    const piece = line.text.slice(start, end);
    const token = covering(line.tokens[nextToken], start, end);
    const hit = covering(hits[nextHit], start, end);

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
        data-mawy-current={hit?.index === currentMatch ? 'true' : undefined}
      >
        {piece}
      </span>
    );
  }

  return out;
}

/** The span, if it is the one this piece is inside. */
function covering<T extends { start: number; end: number }>(
  span: T | undefined,
  start: number,
  end: number
): T | undefined {
  return span && span.start <= start && end <= span.end ? span : undefined;
}
