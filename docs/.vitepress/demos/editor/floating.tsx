import type * as React from 'react';
import { MawyEditor } from 'mawy-react';
import type { DemoProps } from '../types.js';

const DOCUMENT = `## Writing with nothing around it

The toolbar is over the text rather than barred across the top, and the editor
has no surface of its own. The status line stays where it is — it is the bottom
edge of the editor and a count of words is not a control.

\`\`\`tsx
<MawyEditor
  defaultValue={draft}
  frame="floating"
  toolbarPlacement="bottom"
/>
\`\`\`

Type, and the bar stays where it is.
`;

/** The editor with its frame off and its toolbar over the document. */
export default function EditorFloating({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyEditor
      defaultValue={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      frame="floating"
      toolbarPlacement="bottom"
      toolbar={['mode', 'separator', 'bold', 'italic', 'link', 'separator', 'find']}
      status={['words']}
      style={{ height: '24rem', '--mawy-doc-padding': '28px 24px 96px' } as React.CSSProperties}
    />
  );
}
