import { MawyViewer } from 'mawy-react';
import type { DemoProps } from '../types.js';

const DOCUMENT = `## Only the controls you picked

\`toolbar\` takes the controls to draw and the order to draw them in. This one has
a text size and a palette, and nothing else.

\`\`\`tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
\`\`\`
`;

/** Two controls, and nothing else. */
export default function ViewerMinimal({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      toolbar={['fontSize', 'colorScheme']}
      style={{ height: '20rem' }}
    />
  );
}
