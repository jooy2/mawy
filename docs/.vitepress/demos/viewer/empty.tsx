import { MawyViewer } from 'mawy';
import type { DemoProps } from '../types.js';

/**
 * With no `value` the viewer is the file picker. Drop a `.md` file on it.
 */
export default function ViewerEmpty({ colorScheme, locale }: DemoProps) {
  return (
    <MawyViewer
      colorScheme={colorScheme}
      locale={locale}
      toolbar={['fontSize', 'colorScheme', 'open']}
      style={{ height: '22rem' }}
    />
  );
}
