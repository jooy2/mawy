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
  MawyDirectiveKind,
  MawyDirectives,
  MawyHighlighter,
  MawyHtmlPolicy,
  MawyLinkTarget
} from '../../types.js';
import type {
  MdBlock,
  MdCode,
  MdContainerDirective,
  MdFootnoteDefinition,
  MdInline,
  MdLeafDirective,
  MdListItem,
  MdRange,
  MdTableRow,
  MdTextDirective
} from './ast.js';
import { toPlainText } from './inline.js';
import type { MawyFound } from './find.js';
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
  /**
   * The document's footnotes, by label, so a `[^a]` in the middle of a sentence
   * knows which number it is and where its note ended up.
   */
  footnotes?: Map<string, MdFootnoteDefinition>;
  /**
   * What an application knows how to draw that this package does not. A name
   * that is not here is drawn as the characters it was written with.
   */
  directives?: MawyDirectives;
  /**
   * The Markdown the document was parsed from.
   *
   * The one thing the renderer reads the source for, and it is there so that an
   * unhandled directive can be shown as what the author actually typed. Every
   * range in the tree indexes this string.
   */
  source?: string;
  /** Where a link the document wrote opens. @default 'blank' */
  linkTarget?: MawyLinkTarget;
  /**
   * A run of the document to draw as the characters it was written with rather
   * than as what it means.
   *
   * The editor's drawn surface sets this to the link or image the caret is
   * inside, and that is the whole of how a destination gets edited: a `<a>`
   * draws its words and never its `(url)`, so there is nothing on the page for
   * a caret to sit in and nothing for a keystroke to land on. Written out, the
   * characters *are* the source, one for one, and every rule the surface
   * already has applies to them unchanged.
   *
   * Unset everywhere else. A viewer has no caret and nothing to reveal.
   */
  reveal?: MdRange | null;
  /**
   * What the viewer's find bar found, and which of them is being stepped
   * through. See `find.ts` — the search is over what the document draws, and
   * the answer is keyed by the node that draws each run, so marking is a
   * lookup here rather than a second walk that has to agree with this one.
   */
  found?: MawyFound;
  currentMatch?: number;
}

/**
 * A run of text, with whatever the find bar found in it marked.
 *
 * The bare string where nothing was found, and that matters: a paragraph in a
 * document nobody is searching goes on being one piece of text rather than a
 * string wrapped in an element that carries no attributes.
 */
function marked(node: MdInline, value: string, context: RenderContext): React.ReactNode {
  const matches = context.found?.at.get(node);

  if (!matches?.length) {
    return value;
  }

  const out: React.ReactNode[] = [];
  let at = 0;

  for (const match of matches) {
    if (match.start > at) {
      out.push(value.slice(at, match.start));
    }

    out.push(
      <span
        key={match.index}
        className="mawy-find-hit"
        data-mawy-current={match.index === context.currentMatch ? 'true' : undefined}
      >
        {value.slice(match.start, match.end)}
      </span>
    );
    at = match.end;
  }

  if (at < value.length) {
    out.push(value.slice(at));
  }

  return out;
}

/** Whether a node is inside the run being shown as its own source. */
function revealed(node: { range: MdRange }, context: RenderContext): boolean {
  const at = context.reveal;

  return (
    at !== null && at !== undefined && at.start === node.range.start && at.end === node.range.end
  );
}

/**
 * Where a footnote and the sentence that mentions it point at each other.
 *
 * Prefixed, because these are `id`s on somebody else's page: a document with a
 * footnote called `1` should not be claiming `#1` for it.
 */
const footnoteId = (slug: string) => `mawy-fn-${slug}`;
const referenceId = (slug: string, index: number) =>
  index === 0 ? `mawy-fnref-${slug}` : `mawy-fnref-${slug}-${index + 1}`;

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
 * Directives
 * ---------------------------------------------------------------------- */

/**
 * A directive, handed to whatever knows what it means.
 *
 * Nothing here decides anything about the construct: the component an
 * application registered under the name draws it, and this only assembles what
 * that component is given. Which keeps the safety story exactly where it was —
 * the application composes elements, and no markup string is on the path from
 * the document to the page.
 *
 * A name nobody registered is drawn as the characters it was written with, the
 * same answer raw HTML gets by default. Showing the source is the one fallback
 * that cannot quietly lose part of a document: an unhandled `::video{src=…}`
 * has nothing inside it to fall back *to*, and a reader seeing the line the
 * author wrote can tell what was meant.
 *
 * "Registered" means written into the object and not inherited by it. A
 * directive's name is `[A-Za-z][A-Za-z0-9_-]*`, which `constructor` and
 * `toString` both are, and an ordinary object literal answers for those with
 * something off `Object.prototype` — which React would then call as a
 * component. A document would be choosing what runs, which is the one thing a
 * document does not get to do here.
 */
function Directive({
  node,
  kind,
  context
}: {
  node: MdContainerDirective | MdLeafDirective | MdTextDirective;
  kind: MawyDirectiveKind;
  context: RenderContext;
}): React.ReactElement | null {
  const registered = context.directives;
  const Component =
    registered && Object.hasOwn(registered, node.name) ? registered[node.name] : undefined;
  const label = kind === 'container' ? (node as MdContainerDirective).label : node.children;
  const source = context.source?.slice(node.range.start, node.range.end) ?? '';

  if (!Component) {
    const Tag = kind === 'text' ? 'span' : 'div';

    return (
      <Tag className="mawy-md-directive-source" {...origin(node)}>
        {source}
      </Tag>
    );
  }

  return (
    <Component
      name={node.name}
      kind={kind}
      attributes={node.attributes}
      label={label.length ? renderInline(label as MdInline[], context) : null}
      range={node.range}
      source={source}
    >
      {kind === 'container' ? renderBlocks((node as MdContainerDirective).children, context) : null}
    </Component>
  );
}

/* -------------------------------------------------------------------------
 * Inline
 * ---------------------------------------------------------------------- */

function renderInline(nodes: MdInline[], context: RenderContext): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return marked(node, node.value, context);

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
            {marked(node, node.value, context)}
          </code>
        );

      case 'link':
        return revealed(node, context) ? (
          <span key={index} className="mawy-md-source" {...origin(node)}>
            {context.source?.slice(node.range.start, node.range.end)}
          </span>
        ) : (
          <a
            key={index}
            className="mawy-md-link"
            href={node.url}
            title={node.title ?? undefined}
            // `noopener` is what makes the new tab safe and `noreferrer` is
            // what keeps the document's own address out of it; a browser that
            // has one without the other is a browser this has to say both to.
            target={context.linkTarget === 'self' ? undefined : '_blank'}
            rel={context.linkTarget === 'self' ? undefined : 'noopener noreferrer'}
            {...origin(node)}
          >
            {renderInline(node.children, context)}
          </a>
        );

      case 'footnoteReference': {
        const footnote = context.footnotes?.get(node.label);

        // A reference with nothing to point at should not have reached here:
        // the inline parser only makes one for a label the document defines.
        if (!footnote) {
          return null;
        }

        return (
          <sup key={index} className="mawy-md-footnote-ref" {...origin(node)}>
            <a
              href={`#${footnoteId(footnote.slug)}`}
              id={referenceId(footnote.slug, node.index)}
              aria-describedby={footnoteId(footnote.slug)}
            >
              {footnote.number}
            </a>
          </sup>
        );
      }

      case 'image':
        return revealed(node, context) ? (
          <span key={index} className="mawy-md-source" {...origin(node)}>
            {context.source?.slice(node.range.start, node.range.end)}
          </span>
        ) : (
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

      case 'textDirective':
        return <Directive key={index} node={node} kind="text" context={context} />;

      case 'inlineHtml':
        return (
          <RawHtml
            key={index}
            value={node.value}
            context={context}
            inline
            marks={origin(node)}
            reveal={revealed(node, context)}
          />
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
  marks,
  reveal
}: {
  value: string;
  context: RenderContext;
  inline?: boolean;
  marks?: { 'data-mawy-range': string };
  /** Whether the caret is in it, so it is written out rather than drawn. */
  reveal?: boolean;
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

  // Markup with the caret in it is written out as the characters it was
  // written with, which is the only form of it a caret can be inside: what
  // `dangerouslySetInnerHTML` put on the page is markup React does not know the
  // inside of and could not put back.
  if (reveal) {
    return (
      <Tag className="mawy-md-source" {...marks}>
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
        data-mawy-tip={state === 'copied' ? context.strings.copied : context.strings.copyCode}
      >
        <Icon className="mawy-icon" aria-hidden="true" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

/**
 * What the checkbox on a task list item is called.
 *
 * The item's own first line, which is the text a reader sees next to the box.
 * Only a paragraph or a heading has words in it directly — an item that opens
 * with a nested list or a code block has none to lend — and that is the case
 * the caller's fallback is for.
 */
function taskName(item: MdListItem): string {
  const first = item.children[0];

  return first !== undefined && (first.type === 'paragraph' || first.type === 'heading')
    ? toPlainText(first.children)
    : '';
}

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
          // And a box with no name is read out as "checked, checkbox" and
          // nothing else — the one thing worth knowing, which is what is done,
          // is the text sitting beside it on the page. So that text is the
          // name. An item with no text at all is the only place the fallback is
          // reached, and there the word is all there is to say.
          aria-label={taskName(item) || context.strings.task}
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
/**
 * The footnotes, drawn under the document.
 *
 * Not part of `renderBlocks`, because they are not part of the block flow: a
 * footnote is written wherever it suited the author and read at the bottom, so
 * this is the one thing on the page whose place is the renderer's decision
 * rather than the document's. Everything inside it still says where it came
 * from; the section around them says nothing, because it came from nowhere.
 */
export function renderFootnotes(
  footnotes: readonly MdFootnoteDefinition[],
  context: RenderContext
): React.ReactNode {
  if (!footnotes.length) {
    return null;
  }

  return (
    // Named with a label rather than by pointing at the heading: two viewers on
    // one page would be two elements claiming the same `id`, and a link that
    // lands on whichever the browser met first.
    <section className="mawy-md-footnotes" aria-label={context.strings.footnotes}>
      <h2 className="mawy-md-footnotes-title" lang={context.strings.lang}>
        {context.strings.footnotes}
      </h2>
      <ol>
        {footnotes.map((footnote, index) => (
          <li key={index} id={footnoteId(footnote.slug)} {...origin(footnote)}>
            {renderBlocks(footnote.children, context)}
            <a
              className="mawy-md-footnote-back"
              href={`#${referenceId(footnote.slug, 0)}`}
              aria-label={context.strings.footnoteBack}
            >
              ↩
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function renderBlocks(
  blocks: MdBlock[],
  context: RenderContext,
  tight = false
): React.ReactNode {
  return blocks.map((block, index) => {
    // A block written so far as its marker and nothing else, with the caret in
    // it. There is nothing of the document on the page to type the rest of it
    // beside, so the marker is drawn as the characters it is — see
    // `revealedIn` in `MawyEditorDocument`, which decides that and nothing here
    // does.
    if (revealed(block, context)) {
      return (
        <p key={index} className="mawy-md-source" {...origin(block)}>
          {context.source?.slice(block.range.start, block.range.end)}
        </p>
      );
    }

    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.depth}` as 'h1';

        return (
          <Tag
            key={index}
            id={block.slug}
            className="mawy-md-heading"
            // Somewhere the focus can be *put* without being a stop on the way
            // anywhere: following an outline entry has to move the focus as
            // well as the page, or the next `Tab` carries on from the panel.
            // A reader Tabbing through is on their way somewhere, and a stop on
            // text they can already see is a stop that says nothing. This is
            // the Flutter package's `skipTraversal` said the other way round.
            tabIndex={-1}
            {...origin(block)}
          >
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

      case 'definitionList':
        return (
          <dl key={index} className="mawy-md-definitions" {...origin(block)}>
            {block.children.map((child, at) =>
              child.type === 'definitionTerm' ? (
                <dt key={at} {...origin(child)}>
                  {renderInline(child.children, context)}
                </dt>
              ) : (
                <dd key={at} {...origin(child)}>
                  {renderBlocks(child.children, context, !block.loose)}
                </dd>
              )
            )}
          </dl>
        );

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

      case 'containerDirective':
        return <Directive key={index} node={block} kind="container" context={context} />;

      case 'leafDirective':
        return <Directive key={index} node={block} kind="leaf" context={context} />;

      case 'html':
        return (
          <RawHtml
            key={index}
            value={block.value}
            context={context}
            marks={origin(block)}
            reveal={revealed(block, context)}
          />
        );

      default:
        return null;
    }
  });
}
