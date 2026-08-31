'use client';

import * as React from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copy to the clipboard, and say so for a moment afterwards.
 *
 * The "afterwards" is the whole reason this is a hook. A copy button that does
 * its job silently is a button a reader presses twice, because nothing on the
 * screen changed — so the state it returns is what the label reads from, and it
 * falls back to `idle` on its own.
 *
 * `navigator.clipboard` is absent over plain HTTP and can be refused by
 * permissions, so a failure is a state rather than an exception: the button
 * says it could not, which is at least true.
 */
export function useCopy(holdFor = 1600): [CopyState, (text: string) => void] {
  const [state, setState] = React.useState<CopyState>('idle');
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = React.useCallback(
    (text: string) => {
      clearTimeout(timer.current);

      const settle = (next: CopyState) => {
        setState(next);
        timer.current = setTimeout(() => setState('idle'), holdFor);
      };

      if (!navigator.clipboard?.writeText) {
        settle('failed');

        return;
      }

      navigator.clipboard.writeText(text).then(
        () => settle('copied'),
        () => settle('failed')
      );
    },
    [holdFor]
  );

  return [state, copy];
}
