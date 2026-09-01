import { MawyViewer } from 'mawy-react';
import { DEMO_DIRECTIVES } from '../directives.js';
import type { DemoProps } from '../types.js';

/**
 * The three shapes, and the fourth case that matters as much as they do.
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
