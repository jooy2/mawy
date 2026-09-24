'use client';

/**
 * The bars that float beside a picture, a link, a code block and an alert on
 * the drawn document, and the one a new link or picture is written from.
 *
 * `table.tsx` has the table's. These are the same kind of thing for what the
 * drawn document draws as what it means and not as what it is written with; the
 * reason each exists, and the arithmetic each runs, are in `overlays.ts`. They
 * are placed by `MawyEditor`, which knows the pane they float in.
 *
 * A press on a button keeps the focus where it was, the way the table's does,
 * so it changes the block and the next letter still goes where the caret was.
 * The language menu gives the focus back to the document once a language is
 * picked. A field cannot keep it off, being typed into: what is typed there is
 * written when `Enter` is pressed or the field is left, and `Escape` puts the
 * field back and the focus on the document.
 */

import * as React from 'react';
import type { MawyEdit } from './editing.js';
import { Choice, IconButton, Menu } from './controls.js';
import type { MawyStrings } from './i18n.js';
import {
  CautionIcon,
  CheckIcon,
  CodeBlockIcon,
  ImportantIcon,
  NoteIcon,
  OpenLinkIcon,
  RemoveIcon,
  TipIcon,
  UnlinkIcon,
  WarningIcon
} from './icons.js';
import type { MdAlertKind, MdRange } from './markdown/ast.js';
import { safeUrl } from './markdown/url.js';
import {
  alertWritten,
  blockRemoved,
  codeLanguageWritten,
  imageWritten,
  inlineRemoved,
  inserted,
  linkRemoved,
  linkWritten,
  type MawyBlockTarget
} from './overlays.js';

/** A link or a picture about to be written where the selection is. */
export interface MawyInsertTarget {
  kind: 'insert';
  image: boolean;
  range: MdRange;
  /** What was selected, as it was written. */
  text: string;
}

export interface BlockToolsProps {
  target: MawyBlockTarget | MawyInsertTarget;
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
  /** The new link or picture given up. */
  onCancel: () => void;
  /** Bumped to put the focus in the bar's first field. */
  focusRequest: number;
  /** Whether a picture's bar shows its address. See `MawyEditor.imageAddress`. */
  imageAddress: boolean;
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

/**
 * A press on the bar, kept from taking the focus off the document, except in a
 * field or on the label that names one, which puts the focus in its field.
 */
function keepFocus(event: React.MouseEvent<HTMLElement>): void {
  if (!(event.target as Element).closest('input, label')) {
    event.preventDefault();
  }
}

export const BlockTools = React.forwardRef<HTMLDivElement, BlockToolsProps>(
  function BlockTools(props, ref) {
    const { target, strings, top, left } = props;

    return (
      <div
        ref={ref}
        className="mawy-table-tools mawy-block-tools"
        role="toolbar"
        aria-label={
          target.kind === 'code'
            ? strings.codeBlock
            : target.kind === 'alert'
              ? strings.alert
              : target.kind === 'link' || (target.kind === 'insert' && !target.image)
                ? strings.link
                : strings.image
        }
        lang={strings.lang}
        data-mawy-block={target.kind}
        style={{ top, left }}
        onMouseDown={keepFocus}
      >
        {target.kind === 'code' ? (
          <CodeTools {...props} target={target} />
        ) : target.kind === 'alert' ? (
          <AlertTools {...props} target={target} />
        ) : (
          <Fields {...props} target={target} />
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

/**
 * The address and the words of a picture or a link, as two fields, with what
 * else can be done to it beside them; or the same two for one about to be
 * written, with the button that writes it.
 */
function Fields({
  target,
  strings,
  value,
  onEdit,
  onCancel,
  focusRequest,
  imageAddress
}: BlockToolsProps & {
  target: Exclude<MawyBlockTarget, { kind: 'code' | 'alert' }> | MawyInsertTarget;
}) {
  const image = target.kind === 'image' || (target.kind === 'insert' && target.image);
  // A new picture is asked for its address whatever the application says,
  // since there is nothing to write without one.
  const addressed = target.kind !== 'image' || imageAddress;
  const url0 = target.kind === 'insert' ? 'https://' : target.url;
  const text0 = target.kind === 'image' ? target.alt : target.text;
  const [url, setUrl] = React.useState(url0);
  const [text, setText] = React.useState(text0);
  const address = React.useRef<HTMLInputElement>(null);
  const words = React.useRef<HTMLInputElement>(null);
  const done = React.useRef(false);

  // A new one is asked for its address first, with the caret after the
  // `https://` it starts with. A picture whose address is not shown is asked
  // for its description instead.
  React.useEffect(() => {
    const field = address.current ?? words.current;

    if (field && (target.kind === 'insert' || focusRequest > 0)) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }, [focusRequest, target.kind]);

  const write = (refocus: boolean) => {
    if (done.current) {
      return;
    }

    if (target.kind === 'insert') {
      const clean = url.trim();

      if (!clean || clean === 'https://') {
        return;
      }

      done.current = true;
      onEdit(inserted(value, target.range, { url: clean, text, image }), value, refocus);

      return;
    }

    if (url === url0 && text === text0) {
      if (refocus) {
        onEdit(null, value, true);
      }

      return;
    }

    onEdit(
      target.kind === 'image'
        ? imageWritten(value, target, { url, alt: text })
        : linkWritten(value, target, { url, text }),
      value,
      refocus
    );
  };

  const keys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      write(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();

      if (target.kind === 'insert') {
        done.current = true;
        onCancel();
        onEdit(null, value, true);

        return;
      }

      setUrl(url0);
      setText(text0);
      done.current = true;
      onEdit(null, value, true);
    }
  };

  // Left for somewhere outside the bar: what was typed is written, or a new
  // link nobody finished is given up.
  const left = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.currentTarget.closest('.mawy-block-tools')?.contains(event.relatedTarget)) {
      return;
    }

    if (target.kind === 'insert') {
      if (!done.current) {
        onCancel();
      }

      return;
    }

    write(false);
  };
  const href = safeUrl(url);
  const ids = React.useId();

  return (
    <>
      {/*
        One row a field, each named on the page by a label in front of it. Two
        fields side by side with nothing but their contents in them read as two
        runs of text, and which was the address was a thing to work out. The
        label is the field's name as well, so what a screen reader says is what
        is on the page.
      */}
      <div className="mawy-block-fields">
        {addressed ? (
          <>
            <label className="mawy-block-label" htmlFor={`${ids}address`}>
              {image ? strings.imageAddress : strings.linkAddress}
            </label>
            <input
              ref={address}
              id={`${ids}address`}
              className="mawy-block-field"
              type="url"
              placeholder="https://"
              value={url}
              spellCheck={false}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={keys}
              onBlur={left}
            />
          </>
        ) : null}
        <label className="mawy-block-label" htmlFor={`${ids}text`}>
          {image ? strings.imageDescription : strings.linkText}
        </label>
        <input
          ref={words}
          id={`${ids}text`}
          className="mawy-block-field"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={keys}
          onBlur={left}
        />
      </div>
      {target.kind === 'insert' ? (
        <IconButton
          label={strings.insertApply}
          icon={<CheckIcon className="mawy-icon" aria-hidden="true" />}
          disabled={!url.trim() || url.trim() === 'https://'}
          onClick={() => write(true)}
        />
      ) : null}
      {target.kind === 'link' ? (
        <>
          <IconButton
            label={strings.linkOpen}
            icon={<OpenLinkIcon className="mawy-icon" aria-hidden="true" />}
            disabled={!href}
            onClick={() => {
              if (href) {
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            }}
          />
          <IconButton
            label={strings.linkUnlink}
            icon={<UnlinkIcon className="mawy-icon" aria-hidden="true" />}
            onClick={() => {
              done.current = true;
              onEdit(linkRemoved(value, target), value, true);
            }}
          />
        </>
      ) : null}
      {target.kind === 'insert' ? null : (
        <>
          <span className="mawy-toolbar-separator" aria-hidden="true" />
          <IconButton
            label={image ? strings.imageRemove : strings.linkRemove}
            icon={<RemoveIcon className="mawy-icon" aria-hidden="true" />}
            data-mawy-danger=""
            onClick={() => {
              done.current = true;
              onEdit(inlineRemoved(value, target.range), value, true);
            }}
          />
        </>
      )}
    </>
  );
}
