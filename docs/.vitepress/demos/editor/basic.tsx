import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyEditor } from 'mawy';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/** The editor with everything on: the three surfaces, the toolbar, the status bar. */
export default function EditorBasic({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyEditor
      defaultValue={SAMPLE}
      defaultMode="split"
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]}
      style={{ height: '34rem' }}
    />
  );
}
