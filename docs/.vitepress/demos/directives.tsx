import type { MawyDirectiveProps, MawyDirectives } from 'mawy-react';

/**
 * The three directives this site declares, for the demos that want them.
 *
 * They started inside the demo that is *about* directives and are here because
 * a second demo wanted the same three — the playground, where the point is that
 * everything is switched on and a reader who types `:::callout` into the editor
 * should see one appear in the preview.
 *
 * Which is also the shortest statement of what a directive is: the parser reads
 * a **shape** — a container, a leaf, one in the middle of a sentence — and stops
 * there, and what each shape means is the embedding page's. These three are that
 * decision made, in about thirty lines between them, and nothing here parses
 * anything: `children` and `label` arrive already drawn.
 */

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
 * `<aside>` is composed around React elements the viewer already made. Which
 * is also why it carries a class as well as its styles: those children are the
 * library's paragraphs, with the library's margins on them, and the last one's
 * bottom margin is a strip of empty box under the words. A style on this
 * element cannot reach a child, so `custom.css` does it.
 */
function Callout({ attributes, label, children }: MawyDirectiveProps) {
  const colour = KINDS[attributes.kind ?? 'note'] ?? KINDS.note;

  return (
    <aside
      className="mawy-demo-callout"
      style={{
        borderLeft: `3px solid ${colour}`,
        background: 'var(--mawy-bg-sunken)',
        // Square where the rule is and rounded away from it, the way the
        // viewer's own alerts are: a rounded corner turns the top and bottom
        // few pixels of the line into an arc, and the eye reads that as a line
        // that does not quite reach either end.
        borderRadius: '0 var(--mawy-radius-md) var(--mawy-radius-md) 0',
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

/**
 * The three names a demo hands the viewer.
 *
 * `youtube` is deliberately not among them wherever this is used, so that what
 * a viewer does with a name nobody claimed is on the page as well as what it
 * does with the ones somebody did.
 */
export const DEMO_DIRECTIVES: MawyDirectives = {
  callout: Callout,
  progress: Progress,
  kbd: Kbd
};
