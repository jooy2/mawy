/**
 * The document every viewer demo on the site shows.
 *
 * One sample rather than one per page, and it is deliberately made of the
 * awkward things: a table with three alignments, a task list, an alert, a
 * fenced block, a reference link defined at the bottom. A demo document that is
 * three paragraphs of prose proves that paragraphs work.
 */
export const SAMPLE = `# Reading a document

Mawy renders Markdown to React elements rather than to a string of HTML, which is what makes the safe default free: there is no HTML to escape, because there is none. Try the toolbar — the type is yours, not the document's.

## What it reads

Emphasis and **strong**, ~~struck through~~, \`inline code\`, and a [link](https://mawy.cdget.com) that goes somewhere. A bare URL becomes one too: https://github.com/jooy2/mawy

> [!NOTE]
> GitHub's five alert kinds are read as what they are, rather than as a quotation that happens to start with a word in brackets.

### A table

| Package | Registry | Status |
| :------ | :------: | -----: |
| \`packages/react\` | npm | in progress |
| \`packages/flutter\` | pub.dev | planned |

### A list that keeps track

- [x] Block parser
- [x] Inline parser, delimiter stack and all
- [x] The viewer
- [ ] The editor

### And code

\`\`\`ts
import { MawyViewer } from 'mawy';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />;
}
\`\`\`

---

Definitions are resolved wherever they are written — this one is [at the bottom][ref].

[ref]: https://mawy.cdget.com/guide/viewer 'The viewer guide'
`;
