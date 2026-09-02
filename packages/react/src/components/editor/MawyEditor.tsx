'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyDirectives,
  MawyEditorStatusOption,
  MawyEditorToolbarItem,
  MawyEditorToolbarOption,
  MawyEditorStatusItem,
  MawyFont,
  MawyHighlight,
  MawyHtmlPolicy,
  MawyLinkTarget,
  MawyImageUpload,
  MawyLocale,
  MawyMode,
  MawyParseOptions,
  MawyTypography
} from '../../types.js';
import { MAWY_SYSTEM_FONTS } from '../../fonts.js';
import { useControlled } from '../../internal/controlled.js';
import { stringsFor } from '../../internal/i18n.js';
import {
  commandActive,
  continueList,
  indent,
  runCommand,
  type EditState,
  type MawyCommand
} from '../../internal/commands.js';
import type { MawyAim, MawyEdit } from '../../internal/editing.js';
import { imageFilesIn, markdownForImage, pastedImagesIn } from '../../internal/images.js';
import { markdownFromHtml } from '../../internal/markdown/paste.js';
import {
  difference,
  emptyHistory,
  record,
  redo,
  undo,
  type MawyStep
} from '../../internal/history.js';
import { caretFromPoint, domAt, sourceAt } from '../../internal/position.js';
import { measureAnchors, previewScrollFor, type MawyScrollAnchor } from '../../internal/scroll.js';
import { MawyViewer } from '../viewer/index.js';
import { DEFAULT_EDITOR_TOOLBAR, MawyEditorToolbar } from './MawyEditorToolbar.js';
import { MawyEditorFind } from './MawyEditorFind.js';
import { findMatches, matchFrom, replaceAll, replaceMatch } from '../../internal/search.js';
import { MAWY_ACCEPT, fileNameFor, readTextFile, saveTextFile } from '../../internal/files.js';
import { DEFAULT_STATUS, MawyEditorStatus } from './MawyEditorStatus.js';
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
  '1': 'heading1',
  '2': 'heading2',
  '3': 'heading3',
  '0': 'paragraph'
};

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
   * arrives as the URL it already had, upload or no upload — and nothing here
   * touches the toolbar's image button, which writes `![](url)` for you to fill
   * in.
   */
  onUploadImage?: MawyImageUpload;

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
   * What colours a fenced code block in the preview. The drawn document is not
   * coloured and will not be: an editing surface where the caret has to find
   * its way back into the source is not the place for a second opinion about
   * what the characters are.
   */
  highlight?: MawyHighlight;
  /**
   * What draws the directives this package does not know about, in the preview
   * and in the drawn document alike. A name that is not here is drawn as the
   * characters it was written with — which in the drawn document is also what
   * makes it editable, since those characters are the source, one for one.
   */
  directives?: MawyDirectives;
  fonts?: readonly MawyFont[];
  typography?: Partial<MawyTypography>;
  defaultTypography?: Partial<MawyTypography>;

  colorScheme?: MawyColorScheme;
  defaultColorScheme?: MawyColorScheme;
  onColorSchemeChange?: (colorScheme: MawyColorScheme) => void;

  /** @default 'en' */
  locale?: MawyLocale;
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
    parse,
    html = 'escape',
    linkTarget = 'blank',
    highlight,
    directives,
    onSave,
    accept = MAWY_ACCEPT,
    fonts = MAWY_SYSTEM_FONTS,
    typography,
    defaultTypography,
    colorScheme,
    defaultColorScheme,
    onColorSchemeChange,
    locale = 'en',
    className,
    ...rest
  },
  ref
) {
  const strings = stringsFor(locale);

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
  /** How many drops or pastes are still uploading, so one note covers them all. */
  const running = React.useRef(0);
  /** Enters and leaves counted, rather than trusted one at a time. */
  const depth = React.useRef(0);
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
  const [dragging, setDragging] = React.useState(false);
  /** What the editor is saying about an upload, under the document. */
  const [note, setNote] = React.useState<{ text: string; failed: boolean } | null>(null);

  React.useEffect(() => {
    notify.current = onChange;
    upload.current = onUploadImage;
    drew.current = { value: text, ...selection };
  });

  const write = React.useCallback(
    (next: string) => {
      // Everything that changes the document comes through here, which is what
      // lets one history cover both surfaces — and what stops it covering its
      // own footsteps while it is putting a step back.
      if (!restoring.current) {
        record(history.current, drew.current, next, Date.now());
      }

      if (!controlled) {
        setHeld(next);
      }

      notify.current?.(next);
    },
    [controlled]
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

    // The pointer is captured so the drag survives leaving the bar, which it
    // does immediately: the bar is five pixels wide and a hand is not that
    // steady.
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();

    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';

    const move = (at: PointerEvent) => {
      const along = rtl ? box.right - at.clientX : at.clientX - box.left;

      setShare(clamp(along / box.width));
    };

    const up = () => {
      event.currentTarget.removeEventListener('pointermove', move);
      event.currentTarget.removeEventListener('pointerup', up);
      event.currentTarget.removeEventListener('pointercancel', up);
    };

    event.currentTarget.addEventListener('pointermove', move);
    event.currentTarget.addEventListener('pointerup', up);
    event.currentTarget.addEventListener('pointercancel', up);
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
      write(edit.value);
    },
    [write]
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
      write(after.value);
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
    },
    [readOnly, stateNow, write]
  );

  const command = React.useCallback(
    (name: MawyCommand) => {
      const before = readOnly ? null : stateNow();

      if (before) {
        run(before, runCommand(name, before));
      }
    },
    [readOnly, run, stateNow]
  );

  /* ---------------------------------------------------------------------
   * Putting an image in
   * ------------------------------------------------------------------ */

  /**
   * The document with something written into it at a place that was decided
   * earlier — where a file was dropped, or where the caret was when it was
   * pasted. An upload finishes several renders after it began, so the offset is
   * clamped to whatever the document has become in the meantime rather than
   * trusted.
   */
  const insertAt = React.useCallback(
    (offset: number, markdown: string) => {
      const value = drew.current.value;
      const at = Math.max(0, Math.min(offset, value.length));

      run(
        { value, start: at, end: at },
        {
          value: value.slice(0, at) + markdown + value.slice(at),
          start: at + markdown.length,
          end: at + markdown.length
        }
      );
    },
    [run]
  );

  /**
   * Files put into the document as images, one upload at a time.
   *
   * One edit at the end rather than one per file: it is one thing the writer
   * did, so it is one step to take back — and an offset that has to survive
   * several awaits is an offset that goes wrong the moment anything else is
   * typed.
   */
  const addImages = React.useCallback(
    async (files: readonly File[], at: number) => {
      const hook = upload.current;

      if (!hook || readOnly || !files.length) {
        return;
      }

      running.current += 1;
      setNote({ text: strings.uploading, failed: false });

      const written: string[] = [];
      let failed = false;

      for (const file of files) {
        try {
          const source = await hook(file);

          if (source) {
            written.push(markdownForImage(source, file));
          } else {
            // Nothing back is how an upload says no without saying why.
            failed = true;
          }
        } catch {
          failed = true;
        }
      }

      running.current -= 1;

      if (written.length) {
        insertAt(at, written.join('\n\n'));
      }

      if (failed) {
        setNote({ text: strings.uploadFailed, failed: true });
      } else if (running.current === 0) {
        setNote(null);
      }
    },
    [insertAt, readOnly, strings]
  );

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
  const carriesFile = (event: React.DragEvent) => [...event.dataTransfer.types].includes('Files');

  const takesImage = () => Boolean(upload.current) && editable;

  const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!carriesFile(event)) {
      return;
    }

    event.preventDefault();
    depth.current += 1;

    // The veil says "drop to add", so it is only shown where that is true.
    if (takesImage()) {
      setDragging(true);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!carriesFile(event)) {
      return;
    }

    // Without this the browser opens the file itself, replacing the page.
    event.preventDefault();
    event.dataTransfer.dropEffect = takesImage() ? 'copy' : 'none';
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
    if (!carriesFile(event)) {
      return;
    }

    event.preventDefault();
    depth.current = 0;
    setDragging(false);

    const files = takesImage() ? imageFilesIn(event.dataTransfer) : [];

    if (!files.length) {
      // Said rather than ignored: somebody who drops a document on an editor
      // is asking for something, and there is a control that does it.
      setNote({ text: strings.dropNotDocument, failed: true });

      return;
    }

    void addImages(files, dropPoint(event));
  };

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
        event.preventDefault();
        void addImages(images, state.start);

        return;
      }

      const markdown = markdownFromHtml(event.clipboardData.getData('text/html'));

      if (!markdown) {
        return;
      }

      event.preventDefault();
      run(state, {
        value: state.value.slice(0, state.start) + markdown + state.value.slice(state.end),
        start: state.start + markdown.length,
        end: state.start + markdown.length
      });
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
      if (wasLeaving || showDocument) {
        return;
      }

      event.preventDefault();
      apply(state, indent(state, event.shiftKey));

      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      // Carrying a list marker down is a thing done to a line of Markdown. In
      // the drawn document `Enter` is an `insertParagraph`, which the surface
      // answers for in the container it was pressed in — this one is a list,
      // and that one is every one of them.
      const next = showDocument ? null : continueList(state);

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
    if (key === 'f' && showSource) {
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
      if (key === 'x') {
        event.preventDefault();
        run(state, runCommand('strikethrough', state));
      }

      return;
    }

    const name = SHORTCUTS[key];

    if (name) {
      event.preventDefault();
      run(state, runCommand(name, state));
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

  const matches = React.useMemo(
    () => (finding ? findMatches(text, query, matchCase) : []),
    [finding, text, query, matchCase]
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

      if (!match) {
        return;
      }

      if (element) {
        element.focus({ preventScroll: true });
        element.setSelectionRange(match.start, match.end);
        readSelection();
      }
    },
    [matches, readSelection]
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
    const selected = element ? text.slice(element.selectionStart, element.selectionEnd) : '';

    // What is selected is nearly always what somebody is about to look for, and
    // a selection that spans lines is nearly always not.
    if (selected && !selected.includes('\n')) {
      setQuery(selected);
    }

    setFinding(true);
  }, [text]);

  const closeFind = React.useCallback(() => {
    setFinding(false);
    source.current?.focus();
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
    setNote({ text: strings.saved.replace('%N', name), failed: false });
  }, [fileName, onSave, strings, text]);

  /* ---------------------------------------------------------------------
   * Drawing
   * ------------------------------------------------------------------ */

  return (
    <div
      {...rest}
      ref={ref}
      className={['mawy-root', 'mawy-editor', className].filter(Boolean).join(' ')}
      data-mawy-color-scheme={scheme}
      data-mawy-mode={current}
      data-mawy-dragging={dragging ? 'true' : undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
      {items.length ? (
        <MawyEditorToolbar
          items={items}
          strings={strings}
          mode={current}
          modes={modes}
          onModeChange={setMode}
          colorScheme={scheme}
          onColorSchemeChange={setScheme}
          onCommand={command}
          active={(name) => commandActive(name, { value: text, ...selection })}
          editable={editable}
          onFind={showSource ? openFind : undefined}
          finding={finding && showSource}
          onOpen={readOnly ? undefined : openFile}
          onSave={save}
        />
      ) : null}

      {finding && showSource ? (
        <MawyEditorFind
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
      ) : null}

      <div
        className="mawy-editor-body"
        ref={body}
        style={splitting ? ({ '--mawy-split': share } as React.CSSProperties) : undefined}
        data-mawy-split={splitting || undefined}
      >
        {showSource ? (
          <div className="mawy-editor-pane">
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
              readOnly={readOnly}
              label={strings.source}
              escapeHint={strings.sourceEscape}
              placeholder={placeholder ?? strings.editorPlaceholder}
            />
          </div>
        ) : null}

        {showDocument ? (
          <div className="mawy-editor-pane">
            <MawyEditorDocument
              ref={drawn}
              value={text}
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
              directives={directives}
              strings={strings}
              room={room}
              aim={aim}
              onImages={onUploadImage ? addImages : undefined}
            />
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
              fileDrop={false}
              parse={parse}
              html={html}
              linkTarget={linkTarget}
              highlight={highlight}
              directives={directives}
              fonts={fonts}
              locale={locale}
              colorScheme={scheme}
              typography={typography}
              defaultTypography={defaultTypography}
            />
          </div>
        ) : null}
      </div>

      {note ? (
        // `status` rather than `alert`: an upload finishing is not an
        // interruption, and a screen reader is told at the next pause either
        // way. The failure keeps the line until the next attempt, the way the
        // viewer keeps a file it could not read.
        <p className="mawy-editor-note" role="status" data-mawy-failed={note.failed || undefined}>
          {note.text}
        </p>
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

      {statusItems.length && (showSource || showDocument) ? (
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
