import { MawyEditor } from 'mawy-react';
import type { DemoProps } from '../types.js';

const DOCUMENT = `# A source editor and nothing else

\`modes\` decides which surfaces the toolbar offers. Give it one and the switch
disappears — which is how an editor that is only ever a source editor is built.

- [x] Line numbers
- [ ] A status bar that counts Korean the way Korean is written
- [ ] \`Cmd\`/\`Ctrl\` + **B**, *I*, K, E

> Press Enter at the end of a list item and the next one carries the marker
> down. Press it again on the empty one and the marker goes away.

\`\`\`ts
const editor = 'a textarea, with the syntax coloured underneath it';
\`\`\`
`;

/** One surface, no preview: `modes={['plain']}`. */
export default function EditorSource({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyEditor
      defaultValue={DOCUMENT}
      modes={['plain']}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      status={['position', 'selection', 'words', 'characters', 'size']}
      style={{ height: '26rem' }}
    />
  );
}
