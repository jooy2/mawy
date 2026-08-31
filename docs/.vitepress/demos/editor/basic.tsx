import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyEditor } from 'mawy';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/**
 * The editor with everything on: the three surfaces, the toolbar, the status
 * bar, and the preview's code coloured by the highlighter this package ships —
 * fetched only because this document happens to have a language on a fence.
 */
export default function EditorBasic({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyEditor
      defaultValue={SAMPLE}
      defaultMode="split"
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      highlight={() => import('mawy/highlight').then((module) => module.mawyHighlighter)}
      style={{ height: '34rem' }}
    />
  );
}
