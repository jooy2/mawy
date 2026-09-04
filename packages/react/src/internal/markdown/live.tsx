'use client';

/**
 * The two pieces of a drawn document that hold state.
 *
 * A copy button on a code block, and raw HTML waiting for the render after the
 * first — both of them hooks, and a hook is a client. They live here rather
 * than in `render.tsx` so that `render.tsx` reaches nothing marked
 * `'use client'`, which is what lets `mawy-react/server` draw a document
 * without a bundler shipping any of this to a browser.
 *
 * The drawing itself is not here: `drawnCode` and `drawnHtml` are the same
 * markup either way, and what these add is the state around it. See
 * `RenderContext.live`.
 */

import * as React from 'react';
import type { MawyCodeToken, MawyHighlighter } from '../../types.js';
import type { MdCode } from './ast.js';
import { sanitizeHtml } from './html.js';
import { CheckIcon, CopyIcon } from '../icons.js';
import { useCopy } from '../clipboard.js';
import { checkedTokens, drawnCode, drawnHtml, type RenderContext } from './render.js';

/* Nothing to subscribe to: what is being asked is which render this is, and
 * that answer does not change again once it has changed once. */
const subscribeToNothing = () => () => {};
const onTheClient = () => true;
const onTheServer = () => false;

function RawHtml({
  value,
  context,
  inline,
  marks,
  reveal
}: {
  value: string;
  context: RenderContext;
  inline?: boolean;
  marks?: { 'data-mawy-range': string };
  /** Whether the caret is in it, so it is written out rather than drawn. */
  reveal?: boolean;
}): React.ReactElement {
  /**
   * Whether this is the browser, drawing after any hydration it had to do.
   *
   * `sanitize` needs a DOM to parse with, and a server has none — so the server
   * draws the markup as text. Sanitising on the client's *first* render would
   * then be React finding elements where the server sent characters, which is a
   * hydration mismatch and a warning at best.
   *
   * So the first render agrees with the server and the markup arrives on the
   * one after. `useSyncExternalStore` is what says which render this is: the
   * server snapshot is used while hydrating and the client's from then on — and
   * an application that never rendered on a server never hydrates, so its very
   * first render is already the client's and nothing flashes.
   */
  const hydrated = React.useSyncExternalStore(subscribeToNothing, onTheClient, onTheServer);

  const html = React.useMemo(
    () =>
      context.html === 'raw'
        ? value
        : context.html === 'sanitize' && hydrated
          ? sanitizeHtml(value)
          : null,
    [context.html, value, hydrated]
  );

  return drawnHtml({ value, context, inline, marks, reveal }, html);
}

/**
 * What a highlighter makes of a code block, if there is one and it knows the
 * language.
 *
 * The first attempt is made while rendering rather than in an effect, so a
 * highlighter that answers straight away colours the block on the first paint
 * and on a server — no flash of plain code, and nothing extra to hydrate. One
 * that answers with a promise gets the block drawn plain and coloured when it
 * arrives.
 */
function useHighlighted(
  block: MdCode,
  highlighter: MawyHighlighter | null
): MawyCodeToken[] | null {
  const { value, lang } = block;

  const attempt = React.useMemo(() => {
    if (!highlighter || !lang || !value) {
      return null;
    }

    try {
      return highlighter.supports(lang) ? highlighter.highlight(value, lang) : null;
    } catch {
      // A highlighter is somebody else's code running inside a render. It is
      // allowed to be wrong; it is not allowed to take the document down.
      return null;
    }
  }, [highlighter, lang, value]);

  // What arrived, and which attempt it arrived for. Kept together so that an
  // answer to a question nobody is asking any more is ignored rather than
  // cleared: clearing it would be a second render for a value already thrown
  // away, and the check below would have refused it anyway.
  const [answer, setAnswer] = React.useState<{
    to: Promise<MawyCodeToken[]>;
    tokens: MawyCodeToken[];
  } | null>(null);

  React.useEffect(() => {
    if (!attempt || Array.isArray(attempt)) {
      return;
    }

    let live = true;

    void attempt.then(
      (tokens) => {
        if (live) {
          setAnswer({ to: attempt, tokens });
        }
      },
      () => {
        // A highlighter that will not answer is a code block without colour,
        // which is the state it is already in.
      }
    );

    return () => {
      live = false;
    };
  }, [attempt]);

  const tokens = Array.isArray(attempt)
    ? attempt
    : answer && answer.to === attempt
      ? answer.tokens
      : null;

  return checkedTokens(tokens, value);
}

function CodeBlock({
  block,
  context
}: {
  block: MdCode;
  context: RenderContext;
}): React.ReactElement {
  const [state, copy] = useCopy();
  const Icon = state === 'copied' ? CheckIcon : CopyIcon;
  const said = state === 'copied' ? context.strings.copied : context.strings.copyCode;

  return drawnCode(
    block,
    context,
    useHighlighted(block, context.highlighter ?? null),
    <button
      type="button"
      className="mawy-code-copy"
      // A copy button on every code block would be a row of buttons down the
      // page. It appears with the pointer or with focus, and a keyboard
      // reaches it in the order it is written.
      data-mawy-state={state}
      onClick={() => copy(block.value)}
      aria-label={said}
      data-mawy-tip={said}
    >
      <Icon className="mawy-icon" aria-hidden="true" />
    </button>
  );
}

/** What `MawyViewer` and `MawyEditor` put on the context. */
export const LIVE = { code: CodeBlock, html: RawHtml };
