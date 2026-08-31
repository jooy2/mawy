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
import type {
  MawyCodeToken,
  MawyCodeTokenKind,
  MawyHighlighter,
  MawyHtmlPolicy
} from '../../types.js';
import type { MdBlock, MdCode, MdInline, MdListItem, MdRange, MdTableRow } from './ast.js';
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
  /**
   * What colours a code block, once it has arrived. `null` while it is being
   * fetched, and for ever in an application that never asked for one — in both
   * of which the code is drawn as the text it is.
   */
  highlighter?: MawyHighlighter | null;
}

/**
 * Which characters of the source an element was drawn from.
 *
 * Every element the renderer draws carries it — blocks, list items, table rows
 * and cells, and the inline elements inside them — because a range is the only
 * way back: from a place on the page to the place in the document it came
 * from. The preview in `split` scrolls by it, a click in the preview finds the
 * word it landed on by it, and the surface that edits the drawn document will
 * ask the same question in both directions.
 *
 * Text is the one thing that cannot carry one, having no attributes to carry it
 * with. It does not need to: a run of text is bounded by the elements on either
 * side of it, which is enough to find it in the source between them.
 */
function origin(node: { range: MdRange }): { 'data-mawy-range': string } {
  return { 'data-mawy-range': `${node.range.start},${node.range.end}` };
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
        return (
          <em key={index} {...origin(node)}>
            {renderInline(node.children, context)}
          </em>
        );

      case 'strong':
        return (
          <strong key={index} {...origin(node)}>
            {renderInline(node.children, context)}
          </strong>
        );

      case 'delete':
        return (
          <del key={index} {...origin(node)}>
            {renderInline(node.children, context)}
          </del>
        );

      case 'inlineCode':
        return (
          <code key={index} className="mawy-md-code" {...origin(node)}>
            {node.value}
          </code>
        );

      case 'link':
        return (
          <a
            key={index}
            className="mawy-md-link"
            href={node.url}
            title={node.title ?? undefined}
            {...origin(node)}
          >
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
            {...origin(node)}
          />
        );

      case 'break':
        return <br key={index} {...origin(node)} />;

      case 'inlineHtml':
        return (
          <RawHtml key={index} value={node.value} context={context} inline marks={origin(node)} />
        );

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
  inline,
  marks
}: {
  value: string;
  context: RenderContext;
  inline?: boolean;
  marks?: { 'data-mawy-range': string };
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
    return (
      <Tag className="mawy-md-html-source" {...marks}>
        {value}
      </Tag>
    );
  }

  return <Tag className="mawy-md-html" {...marks} dangerouslySetInnerHTML={{ __html: html }} />;
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

/** The kinds a token is allowed to be. Anything else is drawn as plain text. */
const CODE_TOKEN_KINDS = new Set<string>([
  'comment',
  'string',
  'regex',
  'number',
  'constant',
  'keyword',
  'type',
  'function',
  'variable',
  'attribute',
  'tag',
  'operator',
  'punctuation'
]);

/**
 * Tokens, checked against the code they claim to be.
 *
 * A highlighter that drops a character or invents one would have the page
 * showing something the document does not say, and the `data-mawy-range` on the
 * element saying it came from characters it did not. Colour is not worth that,
 * so tokens that do not join back into the code exactly are thrown away and the
 * block is drawn plain.
 */
function checkedTokens(tokens: MawyCodeToken[] | null, code: string): MawyCodeToken[] | null {
  return tokens && tokens.map((token) => token.text).join('') === code ? tokens : null;
}

/**
 * Where each token sits in the document.
 *
 * A coloured code block is a row of elements where there used to be one run of
 * text, and an element that does not say where it came from is a hole in the
 * one promise the renderer makes about all of them. The code's own line offsets
 * are what closes it: a token knows which line it starts on and how far into it,
 * and the parser wrote down where each of those lines is.
 */
function tokenRanges(tokens: MawyCodeToken[], lines: number[]): (MdRange | null)[] {
  const out: (MdRange | null)[] = [];
  let line = 0;
  let column = 0;

  for (const token of tokens) {
    const fromLine = lines[line];
    const fromColumn = column;

    for (let at = 0; at < token.text.length; at += 1) {
      if (token.text[at] === '\n') {
        line += 1;
        column = 0;
      } else {
        column += 1;
      }
    }

    const toLine = lines[line];

    out.push(
      fromLine === undefined || toLine === undefined
        ? null
        : { start: fromLine + fromColumn, end: toLine + column }
    );
  }

  return out;
}

function CodeText({
  tokens,
  code,
  lines
}: {
  tokens: MawyCodeToken[] | null;
  code: string;
  lines: number[];
}): React.ReactNode {
  if (!tokens) {
    return code;
  }

  const ranges = tokenRanges(tokens, lines);

  return tokens.map((token, index) => {
    if (!token.kind || !CODE_TOKEN_KINDS.has(token.kind)) {
      return token.text;
    }

    const range = ranges[index];

    return (
      <span
        key={index}
        className={`mawy-hl-${token.kind as MawyCodeTokenKind}`}
        {...(range ? origin({ range }) : {})}
      >
        {token.text}
      </span>
    );
  });
}

/**
 * What a highlighter makes of a code block, if there is one and it knows the
 * language.
 *
 * The first attempt is made while rendering rather than in an effect, so a
 * highlighter that answers straight away colours the block on the first paint
 * and on a server — no flash of plain code, and nothing extra to hydrate. One
 * that answers with a promise gets the block drawn plain and coloured when it
 * arrives.
 */
function useHighlighted(
  block: MdCode,
  highlighter: MawyHighlighter | null
): MawyCodeToken[] | null {
  const { value, lang } = block;

  const attempt = React.useMemo(() => {
    if (!highlighter || !lang || !value) {
      return null;
    }

    try {
      return highlighter.supports(lang) ? highlighter.highlight(value, lang) : null;
    } catch {
      // A highlighter is somebody else's code running inside a render. It is
      // allowed to be wrong; it is not allowed to take the document down.
      return null;
    }
  }, [highlighter, lang, value]);

  // What arrived, and which attempt it arrived for. Kept together so that an
  // answer to a question nobody is asking any more is ignored rather than
  // cleared: clearing it would be a second render for a value already thrown
  // away, and the check below would have refused it anyway.
  const [answer, setAnswer] = React.useState<{
    to: Promise<MawyCodeToken[]>;
    tokens: MawyCodeToken[];
  } | null>(null);

  React.useEffect(() => {
    if (!attempt || Array.isArray(attempt)) {
      return;
    }

    let live = true;

    void attempt.then(
      (tokens) => {
        if (live) {
          setAnswer({ to: attempt, tokens });
        }
      },
      () => {
        // A highlighter that will not answer is a code block without colour,
        // which is the state it is already in.
      }
    );

    return () => {
      live = false;
    };
  }, [attempt]);

  const tokens = Array.isArray(attempt)
    ? attempt
    : answer && answer.to === attempt
      ? answer.tokens
      : null;

  return checkedTokens(tokens, value);
}

function CodeBlock({
  block,
  context
}: {
  block: MdCode;
  context: RenderContext;
}): React.ReactElement {
  const { value, lang } = block;
  const [state, copy] = useCopy();
  const Icon = state === 'copied' ? CheckIcon : CopyIcon;
  const tokens = useHighlighted(block, context.highlighter ?? null);

  return (
    <div className="mawy-md-pre" data-mawy-lang={lang ?? undefined} {...origin(block)}>
      <pre>
        {/* The range on the `code` rather than only on the box around it: the
            box holds the fences and the copy button as well, and a caret in an
            empty block would otherwise have the backticks for an address. */}
        <code
          className={lang ? `mawy-md-lang language-${lang}` : 'mawy-md-lang'}
          {...origin({ range: block.content })}
        >
          <CodeText tokens={tokens} code={value} lines={block.lines} />
        </code>
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
    <li key={index} className={task ? 'mawy-md-task' : undefined} {...origin(item)}>
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
    <tr key={index} {...origin(row)}>
      {row.children.map((cell, column) => (
        <Cell
          key={column}
          scope={row.header ? 'col' : undefined}
          {...origin(cell)}
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
          <Tag key={index} id={block.slug} className="mawy-md-heading" {...origin(block)}>
            {renderInline(block.children, context)}
          </Tag>
        );
      }

      case 'paragraph':
        return tight ? (
          <React.Fragment key={index}>{renderInline(block.children, context)}</React.Fragment>
        ) : (
          <p key={index} {...origin(block)}>
            {renderInline(block.children, context)}
          </p>
        );

      case 'code':
        return <CodeBlock key={index} block={block} context={context} />;

      case 'blockquote': {
        if (!block.alert) {
          return (
            <blockquote key={index} {...origin(block)}>
              {renderBlocks(block.children, context)}
            </blockquote>
          );
        }

        const Icon = ALERT_ICONS[block.alert];
        const label =
          context.strings[
            `alert${block.alert[0].toUpperCase()}${block.alert.slice(1)}` as keyof MawyStrings
          ];

        return (
          <blockquote
            key={index}
            className="mawy-md-alert"
            data-mawy-alert={block.alert}
            {...origin(block)}
          >
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
            {...origin(block)}
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
          <div key={index} className="mawy-md-table-scroll" {...origin(block)}>
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
        return <hr key={index} className="mawy-md-rule" {...origin(block)} />;

      case 'html':
        return <RawHtml key={index} value={block.value} context={context} marks={origin(block)} />;

      default:
        return null;
    }
  });
}
