'use client';

import * as React from 'react';

/**
 * Turning the tooltips off, and back on again.
 *
 * A tooltip that appears on hover has to be dismissable without moving the
 * pointer — WCAG 1.4.13 — and a `::after` drawn by the stylesheet cannot hear a
 * keystroke. So `Escape` sets an attribute on the root and the stylesheet reads
 * it, and the next move of the pointer or the next thing to take the focus puts
 * them back.
 *
 * The tips are decoration rather than information: every button they name has
 * an `aria-label` saying the same words. What this closes is the case where one
 * is sitting over the thing somebody is trying to read, with no way to move it
 * but to move the pointer.
 */
export function useDismissableTips(): {
  off: boolean;
  props: {
    onKeyDownCapture: React.KeyboardEventHandler<HTMLElement>;
    onPointerMove: React.PointerEventHandler<HTMLElement>;
  };
} {
  const [off, setOff] = React.useState(false);

  return {
    off,
    props: {
      // Captured, so that a menu or the find bar taking `Escape` for itself
      // does not take it from here as well: both are ways of shutting
      // something, and a reader pressing it wants everything it shuts shut.
      onKeyDownCapture: (event) => {
        if (event.key === 'Escape') {
          setOff(true);
        }
      },
      onPointerMove: () => setOff((was) => (was ? false : was))
    }
  };
}
