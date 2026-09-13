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
 * - **`html="sanitize"` draws most markup as characters.** Sanitising needs a
 *   DOM to parse with and a server has none — which is what `MawyViewer` does
 *   on a server too, except that there the elements arrive on the render after.
 *   Here there is no render after. The exceptions are the few pieces a browser
 *   has only one way to read, which need no parser: a `<br>`, an `<img>` with
 *   nothing but quoted `src`, `alt`, `width`, `height` and `title`, and a tag
 *   like `<u>` around some words. See `plainHtml` and `pairsIn` in `render.tsx`.
 *   `html="raw"` writes the markup out as the author wrote it, with everything
 *   that means; see the guide.
 * - **A highlighter is used only if it answers at once.** A promise has no
 *   second render to arrive on. Pass the one this package ships, or any other
 *   synchronous one, and the colour is in the HTML.
 * - **No `data-mawy-range` on anything.** Every element the viewer draws
 *   carries the offsets it came from, so that a place on the page can be turned
 *   back into a place in the document; the editor's preview scrolls by them and
 *   a click in it finds its word by them. There is no component here to ask,
 *   and left in they are a quarter of the HTML — this repository's README comes
 *   out at 12.2 kB rather than 16.8 kB, and 3.4 kB rather than 4.6 kB gzipped.
 */

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyDirectives,
  MawyFont,
  MawyHighlighter,
  MawyHtmlPolicy,
  MawyImageProps,
  MawyLinkRel,
  MawyLinkTarget,
  MawyLocale,
  MawyParseOptions,
  MawyStrings,
  MawyTypography,
  MawyUrlResolver
} from './types.js';
import { MAWY_SYSTEM_FONTS } from './fonts.js';
import { withStrings } from './internal/i18n.js';
import { parseMarkdown } from './internal/markdown/parse.js';
import {
  firstImage,
  renderBlocks,
  renderFootnotes,
  type RenderContext
} from './internal/markdown/render.js';
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
  linkTarget?: MawyLinkTarget;

  /**
   * What a link the document wrote declares about where it goes.
   *
   * A string for every link, or a function asked about each one. A page
   * carrying documents its readers wrote is the case this exists for:
   *
   * ```tsx
   * <MawyDocument value={post.body} linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')} />
   * ```
   *
   * Added to what the link already declares rather than replacing it, so a
   * link opening in a new tab keeps its `noopener noreferrer`. See
   * `MawyLinkRel`.
   */
  linkRel?: MawyLinkRel;

  /** What draws the constructs this package does not know about. */
  directives?: MawyDirectives;

  /**
   * What draws a picture the document points at. See `MawyViewer`'s own
   * `image` — on a server it is also how a picture is turned into whatever the
   * framework's own image component is.
   */
  image?: React.ComponentType<MawyImageProps>;

  /**
   * Where a relative URL points. See `MawyUrlResolver`.
   *
   * A URL written in a document is relative to the document, and the page it is
   * drawn in is the application's. Without this, `![](./diagram.png)` in a file
   * read off a disk or out of a repository is a picture the browser looks for
   * beside the application and does not find.
   *
   *     renderMarkdown(document, { resolveUrl: (url) => new URL(url, base).href })
   *
   * It reaches a link's `href` and a picture's source, including the source of
   * the one kind of picture written as raw HTML that is drawn here: see
   * `plainHtml`. Any other raw HTML is characters, so there are no addresses
   * inside it to resolve.
   */
  resolveUrl?: MawyUrlResolver;

  /**
   * Put in front of every anchor this drawing gives a heading or a footnote.
   *
   * Unset, a heading's anchor is the author's own words — which is what a link
   * written by hand into a README is aimed at. Two documents on one page is
   * what this is for; see `MawyViewer`'s own `anchorPrefix`.
   */
  anchorPrefix?: string;

  /**
   * Which of `h1` to `h6` the document's own `#` is drawn as.
   *
   * A `#` is an `h1`, which is right when the document *is* the page and wrong
   * as soon as it is not. A blog post whose page already writes the title as
   * its `h1`, and then draws a document that opens with one, has two — and a
   * page with two `h1` elements has told a screen reader and a search engine
   * that it is about two things.
   *
   * ```tsx
   * <article>
   *   <h1>{post.title}</h1>
   *   <MawyDocument value={post.body} headingBase={2} />
   * </article>
   * ```
   *
   * Every heading moves by the same amount, so the hierarchy the author wrote
   * survives: under `2` a `#` is an `h2` and a `##` is an `h3`. Nothing goes
   * past `h6`, so a deep heading under a high base flattens against it rather
   * than becoming an element that does not exist.
   *
   * The anchors do not move. A heading's `id` is its own words either way, so a
   * link written against it still lands.
   *
   * @default 1
   */
  headingBase?: number;

  /** The language of the few words this library writes itself. */
  locale?: MawyLocale;

  /**
   * Those words, some or all of them, over the ones `locale` has. See
   * `MawyStrings`, and `MawyViewer`'s own `strings`.
   */
  strings?: Partial<MawyStrings>;

  /**
   * What colours a code block. Only a highlighter that answers at once is
   * used, since there is no second render for a promise to arrive on.
   */
  highlight?: MawyHighlighter;

  /**
   * How the document is set. Written out as the same custom properties.
   *
   * Anything left out keeps its default, so `{ fontSize: 18 }` is a whole
   * answer — which is what the code has always done with it.
   */
  typography?: Partial<MawyTypography>;

  /** The typefaces those properties may name. */
  fonts?: readonly MawyFont[];

  /**
   * Which palette to draw in.
   *
   * `null` — the default — writes nothing and leaves it to the page, which is
   * what an application that themes the `--mawy-*` tokens itself wants: a
   * palette declared here would be one more thing for its own to argue with.
   *
   * `'system'` follows `prefers-color-scheme`, the way `MawyViewer` does by
   * default. It is the answer for a page that has no palette of its own and a
   * reader whose machine does — without it a document drawn on a server was
   * light on a dark screen and there was no way to say otherwise short of
   * `'dark'`, which is wrong for everybody else.
   *
   * @default null
   */
  colorScheme?: MawyColorScheme | null;

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
  linkRel,
  directives,
  image,
  resolveUrl,
  anchorPrefix,
  headingBase,
  locale = 'en',
  strings: overrides,
  highlight,
  typography,
  fonts = MAWY_SYSTEM_FONTS,
  colorScheme = null,
  className,
  style
}: MawyDocumentProps): React.ReactElement {
  const strings = withStrings(locale, overrides);
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
    resolveUrl,
    anchorPrefix,
    headingBase,
    linkTarget,
    linkRel,
    source: value,
    highlighter: highlight ?? null,
    firstImage: firstImage(document_.root.children),
    // The whole of what makes this entry point different from the viewer's
    // drawing. See `RenderContext.still`.
    still: true
  } satisfies RenderContext;

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
