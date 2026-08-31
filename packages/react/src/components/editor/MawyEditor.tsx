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
import { MawyViewer } from '../viewer/index.js';
import { DEFAULT_EDITOR_TOOLBAR, MawyEditorToolbar } from './MawyEditorToolbar.js';
import { DEFAULT_STATUS, MawyEditorStatus } from './MawyEditorStatus.js';
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
   * Which surface the document is on. `wysiwyg` is not built yet and falls
   * back to `plain`.
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
 * unchanged goes out unchanged. Today that is the source surface and the
 * preview; `wysiwyg` is the one still to be built.
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
  const preview = React.useRef<HTMLDivElement>(null);
  const pending = React.useRef<[number, number] | null>(null);

  const notify = React.useRef(onChange);

  React.useEffect(() => {
    notify.current = onChange;
  });

  const write = React.useCallback(
    (next: string) => {
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

  // `wysiwyg` is on the list of modes but has nothing behind it yet, so it
  // shows the source rather than an empty pane.
  const showSource = current !== 'preview';
  const showPreview = current === 'preview' || current === 'split';
  const editable = showSource && !readOnly;

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

  React.useLayoutEffect(() => {
    if (pending.current && source.current) {
      source.current.setSelectionRange(pending.current[0], pending.current[1]);
      pending.current = null;
      readSelection();
    }
  });

  /* ---------------------------------------------------------------------
   * Running a command
   * ------------------------------------------------------------------ */

  /**
   * The edit goes in through `execCommand`, which is deprecated and is still
   * the only way to change a textarea's value and have the change land on the
   * browser's own undo stack. Writing `value` through React instead works and
   * quietly breaks Cmd+Z, which for a text editor is not a small loss — it is
   * most of what the textarea was chosen for.
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

      // The smallest run that actually differs, so the undo stack gets one
      // entry about the thing that changed rather than one about the file.
      const a = before.value;
      const b = after.value;
      let head = 0;

      while (head < a.length && head < b.length && a[head] === b[head]) {
        head += 1;
      }

      let tail = 0;

      while (
        tail < a.length - head &&
        tail < b.length - head &&
        a[a.length - 1 - tail] === b[b.length - 1 - tail]
      ) {
        tail += 1;
      }

      const inserted = b.slice(head, b.length - tail);

      element.focus();
      element.setSelectionRange(head, a.length - tail);

      let done: boolean;

      try {
        done = inserted
          ? document.execCommand('insertText', false, inserted)
          : document.execCommand('delete');
      } catch {
        // Refused, or gone: some day it will be, and the fallback is the plain
        // controlled write. It costs the undo stack, not the edit.
        done = false;
      }

      if (!done) {
        write(b);
      }

      pending.current = [after.start, after.end];
    },
    [readSelection, write]
  );

  const command = React.useCallback(
    (name: MawyCommand) => {
      const element = source.current;

      if (!element || readOnly) {
        return;
      }

      const before: EditState = {
        value: text,
        start: element.selectionStart,
        end: element.selectionEnd
      };

      apply(before, runCommand(name, before));
    },
    [apply, readOnly, text]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.defaultPrevented || readOnly) {
      return;
    }

    const element = event.currentTarget;
    const state: EditState = {
      value: text,
      start: element.selectionStart,
      end: element.selectionEnd
    };

    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      const next = continueList(state);

      if (next) {
        event.preventDefault();
        apply(state, next);
      }

      return;
    }

    if (!(event.metaKey || event.ctrlKey)) {
      return;
    }

    if (event.shiftKey) {
      if (event.key.toLowerCase() === 'x') {
        event.preventDefault();
        apply(state, runCommand('strikethrough', state));
      }

      return;
    }

    const name = SHORTCUTS[event.key.toLowerCase()];

    if (name) {
      event.preventDefault();
      apply(state, runCommand(name, state));
    }
  };

  /* ---------------------------------------------------------------------
   * The two panes, scrolling together
   * ------------------------------------------------------------------ */

  const queued = React.useRef(0);

  /**
   * Proportional, not line for line.
   *
   * Matching a source line to the block it became needs the parser to remember
   * where every node came from, which it does not yet. Proportional is what
   * the difference looks like from the outside: near enough for a long
   * document, visibly approximate for a short one.
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

      const travel = from.scrollHeight - from.clientHeight;

      if (travel > 0) {
        to.scrollTop = (from.scrollTop / travel) * (to.scrollHeight - to.clientHeight);
      }
    });
  }, [current]);

  React.useEffect(() => () => cancelAnimationFrame(queued.current), []);

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
          <div className="mawy-editor-pane" onScroll={syncScroll}>
            <MawyEditorSource
              ref={source}
              value={text}
              onChange={write}
              onSelect={readSelection}
              onKeyDown={onKeyDown}
              gfm={parse?.gfm ?? true}
              lineNumbers={lineNumbers}
              readOnly={readOnly}
              label={strings.source}
              placeholder={placeholder ?? strings.editorPlaceholder}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div className="mawy-editor-pane mawy-editor-preview" ref={preview}>
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

      {statusItems.length && showSource ? (
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
