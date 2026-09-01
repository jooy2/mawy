import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyEditor } from 'mawy-react';
import { DEMO_DIRECTIVES } from '../directives.js';
import { readAsDataUrl } from '../upload.js';
import type { DemoProps } from '../types.js';
import { PLAYGROUND } from './document.js';

/**
 * The editor with nothing switched off.
 *
 * Every other editor demo on this site is narrowed to the one thing its section
 * is about — one surface, or two, or a short toolbar. This one is the opposite
 * and that is its whole job: all four surfaces, the toolbar and the status bar
 * as they come, the web fonts, the highlighter, the site's directives in the
 * preview, and an answer to `onUploadImage` so that a dropped file lands.
 *
 * `onSave` is deliberately absent, which is what makes `Mod`+`S` real: without
 * it the editor hands the document to the browser as a download, and a download
 * is a thing that actually happens rather than a callback nobody can see.
 */
export default function PlaygroundEditor({
  colorScheme,
  onColorSchemeChange,
  locale,
  height
}: DemoProps) {
  return (
    <MawyEditor
      defaultValue={PLAYGROUND[locale]}
      defaultMode="split"
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      highlight={() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)}
      directives={DEMO_DIRECTIVES}
      onUploadImage={readAsDataUrl}
      style={{ height }}
    />
  );
}
