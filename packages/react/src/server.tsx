/**
 * A document drawn on a server, and left alone.
 *
 * `MawyViewer` renders on a server perfectly well and then hydrates, because
 * everything it offers a reader — the toolbar, the find bar, the outline, the
 * copy buttons — is behaviour, and behaviour needs the component on the page.
 * A documentation site, a blog, a changelog: none of those want any of it, and
 * shipping forty kilobytes of JavaScript so that a paragraph can be a paragraph
 * is the trade this entry point exists to refuse.
 *
 * So this is the drawing without the behaviour. No `'use client'`, no hooks, no
 * state: a React Server Component in a framework that has them, and an ordinary
 * component to `renderToStaticMarkup` in one that does not. The markup is the
 * same markup and the stylesheet is the same stylesheet, so a page built this
 * way and a page with a viewer on it look alike.
 *
 *     import { MawyDocument } from 'mawy-react/server';
 *     import 'mawy-react/styles.css';
 *
 *     export default async function Page() {
 *       return <MawyDocument value={await readFile('README.md', 'utf8')} />;
 *     }
 *
 * What is not here, and why:
 *
 * - **No toolbar, find bar or outline.** Each is a control, and a control on a
 *   page with nothing behind it is a lie. An application that wants them wants
 *   `MawyViewer`.
 * - **No copy button on a code block**, for the same reason.
 * - **`html="sanitize"` draws the markup as characters.** Sanitising needs a
 *   DOM to parse with and a server has none — which is what `MawyViewer` does
 *   on a server too, except that there the elements arrive on the render after.
 *   Here there is no render after. `html="raw"` writes the markup out as the
 *   author wrote it, with everything that means; see the guide.
 * - **A highlighter is used only if it answers at once.** A promise has no
 *   second render to arrive on. Pass the one this package ships, or any other
 *   synchronous one, and the colour is in the HTML.
 */

import * as React from 'react';
import type {
  MawyDirectives,
  MawyFont,
  MawyHighlighter,
  MawyHtmlPolicy,
  MawyImageProps,
  MawyLocale,
  MawyParseOptions,
  MawyTypography
} from './types.js';
import { MAWY_SYSTEM_FONTS } from './fonts.js';
import { stringsFor } from './internal/i18n.js';
import { parseMarkdown } from './internal/markdown/parse.js';
import { renderBlocks, renderFootnotes } from './internal/markdown/render.js';
import { DEFAULT_TYPOGRAPHY, typographyStyle } from './internal/typography.js';

export interface MawyDocumentProps {
  /** The Markdown. */
  value: string;

  /** How it is read. The same options `MawyViewer` takes. */
  parse?: MawyParseOptions;

  /**
   * What becomes of raw HTML written inside the document.
   *
   * `escape` — the default — and `sanitize` both draw it as the characters it
   * was written with here, because sanitising needs a DOM and there is none.
   * `raw` draws it as written, and the caller owns what happens next.
   */
  html?: MawyHtmlPolicy;

  /** Where a link the document wrote opens. */
  linkTarget?: 'blank' | 'self';

  /** What draws the constructs this package does not know about. */
  directives?: MawyDirectives;

  /**
   * What draws a picture the document points at. See `MawyViewer`'s own
   * `image` — on a server it is also how a picture is turned into whatever the
   * framework's own image component is.
   */
  image?: React.ComponentType<MawyImageProps>;

  /**
   * Put in front of every anchor this drawing gives a heading or a footnote.
   *
   * Unset, a heading's anchor is the author's own words — which is what a link
   * written by hand into a README is aimed at. Two documents on one page is
   * what this is for; see `MawyViewer`'s own `anchorPrefix`.
   */
  anchorPrefix?: string;

  /** The language of the few words this library writes itself. */
  locale?: MawyLocale;

  /**
   * What colours a code block. Only a highlighter that answers at once is
   * used, since there is no second render for a promise to arrive on.
   */
  highlight?: MawyHighlighter;

  /** How the document is set. Written out as the same custom properties. */
  typography?: MawyTypography;

  /** The typefaces those properties may name. */
  fonts?: readonly MawyFont[];

  /** Which palette to draw in. `null` leaves it to the page. */
  colorScheme?: 'light' | 'dark' | null;

  /** Put on the outermost element, after this library's own names. */
  className?: string;

  /** Merged over the custom properties the typography writes. */
  style?: React.CSSProperties;
}

export function MawyDocument({
  value,
  parse,
  html = 'escape',
  linkTarget = 'blank',
  directives,
  image,
  anchorPrefix,
  locale = 'en',
  highlight,
  typography,
  fonts = MAWY_SYSTEM_FONTS,
  colorScheme = null,
  className,
  style
}: MawyDocumentProps): React.ReactElement {
  const strings = stringsFor(locale);
  const document_ = parseMarkdown(value, {
    gfm: parse?.gfm ?? true,
    breaks: parse?.breaks ?? false,
    definitionLists: parse?.definitionLists ?? true
  });

  const context = {
    html,
    strings,
    footnotes: new Map(document_.footnotes.map((each) => [each.label, each])),
    directives,
    image,
    anchorPrefix,
    linkTarget,
    source: value,
    highlighter: highlight ?? null,
    // The whole of what makes this entry point different from the viewer's
    // drawing. See `RenderContext.still`.
    still: true
  };

  return (
    // `mawy-static` rather than `mawy-document`, which this package already
    // uses for the surface a document is edited in. Nothing in the stylesheet
    // claims this one; it is here so an application has a selector for "a Mawy
    // document with no viewer around it".
    <div
      className={['mawy-root', 'mawy-static', className].filter(Boolean).join(' ')}
      data-mawy-color-scheme={colorScheme ?? undefined}
      style={
        {
          ...typographyStyle({ ...DEFAULT_TYPOGRAPHY, ...typography }, fonts),
          ...style
        } as React.CSSProperties
      }
    >
      <article className="mawy-md" aria-label={strings.document}>
        {renderBlocks(document_.root.children, context)}
        {renderFootnotes(document_.footnotes, context)}
      </article>
    </div>
  );
}

export { parseMarkdown } from './internal/markdown/parse.js';
