import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';
import { DEMO_DIRECTIVES } from '../directives.js';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/**
 * The viewer with nothing switched off, on the document the rest of the site
 * uses as its specimen.
 *
 * The toolbar is the default one, which is every control there is — including
 * `open`, so the document on screen can be somebody's own file rather than
 * ours. Dropping a `.md` file anywhere on it does the same thing.
 *
 * The document is not translated the way the editor's is, and the difference is
 * the point: this one is a specimen rather than a set of instructions, and what
 * a table with three alignments or a footnote mentioned twice looks like does
 * not depend on who is reading it.
 */
export default function PlaygroundViewer({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      defaultValue={SAMPLE}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
      directives={DEMO_DIRECTIVES}
      defaultTypography={{ measure: 'wide' }}
      style={{ height: '32rem' }}
    />
  );
}
