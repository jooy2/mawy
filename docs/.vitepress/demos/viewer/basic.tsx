import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/**
 * The whole thing: every control, a document with something of everything, the
 * web fonts switched on and the code coloured.
 *
 * `fonts` is what turns the typefaces on. Without it the menu offers the three
 * roles the reader's machine already has and nothing is fetched — which is the
 * default precisely because a request to a font CDN is the embedding page's
 * decision rather than the component's.
 *
 * `highlight` is the same shape of decision, and the function is the point of
 * it: nothing is fetched until a document with a language on a fence is
 * actually drawn.
 */
export default function ViewerBasic({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={SAMPLE}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      highlight={() => import('mawy/highlight').then((module) => module.mawyHighlighter)}
      defaultTypography={{ measure: 'wide' }}
      style={{ height: '32rem' }}
    />
  );
}
