'use client';

import * as React from 'react';

/**
 * A value the application may own, or may leave to the component.
 *
 * React's own convention, made once instead of at every prop: pass `value` and
 * the application decides what it is; pass nothing and the component keeps it
 * and reports every change. Both call `onChange`, so an application can watch a
 * value it is not driving — which is the case the two-prop version of this is
 * always quietly wrong about.
 */
export function useControlled<T>(
  value: T | undefined,
  initial: T,
  onChange?: (next: T) => void
): [T, (next: T) => void] {
  const [inner, setInner] = React.useState<T>(initial);
  const controlled = value !== undefined;
  const notify = React.useRef(onChange);

  // Read through a ref so that `set` is stable across renders: it goes into
  // callbacks that are compared by identity, and an unstable one would rebuild
  // every toolbar button on every keystroke.
  React.useEffect(() => {
    notify.current = onChange;
  });

  const set = React.useCallback(
    (next: T) => {
      if (!controlled) {
        setInner(next);
      }

      notify.current?.(next);
    },
    [controlled]
  );

  return [controlled ? (value as T) : inner, set];
}
