import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/**
 * The whole thing: every control, a document with something of everything, and
 * the web fonts switched on.
 *
 * `fonts` is what turns them on. Without it the typeface menu offers the three
 * roles the reader's machine already has and nothing is fetched — which is the
 * default precisely because a request to a font CDN is the embedding page's
 * decision rather than the component's.
 */
export default function ViewerBasic({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={SAMPLE}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      defaultTypography={{ measure: 'wide' }}
      style={{ height: '32rem' }}
    />
  );
}
