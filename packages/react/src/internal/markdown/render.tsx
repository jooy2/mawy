'use client';

/**
 * The document tree, drawn.
 *
 * There is no HTML string anywhere in here. Each node becomes a React element
 * chosen by a `switch`, which is what makes the viewer safe by construction
 * rather than by vigilance: a document has no way to reach an element the
 * `switch` does not name, so there is no escaping to get right and no place for
 * an injection to arrive. `dangerouslySetInnerHTML` appears exactly once, on
 * the raw-HTML path, behind a policy the application has to ask for.
 *
 * The class names are the theming surface. Every element gets `.mawy-md-*`, so
 * an application can restyle any part of a document without the library
 * exposing a render prop for it.
 */

import * as React from 'react';
import type { MawyHtmlPolicy } from '../../types.js';
import type { MdBlock, MdInline, MdListItem, MdTableRow } from './ast.js';
import { sanitizeHtml } from './html.js';
import type { MawyStrings } from '../i18n.js';
import {
  CautionIcon,
  CheckIcon,
  CopyIcon,
  ImportantIcon,
  NoteIcon,
  TipIcon,
  WarningIcon
} from '../icons.js';
import { useCopy } from '../clipboard.js';

export interface RenderContext {
  html: MawyHtmlPolicy;
  strings: MawyStrings;
}

/* -------------------------------------------------------------------------
 * Inline
 * ---------------------------------------------------------------------- */

function renderInline(nodes: MdInline[], context: RenderContext): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value;

      case 'emphasis':
        return <em key={index}>{renderInline(node.children, context)}</em>;

      case 'strong':
        return <strong key={index}>{renderInline(node.children, context)}</strong>;

      case 'delete':
        return <del key={index}>{renderInline(node.children, context)}</del>;

      case 'inlineCode':
        return (
          <code key={index} className="mawy-md-code">
            {node.value}
          </code>
        );

      case 'link':
        return (
          <a key={index} className="mawy-md-link" href={node.url} title={node.title ?? undefined}>
            {renderInline(node.children, context)}
          </a>
        );

      case 'image':
        return (
          <img
            key={index}
            className="mawy-md-image"
            src={node.url}
            alt={node.alt}
            title={node.title ?? undefined}
            loading="lazy"
            decoding="async"
          />
        );

      case 'break':
        return <br key={index} />;

      case 'inlineHtml':
        return <RawHtml key={index} value={node.value} context={context} inline />;

      default:
        return null;
    }
  });
}

/* -------------------------------------------------------------------------
 * Raw HTML
 * ---------------------------------------------------------------------- */

function RawHtml({
  value,
  context,
  inline
}: {
  value: string;
  context: RenderContext;
  inline?: boolean;
}): React.ReactElement {
  // `sanitize` needs a DOM to parse with. Where there is none — a server render
  // — it comes back `null` and the markup is shown rather than guessed at.
  const html = React.useMemo(
    () =>
      context.html === 'raw' ? value : context.html === 'sanitize' ? sanitizeHtml(value) : null,
    [context.html, value]
  );

  const Tag = inline ? 'span' : 'div';

  if (html === null) {
    return <Tag className="mawy-md-html-source">{value}</Tag>;
  }

  return <Tag className="mawy-md-html" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* -------------------------------------------------------------------------
 * Code
 * ---------------------------------------------------------------------- */

const ALERT_ICONS = {
  note: NoteIcon,
  tip: TipIcon,
  important: ImportantIcon,
  warning: WarningIcon,
  caution: CautionIcon
};

function CodeBlock({
  value,
  lang,
  context
}: {
  value: string;
  lang: string | null;
  context: RenderContext;
}): React.ReactElement {
  const [state, copy] = useCopy();
  const Icon = state === 'copied' ? CheckIcon : CopyIcon;

  return (
    <div className="mawy-md-pre" data-mawy-lang={lang ?? undefined}>
      <pre>
        <code className={lang ? `mawy-md-lang language-${lang}` : 'mawy-md-lang'}>{value}</code>
      </pre>
      <button
        type="button"
        className="mawy-code-copy"
        // A copy button on every code block would be a row of buttons down the
        // page. It appears with the pointer or with focus, and a keyboard
        // reaches it in the order it is written.
        data-mawy-state={state}
        onClick={() => copy(value)}
        aria-label={state === 'copied' ? context.strings.copied : context.strings.copyCode}
        title={state === 'copied' ? context.strings.copied : context.strings.copyCode}
      >
        <Icon className="mawy-icon" aria-hidden="true" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

function renderListItem(
  item: MdListItem,
  index: number,
  context: RenderContext,
  tight: boolean
): React.ReactElement {
  const task = item.checked !== null;

  return (
    <li key={index} className={task ? 'mawy-md-task' : undefined}>
      {task ? (
        <input
          type="checkbox"
          className="mawy-md-checkbox"
          checked={item.checked ?? false}
          readOnly
          disabled
          // The document is being read, not filled in. `aria-hidden` would take
          // the state away from a screen reader entirely, so it stays in the
          // tree and is simply not operable.
          tabIndex={-1}
        />
      ) : null}
      {renderBlocks(item.children, context, tight)}
    </li>
  );
}

function renderRow(
  row: MdTableRow,
  index: number,
  context: RenderContext,
  align: readonly (string | null)[]
) {
  const Cell = row.header ? 'th' : 'td';

  return (
    <tr key={index}>
      {row.children.map((cell, column) => (
        <Cell
          key={column}
          scope={row.header ? 'col' : undefined}
          style={
            align[column] ? { textAlign: align[column] as 'left' | 'center' | 'right' } : undefined
          }
        >
          {renderInline(cell.children, context)}
        </Cell>
      ))}
    </tr>
  );
}

/**
 * @param tight Whether these are the contents of a tight list item, whose
 *   paragraphs are not paragraphs. That is Markdown's own rule rather than a
 *   styling choice — a `<p>` here would put a task list's checkbox on the line
 *   above its own label — and it applies to this level only: a list nested
 *   inside decides its own looseness.
 */
export function renderBlocks(
  blocks: MdBlock[],
  context: RenderContext,
  tight = false
): React.ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.depth}` as 'h1';

        return (
          <Tag key={index} id={block.slug} className="mawy-md-heading">
            {renderInline(block.children, context)}
          </Tag>
        );
      }

      case 'paragraph':
        return tight ? (
          <React.Fragment key={index}>{renderInline(block.children, context)}</React.Fragment>
        ) : (
          <p key={index}>{renderInline(block.children, context)}</p>
        );

      case 'code':
        return <CodeBlock key={index} value={block.value} lang={block.lang} context={context} />;

      case 'blockquote': {
        if (!block.alert) {
          return <blockquote key={index}>{renderBlocks(block.children, context)}</blockquote>;
        }

        const Icon = ALERT_ICONS[block.alert];
        const label =
          context.strings[
            `alert${block.alert[0].toUpperCase()}${block.alert.slice(1)}` as keyof MawyStrings
          ];

        return (
          <blockquote key={index} className="mawy-md-alert" data-mawy-alert={block.alert}>
            <p className="mawy-md-alert-label">
              <Icon className="mawy-icon" aria-hidden="true" />
              {label}
            </p>
            {renderBlocks(block.children, context)}
          </blockquote>
        );
      }

      case 'list': {
        const Tag = block.ordered ? 'ol' : 'ul';

        return (
          <Tag
            key={index}
            className={block.loose ? 'mawy-md-list' : 'mawy-md-list mawy-md-tight'}
            start={block.ordered && block.start !== 1 ? block.start : undefined}
          >
            {block.children.map((item, at) => renderListItem(item, at, context, !block.loose))}
          </Tag>
        );
      }

      case 'table': {
        const header = block.children.filter((row) => row.header);
        const body = block.children.filter((row) => !row.header);

        return (
          // A wide table scrolls inside its own box rather than making the page
          // scroll sideways, which is the one thing a reader cannot undo.
          <div key={index} className="mawy-md-table-scroll">
            <table className="mawy-md-table">
              {header.length ? (
                <thead>{header.map((row, at) => renderRow(row, at, context, block.align))}</thead>
              ) : null}
              <tbody>{body.map((row, at) => renderRow(row, at, context, block.align))}</tbody>
            </table>
          </div>
        );
      }

      case 'thematicBreak':
        return <hr key={index} className="mawy-md-rule" />;

      case 'html':
        return <RawHtml key={index} value={block.value} context={context} />;

      default:
        return null;
    }
  });
}
