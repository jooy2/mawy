import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';
import { DEMO_DIRECTIVES } from '../directives.js';
import type { DemoProps } from '../types.js';
import { PLAYGROUND } from './document.js';

/**
 * The viewer with nothing switched off, on the document the editor beside it
 * opens with.
 *
 * The toolbar is the default one, which is every control there is — including
 * `open`, so the document on screen can be somebody's own file rather than
 * ours. Dropping a `.md` file anywhere on it does the same thing.
 *
 * One document across the whole page rather than a specimen of its own: a
 * reader who has just typed into the editor comes here to see the same file
 * read rather than written, and that comparison is only worth anything if it is
 * the same file. `demos/sample.ts` is still what the pages *about* the viewer
 * show, where a second document is a second thing to look at.
 */
export default function PlaygroundViewer({
  colorScheme,
  onColorSchemeChange,
  locale,
  height
}: DemoProps) {
  return (
    <MawyViewer
      defaultValue={PLAYGROUND[locale]}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
      directives={DEMO_DIRECTIVES}
      defaultTypography={{ measure: 'wide' }}
      style={{ height }}
    />
  );
}
