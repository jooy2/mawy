'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyDirectives,
  MawyEditorStatusItem,
  MawyEditorStatusOption,
  MawyEditorToolbarItem,
  MawyEditorToolbarOption,
  MawyFont,
  MawyFrame,
  MawyHeadingLevel,
  MawyHighlight,
  MawyHtmlPolicy,
  MawyImageProps,
  MawyImageUpload,
  MawyImagePolicy,
  MawyLinkPolicy,
  MawyLinkRel,
  MawyLinkTarget,
  MawyLocale,
  MawyMode,
  MawyParseOptions,
  MawyStrings,
  MawyToolbarPlacement,
  MawyTypography,
  MawyUrlResolver
} from '../../types.js';
import { MAWY_SYSTEM_FONTS } from '../../fonts.js';
import { useControlled } from '../../internal/controlled.js';
import { fill } from '../../internal/i18n.js';
import { useStrings } from '../../internal/strings.js';
import {
  commandActive,
  tableAlignAt,
  tableOfSize,
  tableRangeAt,
  tableSpanAt,
  continueList,
  headingActive,
  toggleHeading,
  indent,
  runCommand,
  runTableCommand,
  type EditState,
  type MawyCommand,
  type MawyTableCommand
} from '../../internal/commands.js';
import {
  marksAt,
  nestingWaits,
  wraps,
  type MawyAim,
  type MawyEdit
} from '../../internal/editing.js';
import {
  fileFromDataUrl,
  imageFilesIn,
  markdownForImage,
  pastedImagesIn
} from '../../internal/images.js';
import { markdownFromHtml, pasteFromHtml } from '../../internal/markdown/paste.js';
import {
  difference,
  emptyHistory,
  record,
  redo,
  undo,
  type MawyStep
} from '../../internal/history.js';
import { FilePicker } from '../../internal/controls.js';
import { BlockTools, type MawyInsertTarget } from '../../internal/blockTools.js';
import type { MawyBlockTarget } from '../../internal/overlays.js';
import { movePlace, type MawyChange, type MawyPlace } from '../../internal/places.js';

/** A file on its way into the document, and where it is going. */
interface MawyUpload extends MawyPlace {
  /** Which of two uploads waiting at the same spot started first. */
  order: number;
  /** How many images it is, for `onUploadingChange`. */
  images: number;
  /** What to write, once every file has answered. `null` until then. */
  markdown: string | null;
  /**
   * The document the place was counted in, when that is a paste still on its
   * way in — a picture taken out of pasted markup stands at an offset into the
   * document the paste is about to make. `null` once it has arrived.
   */
  waiting: string | null;
}
import { carriesFile, useFileDrag } from '../../internal/drag.js';
import { caretFromPoint, domAt, rangeOf, sourceAt } from '../../internal/position.js';
import { caretRect, rowHeight } from '../../internal/source.js';
import { TableTools } from '../../internal/table.js';
import { measureAnchors, previewScrollFor, type MawyScrollAnchor } from '../../internal/scroll.js';
import { MawyViewer } from '../viewer/index.js';
import { DEFAULT_EDITOR_TOOLBAR, MawyEditorToolbar } from './MawyEditorToolbar.js';
import { FindBar } from '../../internal/find.js';
import { findMatches, matchFrom, replaceAll, replaceMatch } from '../../internal/search.js';
import { drawnMatches, paintMatches, rangeFor, unpaintMatches } from '../../internal/drawnFind.js';
import {
  MAWY_ACCEPT,
  acceptsFile,
  fileNameFor,
  readTextFile,
  saveTextFile
} from '../../internal/files.js';
import { DEFAULT_STATUS, MawyEditorStatus } from './MawyEditorStatus.js';
import { useDismissableTips } from '../../internal/tips.js';
import { MawyEditorDocument } from './MawyEditorDocument.js';
import { MawyEditorSource } from './MawyEditorSource.js';

/**
 * What the editor offers until an application says otherwise.
 *
 * `wysiwyg` is first, and it was not on this list at all until the two things
 * it could not do stopped being true: a link's destination and raw HTML being
 * drawn are both written out as their own characters when the caret is in
 * them, so there is no longer anywhere on that surface a caret cannot go.
 */
const DEFAULT_MODES: readonly MawyMode[] = ['wysiwyg', 'plain', 'split', 'preview'];

/** How far the bar between the panes of `split` may be pushed, either way. */
const SPLIT_LEAST = 0.15;
const SPLIT_MOST = 0.85;

/**
 * The keys that change a table's shape, which only do anything in a table.
 *
 * Built on the two keys a row is made and unmade with: `Enter` adds, and
 * `Backspace` takes away. `Shift` is the row above or the row itself, `Alt` is
 * the column rather than the row. A letter would have been easier to remember
 * and every letter is already somebody's: `Mod`+`Alt`+`I` is a browser's
 * developer tools, `Mod`+`Shift`+`T` reopens a tab, and on Windows `Ctrl`+`Alt`
 * is `AltGr`, which types `€` and `@` on half of Europe's keyboards. `T` for a
 * new table is the one letter, and it is one of the few `AltGr` leaves alone.
 */
function tableShortcut(event: React.KeyboardEvent): MawyTableCommand | null {
  const { altKey, shiftKey } = event;

  if (event.key === 'Enter') {
    return altKey
      ? shiftKey
        ? 'addColumnBefore'
        : 'addColumnAfter'
      : shiftKey
        ? 'addRowAbove'
        : 'addRowBelow';
  }

  if (event.key === 'Backspace' && shiftKey) {
    return altKey ? 'removeColumn' : 'removeRow';
  }

  // `code` as well as `key`: `Option`+`T` on a Mac is `†`.
  return altKey && !shiftKey && (event.code === 'KeyT' || event.key.toLowerCase() === 't')
    ? 'insertTable'
    : null;
}

/**
 * The keyboard, which is the editor's real interface.
 *
 * `Mod` is Command or Control, whichever the machine has — both are accepted
 * rather than sniffed, because a keyboard is a property of the person and not
 * of the operating system.
 */
const SHORTCUTS: Record<string, MawyCommand> = {
  b: 'bold',
  i: 'italic',
  k: 'link',
  e: 'code',
  '0': 'paragraph'
};

/**
 * The same under `Mod`+`Shift`, which is where the blocks are.
 *
 * The lists and the quotation are the keys GitHub's comment box gives them,
 * `7`, `8` and `.`, and the task list is the digit after. The image and the code
 * block are the link and the code span with `Shift`, which is what each of them
 * is. The divider is `,`, because the key a divider is written with is not
 * free: `Mod`+`Shift`+`-` shrinks the page in Chromium and Firefox alike.
 *
 * A letter is read by what it types, so it follows the keyboard's layout the
 * way `SHORTCUTS` does. The rest are read by the key: under `Shift` a `7` is
 * `&` on one keyboard and `/` on another, and a handler reading the character
 * would never see the key it was written for. The key is asked about only when
 * what it typed was not a letter — Dvorak's `V` is where QWERTY's `.` is, and
 * `Ctrl`+`Shift`+`V` pastes plain text there — and never under `Alt`, which on
 * Windows is half of `AltGr` and types a character of its own.
 */
const SHIFTED: Record<string, MawyCommand> = {
  x: 'strikethrough',
  k: 'image',
  e: 'codeBlock',
  Period: 'quote',
  Comma: 'rule',
  Digit7: 'orderedList',
  Digit8: 'bulletList',
  Digit9: 'taskList'
};

/** Which line of the source an offset is on, counted from zero. */
function lineAt(value: string, offset: number): number {
  let line = 0;

  for (let at = value.indexOf('\n'); at !== -1 && at < offset; at = value.indexOf('\n', at + 1)) {
    line += 1;
  }

  return line;
}

/**
 * Where a bar floats beside something in a pane: under it, or over it where
 * there is no room under it in the pane or on the screen — or over it first,
 * for a bar that belongs over a block — starting at a place across and running
 * the way the line reads, or back from it where the pane has no room that way.
 *
 * `reversed` says it runs back, which the table's bar answers by laying its
 * controls out the other way round. Inside the pane where the pane has a height
 * of its own to scroll in: an editor given no height is as tall as what is in
 * it, and there is nothing of the pane to keep the bar inside.
 */
function floated(
  pane: HTMLElement,
  anchor: { top: number; bottom: number; x: number },
  bar: HTMLElement | null,
  over = false
): { top: number; left: number; reversed: boolean } {
  const room = pane.getBoundingClientRect();
  const rtl = getComputedStyle(pane).direction === 'rtl';
  const tall = bar?.offsetHeight || 34;
  const wide = bar?.offsetWidth || 280;
  const floor = Math.min(
    room.height > tall + 8 ? room.height : Infinity,
    (pane.ownerDocument.defaultView?.innerHeight ?? Infinity) - room.top
  );
  const ceiling = Math.max(0, -room.top);
  const below = anchor.bottom - room.top + 8;
  const above = anchor.top - room.top - 8 - tall;
  const top = over
    ? above >= ceiling + 4
      ? above
      : Math.max(ceiling + 4, Math.min(anchor.top - room.top + 8, floor - tall - 4))
    : below + tall <= floor - 4 || above < ceiling + 4
      ? Math.max(ceiling + 4, Math.min(below, floor - tall - 4))
      : above;
  const onwards = (rtl ? anchor.x - wide + 12 : anchor.x - 12) - room.left;
  const backwards = (rtl ? anchor.x - 12 : anchor.x + 12 - wide) - room.left;
  const fits = rtl ? onwards >= 4 : onwards + wide <= room.width - 4;
  const reversed = !fits && (rtl ? backwards + wide <= room.width - 4 : backwards >= 4);
  const left = Math.max(4, Math.min(reversed ? backwards : onwards, room.width - wide - 4));

  return { top, left, reversed };
}

/** One empty list for every render that holds no formatting, rather than one each. */
const NOTHING_HELD: readonly MawyCommand[] = [];

/** What the `heading` menu offers until an application says otherwise. */
const DEFAULT_HEADING_LEVELS: readonly MawyHeadingLevel[] = [1, 2, 3, 4, 5, 6];

/**
 * What an application can do to an editor from outside it.
 *
 * Handed over through `handle` rather than through `ref`, which has always been
 * the outermost element and stays that: changing what `ref` is would break
 * every application already measuring or scrolling the editor by it.
 */
export interface MawyEditorHandle {
  /**
   * The focus put back on whichever surface is showing, with the caret where it
   * was left. Nothing in `preview`, which has no caret.
   */
  focus(): void;
  /**
   * Markdown written where the caret is, in place of whatever is selected, as
   * one step to undo — a button beside the editor inserting a snippet is the
   * case this is for. The caret ends up after it. Nothing while the editor is
   * read-only or in `preview`.
   */
  insert(markdown: string): void;
}

export interface MawyEditorProps extends Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  /** The document, as Markdown, when the application owns it. */
  value?: string;
  /** The document to start with, when the editor is to keep it itself. */
  defaultValue?: string;
  onChange?: (value: string) => void;

  /**
   * Which surface the document is on.
   * @default the first of `modes`
   */
  mode?: MawyMode;
  defaultMode?: MawyMode;
  onModeChange?: (mode: MawyMode) => void;
  /**
   * The surfaces the toolbar offers. Give it one and the switch disappears,
   * which is how an editor that is only ever a source editor is built.
   * @default ['wysiwyg', 'plain', 'split', 'preview']
   */
  modes?: readonly MawyMode[];

  /** The document can still be read, selected and copied — only not changed. */
  readOnly?: boolean;
  placeholder?: string;
  /** @default true */
  lineNumbers?: boolean;

  /** @default true */
  toolbar?: MawyEditorToolbarOption;
  /** @default true */
  status?: MawyEditorStatusOption;

  /**
   * Where an image goes, when one is dropped on the editor or pasted into it as
   * a file. Called once per file, and answered with the URL to write.
   *
   * Without it a dropped file does nothing at all, which is the honest default:
   * Mawy has nowhere to put bytes and the place they belong is the
   * application's decision. `MawyImageUpload` has the rest of why. Nothing here
   * touches an image that is already on the web — one pasted as part of a page
   * arrives as the URL it already had, upload or no upload, and only a picture
   * pasted as a `data:` address is uploaded like a file.
   *
   * With it, the toolbar's image button is a menu: a file chosen from the device
   * — the photo library or the camera, on a phone — and the `![](url)` it
   * writes without one. `Mod`+`Shift`+`U` opens the same picker.
   */
  onUploadImage?: MawyImageUpload;

  /**
   * How many images are on their way into the document, whenever that changes.
   *
   * Called with the count when an upload starts and again when its images are
   * written, refused or given up on, so zero means the document is the one the
   * reader will end up with. What an application does with it is hold its save
   * button: a document saved while an image is still uploading is saved without
   * it. An upload that finished while the editor was read-only still counts
   * until it is written, and an editor taken off the page says zero on its way.
   */
  onUploadingChange?: (count: number) => void;

  /**
   * Where a saved document goes, when the application would rather say.
   *
   * Without it, `save` hands the text to the browser as a download. With it,
   * nothing is downloaded and this is called with the document and the name it
   * would have been saved as — which is what an application saving to a server,
   * or to a file handle it is already holding, wants instead.
   */
  onSave?: (value: string, name: string) => void;

  /** What the file picker offers. @default every Markdown and text extension */
  accept?: string;

  /**
   * Whether a Markdown file dropped on the editor opens as the document.
   *
   * Off, and that is the careful answer rather than the useful one: replacing a
   * document somebody has been writing because a file landed on it is how work
   * is lost, and `open` is the control that does it on purpose. Turn it on for
   * an editor that starts empty and is a place to bring a file *to* — the
   * playground on this library's own site is one — and an empty preview becomes
   * somewhere to drop one, the way the viewer's empty state already is.
   *
   * A dropped image is still an image wherever `onUploadImage` is given. Only
   * the files that were being refused are read now.
   *
   * @default false
   */
  fileDrop?: boolean;

  /* The preview's half of the props, passed straight through to the viewer. */
  parse?: MawyParseOptions;
  html?: MawyHtmlPolicy;
  /**
   * Where a link in the document opens, in the preview and on the drawn
   * surface. A new tab by default, because behind that link there is unsaved
   * work. See `MawyViewer`.
   */
  linkTarget?: MawyLinkTarget;
  /**
   * What such a link declares about where it goes, in the preview and on the
   * drawn surface. Both are showing the same document, so both say the same
   * thing about it. See `MawyLinkRel`.
   */
  linkRel?: MawyLinkRel;
  /**
   * How a link the document wrote is drawn, in the preview and on the drawn
   * surface. See `MawyLinkPolicy`.
   *
   * On the drawn surface the link the caret is in is written out as its source
   * whatever this says, the way it always is, because that is where a caret
   * can edit it. Anywhere else a link under `hide` is not on the surface at
   * all, so a writer cannot see it until the caret arrives at it — which is
   * what an editor that shows what a reader will be shown is asking for.
   *
   * @default 'show'
   */
  links?: MawyLinkPolicy;
  /**
   * How a picture the document asks for is drawn, in the preview and on the
   * drawn surface. See `MawyImagePolicy` and `links`.
   *
   * @default 'show'
   */
  images?: MawyImagePolicy;
  /**
   * What colours a fenced code block, in the preview and on the drawn document.
   * Every coloured token on the drawn document says where it came from, so a
   * caret inside one maps back into the source the way it does in plain code.
   */
  highlight?: MawyHighlight;
  /**
   * What draws the directives this package does not know about, in the preview
   * and in the drawn document alike. A name that is not here is drawn as the
   * characters it was written with — which in the drawn document is also what
   * makes it editable, since those characters are the source, one for one.
   */
  directives?: MawyDirectives;

  /**
   * What draws a picture the document points at, in the preview and in the
   * drawn document. See `MawyViewer`'s own `image`.
   */
  image?: React.ComponentType<MawyImageProps>;

  /**
   * Where a relative URL points. See `MawyUrlResolver`.
   *
   * The drawn surface and the preview are both showing the document, so both
   * resolve its addresses the same way.
   */
  resolveUrl?: MawyUrlResolver;

  /**
   * Put in front of every anchor the editor gives a heading or a footnote, on
   * the drawn document and in the preview alike.
   *
   * Two editors on one page is what this is for — a page with one document per
   * language, say. Both documents open with `# Introduction`, both headings are
   * given `id="introduction"`, and a footnote reference in the second editor
   * goes to the first editor's note. A prefix each and the names stop colliding;
   * the links the document wrote to its own headings and notes move with them.
   *
   * Unset, which is the default, a heading's anchor is its own words, the way
   * it is in `MawyViewer` and for the same reason. The editor does not make a
   * prefix up when it is given none: which editors share a page is something
   * only the application knows, and a name generated for it would be one no
   * application could link to from its own interface. See `MawyViewer`'s own
   * `anchorPrefix`.
   */
  anchorPrefix?: string;

  /**
   * Which of `h1` to `h6` the document's own `#` is drawn as, on the drawn
   * document and in the preview. See `MawyViewer`'s own `headingBase`: an
   * editor beside a page that writes its own `h1` draws what the page will.
   * What the document says is not moved, and neither is the `heading` menu.
   *
   * @default 1
   */
  headingBase?: number;

  /**
   * Which heading levels the `heading` menu offers, and in what order.
   *
   * The document's own depths, written with that many `#`: `[2, 3, 4]` for an
   * application whose pages put the title in an `h1` of their own and whose
   * documents start at `##`. `Mod`+`1` to `Mod`+`6` toggle a level only where it
   * is offered, so the keys and the menu say the same thing. Body text is always
   * offered, and is `Mod`+`0`.
   *
   * All six by default, because Markdown has six and a menu that stops at three
   * is a document the editor cannot write. An application whose pages only go
   * so deep says so here.
   *
   * @default [1, 2, 3, 4, 5, 6]
   */
  headingLevels?: readonly MawyHeadingLevel[];
  fonts?: readonly MawyFont[];
  typography?: Partial<MawyTypography>;
  defaultTypography?: Partial<MawyTypography>;

  colorScheme?: MawyColorScheme;
  defaultColorScheme?: MawyColorScheme;
  onColorSchemeChange?: (colorScheme: MawyColorScheme) => void;

  /**
   * Whether the editor has a frame around it, or floats in the page.
   *
   * `box` is a surface with a background of its own and the toolbar barred
   * across one end, which is what an editor usually wants: somebody typing can
   * see where the thing they are typing into starts and the page stops.
   * `floating` gives that up and puts the toolbar over the document as a
   * rounded bar, for a writing surface that is the page. See `MawyFrame`.
   *
   * The status line is not a toolbar and does not move. It is the bottom edge
   * of the editor either way.
   *
   * @default 'box'
   */
  frame?: MawyFrame;

  /**
   * Which end of the editor the toolbar is at, and with it the find bar. The
   * status line stays where it is.
   *
   * @default 'top'
   */
  toolbarPlacement?: MawyToolbarPlacement;

  /**
   * Where the editor hands an application what it can do from outside. See
   * `MawyEditorHandle`.
   *
   * ```tsx
   * const editor = useRef<MawyEditorHandle>(null);
   *
   * <button onClick={() => editor.current?.insert('> [!NOTE]\n> ')}>Note</button>
   * <MawyEditor handle={editor} />
   * ```
   */
  handle?: React.Ref<MawyEditorHandle>;

  /** @default 'en' */
  locale?: MawyLocale;

  /**
   * The interface's words, some or all of them, over the ones `locale` has.
   *
   * For an application whose translations live in a catalogue of its own,
   * which is a better answer than this library carrying every language that
   * catalogue does. Anything left out comes from `locale`, `lang` included, so
   * give `lang` too when the words are in a language `locale` is not. See
   * `MawyStrings` for the names and for the placeholders a few of them carry.
   * Handed to the preview as well.
   */
  strings?: Partial<MawyStrings>;
}

/**
 * A Markdown editor, and the viewer beside it.
 *
 * The document is Markdown and every surface is a way of looking at that one
 * string — switching does not serialise out of one model and parse into
 * another, so nothing is lost in the move and a document that came in
 * unchanged goes out unchanged. That is the source surface, the preview, the
 * two of them side by side, and the document edited where it is drawn.
 */
export const MawyEditor = React.forwardRef<HTMLDivElement, MawyEditorProps>(function MawyEditor(
  {
    value,
    defaultValue,
    onChange,
    mode,
    defaultMode,
    onModeChange,
    modes = DEFAULT_MODES,
    readOnly = false,
    placeholder,
    lineNumbers = true,
    toolbar = true,
    status = true,
    onUploadImage,
    onUploadingChange,
    parse,
    html = 'escape',
    linkTarget = 'blank',
    linkRel,
    links = 'show',
    images = 'show',
    highlight,
    directives,
    image,
    resolveUrl,
    anchorPrefix,
    headingBase,
    headingLevels = DEFAULT_HEADING_LEVELS,
    onSave,
    accept = MAWY_ACCEPT,
    fileDrop = false,
    fonts = MAWY_SYSTEM_FONTS,
    typography,
    defaultTypography,
    colorScheme,
    defaultColorScheme,
    onColorSchemeChange,
    frame = 'box',
    toolbarPlacement = 'top',
    locale = 'en',
    strings: overrides,
    handle,
    className,
    ...rest
  },
  ref
) {
  const strings = useStrings(locale, overrides);

  const controlled = value !== undefined;
  const [held, setHeld] = React.useState(defaultValue ?? '');
  const text = controlled ? value : held;

  const [current, setMode] = useControlled(mode, defaultMode ?? modes[0] ?? 'plain', onModeChange);
  const [scheme, setScheme] = useControlled(
    colorScheme,
    defaultColorScheme ?? 'system',
    onColorSchemeChange
  );

  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  /** Whether the focus is anywhere inside the editor. See `MawyEditorDocument`. */
  const [focused, setFocused] = React.useState(false);
  const source = React.useRef<HTMLTextAreaElement>(null);
  const drawn = React.useRef<HTMLElement>(null);
  const preview = React.useRef<HTMLDivElement>(null);
  const pending = React.useRef<[number, number] | null>(null);
  /** Where an empty paragraph is being drawn, because the caret is in it. */
  const [room, setRoom] = React.useState<number | null>(null);
  /**
   * Where the last edit meant to leave the caret, when the page had nowhere to
   * draw it — a space at the end of a paragraph being the everyday one, since
   * Markdown does not keep the whitespace at the end of a line. `MawyAim` has
   * the whole of why.
   */
  const aim = React.useRef<MawyAim | null>(null);
  /**
   * Whether `Escape` was the last key pressed, and so whether the next `Tab`
   * leaves the editor rather than indenting. See `onKeyDown`.
   */
  const leaving = React.useRef(false);

  const notify = React.useRef(onChange);
  const history = React.useRef(emptyHistory());
  const restoring = React.useRef(false);
  /** The document and the caret as they were drawn, which is what undo stores. */
  const drew = React.useRef<MawyStep>({ value: text, start: 0, end: 0 });
  /** Held in a ref because an upload finishes several renders after it began. */
  const upload = React.useRef(onUploadImage);
  /**
   * The find bar, which is closed until somebody asks for it.
   *
   * It exists because the browser's own find cannot reach the source: no
   * browser searches the text inside a `<textarea>`. Everywhere else in this
   * library a thing the platform already does is left to the platform, and this
   * is the place the platform does not.
   */
  const [finding, setFinding] = React.useState(false);
  const picker = React.useRef<HTMLInputElement>(null);
  /** What the document was opened as, so saving it offers the same name back. */
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [replacement, setReplacement] = React.useState('');
  const [matchCase, setMatchCase] = React.useState(false);
  const tips = useDismissableTips();
  /** What the editor is saying about an upload, under the document. */
  const [note, setNote] = React.useState<{ text: string; failed: boolean } | null>(null);

  React.useEffect(() => {
    notify.current = onChange;
    upload.current = onUploadImage;
  });

  /**
   * The document as it was last drawn, which is the step undo has to arrive at.
   *
   * Written when it changes rather than after every render. It used to sit in
   * the effect above and build a fresh object each time, which is an object a
   * render allocated and threw away for every render that changed neither the
   * document nor the caret — a keystroke in the find box, a menu opening, a
   * scroll.
   */
  React.useEffect(() => {
    drew.current = { value: text, start: selection.start, end: selection.end };
  }, [text, selection.start, selection.end]);

  /**
   * Whether there is a step to take back or to put back, for the toolbar's two
   * buttons. Two booleans rather than one object, so that a keystroke that
   * leaves both where they were is not a render of the toolbar.
   */
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  const counted = React.useCallback(() => {
    setCanUndo(history.current.past.length > 0);
    setCanRedo(history.current.future.length > 0);
  }, []);

  const write = React.useCallback(
    (next: string) => {
      // Everything that changes the document comes through here, which is what
      // lets one history cover both surfaces — and what stops it covering its
      // own footsteps while it is putting a step back.
      if (!restoring.current) {
        record(history.current, drew.current, next, Date.now());
        counted();
      }

      if (!controlled) {
        setHeld(next);
      }

      notify.current?.(next);
    },
    [controlled, counted]
  );

  /* ---------------------------------------------------------------------
   * Which surfaces are on screen
   * ------------------------------------------------------------------ */

  const showSource = current === 'plain' || current === 'split';
  const showDocument = current === 'wysiwyg';
  const showPreview = current === 'preview' || current === 'split';
  const editable = (showSource || showDocument) && !readOnly;

  /* ---------------------------------------------------------------------
   * The bar between the two panes of split
   * ------------------------------------------------------------------ */

  /**
   * How much of the width the first pane has, and how it is moved.
   *
   * Half and half is a guess about what somebody is doing, and it is wrong as
   * often as it is right: a wide screen wants more preview while reading over a
   * draft and more source while writing one. So the bar between them is
   * something to take hold of.
   *
   * State rather than a prop. Where a pane's edge sits is the same kind of thing
   * as where a scrollbar sits — the reader's, for as long as they are looking at
   * it — and an application that has to store it has a `value` and an `onChange`
   * for the document and nothing here worth adding a third to.
   */
  const body = React.useRef<HTMLDivElement>(null);
  const [share, setShare] = React.useState(0.5);
  const splitting = showSource && showPreview;

  /** Where the bar can go. Far enough from either edge to be taken hold of. */
  const clamp = (fraction: number) => Math.min(SPLIT_MOST, Math.max(SPLIT_LEAST, fraction));

  const onDividerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const box = body.current?.getBoundingClientRect();

    if (!box || box.width === 0) {
      return;
    }

    // Held in a variable rather than read off the event again. React hands a
    // synthetic event round its listeners and sets `currentTarget` back to null
    // the moment the handler returns, so the callbacks below — which run on a
    // later event — would find nothing there and never take themselves off.
    const bar = event.currentTarget;

    // The pointer is captured so the drag survives leaving the bar, which it
    // does immediately: the bar is five pixels wide and a hand is not that
    // steady.
    //
    // A refused capture is not the end of the drag. `setPointerCapture` throws
    // for a pointer that is no longer down — a press let go inside the same
    // frame is enough — and losing the whole drag because the capture was a
    // moment late is worse than a drag that only follows the pointer while it
    // is over the bar.
    try {
      bar.setPointerCapture(event.pointerId);
    } catch {
      // Nothing to do about it, and nothing that has to be done.
    }

    event.preventDefault();

    const rtl = getComputedStyle(bar).direction === 'rtl';

    const move = (at: PointerEvent) => {
      const along = rtl ? box.right - at.clientX : at.clientX - box.left;

      setShare(clamp(along / box.width));
    };

    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };

    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }, []);

  /**
   * The same bar from the keyboard, which is the half that is easy to leave out.
   *
   * A separator nobody can move without a pointer is a separator half the
   * readers of this editor cannot move at all.
   */
  const onDividerKey = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const step = (event.shiftKey ? 0.1 : 0.02) * (rtl ? -1 : 1);

    const to =
      event.key === 'ArrowLeft'
        ? (was: number) => clamp(was - step)
        : event.key === 'ArrowRight'
          ? (was: number) => clamp(was + step)
          : event.key === 'Home'
            ? () => (rtl ? SPLIT_MOST : SPLIT_LEAST)
            : event.key === 'End'
              ? () => (rtl ? SPLIT_LEAST : SPLIT_MOST)
              : event.key === 'Enter'
                ? () => 0.5
                : null;

    if (!to) {
      return;
    }

    event.preventDefault();
    setShare(to);
  }, []);

  const items: readonly MawyEditorToolbarItem[] =
    toolbar === false ? [] : toolbar === true ? DEFAULT_EDITOR_TOOLBAR : toolbar;
  const statusItems: readonly MawyEditorStatusItem[] =
    status === false ? [] : status === true ? DEFAULT_STATUS : status;

  /* ---------------------------------------------------------------------
   * Where the caret is
   * ------------------------------------------------------------------ */

  const readSelection = React.useCallback(() => {
    const element = source.current;

    if (element) {
      setSelection({ start: element.selectionStart, end: element.selectionEnd });
    }
  }, []);

  /**
   * `selectionchange` rather than the textarea's own `select`, because `select`
   * is not dispatched for a caret that merely moved — and a status bar that
   * only updates when text is selected is a status bar that is usually wrong.
   */
  React.useEffect(() => {
    if (!showSource) {
      return;
    }

    document.addEventListener('selectionchange', readSelection);

    return () => document.removeEventListener('selectionchange', readSelection);
  }, [showSource, readSelection]);

  /** What the caret is reported as while the drawn document has it. */
  const readDrawnSelection = React.useCallback((next: { start: number; end: number }) => {
    setSelection(next);
    // The empty paragraph is only there while the caret is in it.
    setRoom((was) => (was === null || (next.start === was && next.end === was) ? was : null));
  }, []);

  /**
   * An edit made in the drawn document: the Markdown changes, and where the
   * caret should be once it has been parsed and drawn again is remembered until
   * it has been.
   */
  const applyEdit = React.useCallback(
    (edit: MawyEdit) => {
      pending.current = [edit.caret, edit.caret];
      setRoom(edit.betweenBlocks ? edit.caret : null);
      // Where the caret is going, said before the drawing rather than after it.
      // The drawn surface writes out the link or image the caret is inside, and
      // it decides that while rendering — so a caret told afterwards is a link
      // that closes on the keystroke that was being typed into it.
      setSelection({ start: edit.caret, end: edit.caret });

      // A caret moved onto a paragraph nothing has been written for yet is not
      // a change to the document, and an application told about one would save
      // a document nobody touched. The rule `run` follows, for the same reason.
      if (edit.value !== text) {
        write(edit.value);
      }
    },
    [text, write]
  );

  React.useLayoutEffect(() => {
    if (!pending.current) {
      return;
    }

    const [start, end] = pending.current;

    if (showDocument) {
      const element = drawn.current;
      const head = element && domAt(element, start, text);
      const tail = element && (start === end ? head : domAt(element, end, text));

      if (!element || !head || !tail) {
        return;
      }

      const range = element.ownerDocument.createRange();
      const selection_ = element.ownerDocument.getSelection();

      range.setStart(head.node, head.offset);
      range.setEnd(tail.node, tail.offset);
      selection_?.removeAllRanges();
      selection_?.addRange(range);

      // Whether the page could put the caret where the edit asked. When it
      // could not, where it was asked for is kept, or the next thing typed
      // lands wherever the caret had to settle for instead.
      const settled = sourceAt(element, head.node, head.offset, text);

      aim.current =
        start === end && settled !== start
          ? { value: text, at: start, node: head.node, offset: head.offset }
          : null;
      pending.current = null;

      return;
    }

    if (source.current) {
      source.current.setSelectionRange(start, end);
      pending.current = null;
      readSelection();
    }
  });

  /* ---------------------------------------------------------------------
   * Running a command
   * ------------------------------------------------------------------ */

  /**
   * The edit goes in through `execCommand`, which is deprecated and is still the
   * gentlest way to change a textarea's value: the caret, the scroll and any
   * composition in progress are left where they were, which a controlled write
   * does not promise. Undo is no longer the reason — that is `history.ts` now,
   * and it covers both surfaces rather than only this one.
   */
  const apply = React.useCallback(
    (before: EditState, after: EditState) => {
      const element = source.current;

      if (!element || before.value === after.value) {
        if (element && after.start !== before.start) {
          element.setSelectionRange(after.start, after.end);
          readSelection();
        }

        return;
      }

      // The smallest run that actually differs, so what goes into the textarea
      // is the thing that changed rather than the whole file.
      const change = difference(before.value, after.value);

      element.focus();
      element.setSelectionRange(change.at, change.at + change.removed);

      let done: boolean;

      try {
        done = change.inserted
          ? document.execCommand('insertText', false, change.inserted)
          : document.execCommand('delete');
      } catch {
        // Refused, or gone: some day it will be, and the fallback is the plain
        // controlled write. It costs nothing but the way the change got in.
        done = false;
      }

      if (!done) {
        write(after.value);
      }

      pending.current = [after.start, after.end];
    },
    [readSelection, write]
  );

  /**
   * A command's result, put back through whichever surface has the caret.
   *
   * The commands themselves are pure functions of `{ value, start, end }` and
   * know nothing about either surface, which is what lets the whole toolbar
   * work on the drawn document without a second implementation of any of it.
   */
  const run = React.useCallback(
    (before: EditState, after: EditState) => {
      if (!showDocument) {
        apply(before, after);

        return;
      }

      pending.current = [after.start, after.end];
      setRoom(null);
      setSelection({ start: after.start, end: after.end });

      // A command with nothing to do is not a change, and an application told
      // about one would save a document nobody touched.
      if (after.value !== before.value) {
        write(after.value);
      }
    },
    [apply, showDocument, write]
  );

  /** The document and the caret, as whichever surface has it reports them. */
  const stateNow = React.useCallback((): EditState | null => {
    if (showDocument) {
      return { value: text, start: selection.start, end: selection.end };
    }

    const element = source.current;

    return element
      ? { value: text, start: element.selectionStart, end: element.selectionEnd }
      : null;
  }, [showDocument, text, selection]);

  /**
   * One step back through the history, or forward again.
   *
   * The step is put in the way any other change would be, so the surface that
   * has the caret is the surface that gets it — and `restoring` is what keeps
   * the history from writing down the fact that it was read.
   */
  const travel = React.useCallback(
    (back: boolean) => {
      const now = stateNow();

      if (readOnly || !now) {
        return;
      }

      const step = back ? undo(history.current, now) : redo(history.current, now);

      if (!step) {
        return;
      }

      restoring.current = true;
      pending.current = [step.start, step.end];
      setRoom(null);
      write(step.value);
      restoring.current = false;
      counted();
    },
    [counted, readOnly, stateNow, write]
  );

  /**
   * The focus put back on the drawn document, with the caret or the selection
   * where the document's own offsets say. A caret that was meant to be where
   * the page draws nothing is left where the page put it, and `aim` still
   * answers for it.
   */
  const focusDrawn = React.useCallback(
    (start: number, end: number) => {
      const element = drawn.current;
      const head = element && domAt(element, start, text);
      const tail = element && end !== start ? domAt(element, end, text) : head;
      const kept = aim.current;

      element?.focus();

      if (!element || !head || !tail) {
        return;
      }

      const range = element.ownerDocument.createRange();

      if (kept && kept.value === text && kept.at === start && start === end) {
        range.setStart(kept.node, kept.offset);
        range.collapse(true);
      } else {
        range.setStart(head.node, head.offset);
        range.setEnd(tail.node, tail.offset);
      }

      element.ownerDocument.getSelection()?.removeAllRanges();
      element.ownerDocument.getSelection()?.addRange(range);
    },
    [text]
  );

  /**
   * Formatting the caret on the drawn document has been told to hold, and the
   * document and the place it was told at.
   *
   * Bold pressed with nothing selected writes nothing until something is
   * typed, and then writes it around what was typed. See `heldText` for why
   * the markers are not written straight away. Only for as long as the caret
   * and the document are where they were: a caret put somewhere else, or a
   * document changed some other way, has let go of it.
   */
  const [holding, setHolding] = React.useState<{
    value: string;
    at: number;
    commands: readonly MawyCommand[];
  } | null>(null);
  const holds =
    showDocument &&
    holding &&
    holding.value === text &&
    holding.at === selection.start &&
    selection.start === selection.end
      ? holding.commands
      : NOTHING_HELD;
  /**
   * An empty list item on the drawn document `Tab` has moved a level in and
   * nothing has been written into yet, with the document and the place it was
   * pressed in. See `nestingWaits`. Let go of, as held formatting is, by a
   * caret put somewhere else or a document changed some other way.
   */
  const [nesting, setNesting] = React.useState<{ value: string; at: number } | null>(null);
  const nests =
    showDocument &&
    nesting &&
    nesting.value === text &&
    nesting.at === selection.start &&
    selection.start === selection.end
      ? nesting.at
      : null;
  /** The formatting in force where the caret is, read once for every button. */
  const marks = React.useMemo(
    () =>
      showDocument && selection.start === selection.end ? marksAt(text, selection.start) : null,
    [showDocument, selection.start, selection.end, text]
  );

  /**
   * What the caret is inside on the drawn document, of the things a floating
   * bar is for, as the document says. See `targetAt`.
   */
  const [blockTarget, setBlockTarget] = React.useState<MawyBlockTarget | null>(null);
  const readTarget = React.useCallback((next: MawyBlockTarget | null) => {
    setBlockTarget((was) => (JSON.stringify(was) === JSON.stringify(next) ? was : next));
  }, []);
  /** A new link or picture asked for on the drawn document, and the document it was asked of. */
  const [inserting, setInserting] = React.useState<(MawyInsertTarget & { value: string }) | null>(
    null
  );
  /** Bumped to put the focus in the address of the link or picture the caret is in. */
  const [focusRequest, setFocusRequest] = React.useState(0);

  const command = React.useCallback(
    (name: MawyCommand) => {
      const before = readOnly ? null : stateNow();

      if (!before) {
        return;
      }

      // A link or a picture on the drawn document is asked for from a bar with
      // its address and its words in it, and written once it has an address:
      // the `[](url)` a source takes is nowhere on a drawn page to be typed
      // into. In one already, the bar it has is where its address is.
      if (showDocument && (name === 'link' || name === 'image')) {
        if (blockTarget?.kind === name) {
          setFocusRequest((each) => each + 1);

          return;
        }

        setInserting({
          kind: 'insert',
          image: name === 'image',
          range: { start: before.start, end: before.end },
          text: before.value.slice(before.start, before.end),
          value: before.value
        });

        return;
      }

      if (showDocument && before.start === before.end && wraps(name)) {
        setHolding({
          value: before.value,
          at: before.start,
          commands: holds.includes(name) ? holds.filter((each) => each !== name) : [...holds, name]
        });
        // A press on the toolbar took the focus, and nothing written means no
        // edit to put the caret back with it. What is typed next is what the
        // formatting is being held for.
        focusDrawn(before.start, before.end);

        return;
      }

      run(before, runCommand(name, before));
    },
    [blockTarget, focusDrawn, holds, readOnly, run, showDocument, stateNow]
  );

  React.useImperativeHandle(
    handle,
    () => ({
      focus: () => {
        if (showDocument) {
          focusDrawn(selection.start, selection.end);

          return;
        }

        source.current?.focus();
      },
      insert: (markdown: string) => {
        const before = readOnly ? null : stateNow();

        if (!before || !markdown) {
          return;
        }

        const at = before.start + markdown.length;

        run(before, {
          value: before.value.slice(0, before.start) + markdown + before.value.slice(before.end),
          start: at,
          end: at
        });
      }
    }),
    [focusDrawn, readOnly, run, selection.end, selection.start, showDocument, stateNow]
  );

  /**
   * A table command, run where the caret is, if it has anything to act on.
   *
   * Nothing at all where GFM is off: the parser would not read a table there,
   * and pipes written into a document that will never draw them are a mess
   * rather than a table.
   */
  const tableAfter = React.useCallback(
    (name: MawyTableCommand): [EditState, EditState] | null => {
      const before = readOnly || parse?.gfm === false ? null : stateNow();
      const after = before && runTableCommand(name, before);

      return before && after ? [before, after] : null;
    },
    [parse?.gfm, readOnly, stateNow]
  );

  const tableCommand = React.useCallback(
    (name: MawyTableCommand) => {
      const change = tableAfter(name);

      if (change) {
        run(...change);
      }
    },
    [run, tableAfter]
  );

  /** An empty table of the size the toolbar's grid was pressed at. */
  const insertTableSized = React.useCallback(
    (columns: number, rows: number) => {
      const before = readOnly || parse?.gfm === false ? null : stateNow();
      const after = before && tableOfSize(before, columns, rows);

      if (before && after) {
        run(before, after);
      }
    },
    [parse?.gfm, readOnly, run, stateNow]
  );

  /*
   * The table the caret is in, and the controls hung beside it.
   *
   * Only while the editor has the focus and something in it can be edited:
   * the controls are for the table being written in, and a bar left over a
   * table nobody is in is a bar over somebody's reading.
   */
  const sourcePane = React.useRef<HTMLDivElement>(null);
  const documentPane = React.useRef<HTMLDivElement>(null);
  const tools = React.useRef<HTMLDivElement>(null);
  const tableHere = React.useMemo(() => {
    const table =
      editable && focused && parse?.gfm !== false ? tableRangeAt(text, selection.start) : null;

    // A selection from one cell to another is in the table as a caret is, and
    // the controls act on the cells it covers; one that runs out of the table
    // is not.
    return table &&
      (selection.start === selection.end ||
        tableRangeAt(text, selection.end)?.start === table.start)
      ? table
      : null;
  }, [editable, focused, parse?.gfm, selection.end, selection.start, text]);
  /** The rows and columns the selection covers in that table. */
  const tableSpan = React.useMemo(
    () => (tableHere ? tableSpanAt(text, selection.start, selection.end) : null),
    [selection.end, selection.start, tableHere, text]
  );
  /** How the columns it covers are aligned, which the bar draws as pressed. */
  const tableAlign = React.useMemo(
    () => (tableHere ? tableAlignAt(text, selection.start, selection.end) : null),
    [selection.end, selection.start, tableHere, text]
  );
  /** Whether that is more than one cell, which the drawn document marks as cells. */
  const cellsSelected =
    showDocument && tableSpan !== null && tableSpan.rows * tableSpan.columns > 1;
  /**
   * Which cell of the drawn document the bar was last hung under, and how far
   * across it from the cell's edge. See `placeTools`.
   */
  const across = React.useRef<{ key: string; offset: number } | null>(null);
  const [toolsAt, setToolsAt] = React.useState<{
    top: number;
    left: number;
    reversed: boolean;
  } | null>(null);
  /** Where the mark over the selected cells is drawn, in the pane it is drawn in. */
  const [cellsAt, setCellsAt] = React.useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  /** Whether the caret is in a table, which is where a toolbar's blocks have nothing to make. */
  const caretInTable = React.useMemo(
    () => editable && tableRangeAt(text, selection.start) !== null,
    [editable, selection.start, text]
  );

  /**
   * Where the bar goes: under the cell the caret is in, starting across from
   * where the caret came into that cell, or under the cells selected, and over
   * them where there is no room under them in the pane or on the screen. On
   * the source it goes under the line the caret is on.
   *
   * Beside the caret rather than at the table's far end, which in a table
   * longer than the screen is a long way from the row being written in, and
   * under the cell rather than over the line being typed. Measured rather than
   * laid out, because the table is inside a surface that scrolls — a
   * textarea's lines, or the drawn document — and the bar is not.
   */
  const placeTools = React.useCallback(() => {
    const pane = showDocument ? documentPane.current : sourcePane.current;

    if (!tableHere || !pane) {
      across.current = null;
      setToolsAt(null);
      setCellsAt(null);

      return;
    }

    const room = pane.getBoundingClientRect();
    const rtl = getComputedStyle(pane).direction === 'rtl';
    let anchor: { top: number; bottom: number; x: number } | null = null;

    if (showDocument) {
      const table = [...(drawn.current?.querySelectorAll('.mawy-md-table-scroll') ?? [])].find(
        (each) => rangeOf(each)?.start === tableHere.start
      );

      // The selected cells, as one box from the first of them to the last. A
      // row of the table is a line of it, and the delimiter line has no row on
      // the page, so a line past the header is one row further up there.
      const rows = table?.querySelectorAll('tr');
      const span = tableSpan;
      const first = span && rows?.[span.top === 0 ? 0 : span.top - 1]?.children[span.left];
      const last = span && rows?.[span.bottom === 0 ? 0 : span.bottom - 1]?.children[span.right];

      if (cellsSelected && first && last) {
        const one = first.getBoundingClientRect();
        const other = last.getBoundingClientRect();
        const box = {
          top: Math.min(one.top, other.top) - room.top,
          left: Math.min(one.left, other.left) - room.left,
          width: Math.max(one.right, other.right) - Math.min(one.left, other.left),
          height: Math.max(one.bottom, other.bottom) - Math.min(one.top, other.top)
        };

        anchor = {
          top: box.top + room.top,
          bottom: box.top + box.height + room.top,
          x: rtl ? box.left + box.width + room.left : box.left + room.left
        };
        setCellsAt((was) =>
          was &&
          was.top === box.top &&
          was.left === box.left &&
          was.width === box.width &&
          was.height === box.height
            ? was
            : box
        );
      } else {
        setCellsAt(null);

        const selection = pane.ownerDocument.getSelection();
        const node = selection?.focusNode;
        const cell = (node?.nodeType === 1 ? (node as Element) : node?.parentElement)?.closest(
          'td, th'
        );

        if (cell && table?.contains(cell)) {
          const box = cell.getBoundingClientRect();
          const key = span ? `${tableHere.start}:${span.top}:${span.left}` : '';

          // Across from where the caret was when it came into the cell, and
          // kept there for as long as it stays in the cell. Measured from the
          // caret every time, the bar went after the edge of a selection being
          // drawn one letter at a time, and a bar that moves under the pointer
          // with every letter is one nobody can reach for. Kept as a distance
          // from the cell's edge, so a table scrolled sideways takes it along.
          if (!across.current || across.current.key !== key) {
            const caret = selection?.rangeCount
              ? selection.getRangeAt(0).getClientRects()[0]
              : null;

            across.current = { key, offset: (caret?.left ?? box.left) - box.left };
          }

          anchor = { top: box.top, bottom: box.bottom, x: box.left + across.current.offset };
        }
      }
    } else {
      const lines = pane.querySelector('.mawy-source-lines');
      const at = selection.end;
      const caret =
        lines &&
        caretRect(
          lines,
          lineAt(text, at),
          at - text.lastIndexOf('\n', at - 1) - 1,
          rowHeight(lines)
        );

      anchor = caret && { top: caret.top, bottom: caret.bottom, x: caret.left };
    }

    if (!anchor) {
      setToolsAt(null);

      return;
    }

    // Starting at the caret and running the way the line reads, or, where the
    // pane has no room for that, ending at the caret and running back, with its
    // controls the other way round so the ones that delete are still the end
    // away from the caret.
    const { top, left, reversed } = floated(pane, anchor, tools.current);

    setToolsAt((was) =>
      was && was.top === top && was.left === left && was.reversed === reversed
        ? was
        : { top, left, reversed }
    );
  }, [cellsSelected, selection.end, showDocument, tableHere, tableSpan, text]);

  React.useLayoutEffect(() => {
    placeTools();
  });

  React.useEffect(() => {
    const pane = showDocument ? documentPane.current : sourcePane.current;

    if (!tableHere || !pane) {
      return;
    }

    // Captured, because a scroll does not bubble and what scrolls is inside.
    // And whatever changes size under the table without a render — a picture
    // above it arriving, a pane dragged wider — moves the table and not the bar.
    const content = showDocument ? drawn.current : pane.querySelector('.mawy-source-lines');
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => placeTools());

    pane.addEventListener('scroll', placeTools, true);
    observer?.observe(pane);

    if (content) {
      observer?.observe(content);
    }

    return () => {
      pane.removeEventListener('scroll', placeTools, true);
      observer?.disconnect();
    };
  }, [placeTools, showDocument, tableHere]);

  /*
   * The bar over a code block or an alert on the drawn document, where the caret
   * is in one and not in a table, whose own bar is nearer what is being written.
   */
  const [blockAt, setBlockAt] = React.useState<{ top: number; left: number } | null>(null);
  const blockBar = React.useRef<HTMLDivElement>(null);
  /** A new link or picture being asked for, which is the bar there is while there is one. */
  const insertHere = showDocument && inserting && inserting.value === text ? inserting : null;
  const blockHere: MawyBlockTarget | MawyInsertTarget | null =
    !showDocument || !editable || !focused
      ? null
      : (insertHere ??
        (blockTarget && (blockTarget.kind === 'image' || blockTarget.kind === 'link' || !tableHere)
          ? blockTarget
          : null));
  /** Whether that bar is for something inline, which the table's bar gives way to. */
  const inlineBar = blockHere !== null && blockHere.kind !== 'code' && blockHere.kind !== 'alert';

  /**
   * Where that bar goes. Over a block's top edge at its inline end, and inside
   * its top where there is no room over it; under a picture; under the line the
   * caret is on in a link or where a new one is being written.
   */
  const placeBlock = React.useCallback(() => {
    const pane = documentPane.current;
    const element = drawn.current;

    if (!pane || !element || !blockHere) {
      setBlockAt(null);

      return;
    }

    const rtl = getComputedStyle(pane).direction === 'rtl';
    const caretAt = (offset: number) => {
      const place = domAt(element, offset, text);

      if (!place) {
        return null;
      }

      const range = element.ownerDocument.createRange();

      range.setStart(place.node, place.offset);
      range.collapse(true);

      return (
        range.getClientRects()[0] ??
        (place.node.nodeType === 1
          ? (place.node as Element)
          : place.node.parentElement
        )?.getBoundingClientRect() ??
        null
      );
    };

    if (blockHere.kind === 'insert' || blockHere.kind === 'link') {
      const caret = caretAt(
        blockHere.kind === 'insert'
          ? blockHere.range.end
          : Math.min(Math.max(selection.start, blockHere.range.start), blockHere.range.end)
      );

      if (!caret) {
        setBlockAt(null);

        return;
      }

      const { top, left } = floated(
        pane,
        { top: caret.top, bottom: caret.bottom, x: caret.left },
        blockBar.current
      );

      setBlockAt((was) => (was && was.top === top && was.left === left ? was : { top, left }));

      return;
    }

    const drawnAs = [...element.querySelectorAll('[data-mawy-range]')].find((each) => {
      const range = rangeOf(each);

      return range?.start === blockHere.range.start && range.end === blockHere.range.end;
    });

    if (!drawnAs) {
      setBlockAt(null);

      return;
    }

    const box = drawnAs.getBoundingClientRect();
    const wide = blockBar.current?.offsetWidth || 200;
    const { top, left } =
      blockHere.kind === 'image'
        ? floated(
            pane,
            { top: box.top, bottom: box.bottom, x: rtl ? box.right : box.left },
            blockBar.current
          )
        : floated(
            pane,
            {
              top: box.top,
              bottom: box.bottom,
              x: rtl ? box.left + wide - 12 : box.right - wide + 12
            },
            blockBar.current,
            true
          );

    setBlockAt((was) => (was && was.top === top && was.left === left ? was : { top, left }));
  }, [blockHere, selection.start, text]);

  React.useLayoutEffect(() => {
    placeBlock();
  });

  React.useEffect(() => {
    const pane = documentPane.current;

    if (!blockHere || !pane) {
      return;
    }

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => placeBlock());

    pane.addEventListener('scroll', placeBlock, true);
    observer?.observe(pane);

    if (drawn.current) {
      observer?.observe(drawn.current);
    }

    return () => {
      pane.removeEventListener('scroll', placeBlock, true);
      observer?.disconnect();
    };
  }, [blockHere, placeBlock]);

  /** The document the last render was given, for an edit a bar made against an older one. */
  const latestText = React.useRef(text);
  /** The caret, and what puts the focus back on it, as the last render had them. */
  const latestSelection = React.useRef(selection);
  const latestFocus = React.useRef(focusDrawn);

  React.useLayoutEffect(() => {
    latestText.current = text;
    latestSelection.current = selection;
    latestFocus.current = focusDrawn;
  });

  const blockEdit = React.useCallback(
    (edit: MawyEdit | null, from: string, refocus: boolean) => {
      if (readOnly || from !== latestText.current) {
        return;
      }

      setInserting(null);

      if (edit) {
        applyEdit(edit);
      }

      if (refocus) {
        // At the caret the edit left, or the one the document had: a field
        // that took the focus took the page's selection with it, and the
        // document given the focus back on its own puts the caret at its start.
        // After whatever handed the focus to a control of its own on the way
        // out, which a menu picking a value does, and after the edit is drawn.
        const caret = edit ? { start: edit.caret, end: edit.caret } : latestSelection.current;

        requestAnimationFrame(() => latestFocus.current(caret.start, caret.end));
      }
    },
    [applyEdit, readOnly]
  );

  const cancelInsert = React.useCallback(() => setInserting(null), []);

  const blockTools =
    blockHere && blockAt ? (
      <BlockTools
        key={`${blockHere.kind}:${blockHere.range.start}`}
        ref={blockBar}
        target={blockHere}
        strings={strings}
        value={text}
        caret={selection.start}
        top={blockAt.top}
        left={blockAt.left}
        onEdit={blockEdit}
        onCancel={cancelInsert}
        focusRequest={focusRequest}
      />
    ) : null;

  const tableTools =
    tableHere && toolsAt && !inlineBar ? (
      <TableTools
        ref={tools}
        strings={strings}
        top={toolsAt.top}
        left={toolsAt.left}
        reversed={toolsAt.reversed}
        rows={tableSpan?.rows ?? 1}
        columns={tableSpan?.columns ?? 1}
        align={tableAlign}
        available={(name) => tableAfter(name) !== null}
        onCommand={tableCommand}
      />
    ) : null;

  /* ---------------------------------------------------------------------
   * Putting an image in
   * ------------------------------------------------------------------ */

  /**
   * Every upload still out, and the place in the document it is going to.
   *
   * The place is decided when the file arrives and used when the URL comes
   * back, and in between the document goes on changing — so each one is moved
   * with every change, below, rather than trusted as an offset. `order` is
   * which of two uploads waiting at the same spot started first, so that the
   * image pasted first comes out first.
   */
  const places = React.useRef<MawyUpload[]>([]);
  const started = React.useRef(0);
  /** The last count `onUploadingChange` was told, so it hears only of a change. */
  const told = React.useRef(0);
  const uploading = React.useRef(onUploadingChange);

  React.useEffect(() => {
    uploading.current = onUploadingChange;
  });

  /** How many images are out, said to the application when that changes. */
  const recount = React.useCallback(() => {
    const count = places.current.reduce((sum, place) => sum + place.images, 0);

    if (count !== told.current) {
      told.current = count;
      uploading.current?.(count);
    }
  }, []);

  /** An upload taken off the list, whether it was written, refused or abandoned. */
  const forget = React.useCallback(
    (place: MawyUpload) => {
      const index = places.current.indexOf(place);

      if (index !== -1) {
        places.current.splice(index, 1);
        recount();
      }
    },
    [recount]
  );

  // An editor taken off the page takes its uploads with it — nothing it was
  // waiting for will be written anywhere — so an application holding its save
  // button until the count is zero is not left holding it for ever.
  React.useEffect(
    () => () => {
      // Forgotten as well as said, or an upload that answers afterwards still
      // finds its place, writes into a document nobody is showing and counts
      // itself back up.
      places.current.length = 0;

      if (told.current) {
        told.current = 0;
        uploading.current?.(0);
      }
    },
    []
  );
  /** The document the places were last moved to. */
  const shown = React.useRef(text);
  /**
   * The change an upload is writing, said exactly rather than worked out again
   * from the two documents. See `movePlace` for why that matters.
   */
  const writing = React.useRef<{ value: string; change: MawyChange; order: number } | null>(null);

  React.useLayoutEffect(() => {
    const was = shown.current;

    if (was === text) {
      return;
    }

    shown.current = text;

    const own = writing.current?.value === text ? writing.current : null;
    const change = own ? own.change : difference(was, text);

    writing.current = null;

    for (const place of [...places.current]) {
      if (place.waiting !== null) {
        // A paste an application refused to take never made the document its
        // pictures were counted in, and there is nowhere left for them to go.
        if (place.waiting !== text) {
          forget(place);
        }

        place.waiting = null;
        continue;
      }

      // An image written at the spot another is still waiting for goes in
      // front of it when it was pasted first, and behind it otherwise.
      Object.assign(place, movePlace(place, change, own !== null && place.order > own.order));
    }
  }, [forget, text]);

  /**
   * The note taken down once nothing is uploading, unless what it says is that
   * something failed.
   *
   * Every upload shares the one line under the document, and an upload that
   * succeeded has nothing to say about one that did not. Taking the note down
   * whenever the last upload finished meant a failure said a moment earlier was
   * wiped out by a different file arriving safely, and the reader was never told
   * which image was missing. A failure stays until the next upload starts, which
   * is the next attempt, or until something else is said there.
   */
  const settled = React.useCallback(() => {
    if (!places.current.length) {
      setNote((was) => (was?.failed ? was : null));
    }
  }, []);

  /**
   * An image put into the document at the place its upload has been carried to,
   * or kept back while the document is read-only.
   *
   * Written straight to the document rather than through whichever surface
   * started it, which is the whole of three separate problems. The surface that
   * started it may be gone: pasted on `plain` and answered on `wysiwyg`, the
   * textarea it would have gone through is not there any more. The reader may
   * have gone elsewhere: putting it in through the textarea focuses the textarea
   * and moves its caret, which takes the focus back from whatever field on the
   * page they went to in the meantime. And `preview` has no surface at all.
   *
   * The caret stays where the reader left it, moved along by the image if the
   * image went in front of it, and is only put back on a surface that has the
   * focus — a selection set on a surface that does not is a focus taken.
   *
   * **One at a time.** What is written is worked out from the document as it
   * was last drawn, so a second upload answering before the first one's write
   * has been drawn would work from a document without the first image in it
   * and write it out again. It waits instead, still counted, and the effect
   * below writes it once the first is on the page — which is also what a
   * picture taken out of a paste does while the paste itself is on its way in.
   *
   * **A read-only document does not change**, and that includes an upload
   * that finishes while it is one. `readOnly` is what an application sets while
   * it saves, and an image written in the middle of a save is an image on the
   * screen and missing from what was saved. So a finished upload waits, still
   * counted as uploading, and is written the moment the document can be
   * changed again — see the effect below. Throwing it away instead would lose a
   * file the application has already stored, over something that was nobody's
   * mistake.
   */
  const putImage = (place: MawyUpload) => {
    const markdown = place.markdown;

    if (
      readOnly ||
      markdown === null ||
      writing.current !== null ||
      place.waiting !== null ||
      !places.current.includes(place)
    ) {
      return;
    }

    const value = shown.current;
    const start = Math.min(place.start, value.length);
    const end = Math.min(Math.max(place.end, start), value.length);
    const change = { at: start, removed: end - start, inserted: markdown };
    const next = value.slice(0, start) + markdown + value.slice(end);
    const element = showDocument ? drawn.current : source.current;
    const caret = movePlace(
      element === source.current && source.current
        ? { start: source.current.selectionStart, end: source.current.selectionEnd }
        : selection,
      change,
      true
    );

    writing.current = { value: next, change, order: place.order };

    // A textarea is given its caret back whether or not it has the focus:
    // setting its value puts the caret at the end, and a caret at the end is
    // where the next command or `handle.insert` would land. Setting a
    // selection on it does not take the focus. A drawn document is only given
    // one while it has the focus, because a selection put inside a
    // `contenteditable` is a focus taken.
    if (
      element &&
      (element === source.current || element.contains(element.ownerDocument.activeElement))
    ) {
      pending.current = [caret.start, caret.end];
    }

    setRoom(null);
    setSelection(caret);
    write(next);
    forget(place);
    settled();
  };

  /**
   * The uploads that finished while they could not be written — the document
   * read-only, or another image still on its way onto the page — written once
   * they can be. One per render, oldest first: each is written into the document
   * the last one left, which is not on the screen until this has run again.
   */
  React.useLayoutEffect(() => {
    // A write the application did not take — a controlled `value` that stayed
    // where it was — is not waited on for ever. Any render after it would have
    // drawn it.
    if (writing.current && writing.current.value !== text) {
      writing.current = null;
    }

    const held = readOnly ? undefined : places.current.find((place) => place.markdown !== null);

    if (held) {
      putImage(held);
    }
  });

  /**
   * `putImage` as the latest render has it, for an upload to call when it
   * finishes. The one it began with belongs to whatever was showing then.
   */
  const putLater = React.useRef(putImage);

  React.useLayoutEffect(() => {
    putLater.current = putImage;
  });

  /**
   * Files put into the document as images, one upload at a time.
   *
   * One edit at the end rather than one per file: it is one thing the writer
   * did, so it is one step to take back.
   */
  const addImages = React.useCallback(
    async (files: readonly File[], at: MawyPlace, after: string | null = null) => {
      const hook = upload.current;

      if (!hook || readOnly || !files.length) {
        return;
      }

      started.current += 1;

      const place: MawyUpload = {
        start: at.start,
        end: at.end,
        order: started.current,
        markdown: null,
        waiting: after,
        images: files.length
      };

      places.current.push(place);
      recount();
      setNote({ text: strings.uploading, failed: false });

      const written: string[] = [];
      /** What the application said about the files it refused, each once. */
      const reasons: string[] = [];
      /** How many failed with nothing said about why. */
      let unexplained = 0;
      let failed = false;

      for (const file of files) {
        try {
          const answer = await hook(file);

          if (answer && typeof answer === 'object' && 'reason' in answer) {
            failed = true;

            // `null` is the application saying it has told the reader already,
            // and a second message about the same file is one too many.
            if (answer.reason && !reasons.includes(answer.reason)) {
              reasons.push(answer.reason);
            }
          } else if (answer) {
            written.push(markdownForImage(answer, file));
          } else {
            // Nothing back is how an upload says no without saying why.
            failed = true;
            unexplained += 1;
          }
        } catch {
          // What was thrown is not read out. It is as likely to be a network
          // error in a developer's words as anything a reader should see.
          failed = true;
          unexplained += 1;
        }
      }

      if (written.length) {
        place.markdown = written.join('\n\n');
        putLater.current(place);
      } else {
        forget(place);
      }

      /*
       * One note for the whole batch. The images that went in are on the page
       * and need no word; what is said is why the others did not — the reasons
       * the application gave, in the order the files came, and for the files
       * nobody explained, how many of the batch they were.
       */
      const said = [
        ...reasons,
        ...(unexplained === 0
          ? []
          : files.length === 1
            ? [strings.uploadFailed]
            : [fill(strings.uploadFailedSome, { N: String(unexplained), T: String(files.length) })])
      ].join(' ');

      if (failed && said) {
        setNote({ text: said, failed: true });
      } else {
        settled();
      }
    },
    [forget, readOnly, recount, settled, strings]
  );

  /**
   * An image file chosen from the device, which is the way in that needs
   * neither a drag nor a clipboard.
   *
   * On a phone or a tablet those two are the ways that are not there: nothing
   * is dragged from a desktop, and a picture in the photo library is not on the
   * clipboard. `image/*` is what makes a phone offer the library and the camera
   * rather than a list of files.
   *
   * The place is read when the picker opens, because by the time a file comes
   * back the focus has been on the toolbar and the picker, and the caret that
   * mattered is the one before either.
   */
  const imagePicker = React.useRef<HTMLInputElement>(null);
  const pickedFor = React.useRef<MawyPlace | null>(null);

  const pickImage = React.useCallback(() => {
    const state = readOnly || !upload.current ? null : stateNow();

    if (!state) {
      return;
    }

    pickedFor.current = { start: state.start, end: state.end };
    imagePicker.current?.click();
  }, [readOnly, stateNow]);

  const onImagesPicked = (files: File[]) => {
    const at = pickedFor.current;
    const images = files.filter((file) => file.type.startsWith('image/'));

    pickedFor.current = null;

    if (!at) {
      return;
    }

    if (!images.length) {
      // The picker was switched to every file and something else was chosen.
      setNote({ text: strings.uploadFailed, failed: true });

      return;
    }

    void addImages(images, at);
  };

  /**
   * Where a file was dropped, in the document's own offsets.
   *
   * On the drawn document that is the point it was let go over, read back
   * through the same machinery a click in the preview uses. In a textarea the
   * browser has already moved the caret there while the file was being dragged,
   * which is the only answer that surface has and is the right one.
   */
  const dropPoint = React.useCallback(
    (event: React.DragEvent): number => {
      const element = drawn.current;

      if (showDocument && element) {
        const point = caretFromPoint(event.clientX, event.clientY);
        const at = point && sourceAt(element, point.node, point.offset, text);

        if (at !== null && at !== undefined) {
          return at;
        }
      }

      return source.current?.selectionStart ?? selection.start;
    },
    [showDocument, text, selection.start]
  );

  /**
   * A file dragged over the editor is the editor's, whatever is in it.
   *
   * Adding an image where it lands is the only thing a drop here does, and that
   * is deliberate: replacing a document somebody has been writing because a
   * file landed on it is how work is lost, and opening one is a button, which
   * is a thing done on purpose.
   *
   * Every other file is refused *by this component* rather than handed back.
   * A browser given a file it was not stopped from taking opens it as a page,
   * and the document, the undo history and the caret go with the tab — which is
   * what a `.md` dropped on an editor with no `onUploadImage` used to do. A run
   * of text dragged in from another window is not a file, is not claimed, and
   * is still the surface's own business.
   */
  const takesImage = () => Boolean(upload.current) && editable;
  const takesDocument = () => fileDrop && !readOnly;

  const { dragging, props: dragProps } = useFileDrag({
    held: carriesFile,
    taken: takesImage,
    onDrop: (event) => {
      const files = takesImage() ? imageFilesIn(event.dataTransfer) : [];

      if (files.length) {
        const point = dropPoint(event);

        void addImages(files, { start: point, end: point });

        return;
      }

      const dropped = event.dataTransfer.files[0];
      // Checked against the same list the picker offers: a drop had none, and
      // a file that is plainly not a document became one.
      const document_ =
        takesDocument() && dropped && acceptsFile(dropped, accept) ? dropped : undefined;

      if (document_) {
        void read(document_);

        return;
      }

      // Said rather than ignored: somebody who drops a document on an editor is
      // asking for something, and there is a control that does it.
      setNote({ text: strings.dropNotDocument, failed: true });
    }
  });

  /**
   * A paste into the source, read back as Markdown where there is any to read.
   *
   * A clipboard with nothing but text on it is left to the browser: its own
   * paste is exactly right, and letting it happen keeps the caret, the scroll
   * and the undo run where they were.
   */
  const onPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const state = readOnly ? null : stateNow();

      if (!state) {
        return;
      }

      const images = upload.current ? pastedImagesIn(event.clipboardData) : [];

      if (images.length) {
        // In place of what was selected, the way pasting text would be. The
        // selection is replaced when the upload answers rather than now, so an
        // upload that fails leaves the words it would have replaced.
        event.preventDefault();
        void addImages(images, { start: state.start, end: state.end });

        return;
      }

      const html = event.clipboardData.getData('text/html');
      const { markdown, images: inline } = upload.current
        ? pasteFromHtml(html, event.clipboardData.getData('text/rtf'))
        : { markdown: markdownFromHtml(html), images: [] };

      if (!markdown && !inline.length) {
        return;
      }

      event.preventDefault();

      const after = {
        value: state.value.slice(0, state.start) + markdown + state.value.slice(state.end),
        start: state.start + markdown.length,
        end: state.start + markdown.length
      };

      if (markdown) {
        run(state, after);
      }

      for (const image of inline) {
        const file = fileFromDataUrl(image.url, image.alt);
        // Pictures and nothing else replace the selection, as a file would.
        const place = markdown
          ? { start: state.start + image.at, end: state.start + image.at }
          : { start: state.start, end: state.end };

        if (file) {
          void addImages([file], place, markdown ? after.value : null);
        }
      }
    },
    [addImages, readOnly, run, stateNow]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || readOnly) {
      return;
    }

    const state = stateNow();

    if (!state) {
      return;
    }

    /*
     * `Tab` indents, and `Escape` is the way out.
     *
     * A textarea that swallows `Tab` is a keyboard trap, and that is not a
     * style opinion — somebody who cannot use a pointer would have no way to
     * leave the editor at all. So the trap is opened rather than avoided:
     * `Escape` once and the next `Tab` moves the focus, which is the rule
     * CodeMirror, Monaco and GitHub's own editor all use, and the reason it is
     * worth matching them is that anybody who has met one of those already
     * knows it. The flag is cleared by anything else, so `Escape` never leaves
     * the editor in a state a reader cannot see.
     */
    if (event.key === 'Escape') {
      leaving.current = true;

      return;
    }

    const wasLeaving = leaving.current;

    leaving.current = false;

    if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (wasLeaving) {
        return;
      }

      if (showDocument) {
        // The drawn document is one stop on the way through a page, and `Tab`
        // moves on from it — except in a list item, where it is what makes the
        // item an item of the one above, and `Shift`+`Tab` what brings it back.
        // A first item that has nowhere to go takes the key and does nothing,
        // rather than sending the focus off the page in the middle of a list.
        const element = drawn.current;
        const anchor = element?.ownerDocument.getSelection()?.anchorNode ?? null;
        const host = anchor?.nodeType === 1 ? (anchor as Element) : (anchor?.parentElement ?? null);

        if (!element || !host || !element.contains(host)) {
          return;
        }

        // In a table cell, only on a line of the cell written as a list item,
        // where it nests the item. Anywhere else in a table it moves on, as it
        // does from a paragraph. See `indent`.
        if (host.closest('td, th')) {
          const listed = (['bulletList', 'orderedList', 'taskList'] as const).some((command) =>
            commandActive(command, state)
          );

          if (!listed) {
            return;
          }

          event.preventDefault();

          const next = indent(state, event.shiftKey);

          if (next.value !== state.value) {
            run(state, next);
          }

          return;
        }

        if (!host.closest('li')) {
          return;
        }

        event.preventDefault();

        // An empty item already held a level in goes no further in, and comes
        // back out without anything being written. See `nestingWaits`.
        if (nests !== null) {
          if (event.shiftKey) {
            setNesting(null);
            pending.current = [state.start, state.end];
          }

          return;
        }

        const next = indent(state, event.shiftKey);

        if (next.value === state.value) {
          return;
        }

        if (!event.shiftKey && nestingWaits(state, next, parse ?? {})) {
          // Drawn a level in, which takes the item the caret is in off the
          // page and draws another, so the caret is put back in that one.
          setNesting({ value: state.value, at: state.start });
          pending.current = [state.start, state.end];

          return;
        }

        run(state, next);

        return;
      }

      event.preventDefault();
      apply(state, indent(state, event.shiftKey));

      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      // An empty item held a level in steps back out, the way one written a
      // level in does, and nothing is written. See `movedOut`.
      if (nests !== null) {
        event.preventDefault();
        setNesting(null);
        pending.current = [state.start, state.end];

        return;
      }

      // Carrying a list marker down is a thing done to a line of Markdown. In
      // the drawn document `Enter` is an `insertParagraph`, which the surface
      // answers for in the container it was pressed in — this one is a list,
      // and that one is every one of them.
      const next = showDocument ? null : continueList(state, parse?.definitionLists ?? true);

      if (next) {
        event.preventDefault();
        apply(state, next);
      }

      return;
    }

    if (!(event.metaKey || event.ctrlKey)) {
      return;
    }

    const key = event.key.toLowerCase();
    const table = tableShortcut(event);

    if (table) {
      const change = tableAfter(table);

      if (change) {
        event.preventDefault();
        run(...change);
      }

      return;
    }

    // Before the modifiers are read for anything else, because `Cmd`+`Shift`+`Z`
    // is a redo rather than a shifted shortcut, and `Ctrl`+`Y` is the same thing
    // where Windows put it.
    if (key === 'z') {
      event.preventDefault();
      travel(!event.shiftKey);

      return;
    }

    // Before the shift branch, because `Cmd`+`Shift`+`F` is not a shifted
    // shortcut of anything and should open the same bar.
    if (key === 'f' && (showSource || showDocument)) {
      event.preventDefault();
      openFind();

      return;
    }

    if (key === 's' && !event.shiftKey) {
      // The browser's own `Cmd`+`S` saves the page, which is never what
      // somebody writing in an editor meant by it.
      event.preventDefault();
      save();

      return;
    }

    if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      travel(false);

      return;
    }

    if (event.shiftKey) {
      if (key === 'u' && upload.current) {
        event.preventDefault();
        pickImage();

        return;
      }

      const letter = key.length === 1 && key.toLowerCase() !== key.toUpperCase();
      const shifted = event.altKey
        ? undefined
        : (SHIFTED[key] ?? (letter ? undefined : SHIFTED[event.code]));

      if (shifted) {
        event.preventDefault();
        command(shifted);
      }

      return;
    }

    const depth = Number(key) as MawyHeadingLevel;

    if (headingLevels.includes(depth)) {
      event.preventDefault();
      run(state, toggleHeading(state, depth));

      return;
    }

    const name = SHORTCUTS[key];

    if (name) {
      event.preventDefault();
      command(name);
    }
  };

  /* ---------------------------------------------------------------------
   * The two panes, scrolling together
   * ------------------------------------------------------------------ */

  const queued = React.useRef(0);
  const anchors = React.useRef<{
    places: MawyScrollAnchor[];
    source: number;
    preview: number;
  } | null>(null);

  /**
   * The preview follows the source, at the places the two of them agree on.
   *
   * Which places those are has to be measured, and measuring costs a layout
   * read for every block on the page — so the pairs are kept until something
   * moves. The two scroll heights answer for nearly all of that: an edit, a
   * font, a window, an image that finished loading, all change one of them. An
   * edit that leaves both heights exactly where they were drops the table
   * anyway, from the effect below.
   */
  const syncScroll = React.useCallback(() => {
    if (current !== 'split' || queued.current) {
      return;
    }

    queued.current = requestAnimationFrame(() => {
      queued.current = 0;

      const from = source.current;
      const to = preview.current?.querySelector<HTMLElement>('.mawy-viewer-scroll');

      if (!from || !to) {
        return;
      }

      if (
        !anchors.current ||
        anchors.current.source !== from.scrollHeight ||
        anchors.current.preview !== to.scrollHeight
      ) {
        anchors.current = {
          places: measureAnchors(from, to, text),
          source: from.scrollHeight,
          preview: to.scrollHeight
        };
      }

      const travel = to.scrollHeight - to.clientHeight;
      const { places } = anchors.current;
      // Nothing to line up against — an empty document, or a preview that has
      // not been drawn yet. A fraction of the way through is the honest answer
      // to a question with nothing else in it.
      const wanted = places.length
        ? previewScrollFor(places, from.scrollTop)
        : (from.scrollTop / Math.max(from.scrollHeight - from.clientHeight, 1)) * travel;

      // Instant rather than the stylesheet's `smooth`. The preview is being
      // dragged by the source, and an animation started again on every frame
      // of a scroll is an animation that never arrives.
      to.scrollTo({ top: Math.max(0, Math.min(travel, wanted)), behavior: 'instant' });
    });
  }, [current, text]);

  React.useEffect(() => () => cancelAnimationFrame(queued.current), []);

  /**
   * The document moved under both panes, so what was measured is wrong and the
   * preview has to catch up without waiting for somebody to scroll. `syncScroll`
   * is rebuilt whenever the text or the mode is, which is exactly when this
   * should run.
   */
  React.useLayoutEffect(() => {
    anchors.current = null;
    syncScroll();
  }, [syncScroll]);

  /* ---------------------------------------------------------------------
   * Finding, and replacing
   * ------------------------------------------------------------------ */

  const searched = React.useMemo(
    () => (finding ? findMatches(text, query, matchCase) : []),
    [finding, text, query, matchCase]
  );
  /**
   * What the find bar counts and steps through. On the drawn document, only
   * the matches the page draws as themselves — see `drawnMatches` — so the
   * count is the count a reader can see.
   */
  const matches = React.useMemo(
    () =>
      showDocument && searched.length
        ? drawnMatches(text, searched, {
            gfm: parse?.gfm ?? true,
            breaks: parse?.breaks ?? false,
            definitionLists: parse?.definitionLists ?? true
          })
        : searched,
    [parse?.breaks, parse?.definitionLists, parse?.gfm, searched, showDocument, text]
  );

  /**
   * Which match the caret is sitting on, or the one it is nearest.
   *
   * Read from the caret rather than held in a state of its own, so that
   * clicking somewhere in the document and pressing next goes to the match
   * after where you clicked. A number that walked on its own would go back to
   * wherever the last press left it, which is not where anybody is looking.
   */
  const on = matches.findIndex(
    (match) => match.start <= selection.start && selection.start <= match.end
  );
  const currentMatch = on === -1 ? matchFrom(matches, selection.start, true) : on;

  /** A match, selected on the surface it can be selected on. */
  const goTo = React.useCallback(
    (index: number) => {
      const match = matches[index];
      const element = source.current;

      if (match && showDocument) {
        // The editor's own record of the selection moves and the page's does
        // not, for the reason given below: a selection put inside the drawn
        // document is a focus taken from the find bar. The match is marked,
        // brought into view, and selected on the page when the bar closes.
        const drawnDocument = drawn.current;
        const pane = drawnDocument?.parentElement;
        const box = drawnDocument && rangeFor(drawnDocument, text, match)?.getBoundingClientRect();

        setSelection({ start: match.start, end: match.end });

        if (pane && box) {
          const view = pane.getBoundingClientRect();

          if (box.top < view.top || box.bottom > view.bottom) {
            pane.scrollTop += box.top - view.top - view.height / 3;
          }
        }

        if (!finding) {
          focusDrawn(match.start, match.end);
        }

        return;
      }

      if (!match || !element) {
        return;
      }

      // The selection moves; the focus stays where it is. Somebody stepping
      // through matches is typing in the find bar, and a document that takes
      // the focus back on Enter is a document the next keystroke is typed
      // into — which is how a search turns into an edit nobody asked for.
      // The match is still shown, drawn in the layer under the text, and the
      // selection set here is what the textarea comes back to when the find
      // bar closes and hands it the focus.
      if (!finding) {
        element.focus({ preventScroll: true });
      }

      element.setSelectionRange(match.start, match.end);
      readSelection();
    },
    [finding, focusDrawn, matches, readSelection, showDocument, text]
  );

  const step = React.useCallback(
    (forwards: boolean) => {
      // From the end of the match the caret is on rather than from the caret
      // itself, so pressing next twice does not find the same one twice.
      const from = on === -1 ? selection.start : forwards ? matches[on].end : matches[on].start;

      goTo(matchFrom(matches, from, forwards));
    },
    [goTo, matches, on, selection.start]
  );

  const openFind = React.useCallback(() => {
    const element = source.current;
    const selected = showDocument
      ? text.slice(selection.start, selection.end)
      : element
        ? text.slice(element.selectionStart, element.selectionEnd)
        : '';

    // What is selected is nearly always what somebody is about to look for, and
    // a selection that spans lines is nearly always not.
    if (selected && !selected.includes('\n')) {
      setQuery(selected);
    }

    setFinding(true);
  }, [selection.end, selection.start, showDocument, text]);

  const closeFind = React.useCallback(() => {
    setFinding(false);

    if (showDocument) {
      focusDrawn(selection.start, selection.end);

      return;
    }

    source.current?.focus();
  }, [focusDrawn, selection.end, selection.start, showDocument]);

  /**
   * The matches marked on the drawn document while the find bar is open, and
   * taken away when it closes. After every render, because what the page draws
   * changes under the marks with every keystroke in the find box and every step.
   */
  const painter = React.useRef({});

  React.useLayoutEffect(() => {
    const element = drawn.current;

    if (finding && showDocument && element) {
      paintMatches(painter.current, element, text, matches, currentMatch);
    } else {
      unpaintMatches(painter.current);
    }
  });

  React.useEffect(() => {
    const owner = painter.current;

    return () => unpaintMatches(owner);
  }, []);

  /* ---------------------------------------------------------------------
   * Opening, and saving
   * ------------------------------------------------------------------ */

  /**
   * A file dropped on the editor is an image, never a document.
   *
   * Replacing a document somebody has been writing because a file landed on it
   * is how work is lost. Opening is a button, which is a thing done on purpose
   * — and a drop that is not an image is refused rather than left to the
   * browser, which would open it as a page and take the document with it. See
   * `carriesFile` above.
   */
  const openFile = React.useCallback(() => picker.current?.click(), []);

  const read = React.useCallback(
    async (file: File) => {
      const answer = await readTextFile(file);

      if ('failed' in answer) {
        setNote({
          text: answer.failed === 'tooLarge' ? strings.fileTooLarge : strings.readFailed,
          failed: true
        });

        return;
      }

      setNote(null);
      setFileName(file.name);
      write(answer.text);
    },
    [strings, write]
  );

  const save = React.useCallback(() => {
    const name = fileName ?? fileNameFor(text);

    if (onSave) {
      onSave(text, name);

      return;
    }

    saveTextFile(text, name);
    setNote({ text: fill(strings.saved, { N: name }), failed: false });
  }, [fileName, onSave, strings, text]);

  /* ---------------------------------------------------------------------
   * Drawing
   * ------------------------------------------------------------------ */

  /**
   * Where a floating bar hangs from.
   *
   * The status line is the bottom edge of the editor and does not move, so a
   * bar hung from the bottom of the *editor* would cover it. Hung from the
   * body instead it sits over the last line of the document, which is where a
   * bar over the document belongs — and the count of words goes on being
   * readable under it. A box hangs from nothing and stays a sibling.
   */
  const inside = frame === 'floating';

  /**
   * The toolbar and the find bar, which travel together.
   *
   * One group rather than two siblings: both move to the other end under
   * `toolbarPlacement="bottom"`, and both come out of the column to hover
   * over the document under `frame="floating"`. The status line is not in
   * here and does not move — it is the bottom edge of the editor either way,
   * and a count of words is not a control.
   */
  const bars = [
    items.length ? (
      <React.Fragment key="toolbar">
        <MawyEditorToolbar
          items={items}
          strings={strings}
          mode={current}
          modes={modes}
          onModeChange={setMode}
          colorScheme={scheme}
          onColorSchemeChange={setScheme}
          onCommand={command}
          active={(name) =>
            marks && wraps(name)
              ? marks.has(name) !== holds.includes(name)
              : commandActive(name, { value: text, ...selection })
          }
          headingLevels={headingLevels}
          headingActive={(depth) => headingActive({ value: text, ...selection }, depth)}
          onHeading={(depth) => {
            const before = readOnly ? null : stateNow();

            if (before) {
              run(before, toggleHeading(before, depth));
            }
          }}
          editable={editable}
          inTable={caretInTable}
          onFind={showSource || showDocument ? openFind : undefined}
          finding={finding && (showSource || showDocument)}
          onOpen={readOnly ? undefined : openFile}
          onPickImage={onUploadImage ? pickImage : undefined}
          onInsertTable={insertTableSized}
          onUndo={canUndo ? () => travel(true) : undefined}
          onRedo={canRedo ? () => travel(false) : undefined}
          tableInsertable={() => tableAfter('insertTable') !== null}
          onSave={save}
        />
      </React.Fragment>
    ) : null,
    finding && (showSource || showDocument) ? (
      <React.Fragment key="find">
        <FindBar
          query={query}
          onQueryChange={setQuery}
          replacement={replacement}
          onReplacementChange={setReplacement}
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          total={matches.length}
          current={currentMatch}
          onStep={step}
          onReplace={() => {
            const match = matches[currentMatch];

            if (!match) {
              return;
            }

            const next = replaceMatch(text, match, replacement);

            // Written without a selection put on the page, which on the drawn
            // document would take the focus from the replacement being typed.
            if (showDocument) {
              setRoom(null);
              setSelection({ start: match.start, end: next.caret });
              write(next.value);

              return;
            }

            apply(
              { value: text, ...selection },
              {
                value: next.value,
                start: match.start,
                end: next.caret
              }
            );
          }}
          onReplaceAll={() => {
            // On the drawn document, the matches it counted and nothing hidden
            // in an address or a marker besides.
            if (showDocument) {
              let out = '';
              let at = 0;

              for (const match of matches) {
                out += text.slice(at, match.start) + replacement;
                at = match.end;
              }

              if (matches.length) {
                setRoom(null);
                setSelection({ start: selection.start, end: selection.start });
                write(out + text.slice(at));
              }

              return;
            }

            const next = replaceAll(text, query, replacement, matchCase);

            if (next.count) {
              apply(
                { value: text, ...selection },
                {
                  value: next.value,
                  start: selection.start,
                  end: selection.start
                }
              );
            }
          }}
          onClose={closeFind}
          editable={editable}
          strings={strings}
        />
      </React.Fragment>
    ) : null
  ].filter(Boolean);
  const chrome = bars.length ? (
    <div className="mawy-chrome">{toolbarPlacement === 'bottom' ? [...bars].reverse() : bars}</div>
  ) : null;

  return (
    <div
      {...rest}
      ref={ref}
      className={['mawy-root', 'mawy-editor', className].filter(Boolean).join(' ')}
      data-mawy-color-scheme={scheme}
      data-mawy-frame={frame}
      data-mawy-toolbar={toolbarPlacement}
      data-mawy-mode={current}
      data-mawy-dragging={dragging ? 'true' : undefined}
      data-mawy-tips={tips.off ? 'off' : undefined}
      {...tips.props}
      {...dragProps}
      onFocus={() => setFocused(true)}
      // `relatedTarget` is where the focus went. Inside, and it never left —
      // which is the whole of the difference between this and a blur, and what
      // keeps a toolbar press from counting as putting the editor down.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      {!inside && toolbarPlacement === 'top' ? chrome : null}

      <div
        className="mawy-editor-body"
        ref={body}
        style={splitting ? ({ '--mawy-split': share } as React.CSSProperties) : undefined}
        data-mawy-split={splitting || undefined}
      >
        {inside && toolbarPlacement === 'top' ? chrome : null}
        {showSource ? (
          <div className="mawy-editor-pane" ref={sourcePane}>
            <MawyEditorSource
              ref={source}
              value={text}
              onChange={write}
              onSelect={readSelection}
              onKeyDown={onKeyDown}
              onScroll={syncScroll}
              onPaste={onPaste}
              gfm={parse?.gfm ?? true}
              lineNumbers={lineNumbers}
              matches={matches}
              currentMatch={currentMatch}
              readOnly={readOnly}
              label={strings.source}
              escapeHint={strings.sourceEscape}
              placeholder={placeholder ?? strings.editorPlaceholder}
            />
            {tableTools}
          </div>
        ) : null}

        {showDocument ? (
          <div
            className="mawy-editor-pane"
            ref={documentPane}
            data-mawy-cells={(cellsSelected && cellsAt !== null) || undefined}
          >
            <MawyEditorDocument
              ref={drawn}
              value={text}
              highlight={highlight}
              onEdit={applyEdit}
              onSelect={readDrawnSelection}
              selection={selection}
              focused={focused}
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              label={strings.document}
              placeholder={placeholder ?? strings.editorPlaceholder}
              parse={parse}
              html={html}
              linkTarget={linkTarget}
              linkRel={linkRel}
              links={links}
              images={images}
              directives={directives}
              image={image}
              resolveUrl={resolveUrl}
              anchorPrefix={anchorPrefix}
              headingBase={headingBase}
              strings={strings}
              room={room}
              aim={aim}
              held={holds}
              nested={nests}
              onImages={onUploadImage ? addImages : undefined}
              onTarget={readTarget}
            />
            {cellsSelected && cellsAt ? (
              // The cells, marked as cells: a selection that runs across a
              // table is drawn by the browser as the text it covers, a ragged
              // shape nobody reads as the rectangle of cells it acts on.
              <div className="mawy-table-cells" aria-hidden="true" style={cellsAt} />
            ) : null}
            {tableTools}
            {blockTools}
          </div>
        ) : null}

        {splitting ? (
          <div
            className="mawy-editor-divider"
            role="separator"
            aria-orientation="vertical"
            aria-label={strings.divider}
            aria-valuenow={Math.round(share * 100)}
            aria-valuemin={Math.round(SPLIT_LEAST * 100)}
            aria-valuemax={Math.round(SPLIT_MOST * 100)}
            tabIndex={0}
            onPointerDown={onDividerDown}
            onKeyDown={onDividerKey}
            onDoubleClick={() => setShare(0.5)}
          />
        ) : null}

        {showPreview ? (
          <div className="mawy-editor-pane mawy-editor-preview" ref={preview}>
            <MawyViewer
              value={text}
              toolbar={false}
              // The drop is the editor's, whichever pane it lands in — one
              // answer for the whole component rather than two that have to
              // agree. What the preview is given is the *picker*: with a
              // callback to hand a file to, its empty state stops being a
              // notice that there is nothing here and becomes the place to
              // bring one, which is what an empty editor is for.
              fileDrop={false}
              onValueChange={
                fileDrop && !readOnly
                  ? (next, file) => {
                      setNote(null);
                      setFileName(file?.name ?? null);
                      write(next);
                    }
                  : undefined
              }
              parse={parse}
              html={html}
              linkTarget={linkTarget}
              linkRel={linkRel}
              links={links}
              images={images}
              highlight={highlight}
              directives={directives}
              image={image}
              resolveUrl={resolveUrl}
              anchorPrefix={anchorPrefix}
              headingBase={headingBase}
              fonts={fonts}
              locale={locale}
              strings={overrides}
              colorScheme={scheme}
              typography={typography}
              defaultTypography={defaultTypography}
            />
          </div>
        ) : null}

        {inside && toolbarPlacement === 'bottom' ? chrome : null}
      </div>

      {!inside && toolbarPlacement === 'bottom' ? chrome : null}

      {note ? (
        // `status` rather than `alert`: an upload finishing is not an
        // interruption, and a screen reader is told at the next pause either
        // way. The failure keeps the line until the next attempt, the way the
        // viewer keeps a file it could not read.
        <p
          className="mawy-editor-note"
          role="status"
          lang={strings.lang}
          data-mawy-failed={note.failed || undefined}
        >
          {note.text}
        </p>
      ) : null}

      <FilePicker ref={picker} accept={accept} onFile={(file) => void read(file)} />
      {onUploadImage ? (
        <FilePicker ref={imagePicker} accept="image/*" multiple onFiles={onImagesPicked} />
      ) : null}

      {/* Whatever the mode. `preview` has no caret, so the position and the
          selection report the one the source surface was left with — which is
          the one it will have again when the reader switches back. Hiding the
          whole line there meant the count of words came and went with a view
          of the same document, and the Flutter package never did that. */}
      {statusItems.length ? (
        <MawyEditorStatus
          value={text}
          selection={selection}
          items={statusItems}
          strings={strings}
          locale={locale}
        />
      ) : null}

      {dragging ? (
        <div className="mawy-drop-veil" aria-hidden="true">
          <span>{strings.dropImage}</span>
        </div>
      ) : null}
    </div>
  );
});
