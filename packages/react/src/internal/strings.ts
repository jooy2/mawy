/**
 * The interface's words, as a component on a page holds them.
 *
 * Here rather than in `i18n.ts`, which `mawy-react/server` reads and which must
 * not reach for a hook.
 */

import * as React from 'react';
import type { MawyLocale, MawyStrings } from '../types.js';
import { withStrings } from './i18n.js';

/**
 * The strings for a locale with an application's own words over them, kept
 * until either changes.
 *
 * Compared by what they say rather than by identity. `strings={{ bold: t('bold') }}`
 * is a new object on every render of the application, and the strings are part
 * of the context every drawn element of the document is kept against — so an
 * object compared by identity would draw the whole document again each time.
 */
export function useStrings(
  locale: MawyLocale | undefined,
  overrides: Partial<MawyStrings> | undefined
): MawyStrings {
  const said = overrides ? JSON.stringify(overrides) : '';

  return React.useMemo(
    () => withStrings(locale, said ? (JSON.parse(said) as Partial<MawyStrings>) : undefined),
    [locale, said]
  );
}
