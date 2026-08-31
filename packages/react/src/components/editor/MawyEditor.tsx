'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyEditorStatusOption,
  MawyEditorToolbarItem,
  MawyEditorToolbarOption,
  MawyEditorStatusItem,
  MawyFont,
  MawyHtmlPolicy,
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
  runCommand,
  type EditState,
  type MawyCommand
} from '../../internal/commands.js';
import type { MawyEdit } from '../../internal/editing.js';
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
import { DEFAULT_STATUS, MawyEditorStatus } from './MawyEditorStatus.js';
import { MawyEditorDocument } from './MawyEditorDocument.js';
import { MawyEditorSource } from './MawyEditorSource.js';

/** What the editor offers until an application says otherwise. */
const DEFAULT_MODES: readonly MawyMode[] = ['plain', 'split', 'preview'];

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
   * Which surface the document is on. `wysiwyg` is not on the default list of
   * them — an application asks for it by name while it is this new.
   * @default the first of `modes`
   */
  mode?: MawyMode;
  defaultMode?: MawyMode;
  onModeChange?: (mode: MawyMode) => void;
  /**
   * The surfaces the toolbar offers. Give it one and the switch disappears,
   * which is how an editor that is only ever a source editor is built.
   * @default ['plain', 'split', 'preview']
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

  /* The preview's half of the props, passed straight through to the viewer. */
  parse?: MawyParseOptions;
  html?: MawyHtmlPolicy;
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
    parse,
    html = 'escape',
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
  const source = React.useRef<HTMLTextAreaElement>(null);
  const drawn = React.useRef<HTMLElement>(null);
  const preview = React.useRef<HTMLDivElement>(null);
  const pending = React.useRef<[number, number] | null>(null);
  /** Where an empty paragraph is being drawn, because the caret is in it. */
  const [room, setRoom] = React.useState<number | null>(null);

  const notify = React.useRef(onChange);
  const history = React.useRef(emptyHistory());
  const restoring = React.useRef(false);
  /** The document and the caret as they were drawn, which is what undo stores. */
  const drew = React.useRef<MawyStep>({ value: text, start: 0, end: 0 });

  React.useEffect(() => {
    notify.current = onChange;
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
      const markdown = state ? markdownFromHtml(event.clipboardData.getData('text/html')) : '';

      if (!state || !markdown) {
        return;
      }

      event.preventDefault();
      run(state, {
        value: state.value.slice(0, state.start) + markdown + state.value.slice(state.end),
        start: state.start + markdown.length,
        end: state.start + markdown.length
      });
    },
    [readOnly, run, stateNow]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || readOnly) {
      return;
    }

    const state = stateNow();

    if (!state) {
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
   * Clicking the preview
   * ------------------------------------------------------------------ */

  /**
   * A click in the preview puts the caret on the same word in the source.
   *
   * It is the other direction of the question the scrolling asks, and the one
   * the surface that edits the drawn document will be built on: a place on the
   * page, read back as a place in the document. Nothing is scrolled on purpose
   * — in `split` the two panes are already lined up, so a word the preview is
   * showing is a word the source is showing, and the browser's own nudge to
   * bring the caret into view is as far as either pane needs to move.
   */
  const jumpToSource = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const input = source.current;
      const scroller = event.currentTarget.querySelector<HTMLElement>('.mawy-viewer-scroll');

      if (!input || !scroller || !showSource) {
        return;
      }

      // A link is a link, a checkbox is a checkbox, and a code block's copy
      // button is already doing something with the click.
      if ((event.target as HTMLElement).closest('a, button, input, label, select, textarea')) {
        return;
      }

      const selection = window.getSelection();

      // Text was being selected to copy, not a place being asked for.
      if (selection && !selection.isCollapsed) {
        return;
      }

      const point = caretFromPoint(event.clientX, event.clientY);
      const at = point && sourceAt(scroller, point.node, point.offset, text);

      if (at === null || at === undefined) {
        return;
      }

      input.focus({ preventScroll: true });
      input.setSelectionRange(at, at);
      readSelection();
    },
    [showSource, text, readSelection]
  );

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
        />
      ) : null}

      <div className="mawy-editor-body">
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
              onKeyDown={onKeyDown}
              readOnly={readOnly}
              label={strings.document}
              placeholder={placeholder ?? strings.editorPlaceholder}
              parse={parse}
              html={html}
              strings={strings}
              room={room}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div
            className="mawy-editor-pane mawy-editor-preview"
            ref={preview}
            onClick={jumpToSource}
          >
            <MawyViewer
              value={text}
              toolbar={false}
              fileDrop={false}
              parse={parse}
              html={html}
              fonts={fonts}
              locale={locale}
              colorScheme={scheme}
              typography={typography}
              defaultTypography={defaultTypography}
            />
          </div>
        ) : null}
      </div>

      {statusItems.length && (showSource || showDocument) ? (
        <MawyEditorStatus
          value={text}
          selection={selection}
          items={statusItems}
          strings={strings}
          locale={locale}
        />
      ) : null}
    </div>
  );
});
