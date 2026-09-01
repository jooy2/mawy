import type { MawyDirectiveProps } from 'mawy-react';
import { MawyViewer } from 'mawy-react';
import type { DemoProps } from '../types.js';

/**
 * The three shapes, and the fourth case that matters as much as they do.
 *
 * `callout` is a container, `progress` a leaf and `kbd` a text one — and
 * `youtube` is deliberately left off the list, so the demo shows what a viewer
 * does with a name nobody claimed as well as what it does with the ones
 * somebody did.
 */
const DOCUMENT = `# What Markdown has no word for

The parser reads a **shape** and stops there. What each shape means is this page's to say, and the three below are declared in the demo's own file, in about thirty lines between them.

:::callout[The shape and the meaning are different jobs]{kind=note}
A container holds blocks, so everything in here is read as Markdown:

- \`callout\` is a container, and the parser knows that much
- what a callout *is* — an \`<aside>\` with a coloured edge — is this file's
:::

A leaf is a line of its own. This one draws a bar, and the number in it came out of \`{value=72}\`:

::progress{value=72 label=Coverage}

A text directive sits inside a sentence: press :kbd[Ctrl] + :kbd[K] to search, :kbd[Esc] to leave.

:::callout[And nothing claimed this one]{kind=warning}
No component was handed the name \`youtube\`, so the line under this box is drawn as the characters it was written with rather than quietly dropped — the same answer raw HTML gets, and for the same reason.
:::

::youtube{id=dQw4w9WgXcQ}
`;

/** The kinds `callout` knows, and the custom property each borrows its edge from. */
const KINDS: Readonly<Record<string, string>> = {
  note: 'var(--mawy-note)',
  tip: 'var(--mawy-tip)',
  warning: 'var(--mawy-warning)',
  caution: 'var(--mawy-caution)'
};

/**
 * The house callout, which is the directive every site turns out to want.
 *
 * `children` arrives drawn, so there is no second parse and no markup — an
 * `<aside>` is composed around React elements the viewer already made.
 */
function Callout({ attributes, label, children }: MawyDirectiveProps) {
  const colour = KINDS[attributes.kind ?? 'note'] ?? KINDS.note;

  return (
    <aside
      style={{
        borderLeft: `3px solid ${colour}`,
        background: 'var(--mawy-bg-sunken)',
        borderRadius: 'var(--mawy-radius-md)',
        padding: '0.75rem 1rem',
        margin: '1rem 0'
      }}
    >
      {label ? (
        <strong style={{ color: colour, display: 'block', marginBottom: '0.25rem' }}>
          {label}
        </strong>
      ) : null}
      {children}
    </aside>
  );
}

/**
 * A bar, from `{value=…}`.
 *
 * Every attribute is a string, because a string is all the document said —
 * reading one as a number, and deciding what a missing one means, is the
 * component's, and this is what that looks like.
 */
function Progress({ attributes }: MawyDirectiveProps) {
  const value = Math.min(100, Math.max(0, Number(attributes.value) || 0));

  return (
    <div style={{ margin: '1rem 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--mawy-fg-muted)',
          fontSize: '0.85em',
          marginBottom: '0.35rem'
        }}
      >
        <span>{attributes.label ?? 'Progress'}</span>
        <span>{value}%</span>
      </div>
      <div
        style={{
          background: 'var(--mawy-bg-sunken)',
          border: '1px solid var(--mawy-border)',
          borderRadius: 'var(--mawy-radius-sm)',
          height: '0.55rem',
          overflow: 'hidden'
        }}
      >
        <div style={{ background: 'var(--mawy-accent)', height: '100%', width: `${value}%` }} />
      </div>
    </div>
  );
}

/** A key cap. A text directive is placed in the sentence, so this stays inline. */
function Kbd({ label }: MawyDirectiveProps) {
  return (
    <kbd
      style={{
        background: 'var(--mawy-code-bg)',
        border: '1px solid var(--mawy-border-strong)',
        borderRadius: 'var(--mawy-radius-sm)',
        boxShadow: 'var(--mawy-shadow-1)',
        color: 'var(--mawy-code-fg)',
        font: 'inherit',
        fontSize: '0.85em',
        padding: '0.1em 0.4em'
      }}
    >
      {label}
    </kbd>
  );
}

/** Three names the viewer was told about, and one it was not. */
export default function ViewerDirectives({ colorScheme, onColorSchemeChange, locale }: DemoProps) {
  return (
    <MawyViewer
      value={DOCUMENT}
      colorScheme={colorScheme}
      onColorSchemeChange={onColorSchemeChange}
      locale={locale}
      directives={{ callout: Callout, progress: Progress, kbd: Kbd }}
      toolbar={['fontSize', 'colorScheme']}
      style={{ height: '28rem' }}
    />
  );
}
