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
import { FilePicker } from '../../internal/controls.js';
import { carriesFile, useFileDrag } from '../../internal/drag.js';
import { stringsFor } from '../../internal/i18n.js';
import { parseMarkdown } from '../../internal/markdown/parse.js';
import { LIVE } from '../../internal/markdown/live.js';
import { renderBlocks, renderFootnotes } from '../../internal/markdown/render.js';
import { findInDocument, NOTHING_FOUND } from '../../internal/markdown/find.js';
import { FindBar } from '../../internal/find.js';
import { useHighlighter } from '../../internal/highlighter.js';
import { useDismissableTips } from '../../internal/tips.js';
import { DEFAULT_TYPOGRAPHY, typographyStyle } from '../../internal/typography.js';
import { MAWY_ACCEPT, acceptsFile, readTextFile } from '../../internal/files.js';
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

  /** The language of the viewer's own interface. @default 'en' */
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
  //
  // Keyed on the address rather than on the list it was found in: `fonts` is
  // written into the JSX in the way the documentation shows it, which makes it
  // a new array on every render and this an effect that runs on every one.
  const chosenFont = fontOf(type.fontFamily, fonts)?.href;

  React.useEffect(() => {
    if (chosenFont) {
      loadFontStylesheet(chosenFont);
    }
  }, [chosenFont]);

  const [outlineOpen, setOutlineOpen] = React.useState(false);
  /**
   * The find bar, which is closed until somebody asks for it.
   *
   * A viewer is a page of ordinary elements and the browser's own find does
   * reach it — but a viewer given a height of its own is a window that find
   * scrolls past rather than into, and a reader who has just been handed a
   * find button on the editor goes looking for the same one here.
   */
  const [finding, setFinding] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [matchCase, setMatchCase] = React.useState(false);
  const [at, setAt] = React.useState(0);
  const [activeHeading, setActiveHeading] = React.useState<string | null>(null);
  const [copyState, copy] = useCopy();
  const tips = useDismissableTips();

  const scroller = React.useRef<HTMLDivElement>(null);
  const picker = React.useRef<HTMLInputElement>(null);

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
  const found = React.useMemo(
    () => (finding ? findInDocument(document_.root.children, query, matchCase) : NOTHING_FOUND),
    [finding, document_, query, matchCase]
  );
  /** The one being stepped through, kept inside a count that may have shrunk. */
  const currentMatch = found.total ? Math.min(at, found.total - 1) : -1;
  const context = React.useMemo(
    () => ({
      html,
      strings,
      highlighter,
      footnotes,
      directives,
      linkTarget,
      source: text,
      found,
      currentMatch,
      live: LIVE
    }),
    [html, strings, highlighter, footnotes, directives, linkTarget, text, found, currentMatch]
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
   * Finding
   * ------------------------------------------------------------------ */

  /**
   * The shortcut exists exactly where the button does.
   *
   * `Ctrl`+`F` is the browser's, and taking it is worth doing only in a viewer
   * that offers finding at all — so an application that left `find` out of its
   * `toolbar` gets the browser's find and none of this.
   */
  const searchable = items.includes('find');

  // A new query starts at the first match rather than at wherever the last one
  // left off, which is somewhere in a document nobody is looking at any more.
  React.useEffect(() => setAt(0), [query, matchCase]);

  const step = React.useCallback(
    (forwards: boolean) => {
      setAt((was) => {
        const total = found.total;

        if (!total) {
          return 0;
        }

        const from = found.total ? Math.min(was, total - 1) : 0;

        return (from + (forwards ? 1 : -1) + total) % total;
      });
    },
    [found.total]
  );

  /**
   * The match being stepped through, brought into view.
   *
   * By measuring the element rather than by an offset into the text, because
   * the document is drawn rather than laid out in lines: where a word ends up
   * depends on the typography, the width, and every picture above it that has
   * or has not loaded yet.
   *
   * And by moving this pane rather than by `scrollIntoView`, which scrolls
   * every scrolling ancestor it can find — including the page the application
   * put this viewer on. Pressing next should move the document, not the page
   * around it. The smoothness is the stylesheet's `scroll-behavior`, which is
   * off for a reader who asked their platform for less movement.
   */
  React.useLayoutEffect(() => {
    const pane = scroller.current;
    const mark = pane?.querySelector('.mawy-find-hit[data-mawy-current]');

    if (!finding || !pane || !mark) {
      return;
    }

    const view = pane.getBoundingClientRect();
    const box = mark.getBoundingClientRect();
    // A third of the pane of slack, so a match arrives inside the text rather
    // than against the edge it was just scrolled past.
    const room = Math.min(view.height / 3, 160);

    if (box.top < view.top + room) {
      pane.scrollTop -= view.top + room - box.top;
    } else if (box.bottom > view.bottom - room) {
      pane.scrollTop += box.bottom - view.bottom + room;
    }
  }, [finding, currentMatch, found]);

  const openFind = React.useCallback(() => {
    const selected = window.getSelection()?.toString() ?? '';

    // What is selected is nearly always what somebody is about to look for.
    if (selected && !selected.includes('\n')) {
      setQuery(selected);
    }

    setFinding(true);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!searchable || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f') {
      return;
    }

    event.preventDefault();
    openFind();
  };

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
    // with it, or the next Tab carries on from wherever the outline was. Every
    // heading is drawn able to take it — see the renderer — rather than being
    // made able to here, which would be writing an attribute into a tree React
    // owns and would never take back out.
    heading.focus({ preventScroll: true });
  }, []);

  /* ---------------------------------------------------------------------
   * Dragging a file over
   * ------------------------------------------------------------------ */

  const { dragging, props: dragProps } = useFileDrag({
    held: (event) => droppable && carriesFile(event),
    taken: () => true,
    onDrop: (event) => {
      const file = event.dataTransfer.files[0];

      // Checked against the same list the picker offers, so that a file which
      // is plainly not a document is refused rather than shown as mojibake.
      if (!file) {
        return;
      }

      if (acceptsFile(file, accept)) {
        void read(file);

        return;
      }

      setReadError(strings.readFailed);
    }
  });

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
      data-mawy-tips={tips.off ? 'off' : undefined}
      style={{ ...typographyStyle(type, fonts), ...style } as React.CSSProperties}
      {...tips.props}
      {...dragProps}
      onKeyDown={onKeyDown}
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
          onFind={hasDocument ? openFind : undefined}
          finding={finding}
          onOpenFile={takesFile ? () => picker.current?.click() : undefined}
          onCopy={() => copy(text)}
          copyState={copyState}
          fileName={fileName}
          hasDocument={hasDocument}
        />
      ) : null}

      {finding && searchable ? (
        <FindBar
          query={query}
          onQueryChange={setQuery}
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          total={found.total}
          current={currentMatch}
          onStep={step}
          onClose={() => setFinding(false)}
          strings={strings}
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

        {/* Focusable by click but not by `Tab`: a keystroke has to land
            somewhere, and `Ctrl`+`F` in a document somebody has just clicked
            into should reach this viewer rather than the browser's own find.
            `-1` rather than `0` because a reader Tabbing through a page is on
            their way somewhere, and a stop on the text they can already see is
            a stop that says nothing. */}
        <div className="mawy-viewer-scroll" ref={scroller} tabIndex={-1}>
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

      <FilePicker ref={picker} accept={accept} onFile={(file) => void read(file)} />
    </div>
  );
});
