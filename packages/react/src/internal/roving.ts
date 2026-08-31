'use client';

import * as React from 'react';

/**
 * One tab stop for a whole row of controls.
 *
 * This is what makes a toolbar a `toolbar` rather than a row of buttons, and it
 * is not decoration: eleven buttons above a document is eleven presses of Tab
 * before a keyboard reaches the document. With this, it is one to enter, one to
 * leave, and the arrows move between the controls inside.
 *
 * It lives here rather than in either toolbar because there are two of them,
 * and two copies of a focus model drift into two different keyboards.
 */
export function useRoving() {
  const [active, setActive] = React.useState(0);
  const controls = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    // A panel that is open has keys of its own — a slider's arrows are the
    // whole point of it — so the toolbar stops listening while focus is inside.
    if ((event.target as HTMLElement).closest('.mawy-menu-panel')) {
      return;
    }

    const buttons = controls.current.filter(Boolean) as HTMLButtonElement[];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (at === -1 || buttons.length === 0) {
      return;
    }

    const to =
      event.key === 'ArrowRight'
        ? (at + 1) % buttons.length
        : event.key === 'ArrowLeft'
          ? (at - 1 + buttons.length) % buttons.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : -1;

    if (to === -1) {
      return;
    }

    event.preventDefault();
    setActive(to);
    buttons[to].focus();
  }, []);

  const itemProps = React.useCallback(
    (at: number) => ({
      tabIndex: at === active ? 0 : -1,
      onFocus: () => setActive(at),
      ref: (node: HTMLButtonElement | null) => {
        controls.current[at] = node;
      }
    }),
    [active]
  );

  return { onKeyDown, itemProps };
}

/**
 * Where each item's tab stops begin, counted over the whole row.
 *
 * A separator is drawn but is not reached, so it takes none; a segmented
 * control takes one for each of its buttons. Both are why this counts rather
 * than using the item's own index.
 */
export function tabStops<T>(items: readonly T[], stopsFor: (item: T) => number): number[] {
  const out: number[] = [];
  let counted = 0;

  for (const item of items) {
    out.push(counted);
    counted += stopsFor(item);
  }

  return out;
}
