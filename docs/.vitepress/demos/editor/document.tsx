import { MawyEditor } from 'mawy-react';
import type { DemoProps } from '../types.js';
import { readAsDataUrl } from '../upload.js';

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

So do the containers. Type in any of these, and press Enter at the end of one:

- a list item, where Enter carries the bullet down
- and Enter on the empty item that follows gives it up again

> a quotation, where ending a paragraph takes a blank quoted line

| a table | where Enter |
| ------- | ----------- |
| has     | nowhere     |

\`\`\`ts
const code = 'a code block, where a newline is a newline';
\`\`\`

An image or a hard break comes out in one piece, because each of them is one
character to a reader and none at all to a walk over the text.

Put the caret in [this link](https://mawy.cdget.com) and it is written out as
the characters that make it, destination and all, until the caret leaves again.
That is the only place there is for a URL to be typed: a drawn link puts its
words on the page and never its address.

Drop an image file here, or paste a screenshot. This demo answers
\`onUploadImage\` with a \`data:\` URI so that the page needs no server; a real
application answers with wherever it put the bytes.
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
      onUploadImage={readAsDataUrl}
      style={{ height: '30rem' }}
    />
  );
}
