'use client';

import * as React from 'react';
import { highlightMarkdown, type MdHighlightedLine } from '../../internal/markdown/highlight.js';

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
  gfm: boolean;
  lineNumbers: boolean;
  readOnly: boolean;
  label: string;
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
      gfm,
      lineNumbers,
      readOnly,
      label,
      placeholder
    },
    ref
  ) {
    const back = React.useRef<HTMLDivElement>(null);
    const input = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => input.current as HTMLTextAreaElement);

    const lines = React.useMemo(() => highlightMarkdown(value, gfm), [value, gfm]);

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
        <div className="mawy-source-layer" aria-hidden="true">
          <div className="mawy-source-lines" ref={back}>
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                {lineNumbers ? <span className="mawy-source-number">{index + 1}</span> : null}
                <span className="mawy-source-line">{renderLine(line)}</span>
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
        />
      </div>
    );
  }
);

/** One line, cut into the coloured runs the highlighter found and the rest. */
function renderLine(line: MdHighlightedLine): React.ReactNode {
  if (!line.tokens.length) {
    // An empty line still has to be a line, or the copy underneath drifts a row
    // out of step with the textarea for the whole rest of the file. The height
    // comes from `min-height` in the stylesheet rather than from a placeholder
    // character, which would be a character the textarea does not have.
    return line.text;
  }

  const out: React.ReactNode[] = [];
  let at = 0;

  for (const [index, token] of line.tokens.entries()) {
    if (token.start > at) {
      out.push(line.text.slice(at, token.start));
    }

    out.push(
      <span key={index} className={`mawy-tok mawy-tok-${token.kind}`}>
        {line.text.slice(token.start, token.end)}
      </span>
    );
    at = token.end;
  }

  if (at < line.text.length) {
    out.push(line.text.slice(at));
  }

  return out;
}
