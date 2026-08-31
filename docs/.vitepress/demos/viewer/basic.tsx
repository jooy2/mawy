import { MawyViewer } from 'mawy';
import { SAMPLE } from '../sample.js';
import type { DemoProps } from '../types.js';

/** The whole thing: every control, a document with something of everything. */
export default function ViewerBasic({ colorScheme, locale }: DemoProps) {
  return (
    <MawyViewer
      value={SAMPLE}
      colorScheme={colorScheme}
      locale={locale}
      defaultTypography={{ measure: 'wide' }}
      style={{ height: '32rem' }}
    />
  );
}
