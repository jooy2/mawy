import type * as React from 'react';
import { MawyViewer } from 'mawy-react';
import type { DemoProps } from '../types.js';

const DOCUMENT = `## A document that is the page

Nothing wraps this. The viewer has no background of its own and no bar across
the top — the toolbar is a group hovering over the text, the way a phone puts
its controls over what they act on.

\`\`\`tsx
<MawyViewer
  value={document}
  frame="floating"
  toolbarPlacement="bottom"
  style={{ '--mawy-doc-padding': '28px 24px 96px' }}
/>
\`\`\`

The document's own padding is nothing under \`floating\`, because a page that
draws its own gutters does not want a second set inside them. This demo asks
for some, which is what the custom property is for.

Scroll, and the bar stays where it is.
`;

/** The frame off, and the toolbar over the document rather than above it. */
export default function ViewerFloating({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      frame="floating"
      toolbarPlacement="bottom"
      toolbar={['fontSize', 'colorScheme', 'find']}
      style={{ height: '22rem', '--mawy-doc-padding': '28px 24px 96px' } as React.CSSProperties}
    />
  );
}
