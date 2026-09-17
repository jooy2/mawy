import { MawyViewer } from 'mawy-react';
import { DEMO_DIRECTIVES } from '../directives.js';
import type { DemoProps } from '../types.js';

/**
 * The three shapes, the fourth case that matters as much as they do, and the
 * one drawing the library ships for a name an application chooses.
 *
 * `callout` is a container, `progress` a leaf and `kbd` a text one — they are
 * declared in `demos/directives.tsx`, which the playground reads too. `youtube`
 * is deliberately left off the list, so the demo shows what a viewer does with a
 * name nobody claimed as well as what it does with the ones somebody did.
 */
const DOCUMENT = `# What Markdown has no word for

The parser reads a **shape** and stops there. What each shape means is this page's to say, and the three below are declared in a file beside the demo, in about thirty lines between them.

:::callout[The shape and the meaning are different jobs]{kind=note}
A container holds blocks, so everything in here is read as Markdown:

- \`callout\` is a container, and the parser knows that much
- what a callout *is* — an \`<aside>\` with a coloured edge — is that file's
:::

A leaf is a line of its own. This one draws a bar, and the number in it came out of \`{value=72}\`:

::progress{value=72 label=Coverage}

A text directive sits inside a sentence: press :kbd[Ctrl] + :kbd[K] to search, :kbd[Esc] to leave.

The head has a second spelling as well, which is what every tool that shipped containers before the proposal writes. \`MawyCodeGroup\` is the one drawing this library ships, and this page registered it under two names. Several blocks in one group are tabs:

::: code-group

\`\`\`js
sub(10, 1, 5); // 4
\`\`\`

\`\`\`dart
sub(<int>[10, 1, 5]); // 4
\`\`\`

\`\`\`python
sub(10, 1, 5)  # 4
\`\`\`

:::

And a group of one takes its name from the title the line wrote:

::: lang bash

\`\`\`bash
npm install mawy-react
\`\`\`

:::

:::callout[And nothing claimed this one]{kind=warning}
No component was handed the name \`youtube\`, so the line under this box is drawn as the characters it was written with rather than quietly dropped — the same answer raw HTML gets, and for the same reason.
:::

::youtube{id=dQw4w9WgXcQ}
`;

/** Three names the viewer was told about, and one it was not. */
export default function ViewerDirectives({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      directives={DEMO_DIRECTIVES}
      toolbar={['fontSize', 'colorScheme']}
      style={{ height: '28rem' }}
    />
  );
}
