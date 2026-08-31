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
