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
 *
 * No `'use client'` here, and that is the point rather than an omission: this
 * file is reached by `mawy-react/server`, and a module that declares itself a
 * client is one a bundler ships to a browser. The two pieces of a document
 * that hold state are in `live.tsx`, which does declare it, and they arrive
 * through `RenderContext.live` from whoever is drawing on a page.
 */

import * as React from 'react';
import type {
  MawyImageProps,
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
import type { MawyStrings } from '../i18n.js';
import { CautionIcon, ImportantIcon, NoteIcon, TipIcon, WarningIcon } from '../icons.js';

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
   * Put in front of every name this drawing gives something.
   *
   * A heading's anchor is the author's own words — `#getting-started` is
   * whatever GitHub would have called that heading, which is what a link
   * written by hand into a README is aimed at — so nothing is prefixed by
   * default and a deep link from outside lands where it always did.
   *
   * Two viewers on one page is the case this is for: both give their own
   * `# Introduction` the same anchor, and two elements with one `id` is a link
   * that lands on whichever the browser met first. Give one of them a prefix
   * and its names stop colliding. Links the document wrote to its own headings
   * and footnotes move with them; a link to anywhere else does not.
   */
  anchorPrefix?: string;

  /**
   * What draws a picture the document points at. See `MawyImageProps`.
   *
   * Absent, the renderer writes an `<img>`. Given one, the application draws
   * it instead — which is the only way to put a header on the request, send it
   * through a loader of its own, answer it out of a cache, or refuse it.
   */
  image?: React.ComponentType<MawyImageProps>;

  /**
   * The two pieces of a document that can hold state, where there is a page
   * for them to hold it on.
   *
   * A code block has a copy button and waits for a highlighter that answers
   * with a promise; raw HTML under `sanitize` becomes elements on the render
   * after the first, because sanitising wants a DOM the server has not got.
   * Both are hooks, and hooks are a client.
   *
   * So they are handed in rather than reached for. `MawyViewer` and
   * `MawyEditor` pass `LIVE` from `markdown/live.tsx`; `mawy-react/server`
   * passes nothing and gets the same document drawn still — no copy button, no
   * second render to wait for. The point of that is what is *not* imported: a
   * server module that reached a `'use client'` one would ship it.
   */
  live?: {
    code: React.ComponentType<{ block: MdCode; context: RenderContext }>;
    html: React.ComponentType<{
      value: string;
      context: RenderContext;
      inline?: boolean;
      marks?: { 'data-mawy-range': string };
      reveal?: boolean;
    }>;
  };
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
const footnoteId = (context: RenderContext, slug: string) =>
  `${context.anchorPrefix ?? ''}mawy-fn-${slug}`;
const referenceId = (context: RenderContext, slug: string, index: number) =>
  `${context.anchorPrefix ?? ''}mawy-fnref-${slug}${index === 0 ? '' : `-${index + 1}`}`;

/**
 * A destination, with a link to somewhere in this document moved under the
 * prefix its anchors are.
 *
 * `#getting-started` in a prefixed viewer has to become the name that viewer
 * actually gave the heading, or a document stops being able to link to itself.
 * Anything that is not a fragment is left exactly as written.
 */
const destination = (context: RenderContext, url: string) =>
  context.anchorPrefix && url.startsWith('#') ? `#${context.anchorPrefix}${url.slice(1)}` : url;

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
export function origin(node: { range: MdRange }): { 'data-mawy-range': string } {
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
            href={destination(context, node.url)}
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
              href={`#${footnoteId(context, footnote.slug)}`}
              id={referenceId(context, footnote.slug, node.index)}
              aria-describedby={footnoteId(context, footnote.slug)}
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
        ) : context.image ? (
          // Handed over whole rather than fetched here. Which pictures are
          // worth fetching, and with what on the request, is the application's
          // answer.
          <span key={index} className="mawy-md-image-slot" {...origin(node)}>
            <context.image src={node.url} alt={node.alt} title={node.title} />
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

      case 'inlineHtml': {
        const Html = context.live?.html ?? StillHtml;

        return (
          <Html
            key={index}
            value={node.value}
            context={context}
            inline
            marks={origin(node)}
            reveal={revealed(node, context)}
          />
        );
      }

      default:
        return null;
    }
  });
}

/* -------------------------------------------------------------------------
 * Raw HTML
 * ---------------------------------------------------------------------- */

/**
 * The same markup on a page that will never hydrate.
 *
 * No hooks, because there is nothing for them to be. `sanitize` needs a DOM to
 * parse with and a server has none, so it draws what a server already draws —
 * the markup as the characters it was written with. The difference is that
 * there is no render after this one for the elements to arrive on, which is
 * what `raw` is for and what the guide says about it.
 */
function StillHtml(props: {
  value: string;
  context: RenderContext;
  inline?: boolean;
  marks?: { 'data-mawy-range': string };
  reveal?: boolean;
}): React.ReactElement {
  return drawnHtml(props, props.context.html === 'raw' ? props.value : null);
}

export function drawnHtml(
  {
    value,
    inline,
    marks,
    reveal
  }: {
    value: string;
    context: RenderContext;
    inline?: boolean;
    marks?: { 'data-mawy-range': string };
    reveal?: boolean;
  },
  html: string | null
): React.ReactElement {
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
export function checkedTokens(
  tokens: MawyCodeToken[] | null,
  code: string
): MawyCodeToken[] | null {
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

export function CodeText({
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
 * A code block, drawn — with whatever colour it has and whatever button it has.
 *
 * The two callers are the same block on a page that will be interacted with
 * and on one that will not, and the difference between them is two things this
 * takes as arguments rather than two copies of the markup.
 */
export function drawnCode(
  block: MdCode,
  context: RenderContext,
  tokens: MawyCodeToken[] | null,
  copy: React.ReactNode
): React.ReactElement {
  const { value, lang } = block;

  return (
    <div className="mawy-md-pre" data-mawy-lang={lang ?? undefined} {...origin(block)}>
      {/* A box that scrolls sideways and cannot be focused is content a
          keyboard cannot reach the right-hand end of, which is WCAG 2.1.1.
          A tab stop on every block rather than only on the ones that overflow:
          whether it overflows is a question about the width it is drawn at, and
          answering it would mean measuring every code block on every resize —
          which is a great deal of work to save a keyboard one press. */}
      <pre tabIndex={0}>
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
      {copy}
    </div>
  );
}

/**
 * The same block on a page that will never hydrate.
 *
 * No hooks, because there is nothing for them to be: this is a server
 * component and a server component has no state to hold. No copy button
 * either, for the same reason — a button nothing is listening to is a control
 * that lies about being one. And only a highlighter that answers straight
 * away, since there is no second render for a promise to arrive on.
 */
function StillCode({
  block,
  context
}: {
  block: MdCode;
  context: RenderContext;
}): React.ReactElement {
  return drawnCode(block, context, stillTokens(block, context.highlighter ?? null), null);
}

/** What a highlighter says about a block, if it says it at once. */
function stillTokens(block: MdCode, highlighter: MawyHighlighter | null): MawyCodeToken[] | null {
  const { value, lang } = block;

  if (!highlighter || !lang || !value) {
    return null;
  }

  try {
    const answer = highlighter.supports(lang) ? highlighter.highlight(value, lang) : null;

    return checkedTokens(Array.isArray(answer) ? answer : null, value);
  } catch {
    // A highlighter is somebody else's code running inside a render. It is
    // allowed to be wrong; it is not allowed to take the document down.
    return null;
  }
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
          <li key={index} id={footnoteId(context, footnote.slug)} {...origin(footnote)}>
            {renderBlocks(footnote.children, context)}
            <a
              className="mawy-md-footnote-back"
              href={`#${referenceId(context, footnote.slug, 0)}`}
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
            id={`${context.anchorPrefix ?? ''}${block.slug}`}
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

      case 'code': {
        const Code = context.live?.code ?? StillCode;

        return <Code key={index} block={block} context={context} />;
      }

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
          <div key={index} className="mawy-md-table-scroll" tabIndex={0} {...origin(block)}>
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

      case 'html': {
        const Html = context.live?.html ?? StillHtml;

        return (
          <Html
            key={index}
            value={block.value}
            context={context}
            marks={origin(block)}
            reveal={revealed(block, context)}
          />
        );
      }

      default:
        return null;
    }
  });
}
