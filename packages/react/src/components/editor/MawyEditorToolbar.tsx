'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyEditorToolbarItem,
  MawyHeadingLevel,
  MawyMode
} from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';
import { blockCommand, type MawyCommand } from '../../internal/commands.js';
import { Actions, Choice, IconButton, Menu } from '../../internal/controls.js';
import { TableSizeGrid } from '../../internal/table.js';
import { tabStops, useRoving } from '../../internal/roving.js';
import {
  BoldIcon,
  BulletListIcon,
  CodeBlockIcon,
  CodeIcon,
  DarkIcon,
  FindIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LightIcon,
  LinkIcon,
  MoreIcon,
  OpenFileIcon,
  OrderedListIcon,
  UploadIcon,
  ParagraphIcon,
  PreviewIcon,
  QuoteIcon,
  RuleIcon,
  SaveIcon,
  SourceIcon,
  SplitIcon,
  StrikethroughIcon,
  SystemThemeIcon,
  TableIcon,
  RedoIcon,
  UndoIcon,
  TaskListIcon,
  WysiwygIcon
} from '../../internal/icons.js';

export interface MawyEditorToolbarProps {
  items: readonly MawyEditorToolbarItem[];
  strings: MawyStrings;
  mode: MawyMode;
  modes: readonly MawyMode[];
  onModeChange: (mode: MawyMode) => void;
  colorScheme: MawyColorScheme;
  onColorSchemeChange: (colorScheme: MawyColorScheme) => void;
  onCommand: (command: MawyCommand) => void;
  /** Whether the selection is already what a command would make it. */
  active: (command: MawyCommand) => boolean;
  /** Which heading levels the `heading` menu offers, in order. */
  headingLevels: readonly MawyHeadingLevel[];
  /** A heading of this depth over the selection, or off it; `0` is body text. */
  onHeading: (depth: MawyHeadingLevel | 0) => void;
  /** Whether the selection is already a heading of this depth. */
  headingActive: (depth: MawyHeadingLevel) => boolean;
  /** Off in the modes that have nothing to format. */
  editable: boolean;
  /**
   * Whether the caret is in a table, where the commands that make a block have
   * nothing to make. See `BLOCK_COMMANDS`.
   */
  inTable?: boolean;
  /** Opens the find bar. Absent in the modes that have no source to search. */
  onFind?: () => void;
  finding: boolean;
  /** Absent while the document cannot be replaced. */
  onOpen?: () => void;
  /**
   * Chooses an image file to upload. Present only where the application has
   * said where an image goes, and then `image` is a menu of that and the link.
   */
  onPickImage?: () => void;
  /** A step back through the history. Absent when there is none to take. */
  onUndo?: () => void;
  /** A step forward again. Absent when there is none to put back. */
  onRedo?: () => void;
  /** Inserts an empty table of this many columns and rows, the header among them. */
  onInsertTable: (columns: number, rows: number) => void;
  /** Whether a table can go where the caret is. Asked when the menu opens. */
  tableInsertable: () => boolean;
  onSave: () => void;
}

const HEADING_ICONS: Record<MawyHeadingLevel, typeof SourceIcon> = {
  1: Heading1Icon,
  2: Heading2Icon,
  3: Heading3Icon,
  4: Heading4Icon,
  5: Heading5Icon,
  6: Heading6Icon
};

const MODE_ICONS: Record<MawyMode, typeof SourceIcon> = {
  wysiwyg: WysiwygIcon,
  plain: SourceIcon,
  preview: PreviewIcon,
  split: SplitIcon
};

const MODE_LABELS: Record<MawyMode, keyof MawyStrings> = {
  wysiwyg: 'modeWysiwyg',
  plain: 'modePlain',
  preview: 'modePreview',
  split: 'modeSplit'
};

/** The command each formatting button runs, and the glyph it runs under. */
const COMMANDS: Partial<
  Record<
    MawyEditorToolbarItem,
    { command: MawyCommand; icon: typeof BoldIcon; label: keyof MawyStrings }
  >
> = {
  bold: { command: 'bold', icon: BoldIcon, label: 'bold' },
  italic: { command: 'italic', icon: ItalicIcon, label: 'italic' },
  strikethrough: { command: 'strikethrough', icon: StrikethroughIcon, label: 'strikethrough' },
  code: { command: 'code', icon: CodeIcon, label: 'codeSpan' },
  link: { command: 'link', icon: LinkIcon, label: 'link' },
  image: { command: 'image', icon: ImageIcon, label: 'image' },
  quote: { command: 'quote', icon: QuoteIcon, label: 'quote' },
  bulletList: { command: 'bulletList', icon: BulletListIcon, label: 'bulletList' },
  orderedList: { command: 'orderedList', icon: OrderedListIcon, label: 'orderedList' },
  taskList: { command: 'taskList', icon: TaskListIcon, label: 'taskList' },
  codeBlock: { command: 'codeBlock', icon: CodeBlockIcon, label: 'codeBlock' },
  rule: { command: 'rule', icon: RuleIcon, label: 'thematicBreak' }
};

/**
 * How many of a toolbar's groups fit across it, and what to do with the rest.
 *
 * A toolbar is a row and a row has a width, and eighteen buttons is wider than
 * a narrow editor. Wrapping was what happened before, and a wrapped toolbar is
 * a second row the layout above it did not make room for — the buttons went on
 * and the bar did not grow.
 *
 * So the row keeps what fits and the rest goes into one menu at the end. Whole
 * groups at a time, in the order they were asked for: `toolbar` is already
 * "exactly these controls in exactly this order", and the order an application
 * wrote is the order it would want them to go in. The first group never leaves
 * — the surface switch is the control a writer reaches for most, and a control
 * hidden behind a menu at every width is one that should not have been on the
 * list.
 *
 * The measuring is the awkward half. A group that has been taken out of the row
 * has no width to read, so every group is shown, measured and put back inside
 * one layout effect — the browser paints once, at the end, with the answer
 * already applied. Hiding a child does not change the width of the row that
 * holds it, so the observer cannot set itself off.
 *
 * What is measured is where each group *ends*, not how wide it is. A group's
 * own width leaves out the rule drawn before it, the margins on either side of
 * that rule and the gaps the row puts between all of them — sixty pixels of a
 * default toolbar, which is a button and a half the row thought it had.
 */
function useOverflow(groups: number): {
  row: React.RefObject<HTMLDivElement | null>;
  shown: number;
} {
  const row = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(groups);

  React.useLayoutEffect(() => {
    const element = row.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      const all = [...element.querySelectorAll<HTMLElement>('[data-mawy-toolbar-group]')];
      const more = element.querySelector<HTMLElement>('[data-mawy-toolbar-more]');
      // The rules between the groups are hidden with the groups they belong to
      // and have to come back for the same reason: a hidden one is a width of
      // nothing, and the row has to be measured as it would actually look.
      const shownAgain = [
        ...all,
        ...element.querySelectorAll<HTMLElement>('[data-mawy-toolbar-rule]'),
        ...(more ? [more] : [])
      ];
      const was = shownAgain.map((child) => child.style.display);

      for (const child of shownAgain) {
        child.style.display = '';
      }

      const box = element.getBoundingClientRect();
      const rightToLeft = element.ownerDocument.defaultView
        ? getComputedStyle(element).direction === 'rtl'
        : false;
      const start = rightToLeft ? box.right : box.left;
      /** How far past the row's own start this child's far edge sits. */
      const reach = (child: HTMLElement) => {
        const own = child.getBoundingClientRect();

        return rightToLeft ? start - own.left : own.right - start;
      };

      const room = box.width;
      const menu = more ? more.getBoundingClientRect().width : 0;
      const edges = all.map(reach);

      let fits = all.length;

      if (edges.length > 0 && edges[edges.length - 1] > room) {
        fits = 0;

        while (fits < edges.length && edges[fits] + menu <= room) {
          fits += 1;
        }
      }

      shownAgain.forEach((child, index) => {
        child.style.display = was[index];
      });

      // At least the first: a row too narrow for it is a row too narrow for
      // anything, and an empty toolbar beside a menu is worse than one that
      // overflows its own edge.
      setShown(Math.max(1, fits));
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [groups]);

  return { row, shown };
}

/**
 * The editor's toolbar.
 *
 * Every formatting button here runs a command that also has a keyboard
 * shortcut, and the order of those two matters: the commands are the editor and
 * the buttons are a way of finding them. An editor whose toolbar is the only
 * way to reach a command is an editor that cannot be used without a pointer.
 *
 * Like the viewer's, it is a real `toolbar` — one tab stop, arrows inside —
 * and it draws only the controls it was given.
 */
export function MawyEditorToolbar({
  items,
  strings,
  mode,
  modes,
  onModeChange,
  colorScheme,
  onColorSchemeChange,
  onCommand,
  active,
  headingLevels,
  onHeading,
  headingActive,
  editable,
  inTable = false,
  onFind,
  finding,
  onOpen,
  onPickImage,
  onUndo,
  onRedo,
  onInsertTable,
  tableInsertable,
  onSave
}: MawyEditorToolbarProps): React.ReactElement {
  const { onKeyDown, itemProps } = useRoving();
  const order = tabStops(items, (item) =>
    item === 'separator' ? 0 : item === 'mode' ? modes.length : 1
  );

  /**
   * The controls, cut into groups at the separators an application wrote.
   *
   * The separators are already the grouping — `mode`, then what marks up a run
   * of text, then what makes a block of one, then the file and the palette —
   * and reading them is a great deal better than a second list here saying what
   * belongs with what. An application that reorders `toolbar` reorders the
   * groups with it, which is the behaviour it would expect.
   */
  const groups = React.useMemo(() => {
    const out: { item: MawyEditorToolbarItem; key: number }[][] = [];
    let current: { item: MawyEditorToolbarItem; key: number }[] = [];

    items.forEach((item, key) => {
      if (item === 'separator') {
        if (current.length) {
          out.push(current);
          current = [];
        }

        return;
      }

      current.push({ item, key });
    });

    if (current.length) {
      out.push(current);
    }

    return out;
  }, [items]);

  const { row, shown } = useOverflow(groups.length);
  const hidden = groups.slice(shown);

  /** The stop after every control's, which is where the overflow menu goes. */
  const lastStop = items.reduce(
    (count, item) => count + (item === 'separator' ? 0 : item === 'mode' ? modes.length : 1),
    0
  );

  const control = (item: MawyEditorToolbarItem, key: number): React.ReactNode => {
    const at = order[key];

    if (item === 'separator') {
      return <span key={key} className="mawy-toolbar-separator" aria-hidden="true" />;
    }

    if (item === 'mode') {
      // A segmented group rather than a menu: this is the control a writer
      // reaches for most, and one press is not two.
      return (
        <div key={key} className="mawy-segmented" role="radiogroup" aria-label={strings.mode}>
          {modes.map((each, index) => {
            const Icon = MODE_ICONS[each];

            return (
              <IconButton
                key={each}
                role="radio"
                aria-checked={each === mode}
                pressed={each === mode}
                label={strings[MODE_LABELS[each]]}
                icon={<Icon className="mawy-icon" aria-hidden="true" />}
                data-mawy-toolbar-item=""
                onClick={() => onModeChange(each)}
                {...itemProps(at + index)}
              />
            );
          })}
        </div>
      );
    }

    if (item === 'heading') {
      return (
        <Menu
          key={key}
          label={strings.heading}
          icon={<HeadingIcon className="mawy-icon" aria-hidden="true" />}
          disabled={inTable}
          {...itemProps(at)}
        >
          <Choice<string>
            label={strings.heading}
            value={String(headingLevels.find((depth) => headingActive(depth)) ?? 0)}
            onChange={(chosen) => onHeading(Number(chosen) as MawyHeadingLevel | 0)}
            options={[
              ...headingLevels.map((depth) => {
                const Icon = HEADING_ICONS[depth];

                return {
                  value: String(depth),
                  label: strings[`heading${depth}`],
                  icon: <Icon className="mawy-icon" aria-hidden="true" />
                };
              }),
              {
                value: '0',
                label: strings.paragraph,
                icon: <ParagraphIcon className="mawy-icon" aria-hidden="true" />
              }
            ]}
          />
        </Menu>
      );
    }

    if (item === 'image' && onPickImage) {
      // Two ways in, because somebody on a phone has no file to drag and no
      // clipboard with a screenshot on it, and somebody with a picture already
      // on the web has nothing to upload.
      return (
        <Menu
          key={key}
          label={strings.image}
          icon={<ImageIcon className="mawy-icon" aria-hidden="true" />}
          disabled={!editable}
          {...itemProps(at)}
        >
          <Actions
            label={strings.image}
            actions={[
              {
                label: strings.imageUpload,
                icon: <UploadIcon className="mawy-icon" aria-hidden="true" />,
                run: onPickImage
              },
              {
                label: strings.imageLink,
                icon: <LinkIcon className="mawy-icon" aria-hidden="true" />,
                run: () => onCommand('image')
              }
            ]}
          />
        </Menu>
      );
    }

    if (item === 'table') {
      return (
        <Menu
          key={key}
          label={strings.table}
          icon={<TableIcon className="mawy-icon" aria-hidden="true" />}
          disabled={!editable}
          {...itemProps(at)}
        >
          {/* A grid of sizes, and nothing else: what reshapes a table is hung
              beside the table the caret is in, where it has something to act
              on. Asked when the menu opens, because whether a table can go
              where the caret is — not in a code block, not in another table —
              is a parse. */}
          {() => (
            <TableSizeGrid strings={strings} disabled={!tableInsertable()} onPick={onInsertTable} />
          )}
        </Menu>
      );
    }

    if (item === 'undo' || item === 'redo') {
      const back = item === 'undo';
      const Icon = back ? UndoIcon : RedoIcon;
      const onPress = back ? onUndo : onRedo;

      // Here for a reader with no keyboard, which on a phone is every reader:
      // `Mod`+`Z` is the whole of undo otherwise.
      return (
        <IconButton
          key={key}
          label={back ? strings.undo : strings.redo}
          icon={<Icon className="mawy-icon" aria-hidden="true" />}
          aria-keyshortcuts={back ? 'Control+Z Meta+Z' : 'Control+Shift+Z Meta+Shift+Z Control+Y'}
          disabled={!editable || !onPress}
          data-mawy-toolbar-item=""
          onClick={onPress}
          {...itemProps(at)}
        />
      );
    }

    if (item === 'find') {
      return (
        <IconButton
          key={key}
          label={strings.find}
          icon={<FindIcon className="mawy-icon" aria-hidden="true" />}
          pressed={finding}
          aria-pressed={finding}
          disabled={!onFind}
          data-mawy-toolbar-item=""
          onClick={onFind}
          {...itemProps(at)}
        />
      );
    }

    if (item === 'open' || item === 'save') {
      const opening = item === 'open';

      return (
        <IconButton
          key={key}
          label={opening ? strings.openFile : strings.saveFile}
          icon={
            opening ? (
              <OpenFileIcon className="mawy-icon" aria-hidden="true" />
            ) : (
              <SaveIcon className="mawy-icon" aria-hidden="true" />
            )
          }
          disabled={opening && !onOpen}
          data-mawy-toolbar-item=""
          onClick={opening ? onOpen : onSave}
          {...itemProps(at)}
        />
      );
    }

    if (item === 'colorScheme') {
      const Icon =
        colorScheme === 'light' ? LightIcon : colorScheme === 'dark' ? DarkIcon : SystemThemeIcon;

      return (
        <Menu
          key={key}
          label={strings.colorScheme}
          icon={<Icon className="mawy-icon" aria-hidden="true" />}
          {...itemProps(at)}
        >
          <Choice<MawyColorScheme>
            label={strings.colorScheme}
            value={colorScheme}
            onChange={onColorSchemeChange}
            options={[
              {
                value: 'light',
                label: strings.colorSchemeLight,
                icon: <LightIcon className="mawy-icon" aria-hidden="true" />
              },
              {
                value: 'dark',
                label: strings.colorSchemeDark,
                icon: <DarkIcon className="mawy-icon" aria-hidden="true" />
              },
              {
                value: 'system',
                label: strings.colorSchemeSystem,
                icon: <SystemThemeIcon className="mawy-icon" aria-hidden="true" />
              }
            ]}
          />
        </Menu>
      );
    }

    const entry = COMMANDS[item];

    if (!entry) {
      return null;
    }

    const Icon = entry.icon;
    const on = active(entry.command);

    return (
      <IconButton
        key={key}
        label={strings[entry.label]}
        icon={<Icon className="mawy-icon" aria-hidden="true" />}
        pressed={on}
        aria-pressed={on}
        disabled={!editable || (inTable && blockCommand(entry.command))}
        data-mawy-toolbar-item=""
        onClick={() => onCommand(entry.command)}
        {...itemProps(at)}
      />
    );
  };

  return (
    <div
      className="mawy-toolbar"
      role="toolbar"
      aria-label={strings.editor}
      lang={strings.lang}
      onKeyDown={onKeyDown}
    >
      <div className="mawy-toolbar-controls mawy-toolbar-editor" ref={row}>
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            {index > 0 ? (
              <span
                className="mawy-toolbar-separator"
                aria-hidden="true"
                data-mawy-toolbar-rule=""
                style={index < shown ? undefined : { display: 'none' }}
              />
            ) : null}
            <span
              className="mawy-toolbar-group"
              data-mawy-toolbar-group=""
              style={index < shown ? undefined : { display: 'none' }}
            >
              {group.map(({ item, key }) => control(item, key))}
            </span>
          </React.Fragment>
        ))}
        <span
          className="mawy-toolbar-more"
          data-mawy-toolbar-more=""
          style={hidden.length ? undefined : { display: 'none' }}
        >
          <Menu
            label={strings.more}
            icon={<MoreIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(lastStop)}
          >
            {/* Drawn when the menu is opened rather than with the toolbar. Every
                control here is already in the row, hidden, so that it can be
                measured — and asking each of them again whether its command is
                in force, on every keystroke, for a menu nobody has opened, is
                the same work done twice for no one. */}
            {() => (
              <div className="mawy-toolbar-overflow">
                {hidden.map((group, index) => (
                  <div className="mawy-toolbar-group" key={index}>
                    {group.map(({ item, key }) => control(item, key))}
                  </div>
                ))}
              </div>
            )}
          </Menu>
        </span>
      </div>
    </div>
  );
}

/** Every control, in the order they are drawn when `toolbar` is just `true`. */
export const DEFAULT_EDITOR_TOOLBAR: readonly MawyEditorToolbarItem[] = [
  'mode',
  'separator',
  'undo',
  'redo',
  'separator',
  'heading',
  'bold',
  'italic',
  'strikethrough',
  'code',
  'link',
  'image',
  'separator',
  'quote',
  'bulletList',
  'orderedList',
  'taskList',
  'codeBlock',
  'table',
  'rule',
  'separator',
  'find',
  'open',
  'save',
  'colorScheme'
];
