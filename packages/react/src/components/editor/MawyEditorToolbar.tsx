'use client';

import * as React from 'react';
import type { MawyColorScheme, MawyEditorToolbarItem, MawyMode } from '../../types.js';
import type { MawyStrings } from '../../internal/i18n.js';
import type { MawyCommand } from '../../internal/commands.js';
import { Choice, IconButton, Menu } from '../../internal/controls.js';
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
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LightIcon,
  LinkIcon,
  OpenFileIcon,
  OrderedListIcon,
  ParagraphIcon,
  PreviewIcon,
  QuoteIcon,
  RuleIcon,
  SaveIcon,
  SourceIcon,
  SplitIcon,
  StrikethroughIcon,
  SystemThemeIcon,
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
  /** Off in the modes that have nothing to format. */
  editable: boolean;
  /** Opens the find bar. Absent in the modes that have no source to search. */
  onFind?: () => void;
  finding: boolean;
  /** Absent while the document cannot be replaced. */
  onOpen?: () => void;
  onSave: () => void;
}

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
  editable,
  onFind,
  finding,
  onOpen,
  onSave
}: MawyEditorToolbarProps): React.ReactElement {
  const { onKeyDown, itemProps } = useRoving();
  const order = tabStops(items, (item) =>
    item === 'separator' ? 0 : item === 'mode' ? modes.length : 1
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
          {...itemProps(at)}
        >
          <Choice<MawyCommand>
            label={strings.heading}
            value={
              (['heading1', 'heading2', 'heading3'] as const).find((command) => active(command)) ??
              'paragraph'
            }
            onChange={onCommand}
            options={[
              {
                value: 'heading1',
                label: strings.heading1,
                icon: <Heading1Icon className="mawy-icon" aria-hidden="true" />
              },
              {
                value: 'heading2',
                label: strings.heading2,
                icon: <Heading2Icon className="mawy-icon" aria-hidden="true" />
              },
              {
                value: 'heading3',
                label: strings.heading3,
                icon: <Heading3Icon className="mawy-icon" aria-hidden="true" />
              },
              {
                value: 'paragraph',
                label: strings.paragraph,
                icon: <ParagraphIcon className="mawy-icon" aria-hidden="true" />
              }
            ]}
          />
        </Menu>
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
        disabled={!editable}
        data-mawy-toolbar-item=""
        onClick={() => onCommand(entry.command)}
        {...itemProps(at)}
      />
    );
  };

  return (
    <div className="mawy-toolbar" role="toolbar" aria-label={strings.editor} onKeyDown={onKeyDown}>
      <div className="mawy-toolbar-controls mawy-toolbar-editor">{items.map(control)}</div>
    </div>
  );
}

/** Every control, in the order they are drawn when `toolbar` is just `true`. */
export const DEFAULT_EDITOR_TOOLBAR: readonly MawyEditorToolbarItem[] = [
  'mode',
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
  'rule',
  'separator',
  'find',
  'open',
  'save',
  'colorScheme'
];
