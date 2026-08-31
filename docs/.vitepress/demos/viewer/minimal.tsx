import { MawyViewer } from 'mawy';
import type { DemoProps } from '../types.js';

const DOCUMENT = `## A viewer with almost no chrome

The \`toolbar\` prop takes the controls to draw and the order to draw them in, so
a viewer that only needs a text size gets a toolbar with a text size on it.

\`\`\`tsx
<MawyViewer value={document} toolbar={['fontSize']} />
\`\`\`
`;

/** One control, and nothing else. */
export default function ViewerMinimal({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      toolbar={['fontSize']}
      style={{ height: '20rem' }}
    />
  );
}
