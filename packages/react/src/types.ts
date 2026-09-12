/**
 * The vocabulary every part of Mawy is written in.
 *
 * These are the types that more than one component needs, which is why they sit
 * here rather than beside whichever component introduced them — and why they
 * are also exported from `mawy-react/types`, so an application can name one in its
 * own props without importing a component to get at it.
 */

import type * as React from 'react';

/**
 * Which surface a document is shown on.
 *
 * These are views of one document rather than four editors: switching is a
 * change of view, and the value underneath does not round-trip through a second
 * implementation on the way.
 *
 * - `wysiwyg` — the rendered document, edited in place. Partly built: anywhere
 *   there is text to type in, and not an image or raw HTML being drawn rather
 *   than shown. Not on the default list.
 * - `plain` — the Markdown source, edited as text.
 * - `preview` — the rendered document, read-only.
 * - `split` — the source on one side and the preview on the other, at once.
 *
 * `split` is the odd one, and it is on this list rather than beside it because
 * of what a reader does with the control: the four are one group of buttons,
 * one at a time, and "both" is the fourth answer to the same question. A
 * separate prop would make it a second question about the first one.
 */
export type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';

/**
 * One control on the editor's toolbar.
 *
 * Everything except `mode`, `find`, `open`, `save`, `colorScheme` and
 * `separator` is a formatting command, and every one of them has a keyboard
 * shortcut — the buttons are a way of finding the commands rather than the way
 * of running them. `find` and `save` have one too, `Mod`+`F` and `Mod`+`S`,
 * and both work whether or not the button is on the toolbar. `open` has none:
 * the browser's own `Mod`+`O` is a reasonable thing to leave alone, and
 * opening a file is a rare and deliberate act rather than one done in a flow.
 */
export type MawyEditorToolbarItem =
  | 'mode'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule'
  | 'find'
  | 'open'
  | 'save'
  | 'colorScheme'
  | 'separator';

/**
 * The editor's toolbar, as an application asks for it. Same shape as the
 * viewer's: `true` for all of it, `false` for none, or exactly these in exactly
 * this order.
 */
export type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];

/**
 * Where an image ends up, once one has been dropped on the editor or pasted
 * into it.
 *
 * This is a prop rather than a behaviour because Mawy has nowhere to put bytes.
 * It is a component inside somebody else's application, and whether an image
 * belongs in an object store, behind an upload endpoint, or inline as a `data:`
 * URI is that application's decision — one with a bill attached, and not one a
 * text editor should make on its own. With no `onUploadImage`, a dropped file
 * does nothing: an image *already on the web*, pasted as part of a page, still
 * arrives as the URL it already had.
 *
 * What comes back is the URL to write, or the URL with what to write beside it:
 *
 * ```tsx
 * <MawyEditor onUploadImage={async (file) => (await save(file)).url} />
 * ```
 *
 * Throwing, or coming back with nothing, is how an upload says it failed, and
 * the editor says so and writes nothing.
 */
export type MawyImageUpload = (
  file: File
) => MawyImageSource | null | Promise<MawyImageSource | null>;

/** A URL, or a URL with the words that go around it in the Markdown. */
export type MawyImageSource =
  | string
  | {
      url: string;
      /** What the image is, for a reader who is not seeing it. */
      alt?: string;
      title?: string;
    };

/**
 * What the editor counts and shows along its bottom edge.
 *
 * `size` is the document in UTF-8 bytes, which is what a file on disk will be
 * and is not the same number as `characters` the moment anything is not ASCII.
 */
export type MawyEditorStatusItem =
  'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';

export type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];

/**
 * Which palette to draw in.
 *
 * `system` follows `prefers-color-scheme`, which is the default: an editor
 * embedded in an application that already answers that query should not be the
 * one white rectangle on a dark page.
 */
export type MawyColorScheme = 'light' | 'dark' | 'system';

/**
 * The language the editor's own interface is written in — toolbar labels, menu
 * entries, the text a screen reader is given. Nothing to do with the language a
 * document is written in.
 */
export type MawyLocale = 'en' | 'ko';

/**
 * Which typeface the document is set in — the `id` of one of the fonts the
 * viewer was given.
 *
 * `sans`, `serif` and `mono` are the three the library offers on its own, and
 * they are roles rather than font names: nothing is downloaded, and the stack
 * behind each is a `--mawy-font-*` custom property an application can
 * redeclare. Any other string is the `id` of a font passed through the `fonts`
 * prop — see `MawyFont`.
 */
export type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});

/**
 * A typeface the toolbar offers.
 *
 * `href`, if it is there, is a stylesheet that has to arrive before the font
 * can be drawn — a web font. **Nothing is ever fetched unless an application
 * asks for it**, by passing fonts that have one: a component embedded in
 * somebody else's page has no business opening a connection they did not
 * choose, and the default list opens none. `MAWY_WEB_FONTS` is the opt-in.
 */
export interface MawyFont {
  /** What `MawyTypography.fontFamily` is set to in order to choose this font. */
  id: string;
  /**
   * What the toolbar shows. `sans`, `serif` and `mono` take their label from
   * the locale when this is left out; anything else falls back to its `id`.
   */
  label?: string;
  /**
   * The CSS `font-family` value. Defaults to `var(--mawy-font-{id})`, which is
   * how the three built-in roles stay themeable from a stylesheet.
   */
  stack?: string;
  /**
   * A stylesheet to load before the font can be drawn. Fetched once, the first
   * time the font is chosen or its name is shown in the toolbar.
   */
  href?: string;
}

/**
 * What a piece of code turns out to be.
 *
 * A closed list, and closed on purpose: a token's kind becomes a class name on
 * an element the renderer draws, so a highlighter cannot invent one — the same
 * rule that keeps a parsed document from becoming an element nobody decided to
 * draw. A kind this does not name is drawn as the plain text it is.
 */
export type MawyCodeTokenKind =
  | 'comment'
  | 'string'
  | 'regex'
  | 'number'
  | 'constant'
  | 'keyword'
  | 'type'
  | 'function'
  | 'variable'
  | 'attribute'
  | 'tag'
  | 'operator'
  | 'punctuation';

/** One run of a code block, and what it is. */
export interface MawyCodeToken {
  text: string;
  /** `null` for a run that is nothing in particular. */
  kind: MawyCodeTokenKind | null;
}

/**
 * Something that can colour a code block.
 *
 * Tokens rather than markup, which is the whole shape of it: what a highlighter
 * hands back is text and names, and the renderer decides what element that
 * becomes. Nothing reaches the page as a string of HTML, here as anywhere else
 * in this library, and a highlighter cannot put a `<script>` in a document by
 * being wrong.
 *
 * The one thing a highlighter has to promise is that its tokens *are* the code:
 * joining every `text` back together has to give back exactly what it was
 * given. What it hands back is checked against that, and a code block that
 * fails the check is drawn plain — colour is not worth a document that says
 * something else.
 */
export interface MawyHighlighter {
  /** Whether it has anything to say about this language. */
  supports(language: string): boolean;
  /**
   * The code, taken apart. May be answered later — a highlighter that has to
   * fetch a grammar first is the usual reason — in which case the block is
   * drawn plain until it arrives.
   */
  highlight(code: string, language: string): MawyCodeToken[] | Promise<MawyCodeToken[]>;
}

/**
 * A highlighter, or the way to get one.
 *
 * A function is what makes it lazy, and lazy is the point: pass
 * `() => import('mawy-react/highlight').then((module) => module.mawyHighlighter)`
 * and nothing is fetched until a document with a fenced code block *and* a
 * language on the fence is actually drawn. A reader who never opens one never
 * pays for it, and an application that never sets the prop never ships it.
 */
export type MawyHighlight = MawyHighlighter | (() => MawyHighlighter | Promise<MawyHighlighter>);

/**
 * Where a piece of a document was written, in the offsets of the Markdown the
 * component was given.
 *
 * The same two numbers every element carries as `data-mawy-range`, handed over
 * as numbers where a component gets them directly.
 */
export interface MawyRange {
  /** Where the first character sits. */
  start: number;
  /** Where the last one ends. */
  end: number;
}

/**
 * Which of the three shapes a directive was written in.
 *
 * The number of colons is the difference and nothing else about it is:
 * `:::container` holds blocks, `::leaf` is a line of its own, and `:text` sits
 * inside a sentence.
 */
export type MawyDirectiveKind = 'container' | 'leaf' | 'text';

/**
 * A directive, on its way to the component that knows what it means.
 *
 * The library reads the shape and stops there: it has no opinion about what
 * `youtube` or `callout` is, which is exactly what lets a document carry one.
 * What arrives here is a name, whatever was written in `{…}`, and the pieces
 * already drawn — so a component composes React elements rather than parsing
 * Markdown a second time or handling a string of HTML.
 */
export interface MawyDirectiveProps {
  /** The name the document wrote after the colons. */
  name: string;
  kind: MawyDirectiveKind;
  /**
   * `{key=value}`, in the order they were written. `{#id}` arrives as `id` and
   * `{.a .b}` as `class`; a name written on its own arrives with an empty
   * string, which is how a flag is spelled.
   *
   * Every value is a string, because that is all the document said. Reading one
   * as a number or as a boolean is the component's to do, as is deciding what a
   * missing one means.
   */
  attributes: Readonly<Record<string, string>>;
  /** The `[label]`, drawn. `null` when the document wrote none. */
  label: React.ReactNode;
  /** A container's blocks, drawn. `null` for the other two shapes. */
  children: React.ReactNode;
  range: MawyRange;
  /** The characters the directive was written with, source and all. */
  source: string;
}

/**
 * The directives an application knows, by name.
 *
 * A name that is not on the list is drawn as the characters it was written
 * with — the same answer raw HTML gets under the default `html` policy, and for
 * the same reason: a document should show what it says rather than quietly lose
 * a piece of itself to a viewer that was never told what it meant.
 */
export type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;

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
 * A picture the document asked for.
 *
 * What an image component is handed, so that adding something to it later is
 * not a change to every component anybody has written.
 */
export interface MawyImageProps {
  /**
   * Where the picture is. Already checked against the scheme allowlist, so a
   * `javascript:` never reaches here — and a `data:` image arrives whole.
   */
  src: string;
  /**
   * What the picture is, for a reader who is not seeing it. Empty where the
   * author wrote `![](…)`, which in Markdown means decoration.
   */
  alt: string;
  /** The `title`, if one was written. */
  title: string | null;
  /**
   * Whether this is the first picture in the document.
   *
   * A page is measured on how long its largest piece of content takes to
   * arrive, and on a page whose document opens with a picture that picture is
   * usually the piece. Everything Mawy draws itself is text, so the one thing
   * this library can say about that measurement is which picture came first —
   * which is what an image component needs to know to fetch it at once instead
   * of when it is scrolled to:
   *
   * ```tsx
   * <MawyDocument
   *   value={document}
   *   image={({ src, alt, title, first }) => (
   *     <Image src={src} alt={alt} title={title ?? undefined} priority={first} />
   *   )}
   * />
   * ```
   *
   * First in the document rather than first on the screen, and the two are the
   * same thing only when the document starts at the top of the page. A
   * document reached halfway down a long page, or one of many drawn in a list,
   * is a case where this says yes and the answer that would have helped is no.
   * The renderer's own `<img>` makes the same guess — see the guide.
   */
  first: boolean;
}

/** Which of the two a URL was written as. */
export type MawyUrlKind = 'link' | 'image';

/**
 * Where a relative URL points.
 *
 * A URL written in a document is relative to the *document*. The page the
 * document is drawn in is the application's, and it is somewhere else — so
 * `![](./diagram.png)` in a file read off a disk, or out of a repository, or
 * from behind an API, is a picture the browser looks for beside the
 * application and does not find. Only the application knows where the document
 * came from, so only the application can say what that address means.
 *
 *     <MawyViewer
 *       value={document}
 *       resolveUrl={(url, kind) =>
 *         kind === 'image' ? new URL(url, base).href : `#/doc/${url}`
 *       }
 *     />
 *
 * Called for every relative URL in the document and for no other — see
 * `isRelativeUrl` for what that means and why an anchor, a scheme and a
 * protocol-relative address are all left alone. It reaches the `href` of a
 * link, the source of a picture, and the same two inside raw HTML under
 * `sanitize`, so an application writes the answer once.
 *
 * **What it returns is used as written.** The scheme allowlist has already run
 * on what the *document* said by the time this is called, and what comes back
 * is not checked again — an application that answers with `app-asset://…`, so
 * that a protocol handler of its own serves the file, is the case this is for
 * and a second check would make it impossible. The document is untrusted here
 * and the application is not, which is the same line every other hook in this
 * library draws.
 */
export type MawyUrlResolver = (url: string, kind: MawyUrlKind) => string;

/**
 * What becomes of raw HTML written inside a document.
 *
 * - `escape` — it is shown as the characters it was written with. The default,
 *   and the only one that is safe without qualification.
 * - `sanitize` — it is drawn, with everything outside an allowlist of elements,
 *   attributes and URL schemes removed first.
 * - `raw` — it is drawn as written. Nothing is removed and nothing is checked:
 *   a `<script>` in the document runs, an `onerror` on an image runs, an
 *   `<iframe>` loads, and all of it in the page's own origin with the page's
 *   own cookies. Anybody who can put characters into the document can do
 *   anything the application can do. Set it for documents the application
 *   wrote or has already made safe itself, and for nothing else. A report
 *   about rendering untrusted Markdown with this set is not a vulnerability
 *   in Mawy; it is the documented meaning of the value.
 *
 * None of the three affects links. A `[click](javascript:…)` is refused under
 * every policy, because it is Markdown rather than HTML and switching the HTML
 * policy was never a statement about it.
 */
export type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';

/**
 * Where a link in the document opens.
 *
 * - `blank` — in a new tab, with `rel="noopener noreferrer"` on it. The
 *   default, because a viewer is usually a piece of a page rather than the
 *   page: a reader who follows a link out of a document and comes back should
 *   find the document where they left it, and in an editor there is unsaved
 *   work behind that link.
 * - `self` — in the tab the document is in, which is what an application
 *   showing a document *as* its page wants.
 *
 * Only the links the document wrote. A footnote's reference and the arrow back
 * from it point at the same page and are unaffected.
 */
/**
 * Whether the surface has a frame around it, or floats in the page.
 *
 * - `box` — the default. The toolbar is a bar across the top of the surface
 *   with a line under it, and the whole thing has a background of its own. A
 *   reader can see where the editor starts and the page stops, which is what a
 *   document being *worked on* inside a larger page wants.
 * - `floating` — nothing wraps the document. No border, no bar across the end,
 *   and the toolbar becomes a rounded group over the top or the bottom of the
 *   text, the way a phone puts its controls over what they act on. This is for
 *   a document that *is* the page: an article, a post, a README, where a box
 *   around the prose is a box around the whole screen and says nothing.
 *
 * The ground stays under the document either way, because a palette that
 * reaches the text and not what it sits on is half a palette — a reader who
 * picks dark would get light grey on the page's white. `--mawy-bg: transparent`
 * is how a page says it wants the document on its own ground instead.
 *
 * The document's own padding follows: `box` keeps the room a surface needs,
 * and `floating` has none, because a page that draws its own gutters does not
 * want a second set inside them. `--mawy-doc-padding` overrides either.
 */
export type MawyFrame = 'box' | 'floating';

/**
 * Which end of the surface the toolbar is at.
 *
 * `top` under `box` is a bar with a line under it, and `bottom` is the same bar
 * with the line above it. Under `floating` it is which edge the rounded bar
 * hovers over — `bottom` is where a thumb is on a phone, and `top` is where a
 * pointer expects a toolbar on a page.
 *
 * The editor's status line is not a toolbar and does not move; it is the bottom
 * edge of the editor either way.
 */
export type MawyToolbarPlacement = 'top' | 'bottom';

export type MawyLinkTarget = 'blank' | 'self';

/**
 * What a link the document wrote declares about where it goes.
 *
 * A string for every link, or a function asked about each one. A document
 * somebody else wrote has somebody else's links in it, and what a page is
 * willing to say about them is the page's answer rather than a viewer's:
 *
 *     <MawyViewer
 *       value={post.body}
 *       linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')}
 *     />
 *
 * `nofollow` is a page saying it does not vouch for where the link goes and
 * `ugc` is it saying who wrote the link, which together are what a search
 * engine expects of a page carrying documents its readers wrote. Neither is a
 * reason to hide the link, and neither stops a reader following it.
 *
 * **Added to what the link already declares, rather than replacing it.** A
 * link opening in a new tab keeps its `noopener noreferrer` whatever this
 * answers: `noopener` is what makes that tab safe and `noreferrer` is what
 * keeps the document's own address out of it, and an application asking for
 * one more precaution did not ask to lose two. A token already there is not
 * written twice.
 *
 * The function is given the address as it will appear in the `href`, after
 * `resolveUrl` has had its say, so the answer is about the link the reader
 * will actually follow. Answering nothing leaves the link as it was.
 *
 * Only the links the document wrote. A footnote's reference and the arrow back
 * from it point at this same page and are never asked about.
 */
export type MawyLinkRel = string | ((href: string) => string | null | undefined);

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
  /**
   * Whether a line opening with `: ` under a line of text is a term and what it
   * means.
   *
   * On, and it is the one thing Mawy reads that GitHub does not: the syntax is
   * PHP Markdown Extra's, and it is the one everybody who writes these uses.
   * Turn it off for a document that has to mean exactly what it would mean
   * there.
   * @default true
   */
  definitionLists?: boolean;
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
  | 'find'
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
