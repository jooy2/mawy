import { MawyViewer } from 'mawy-react';
import type { DemoProps } from '../types.js';

const DOCUMENT = `## Just the document

Nothing but the Markdown, set the way the application asked for it — which is
most of what an application wants most of the time.

\`\`\`tsx
<MawyViewer value={document} toolbar={false} />
\`\`\`
`;

/**
 * The viewer with its chrome switched off.
 *
 * The palette is still the site's, because this page's own switch drives it —
 * an application that draws no toolbar decides the palette itself, which is
 * what `colorScheme` is for.
 */
export default function ViewerBare({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      toolbar={false}
      style={{ height: '18rem' }}
    />
  );
}
