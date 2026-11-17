'use client';

/**
 * The three pieces of a drawn document that hold state.
 *
 * A copy button on a code block, raw HTML waiting for the render after the
 * first, and a picture that remembers it could not be fetched — all of them
 * hooks, and a hook is a client. They live here rather than in `render.tsx`
 * so that `render.tsx` calls no hook and reaches nothing of ours marked
 * `'use client'`, which is what lets `mawy-react/server` draw a document as a
 * React Server Component, where `useState` does not exist.
 *
 * The drawing itself is not here: `drawnCode` and `drawnHtml` are the same
 * markup either way, and a picture with nowhere to keep its state is the same
 * `<img>` without the stand-in. What these add is the state around it. See
 * `RenderContext.live`.
 */

import * as React from 'react';
import type { MawyCodeToken, MawyHighlighter } from '../../types.js';
import type { MdCode } from './ast.js';
import { sanitizeHtml } from './html.js';
import { CheckIcon, CopyIcon } from '../icons.js';
import { useCopy } from '../clipboard.js';
import {
  checkedTokens,
  drawnCode,
  drawnHtml,
  plainHtml,
  type MawyMarks,
  type RenderContext
} from './render.js';

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
  marks?: MawyMarks;
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
          ? sanitizeHtml(value, context.resolveUrl, {
              links: context.links,
              images: context.images
            })
          : null,
    [context.html, context.resolveUrl, context.links, context.images, value, hydrated]
  );

  // What can be read without a DOM is drawn the same way on the server and on
  // the first render here, so there is nothing to change after hydrating.
  return (
    plainHtml({ value, context, inline, marks, reveal }) ??
    drawnHtml({ value, context, inline, marks, reveal }, html)
  );
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
  /*
   * The ring on a block the pointer put the focus in.
   *
   * The box is a tab stop so a keyboard can reach the right-hand end of code
   * that scrolls sideways, and the ring around it is what says the keyboard is
   * there. A pointer leaves the focus in it as well — a press to take a line
   * out of the code — and `:focus-visible` turns that into a ring at the next
   * press, so copying a selection lit the whole block up in the accent colour.
   * The mark says the pointer is what put the focus there, the stylesheet draws
   * no ring while it is on, and leaving the block takes it off. A `Tab` into
   * the block never sets it, so the keyboard keeps the ring it needs.
   */
  const box = context.editing
    ? {}
    : {
        onPointerDown: (event: React.PointerEvent<HTMLPreElement>) =>
          event.currentTarget.setAttribute('data-mawy-pointer', ''),
        onBlur: (event: React.FocusEvent<HTMLPreElement>) =>
          event.currentTarget.removeAttribute('data-mawy-pointer')
      };

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
    </button>,
    box
  );
}

/**
 * A picture the browser fetches, drawn as a box of its own once it could not
 * be.
 *
 * A picture that failed was drawn by the browser as its description beside a
 * small broken icon, in the same type as the words around it, so that in a
 * sentence it read as more of the sentence — and each browser drew it its own
 * way, one of them with no description at all. In its place is a picture this
 * library draws: an icon and the description, in a frame the stylesheet gives
 * it. See `standIn`.
 *
 * Still the `<img>` it was, so that everything that finds a picture on the
 * page — the editor pressing, selecting and copying one, a caret stepping past
 * one — finds this one too, and with the `src` it was given, which is what an
 * application reading the page and the editor's copy both ask it for. The
 * stand-in is drawn through `srcset`, which a browser draws in preference to
 * `src`: put in `src`, it took the address's place, and a 404 that came back
 * before anything had read the address left nothing to read it from. An
 * address mended in its bar takes the stand-in off and is fetched again.
 *
 * Here and not in `render.tsx`, because knowing that the fetch failed is
 * state. 1.10.0 drew every picture through this from there, and a React
 * Server Component, which has no `useState`, threw on the first `![](…)` it
 * met. A document drawn by `mawy-react/server` gets the same `<img>` without
 * this around it, and a picture that fails there is drawn the browser's way.
 */
function Picture(props: React.ComponentPropsWithoutRef<'img'>): React.ReactElement {
  const [broken, setBroken] = React.useState<string | null>(null);
  const address = typeof props.src === 'string' ? props.src : '';
  const failed = broken !== null && broken === address;
  const shown = React.useMemo(
    () => (failed ? standIn(props.alt ?? '') : null),
    [failed, props.alt]
  );

  return (
    <img
      {...props}
      srcSet={shown ?? props.srcSet}
      data-mawy-broken={failed ? '' : undefined}
      onError={() => {
        if (!failed) {
          setBroken(address);
        }
      }}
    />
  );
}

/** The type a stand-in's description is drawn in, which a picture can reach. */
const STAND_IN_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** The icon a stand-in is drawn with: Lucide's `image-off`, as the toolbar draws its icons. */
const STAND_IN_ICON =
  '<line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/>' +
  '<line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/>' +
  '<path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/>' +
  '<path d="M21 15V5a2 2 0 0 0-2-2H9"/>';

/**
 * The picture drawn in place of one that could not be fetched, as an address
 * an `<img>` can be given.
 *
 * A picture rather than words beside one, because the words would be text on
 * the page that is not in the document, and every place on the page this
 * library reads back as a place in the document would have them to step
 * around. In a grey that reads on either palette, since a token cannot reach
 * inside a picture, and in the system's own type, which is the only one a
 * picture can draw in; it is measured in that type, so the box is as wide as
 * the words. A description too long for a line is cut short with an ellipsis.
 */
function standIn(alt: string): string {
  const size = 13;
  const room = 360;
  const measure = measurer(size);
  let label = alt.replace(/\s+/g, ' ').trim();

  if (measure(label) > room) {
    while (label && measure(`${label}…`) > room) {
      label = label.slice(0, -1);
    }

    label = `${label.trimEnd()}…`;
  }

  const width = Math.ceil(label ? 34 + measure(label) + 10 : 34);
  const text = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30" viewBox="0 0 ${width} 30">` +
    `<g transform="translate(10 8) scale(0.583)" fill="none" stroke="#8a8f98" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${STAND_IN_ICON}</g>` +
    (text
      ? `<text x="34" y="19.5" fill="#8a8f98" font-size="${size}" font-family="${STAND_IN_FONT.replace(/"/g, "'")}">${text}</text>`
      : '') +
    '</svg>';

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** How wide a run of words is in the stand-in's type, measured where there is a canvas. */
function measurer(size: number): (text: string) => number {
  const context =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');

  if (context) {
    context.font = `${size}px ${STAND_IN_FONT}`;
  }

  return (text) => (context ? context.measureText(text).width : text.length * size * 0.6);
}

/** What `MawyViewer` and `MawyEditor` put on the context. */
export const LIVE = { code: CodeBlock, html: RawHtml, picture: Picture };
