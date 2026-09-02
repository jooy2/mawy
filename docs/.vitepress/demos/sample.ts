/**
 * The document every viewer demo on the site shows.
 *
 * One sample rather than one per page, and it is deliberately made of the
 * awkward things: a table with three alignments, a task list, an alert, a
 * fenced block, a definition list, a footnote mentioned twice, a reference link
 * defined at the bottom. A demo document that is three paragraphs of prose
 * proves that paragraphs work.
 */
export const SAMPLE = `# Reading a document

Mawy renders Markdown to React elements rather than to a string of HTML,[^why] which is what makes the safe default free: there is no HTML to escape, because there is none. Try the toolbar — the type is yours, not the document's.

## What it reads

Emphasis and **strong**, ~~struck through~~, \`inline code\`, and a [link](https://mawy.cdget.com) that goes somewhere. A bare URL becomes one too: https://github.com/jooy2/mawy

> [!NOTE]
> GitHub's five alert kinds are read as what they are, rather than as a quotation that happens to start with a word in brackets.

### A table

| Package | Registry | Status |
| :------ | :------: | -----: |
| \`packages/react\` | npm | 1.0.0 |
| \`packages/flutter\` | pub.dev | 1.0.0 |

### A list that keeps track

- [x] Block parser
- [x] Inline parser, delimiter stack and all
- [x] The viewer
- [ ] The editor

### And code

\`\`\`ts
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />;
}
\`\`\`

### A term and what it means

Definition lists are the one thing here GitHub does not read.[^why]

Markdown
: A way of writing that reads as what it says.

Mawy
: A viewer for it.
: And an editor beside the viewer.

---

Definitions are resolved wherever they are written — this one is [at the bottom][ref].

[ref]: https://mawy.cdget.com/guide/viewer 'The viewer guide'

[^why]: A footnote is written wherever it suits the author and read at the
    bottom. This one is written in the middle of the file, and is mentioned
    twice — the number is the same both times, and only the first mention is
    where the arrow comes back to.
`;
