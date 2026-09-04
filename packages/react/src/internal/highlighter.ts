/**
 * Getting hold of a highlighter, and not before it is wanted.
 *
 * Three files in this package have `highlight` in the name and they are three
 * different things: `markdown/highlight.ts` marks up Markdown for the source
 * surface, `../highlight.ts` is the one this package ships for code blocks, and
 * this is neither — it is only the question of when to ask for one.
 *
 * A highlighter is the largest thing a Markdown renderer can be made to carry,
 * and most documents have nothing in them to colour — so `highlight` may be a
 * function that fetches one, and this is what decides when to call it: the
 * first time a document is drawn that has a fenced code block *with a language
 * on the fence*. A reader who never opens one never pays for it, and a document
 * of nothing but prose never asks.
 *
 * Once it is here it stays. An application that passed a `() => import(...)`
 * meant one highlighter and not one per document.
 */

import * as React from 'react';
import type { MawyHighlight, MawyHighlighter } from '../types.js';
import type { MdBlock, MdDocument } from './markdown/ast.js';

/** Whether anything in the document is a code block that named its language. */
function wantsHighlighting(blocks: readonly MdBlock[]): boolean {
  for (const block of blocks) {
    if (block.type === 'code') {
      if (block.lang) {
        return true;
      }

      continue;
    }

    if ('children' in block && wantsHighlighting(block.children as MdBlock[])) {
      return true;
    }
  }

  return false;
}

export function useHighlighter(
  highlight: MawyHighlight | undefined,
  document: MdDocument
): MawyHighlighter | null {
  const wanted = React.useMemo(() => wantsHighlighting(document.root.children), [document]);
  const [fetched, setFetched] = React.useState<MawyHighlighter | null>(null);
  /**
   * The loader, where the effect can read it without depending on it.
   *
   * `highlight={() => import('mawy-react/highlight')}` written in the JSX is a
   * different function on every render, and an effect that depended on it would
   * ask again for every one of them.
   */
  const loader = React.useRef(highlight);
  /** The one request, kept so that a second render is not a second one. */
  const asked = React.useRef<Promise<MawyHighlighter> | null>(null);

  // A highlighter handed over as an object needs no fetching and no render to
  // arrive: it is already here, and drawing the first paint without it would be
  // a flash of plain code for nothing.
  const ready = highlight && typeof highlight !== 'function' ? highlight : null;

  React.useEffect(() => {
    loader.current = highlight;
  });

  React.useEffect(() => {
    const ask = loader.current;

    if (!ask || typeof ask !== 'function' || !wanted) {
      return;
    }

    let live = true;

    // Kept rather than remade, so that this effect running twice — which is
    // what a development double-mount does — waits on the one request instead
    // of starting a second and cancelling the first.
    asked.current ??= Promise.resolve(ask());

    void asked.current.then(
      (loaded) => {
        if (live) {
          setFetched(loaded);
        }
      },
      () => {
        // A highlighter that will not load is a document without colour, which
        // is the state it was already in. It is not asked for again: a loader
        // that failed once fails on every render, and a render is not a reason
        // to try the network again.
      }
    );

    return () => {
      live = false;
    };
  }, [wanted]);

  return ready ?? (wanted ? fetched : null);
}
