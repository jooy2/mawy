'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyDirectives,
  MawyFont,
  MawyHighlight,
  MawyHtmlPolicy,
  MawyLinkTarget,
  MawyLocale,
  MawyParseOptions,
  MawyTypography,
  MawyViewerToolbarItem,
  MawyViewerToolbarOption
} from '../../types.js';
import { MAWY_SYSTEM_FONTS } from '../../fonts.js';
import { fontOf, loadFontStylesheet } from '../../internal/fonts.js';
import { useCopy } from '../../internal/clipboard.js';
import { useControlled } from '../../internal/controlled.js';
import { stringsFor } from '../../internal/i18n.js';
import { parseMarkdown } from '../../internal/markdown/parse.js';
import { renderBlocks, renderFootnotes } from '../../internal/markdown/render.js';
import { useHighlighter } from '../../internal/highlighter.js';
import { DEFAULT_TYPOGRAPHY, typographyStyle } from '../../internal/typography.js';
import { MAWY_ACCEPT, readTextFile } from '../../internal/files.js';
import { DEFAULT_TOOLBAR, MawyViewerToolbar } from './MawyViewerToolbar.js';
import { MawyViewerEmpty } from './MawyViewerEmpty.js';
import { MawyViewerOutline } from './MawyViewerOutline.js';

export interface MawyViewerProps extends Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  /**
   * The document, as Markdown.
   *
   * Optional, and that is the whole design of this component rather than a
   * convenience: with no document the viewer *is* the file picker, so an
   * application that has nothing to show yet has something to render.
   *
   * Passing it makes the document the application's. It will not change on its
   * own, and opening a file reports through `onValueChange` instead.
   */
  value?: string;
  /** The document to start with, when the viewer is to keep it itself. */
  defaultValue?: string;
  /**
   * A new document, and the file it came from — `null` when it came from
   * somewhere else. Called whether or not `value` is being passed.
   */
  onValueChange?: (value: string, file: File | null) => void;

  /** @default 'system' */
  colorScheme?: MawyColorScheme;
  defaultColorScheme?: MawyColorScheme;
  onColorSchemeChange?: (colorScheme: MawyColorScheme) => void;

  /**
   * How the document is set. Anything left out keeps its default, so
   * `{ fontSize: 18 }` is a whole answer.
   */
  typography?: Partial<MawyTypography>;
  defaultTypography?: Partial<MawyTypography>;
  onTypographyChange?: (typography: MawyTypography) => void;

  /**
   * The typefaces the toolbar offers, in the order it lists them.
   *
   * The default is the three roles already on the reader's machine, and it
   * fetches nothing. `MAWY_WEB_FONTS` is a curated list of open-licensed
   * families that do have to be downloaded — passing it is how an application
   * says that a request to a font CDN is acceptable in its page, which is not
   * a decision a component should make on its own:
   *
   * ```tsx
   * <MawyViewer fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
   * ```
   *
   * Nothing is fetched until a font is chosen or the toolbar's font menu is
   * opened, and each stylesheet is fetched once per page.
   *
   * @default MAWY_SYSTEM_FONTS
   */
  fonts?: readonly MawyFont[];

  /**
   * The toolbar: `true` for all of it, `false` for none, or the controls to
   * draw and the order to draw them in.
   * @default true
   */
  toolbar?: MawyViewerToolbarOption;

  /** How the Markdown is read. @default `{ gfm: true, breaks: false, definitionLists: true }` */
  parse?: MawyParseOptions;

  /**
   * What becomes of raw HTML inside the document.
   * @default 'escape'
   */
  html?: MawyHtmlPolicy;

  /**
   * Where a link the document wrote opens.
   *
   * A new tab by default, with `rel="noopener noreferrer"` on it. A viewer is
   * usually a piece of a page rather than the page, so a reader who follows a
   * link out and comes back should find the document where they left it — and
   * in an editor there is unsaved work behind that link. `'self'` is for an
   * application showing a document *as* its page.
   *
   * @default 'blank'
   */
  linkTarget?: MawyLinkTarget;

  /** The language of the viewer's own chrome. @default 'en' */
  locale?: MawyLocale;

  /**
   * Whether a file dropped onto the viewer opens in it.
   *
   * On unless `value` is being passed — an application that owns the document
   * has not asked for a second way of replacing it, and can say so explicitly.
   */
  fileDrop?: boolean;

  /** What the file picker offers. @default every Markdown and text extension */
  accept?: string;

  /**
   * What colours a fenced code block that names its language.
   *
   * Nothing at all by default, because nothing at all is what most documents
   * need and a highlighter is the largest thing a Markdown renderer can be made
   * to carry. Pass one, or — better — pass a function that fetches one, and it
   * is fetched the first time a document with a language on a fence is drawn:
   *
   * ```tsx
   * import { mawyHighlighter } from 'mawy-react/highlight';
   *
   * <MawyViewer value={document} highlight={mawyHighlighter} />
   * ```
   *
   * `MawyHighlighter` is the whole interface, and it is tokens rather than
   * markup: what a highlighter says is text and names, and this library decides
   * what element that becomes.
   */
  highlight?: MawyHighlight;

  /**
   * What to draw for the constructs this package does not know about.
   *
   * A directive is a name and some attributes written in the document —
   * `:::callout{kind=warning}` and its two shorter shapes — and the parser
   * reads the shape without having any opinion about what it means. Which
   * component that becomes is the application's answer:
   *
   * ```tsx
   * <MawyViewer value={document} directives={{ callout: Callout }} />
   * ```
   *
   * A name that is not here is drawn as the characters it was written with,
   * the same answer raw HTML gets by default.
   */
  directives?: MawyDirectives;

  /** What to draw instead of the file picker when there is no document. */
  empty?: React.ReactNode;
}

/**
 * A Markdown document, rendered and not editable.
 *
 * The document becomes React elements rather than a string of HTML, which is
 * what makes the default safe: there is no HTML to escape, because there is no
 * HTML — a node in the parsed document can only become an element the renderer
 * has a case for. Raw HTML written *inside* the document is the one exception,
 * and it is inert until an application asks for it with `html`.
 */
export const MawyViewer = React.forwardRef<HTMLDivElement, MawyViewerProps>(function MawyViewer(
  {
    value,
    defaultValue,
    onValueChange,
    colorScheme,
    defaultColorScheme,
    onColorSchemeChange,
    typography,
    defaultTypography,
    onTypographyChange,
    fonts = MAWY_SYSTEM_FONTS,
    toolbar = true,
    parse,
    html = 'escape',
    linkTarget = 'blank',
    locale = 'en',
    fileDrop,
    accept = MAWY_ACCEPT,
    highlight,
    directives,
    empty,
    className,
    style,
    ...rest
  },
  ref
) {
  const strings = stringsFor(locale);
  const gfm = parse?.gfm ?? true;
  const breaks = parse?.breaks ?? false;
  const definitionLists = parse?.definitionLists ?? true;

  const controlled = value !== undefined;
  /**
   * Whether a file opened here would go anywhere.
   *
   * An application that passes `value` owns the document, and without
   * `onValueChange` there is nothing for a chosen file to become. Every
   * affordance that offers one is off in that case rather than present and
   * inert — which is what the editor's preview was drawing over an empty
   * document, a file picker that could not open a file.
   */
  const takesFile = !controlled || onValueChange !== undefined;
  const droppable = (fileDrop ?? !controlled) && takesFile;
  const [held, setHeld] = React.useState(defaultValue ?? '');
  const text = controlled ? value : held;

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);

  const [scheme, setScheme] = useControlled(
    colorScheme,
    defaultColorScheme ?? 'system',
    onColorSchemeChange
  );

  const given = React.useMemo(
    () => (typography ? { ...DEFAULT_TYPOGRAPHY, ...typography } : undefined),
    [typography]
  );
  const [type, setType] = useControlled(
    given,
    { ...DEFAULT_TYPOGRAPHY, ...defaultTypography },
    onTypographyChange
  );

  // The chosen font, if it is one that has to arrive first. Opening the font
  // menu fetches the rest; this is for the one the document is already set in.
  React.useEffect(() => {
    const href = fontOf(type.fontFamily, fonts)?.href;

    if (href) {
      loadFontStylesheet(href);
    }
  }, [fonts, type.fontFamily]);

  const [outlineOpen, setOutlineOpen] = React.useState(false);
  const [activeHeading, setActiveHeading] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [copyState, copy] = useCopy();

  const scroller = React.useRef<HTMLDivElement>(null);
  const picker = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);

  /**
   * The heading the reader asked for, until they scroll somewhere themselves.
   *
   * Following an entry is a smooth scroll, and a smooth scroll passes over
   * every heading between here and there — so the mark walked down the panel
   * with it and settled on whichever heading happened to be at the top when it
   * stopped, which is not always the one that was pressed. The last heading in
   * a document cannot reach the top of a box taller than what is under it, and
   * a short section under a long one is passed straight through.
   *
   * What was pressed is not in doubt, so it is not measured. It is measured
   * again at the next wheel, touch, key or press inside the document, which is
   * the reader saying they have gone somewhere of their own.
   */
  const chosen = React.useRef<string | null>(null);

  /* ---------------------------------------------------------------------
   * The document
   * ------------------------------------------------------------------ */

  const document_ = React.useMemo(
    () => parseMarkdown(text, { gfm, breaks, definitionLists }),
    [text, gfm, breaks, definitionLists]
  );
  const highlighter = useHighlighter(highlight, document_);
  const footnotes = React.useMemo(
    () => new Map(document_.footnotes.map((footnote) => [footnote.label, footnote])),
    [document_]
  );
  const context = React.useMemo(
    () => ({ html, strings, highlighter, footnotes, directives, linkTarget, source: text }),
    [html, strings, highlighter, footnotes, directives, linkTarget, text]
  );
  const content = React.useMemo(
    () => (
      <>
        {renderBlocks(document_.root.children, context)}
        {renderFootnotes(document_.footnotes, context)}
      </>
    ),
    [document_, context]
  );

  const items: readonly MawyViewerToolbarItem[] =
    toolbar === false ? [] : toolbar === true ? DEFAULT_TOOLBAR : toolbar;

  /* ---------------------------------------------------------------------
   * Opening a file
   * ------------------------------------------------------------------ */

  const load = React.useCallback(
    (next: string, file: File | null) => {
      if (!controlled) {
        setHeld(next);
      }

      setFileName(file?.name ?? null);
      onValueChange?.(next, file);
    },
    [controlled, onValueChange]
  );

  const read = React.useCallback(
    async (file: File) => {
      const answer = await readTextFile(file);

      setReadError(
        'failed' in answer
          ? answer.failed === 'tooLarge'
            ? strings.fileTooLarge
            : strings.readFailed
          : null
      );

      if ('text' in answer) {
        load(answer.text, file);
      }
    },
    [load, strings]
  );

  /* ---------------------------------------------------------------------
   * Where the reader is
   * ------------------------------------------------------------------ */

  React.useEffect(() => {
    const element = scroller.current;

    if (!outlineOpen || !element) {
      return;
    }

    let queued = 0;

    const measure = () => {
      queued = 0;

      if (chosen.current) {
        setActiveHeading(chosen.current);

        return;
      }

      const headings = [...element.querySelectorAll<HTMLElement>('.mawy-md-heading')];

      // The viewer scrolls inside itself when it has been given a height, and
      // otherwise the page scrolls around it. Clamping the box's top at zero is
      // what makes one line of arithmetic answer both.
      const line = Math.max(element.getBoundingClientRect().top, 0) + 24;
      let current: string | null = headings[0]?.id ?? null;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > line) {
          break;
        }

        current = heading.id;
      }

      setActiveHeading(current);
    };

    const onScroll = () => {
      queued ||= requestAnimationFrame(measure);
    };

    // Inside the document only. A wheel over the panel is somebody reading the
    // list of headings, which is not somebody leaving the one they chose.
    const release = () => {
      chosen.current = null;
    };

    measure();
    element.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('wheel', release, { passive: true });
    element.addEventListener('touchstart', release, { passive: true });
    element.addEventListener('pointerdown', release);
    element.addEventListener('keydown', release);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(queued);
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('wheel', release);
      element.removeEventListener('touchstart', release);
      element.removeEventListener('pointerdown', release);
      element.removeEventListener('keydown', release);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [outlineOpen, document_]);

  const goTo = React.useCallback((slug: string) => {
    const heading = [
      ...(scroller.current?.querySelectorAll<HTMLElement>('.mawy-md-heading') ?? [])
    ].find((element) => element.id === slug);

    if (!heading) {
      return;
    }

    chosen.current = slug;
    setActiveHeading(slug);

    heading.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // Moving the page is only half of following a link. The focus has to go
    // with it, or the next Tab carries on from wherever the outline was.
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, []);

  /* ---------------------------------------------------------------------
   * Dragging a file over
   * ------------------------------------------------------------------ */

  const carriesFile = (event: React.DragEvent) => [...event.dataTransfer.types].includes('Files');

  const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!droppable || !carriesFile(event)) {
      return;
    }

    event.preventDefault();
    depth.current += 1;
    setDragging(true);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!droppable || !carriesFile(event)) {
      return;
    }

    // Without this the browser opens the file itself, replacing the page.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = () => {
    // Dragging across a child fires leave on the parent, so the enters and the
    // leaves are counted rather than trusted one at a time.
    depth.current = Math.max(depth.current - 1, 0);

    if (depth.current === 0) {
      setDragging(false);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!droppable || !carriesFile(event)) {
      return;
    }

    event.preventDefault();
    depth.current = 0;
    setDragging(false);

    const file = event.dataTransfer.files[0];

    if (file) {
      void read(file);
    }
  };

  /* ---------------------------------------------------------------------
   * Drawing
   * ------------------------------------------------------------------ */

  const hasDocument = text.trim().length > 0;

  return (
    <div
      {...rest}
      ref={ref}
      className={['mawy-root', 'mawy-viewer', className].filter(Boolean).join(' ')}
      data-mawy-color-scheme={scheme}
      data-mawy-dragging={dragging ? 'true' : undefined}
      style={{ ...typographyStyle(type, fonts), ...style } as React.CSSProperties}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {items.length ? (
        <MawyViewerToolbar
          items={items}
          strings={strings}
          typography={type}
          onTypographyChange={setType}
          fonts={fonts}
          colorScheme={scheme}
          onColorSchemeChange={setScheme}
          outlineOpen={outlineOpen}
          onOutlineToggle={() => setOutlineOpen((was) => !was)}
          onOpenFile={takesFile ? () => picker.current?.click() : undefined}
          onCopy={() => copy(text)}
          copyState={copyState}
          fileName={fileName}
          hasDocument={hasDocument}
        />
      ) : null}

      <div className="mawy-viewer-body">
        {outlineOpen && hasDocument ? (
          <MawyViewerOutline
            entries={document_.outline}
            strings={strings}
            active={activeHeading}
            onSelect={goTo}
            onClose={() => setOutlineOpen(false)}
          />
        ) : null}

        <div className="mawy-viewer-scroll" ref={scroller}>
          {hasDocument ? (
            <article className="mawy-md" aria-label={fileName ?? strings.document}>
              {content}
            </article>
          ) : (
            (empty ?? (
              <MawyViewerEmpty
                strings={strings}
                droppable={droppable}
                error={readError}
                onOpenFile={takesFile ? () => picker.current?.click() : undefined}
              />
            ))
          )}
        </div>
      </div>

      {dragging ? (
        <div className="mawy-drop-veil" aria-hidden="true">
          <span>{strings.dropHere}</span>
        </div>
      ) : null}

      <input
        ref={picker}
        type="file"
        className="mawy-file-input"
        accept={accept}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            void read(file);
          }

          // Cleared, so that choosing the same file twice in a row is two
          // events rather than one.
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
});
