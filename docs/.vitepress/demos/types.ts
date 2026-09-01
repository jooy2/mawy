import type { MawyColorScheme, MawyLocale } from 'mawy-react';

/**
 * What every demo is handed.
 *
 * The site's own light/dark switch drives the viewer's, so a reader who has the
 * documentation in dark mode is not shown one white rectangle in the middle of
 * it — and the locale follows the page's, so the Korean pages show a Korean
 * toolbar without a second set of demo files.
 *
 * `colorScheme` is controlled, which means `onColorSchemeChange` is not
 * optional: the viewer's own theme switch is a control that does nothing
 * without it. Every demo passes both straight through.
 */
export interface DemoProps {
  colorScheme: MawyColorScheme;
  onColorSchemeChange: (colorScheme: MawyColorScheme) => void;
  locale: MawyLocale;
  /**
   * How tall to draw, as a CSS length.
   *
   * Most demos ignore it and set a height that suits what they are showing —
   * the number beside `<MawyDemo>` on the page is there for the Flutter frame,
   * which has no content of ours to measure. The playground is the exception:
   * its height is measured from the window, so both halves have to take it.
   */
  height: string;
}
