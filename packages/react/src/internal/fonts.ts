import type { MawyFont, MawyFontFamily } from '../types.js';

/**
 * Fetching a web font, once.
 *
 * A `<link>` rather than `FontFace` or an injected `@font-face`, because what
 * these stylesheets carry is a *list* of faces — Google's CSS is dozens of
 * `unicode-range` blocks per family, and a browser downloads only the ranges a
 * page actually draws. Reimplementing that would be reimplementing subsetting.
 *
 * The set is a fast path; the DOM is the real answer. Two viewers on one page
 * ask for the same font independently, and a second render must not add a
 * second `<link>`.
 */
const requested = new Set<string>();

export function loadFontStylesheet(href: string): void {
  if (typeof document === 'undefined' || requested.has(href)) {
    return;
  }

  requested.add(href);

  if (document.querySelector(`link[data-mawy-font][href="${CSS.escape(href)}"]`)) {
    return;
  }

  const link = document.createElement('link');

  link.rel = 'stylesheet';
  link.href = href;
  // A font lives on somebody else's server, and a request to it carries the
  // address of the page that made it unless it is told not to. Which page a
  // reader has open is the reader's business and not the font host's, and no
  // font service needs to know it to answer with a stylesheet.
  link.referrerPolicy = 'no-referrer';
  link.dataset.mawyFont = '';
  document.head.append(link);
}

/** The font with this id, or the first one offered if there is no such font. */
export function fontOf(id: MawyFontFamily, fonts: readonly MawyFont[]): MawyFont | undefined {
  return fonts.find((font) => font.id === id) ?? fonts[0];
}

/**
 * What to put in `font-family`.
 *
 * A font with no stack of its own resolves to `var(--mawy-font-{id})`, which is
 * how the three built-in roles stay a stylesheet's business rather than this
 * file's.
 */
export function fontStack(font: MawyFont | undefined): string {
  if (!font) {
    return 'var(--mawy-font-sans)';
  }

  return font.stack ?? `var(--mawy-font-${font.id})`;
}
