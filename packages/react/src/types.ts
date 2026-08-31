/**
 * The vocabulary every part of Mawy is written in.
 *
 * These are the types that more than one component needs, which is why they sit
 * here rather than beside whichever component introduced them — and why they
 * are also exported from `mawy/types`, so an application can name one in its
 * own props without importing a component to get at it.
 */

/**
 * Which surface a document is shown on.
 *
 * The three are views of one document rather than three editors: switching is a
 * change of view, and the value underneath does not round-trip through a second
 * implementation on the way.
 *
 * - `wysiwyg` — the rendered document, edited in place.
 * - `plain` — the Markdown source, edited as text.
 * - `preview` — the rendered document, read-only.
 */
export type MawyMode = 'wysiwyg' | 'plain' | 'preview';

/**
 * Which palette to draw in.
 *
 * `system` follows `prefers-color-scheme`, which is the default: an editor
 * embedded in an application that already answers that query should not be the
 * one white rectangle on a dark page.
 */
export type MawyColorScheme = 'light' | 'dark' | 'system';

/**
 * The language the editor's own chrome is written in — toolbar labels, menu
 * entries, the text a screen reader is given. Nothing to do with the language a
 * document is written in.
 */
export type MawyLocale = 'en' | 'ko';

/**
 * Which of the three typefaces the document is set in.
 *
 * A family rather than a font name. The library ships no fonts and has no
 * business naming one — what it names is the role, and the stack behind each
 * role is a `--mawy-font-*` custom property an application can redeclare.
 */
export type MawyFontFamily = 'sans' | 'serif' | 'mono';

/**
 * How wide the text is allowed to run.
 *
 * A line that is too long is the failure that arrives with a larger text size:
 * turn the size up on a full-width document and every line becomes harder to
 * come back to. `full` is for a viewer that has been given a column of its own
 * and does not need a second one inside it.
 */
export type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';

/**
 * How the document is set. Every field reaches the page as a `--mawy-doc-*`
 * custom property, so a value out of range is a strange-looking document rather
 * than a broken one.
 */
export interface MawyTypography {
  fontFamily: MawyFontFamily;
  /** The body size, in pixels. Everything else is relative to it. */
  fontSize: number;
  /** Unitless, so it scales with the size the way a line height should. */
  lineHeight: number;
  /** In `em`. Negative tightens. */
  letterSpacing: number;
  measure: MawyMeasure;
}

/**
 * What becomes of raw HTML written inside a document.
 *
 * - `escape` — it is shown as the characters it was written with. The default,
 *   and the only one that is safe without qualification.
 * - `sanitize` — it is drawn, with everything outside an allowlist of elements,
 *   attributes and URL schemes removed first.
 * - `raw` — it is drawn as written, and the caller owns what happens next. A
 *   report about rendering untrusted Markdown with this set is not a
 *   vulnerability in Mawy; it is the documented meaning of the value.
 *
 * None of the three affects links. A `[click](javascript:…)` is refused under
 * every policy, because it is Markdown rather than HTML and switching the HTML
 * policy was never a statement about it.
 */
export type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';

/** How the Markdown itself is read. */
export interface MawyParseOptions {
  /**
   * GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~`, alerts
   * and bare URLs becoming links.
   * @default true
   */
  gfm?: boolean;
  /**
   * Whether a single newline inside a paragraph is a line break.
   *
   * Off by default, because that is what Markdown says. On, it matches the way
   * chat clients and issue trackers behave — which is what a reader who has
   * never written Markdown expects, and the reason it is an option at all.
   * @default false
   */
  breaks?: boolean;
}

/**
 * One control on the viewer's toolbar.
 *
 * `separator` draws a hairline rather than a control, for grouping a toolbar
 * that has been given a long list.
 */
export type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'copy'
  | 'open'
  | 'separator';

/**
 * The toolbar, as an application asks for it.
 *
 * `true` is every control in the order below; `false` is no toolbar at all; an
 * array is exactly those controls, in exactly that order. There is no way to
 * add a control that is not on the list, which is deliberate — a toolbar that
 * takes arbitrary children stops being a toolbar the library can make
 * keyboard-operable.
 */
export type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
