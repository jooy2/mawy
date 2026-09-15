'use client';

/**
 * The bars that float over a code block and an alert on the drawn document.
 *
 * `table.tsx` has the table's. These are the same kind of thing for what the
 * drawn document draws as what it means and not as what it is written with; the
 * reason each exists, and the arithmetic each runs, are in `overlays.ts`. They
 * are placed by `MawyEditor`, which knows the pane they float in.
 *
 * A press on one keeps the focus where it was, the way the table's does, so it
 * changes the block and the next letter still goes where the caret was. The
 * language menu is the exception, being a menu, and gives the focus back to the
 * document once a language is picked.
 */

import * as React from 'react';
import type { MawyEdit } from './editing.js';
import { Choice, IconButton, Menu } from './controls.js';
import type { MawyStrings } from './i18n.js';
import {
  CautionIcon,
  CodeBlockIcon,
  ImportantIcon,
  NoteIcon,
  RemoveIcon,
  TipIcon,
  WarningIcon
} from './icons.js';
import type { MdAlertKind } from './markdown/ast.js';
import {
  alertWritten,
  blockRemoved,
  codeLanguageWritten,
  type MawyBlockTarget
} from './overlays.js';

export interface BlockToolsProps {
  target: Extract<MawyBlockTarget, { kind: 'code' | 'alert' }>;
  strings: MawyStrings;
  /** The document the bar reads its target out of. */
  value: string;
  /** Where the caret is in it, which an edit that is not about the caret keeps. */
  caret: number;
  /** Where the bar is, from the top and the left of the pane it is in. */
  top: number;
  left: number;
  /**
   * An edit the bar made, with the document it was made against, and whether
   * the focus goes back to the document. `null` for no edit, only the focus.
   */
  onEdit: (edit: MawyEdit | null, from: string, refocus: boolean) => void;
}

/**
 * The languages the menu offers, by the names a fence writes them with.
 *
 * The editor's own list rather than the highlighter's: which highlighter an
 * application passes, and whether it passes one, is its own business, and a
 * block can be named a language nothing colours. A language already on the
 * fence that is not here is offered as well.
 */
const LANGUAGES = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'dart',
  'go',
  'html',
  'java',
  'javascript',
  'json',
  'kotlin',
  'markdown',
  'python',
  'rust',
  'shell',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml'
];

const ALERTS: readonly { kind: MdAlertKind; label: keyof MawyStrings; icon: typeof NoteIcon }[] = [
  { kind: 'note', label: 'alertNote', icon: NoteIcon },
  { kind: 'tip', label: 'alertTip', icon: TipIcon },
  { kind: 'important', label: 'alertImportant', icon: ImportantIcon },
  { kind: 'warning', label: 'alertWarning', icon: WarningIcon },
  { kind: 'caution', label: 'alertCaution', icon: CautionIcon }
];

/** A press on the bar, kept from taking the focus off the document. */
function keepFocus(event: React.MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

export const BlockTools = React.forwardRef<HTMLDivElement, BlockToolsProps>(
  function BlockTools(props, ref) {
    const { target, strings, top, left } = props;

    return (
      <div
        ref={ref}
        className="mawy-table-tools mawy-block-tools"
        role="toolbar"
        aria-label={target.kind === 'code' ? strings.codeBlock : strings.alert}
        lang={strings.lang}
        data-mawy-block={target.kind}
        style={{ top, left }}
        onMouseDown={keepFocus}
      >
        {target.kind === 'code' ? (
          <CodeTools {...props} target={target} />
        ) : (
          <AlertTools {...props} target={target} />
        )}
      </div>
    );
  }
);

function CodeTools({
  target,
  strings,
  value,
  caret,
  onEdit
}: BlockToolsProps & { target: Extract<MawyBlockTarget, { kind: 'code' }> }) {
  const options = [
    { value: '', label: strings.codeLanguageNone },
    ...(target.lang && !LANGUAGES.includes(target.lang) ? [target.lang] : []).map((name) => ({
      value: name,
      label: name
    })),
    ...LANGUAGES.map((name) => ({ value: name, label: name }))
  ];

  return (
    <>
      <Menu
        label={strings.codeLanguage}
        text={target.lang || strings.codeLanguageNone}
        icon={<CodeBlockIcon className="mawy-icon" aria-hidden="true" />}
      >
        <Choice
          label={strings.codeLanguage}
          value={target.lang}
          options={options}
          onChange={(lang) =>
            onEdit(codeLanguageWritten(value, target.range, lang, caret), value, true)
          }
        />
      </Menu>
      <span className="mawy-toolbar-separator" aria-hidden="true" />
      <IconButton
        label={strings.codeBlockRemove}
        icon={<RemoveIcon className="mawy-icon" aria-hidden="true" />}
        data-mawy-danger=""
        onClick={() => onEdit(blockRemoved(value, target.range), value, true)}
      />
    </>
  );
}

function AlertTools({
  target,
  strings,
  value,
  caret,
  onEdit
}: BlockToolsProps & { target: Extract<MawyBlockTarget, { kind: 'alert' }> }) {
  return (
    <>
      {ALERTS.map((each) => (
        <IconButton
          key={each.kind}
          label={strings[each.label]}
          icon={<each.icon className="mawy-icon" aria-hidden="true" />}
          pressed={target.alert === each.kind}
          aria-pressed={target.alert === each.kind}
          onClick={() => onEdit(alertWritten(value, target.range, each.kind, caret), value, false)}
        />
      ))}
      <span className="mawy-toolbar-separator" aria-hidden="true" />
      <IconButton
        label={strings.alertRemove}
        icon={<RemoveIcon className="mawy-icon" aria-hidden="true" />}
        data-mawy-danger=""
        onClick={() => onEdit(blockRemoved(value, target.range), value, true)}
      />
    </>
  );
}
