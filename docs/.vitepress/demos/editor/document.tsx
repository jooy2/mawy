import { MawyEditor } from 'mawy';
import type { DemoProps } from '../types.js';

const DOCUMENT = `# Editing the document itself

There is no source here to edit. What is on screen is the drawing, and typing
into it changes the **Markdown** behind it — which is then parsed and drawn
again, so the two cannot come apart.

Type in this paragraph. Press Enter to split it in two, and Backspace at the
start of one to join it back to the one above. Select something and press
\`Cmd\`/\`Ctrl\` + **B**.

한글도 그대로 됩니다. An input method is left alone for as long as it is
composing, and what it wrote is read back when it finishes.

## Headings work the same way

What does not work yet is everything below:

- a list item
- another one

> a quotation

\`\`\`ts
const code = 'a code block';
\`\`\`

Those still draw and still read. Typing in one does nothing at all, which is
the honest answer until the rule for writing that edit back is written.
`;

/** The `wysiwyg` surface: the drawn document, edited in place. */
export default function EditorDocument({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyEditor
      defaultValue={DOCUMENT}
      modes={['wysiwyg', 'plain']}
      defaultMode="wysiwyg"
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      style={{ height: '30rem' }}
    />
  );
}
