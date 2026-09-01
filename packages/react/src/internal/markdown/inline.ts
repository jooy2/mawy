/**
 * The inline parser: everything inside a paragraph, a heading or a table cell.
 *
 * Emphasis is the reason this file is not a handful of regular expressions.
 * `*foo**bar**baz*` and `**foo*bar*baz**` are different documents made of the
 * same characters, and which asterisk pairs with which is decided by what is on
 * either side of every run in the line — so a run cannot be resolved when it is
 * read. The delimiter stack below is CommonMark's own answer to that: read the
 * line once into a list of chunks, remembering which runs *could* open and
 * which *could* close, and only then walk the list pairing them off.
 *
 * Links are on the same list for the same reason: `[a [b](c)](d)` needs the
 * inner `]` to consume the inner `[`, which is a fact about the whole line.
 */

import type { MdDefinition, MdInline, MdRange, MdText } from './ast.js';
import { readDirectiveHead } from './directive.js';
import { decodeEntities } from './entities.js';
import { endOffset, rangeOf, slice, type Sourced } from './source.js';
import { safeImageUrl, safeUrl } from './url.js';

export interface InlineOptions {
  /** GitHub's additions: `~~strikethrough~~` and bare URLs becoming links. */
  gfm: boolean;
  /** Whether a single newline inside a paragraph is a line break. */
  breaks: boolean;
  /** The document's link reference definitions, already collected. */
  definitions: Map<string, MdDefinition>;
  /**
   * The labels of the footnotes the document actually defines. A `[^a]` with
   * nothing to point at is the four characters it was written with — the same
   * answer an unresolved `[a][b]` gets.
   */
  footnotes: Set<string>;
}

/* -------------------------------------------------------------------------
 * The chunk list
 * ---------------------------------------------------------------------- */

interface Delimiter {
  char: string;
  /** How many of the run are still unused. Reaches zero and the chunk goes. */
  length: number;
  /** How long the run was when it was read — the "rule of three" needs this. */
  original: number;
  canOpen: boolean;
  canClose: boolean;
}

interface Opener {
  image: boolean;
  /**
   * A link may not contain another link. Closing one deactivates every *link*
   * opener to its left, so `[a [b](c)](d)` gives the inner link and leaves the
   * outer brackets as text.
   *
   * An image opener is left alone, and that is the whole of the difference
   * between the two: a description may hold a link, and `![a [b](c)](d)` is one
   * image whose alt text is `a b`.
   */
  active: boolean;
  /** Where the label's text starts in the source, for a reference lookup. */
  textStart: number;
}

interface Chunk {
  node: MdInline;
  delimiter: Delimiter | null;
  opener: Opener | null;
}

interface State {
  chunks: Chunk[];
  /** The chunks that are delimiter runs, in source order. */
  delimiters: Chunk[];
  /** The `[` and `![` chunks that have not been closed, innermost last. */
  openers: Chunk[];
}

function textChunk(value: string, range: MdRange): Chunk {
  return { node: { type: 'text', range, value }, delimiter: null, opener: null };
}

function nodeChunk(node: MdInline): Chunk {
  return { node, delimiter: null, opener: null };
}

function drop<T>(list: T[], item: T): void {
  const at = list.indexOf(item);

  if (at !== -1) {
    list.splice(at, 1);
  }
}

/* -------------------------------------------------------------------------
 * Character classes
 * ---------------------------------------------------------------------- */

const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/;
const ESCAPABLE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

/**
 * Whether a delimiter run has content on its left, on its right, or both.
 *
 * This is the whole of CommonMark's emphasis rule and it is easy to get subtly
 * wrong: a run is *left-flanking* when it is not followed by whitespace and
 * either is not followed by punctuation or is itself preceded by whitespace or
 * punctuation. Which is a long way of saying: the run is up against a word on
 * its right.
 */
function flanking(source: string, start: number, end: number): [boolean, boolean] {
  const before = start > 0 ? source[start - 1] : ' ';
  const after = end < source.length ? source[end] : ' ';

  const whitespaceBefore = WHITESPACE.test(before);
  const whitespaceAfter = WHITESPACE.test(after);
  const punctuationBefore = PUNCTUATION.test(before);
  const punctuationAfter = PUNCTUATION.test(after);

  const left = !whitespaceAfter && (!punctuationAfter || whitespaceBefore || punctuationBefore);
  const right = !whitespaceBefore && (!punctuationBefore || whitespaceAfter || punctuationAfter);

  return [left, right];
}

/* -------------------------------------------------------------------------
 * Emphasis
 * ---------------------------------------------------------------------- */

/**
 * The "rule of three".
 *
 * Without it, `*foo**bar**baz*` pairs the wrong asterisks and the sentence
 * comes out as two nested emphases instead of one containing a strong. The rule
 * is stated in the specification exactly as it is written here, and the reason
 * it looks arbitrary is that it is: it is the smallest patch that makes the
 * common intraword cases come out the way an author expects.
 */
function blockedByRuleOfThree(opener: Delimiter, closer: Delimiter): boolean {
  if (!closer.canOpen && !opener.canClose) {
    return false;
  }

  if ((opener.original + closer.original) % 3 !== 0) {
    return false;
  }

  return opener.original % 3 !== 0 || closer.original % 3 !== 0;
}

/**
 * Pair off every delimiter above `bottom` and fold what is between each pair
 * into an `emphasis`, a `strong` or a `delete`.
 *
 * Runs that never find a partner stay exactly as they were typed, which is why
 * the delimiter's characters live in a real text node the whole time rather
 * than being held to one side and put back on failure.
 */
function processEmphasis(state: State, bottom: number): void {
  const { chunks, delimiters } = state;
  const openersBottom = new Map<string, number>();
  let closerIndex = bottom;

  while (closerIndex < delimiters.length) {
    const closerChunk = delimiters[closerIndex];
    const closer = closerChunk.delimiter as Delimiter;

    if (!closer.canClose) {
      closerIndex += 1;
      continue;
    }

    const key = `${closer.char}:${closer.original % 3}:${closer.canOpen}`;
    const floor = Math.max(openersBottom.get(key) ?? bottom, bottom);
    let found = -1;

    for (let at = closerIndex - 1; at >= floor; at -= 1) {
      const candidate = delimiters[at].delimiter as Delimiter;

      if (
        candidate.canOpen &&
        candidate.char === closer.char &&
        !blockedByRuleOfThree(candidate, closer)
      ) {
        found = at;
        break;
      }
    }

    if (found === -1) {
      openersBottom.set(key, closerIndex);

      // A run that can only close and matched nothing is finished with: it
      // stays on the page as text, but nothing later can pair with it.
      if (!closer.canOpen) {
        delimiters.splice(closerIndex, 1);
      } else {
        closerIndex += 1;
      }

      continue;
    }

    const openerChunk = delimiters[found];
    const opener = openerChunk.delimiter as Delimiter;
    const use = closer.char === '~' || (opener.length >= 2 && closer.length >= 2) ? 2 : 1;

    const openerAt = chunks.indexOf(openerChunk);
    const closerAt = chunks.indexOf(closerChunk);
    const children = chunks.slice(openerAt + 1, closerAt).map((chunk) => chunk.node);

    // The characters that pair off are the *last* of the opening run and the
    // first of the closing one, so the node starts where what is left of the
    // opener ends. A run is a run of one character, which is what lets both
    // ends be counted rather than looked up.
    const openerNode = openerChunk.node as MdText;
    const closerNode = closerChunk.node as MdText;
    const range: MdRange = {
      start: openerNode.range.end - use,
      end: closerNode.range.start + use
    };

    const node: MdInline =
      closer.char === '~'
        ? { type: 'delete', range, children }
        : use === 2
          ? { type: 'strong', range, children }
          : { type: 'emphasis', range, children };

    chunks.splice(openerAt + 1, closerAt - openerAt - 1, nodeChunk(node));
    delimiters.splice(found + 1, closerIndex - found - 1);
    closerIndex = found + 1;

    opener.length -= use;
    closer.length -= use;
    openerNode.value = closer.char.repeat(opener.length);
    openerNode.range = { start: openerNode.range.start, end: range.start };
    closerNode.value = closer.char.repeat(closer.length);
    closerNode.range = { start: range.end, end: closerNode.range.end };

    if (closer.length === 0) {
      drop(chunks, closerChunk);
      drop(delimiters, closerChunk);
    }

    if (opener.length === 0) {
      drop(chunks, openerChunk);
      drop(delimiters, openerChunk);
      closerIndex -= 1;
    }
  }

  delimiters.length = bottom;
}

/* -------------------------------------------------------------------------
 * Link destinations and labels
 * ---------------------------------------------------------------------- */

interface Destination {
  url: string;
  title: string | null;
  end: number;
}

/** `(url "title")` — the parenthesised half of an inline link. */
function readInlineDestination(source: string, start: number): Destination | null {
  let at = start + 1;

  const skipSpace = () => {
    while (at < source.length && WHITESPACE.test(source[at])) {
      at += 1;
    }
  };

  skipSpace();

  let url = '';

  if (source[at] === '<') {
    at += 1;

    while (at < source.length && source[at] !== '>') {
      if (source[at] === '\n') {
        return null;
      }

      if (source[at] === '\\' && ESCAPABLE.test(source[at + 1] ?? '')) {
        at += 1;
      }

      url += source[at];
      at += 1;
    }

    if (source[at] !== '>') {
      return null;
    }

    at += 1;
  } else {
    let depth = 0;

    while (at < source.length) {
      const character = source[at];

      if (WHITESPACE.test(character)) {
        break;
      }

      if (character === '\\' && ESCAPABLE.test(source[at + 1] ?? '')) {
        url += source[at + 1];
        at += 2;
        continue;
      }

      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        if (depth === 0) {
          break;
        }

        depth -= 1;
      }

      url += character;
      at += 1;
    }
  }

  skipSpace();

  let title: string | null = null;
  const quote = source[at];

  if (quote === '"' || quote === "'" || quote === '(') {
    const closing = quote === '(' ? ')' : quote;
    at += 1;
    title = '';

    while (at < source.length && source[at] !== closing) {
      if (source[at] === '\\' && ESCAPABLE.test(source[at + 1] ?? '')) {
        at += 1;
      }

      title += source[at];
      at += 1;
    }

    if (source[at] !== closing) {
      return null;
    }

    at += 1;
    skipSpace();
  }

  if (source[at] !== ')') {
    return null;
  }

  return {
    url: decodeEntities(url),
    title: title === null ? null : decodeEntities(title),
    end: at + 1
  };
}

/**
 * A backslash taken off whatever it was in front of.
 *
 * A destination, a title, a reference label and a fence's info string all read
 * their escapes rather than showing them, and each of them is scanned by a
 * regular expression that keeps the characters as written — so this is what
 * turns `/bar\\*` into `/bar*` afterwards.
 */
export function unescaped(text: string): string {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
}

/**
 * A reference label, folded to the form definitions are stored under.
 *
 * Case and runs of whitespace do not distinguish two labels, so `[Foo Bar]` and
 * `[foo   bar]` are the same reference. Folding here and at the definition site
 * means the map never has to be searched twice.
 *
 * An escape is *not* read here, and that is the specification rather than an
 * oversight: `[foo\\!]` and `[foo!]` are two labels. Both sides fold the
 * characters as written, so both sides agree, and what the escape means is
 * settled where the label is drawn rather than where it is looked up.
 */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** `[label]` immediately after a closed `]`, for a full reference link. */
function readReferenceLabel(source: string, start: number): { label: string; end: number } | null {
  if (source[start] !== '[') {
    return null;
  }

  let at = start + 1;
  let label = '';

  while (at < source.length) {
    const character = source[at];

    if (character === '\\' && ESCAPABLE.test(source[at + 1] ?? '')) {
      label += source.slice(at, at + 2);
      at += 2;
      continue;
    }

    if (character === '[') {
      return null;
    }

    if (character === ']') {
      return { label, end: at + 1 };
    }

    label += character;
    at += 1;
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Leaf scanners
 * ---------------------------------------------------------------------- */

/** A run of backticks, and the matching run that closes it. */
function readCodeSpan(source: string, start: number): { value: string; end: number } | null {
  let fence = 0;

  while (source[start + fence] === '`') {
    fence += 1;
  }

  let at = start + fence;

  while (at < source.length) {
    if (source[at] !== '`') {
      at += 1;
      continue;
    }

    let run = 0;

    while (source[at + run] === '`') {
      run += 1;
    }

    if (run === fence) {
      let value = source.slice(start + fence, at).replace(/\n/g, ' ');

      // One space is stripped from each end when there is one at both — that is
      // what lets a code span hold a literal backtick: `` ` ``.
      if (value.length > 2 && value.startsWith(' ') && value.endsWith(' ') && value.trim()) {
        value = value.slice(1, -1);
      }

      return { value, end: at + run };
    }

    at += run;
  }

  return null;
}

const AUTOLINK_URI = /^<([A-Za-z][A-Za-z\d+.-]{1,31}:[^\s<>]*)>/;
const AUTOLINK_EMAIL =
  /^<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>/;
// An attribute name is a letter, `_` or `:` and then letters, digits, `_`,
// `.`, `:` and `-` — which is the specification's own rule, and is narrower
// than "anything that is not a space or a quote": `<a h*#ref="hi">` is a
// sentence about a tag rather than a tag, and so is a second line of one that
// begins `bim!bop`.
//
// `<!-->` and `<!--->` are comments in their own right, so they are tried
// before the general form. Without that, `<!--> foo -->` is one comment as far
// as the closing `-->` rather than a comment and then some text.
const INLINE_HTML =
  /^(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[A-Za-z_:][A-Za-z\d_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<\/[A-Za-z][A-Za-z\d-]*\s*>|<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)/;

/* -------------------------------------------------------------------------
 * Bare URLs
 * ---------------------------------------------------------------------- */

const LITERAL =
  /(?:https?:\/\/|www\.)[^\s<]+|[A-Za-z\d._%+-]+@[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)+/g;

/** Only after whitespace or one of the few marks a URL is written next to. */
function canStartLiteral(before: string | undefined): boolean {
  return before === undefined || WHITESPACE.test(before) || '*_~([{'.includes(before);
}

/**
 * Trailing punctuation that belongs to the sentence rather than to the URL.
 *
 * "See https://example.com." ends in a full stop, and a link that swallowed it
 * would be a link to the wrong page. The closing parenthesis is the awkward one
 * — Wikipedia URLs end in one legitimately — so it is kept only while the
 * parentheses in the match balance.
 */
function trimLiteral(match: string): string {
  let end = match.length;

  while (end > 0) {
    const character = match[end - 1];

    if ('!"\'*,.:;?_~'.includes(character)) {
      end -= 1;
      continue;
    }

    if (character === ')') {
      const slice = match.slice(0, end);
      const opens = (slice.match(/\(/g) ?? []).length;
      const closes = (slice.match(/\)/g) ?? []).length;

      if (closes > opens) {
        end -= 1;
        continue;
      }
    }

    break;
  }

  // `&copy;` at the end of a URL is a character reference in the prose around
  // it far more often than it is part of the address.
  const trimmed = match.slice(0, end);
  const entity = /&[A-Za-z\d]+;$/.exec(trimmed);

  return entity ? trimmed.slice(0, entity.index) : trimmed;
}

/**
 * A text node split around the bare URLs and e-mail addresses inside it.
 *
 * The pieces get their offsets by counting from the node's own start, which is
 * exact whenever the node is the characters it was written with — and it is,
 * unless a character reference or a backslash escape was decoded on the way in.
 * Nothing is left to say where those went, so the count is held inside the
 * node's range instead: a piece may then be a character or two out, and is
 * still in order and still inside the node it came from.
 */
function linkifyText(node: MdText): MdInline[] {
  const { value } = node;
  const offset = (index: number) => Math.min(node.range.start + index, node.range.end);
  const out: MdInline[] = [];
  let last = 0;

  LITERAL.lastIndex = 0;

  for (let match = LITERAL.exec(value); match; match = LITERAL.exec(value)) {
    const at = match.index;

    if (!canStartLiteral(at === 0 ? undefined : value[at - 1])) {
      continue;
    }

    const text = trimLiteral(match[0]);

    if (!text) {
      continue;
    }

    const email = !/^(?:https?:\/\/|www\.)/i.test(text);
    const url = safeUrl(
      email ? `mailto:${text}` : text.startsWith('www.') ? `http://${text}` : text
    );

    if (!url) {
      continue;
    }

    if (at > last) {
      out.push({
        type: 'text',
        range: { start: offset(last), end: offset(at) },
        value: value.slice(last, at)
      });
    }

    const range = { start: offset(at), end: offset(at + text.length) };

    out.push({
      type: 'link',
      range,
      url,
      title: null,
      children: [{ type: 'text', range, value: text }]
    });
    last = at + text.length;
    LITERAL.lastIndex = last;
  }

  if (last < value.length) {
    out.push({
      type: 'text',
      range: { start: offset(last), end: node.range.end },
      value: value.slice(last)
    });
  }

  return out.length ? out : [node];
}

/** The same, over a finished tree — but never inside a link, which has one. */
function linkify(nodes: MdInline[]): MdInline[] {
  const out: MdInline[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      out.push(...linkifyText(node));
      continue;
    }

    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
      out.push({ ...node, children: linkify(node.children) });
      continue;
    }

    out.push(node);
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Tidying
 * ---------------------------------------------------------------------- */

/** Adjacent text nodes joined, empty ones dropped. */
function merge(nodes: MdInline[]): MdInline[] {
  const out: MdInline[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      if (!node.value) {
        continue;
      }

      const previous = out[out.length - 1];

      if (previous?.type === 'text') {
        previous.value += node.value;
        previous.range = { start: previous.range.start, end: node.range.end };
        continue;
      }

      out.push({ type: 'text', range: node.range, value: node.value });
      continue;
    }

    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
      out.push({ ...node, children: merge(node.children) });
      continue;
    }

    if (node.type === 'link') {
      out.push({ ...node, children: merge(node.children) });
      continue;
    }

    out.push(node);
  }

  return out;
}

/** What a run of inline nodes says, with the formatting taken off. */
export function toPlainText(nodes: MdInline[]): string {
  let out = '';

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'inlineCode':
        out += node.value;
        break;
      case 'image':
        out += node.alt;
        break;
      case 'break':
        out += ' ';
        break;
      // A footnote's number is not part of what the sentence says, and a
      // heading with one in it should slug and outline without it.
      case 'footnoteReference':
        break;
      case 'inlineHtml':
        break;
      default:
        out += toPlainText(node.children);
        break;
    }
  }

  return out;
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

export function parseInline(raw: Sourced, options: InlineOptions): MdInline[] {
  const source = raw.text;
  const state: State = { chunks: [], delimiters: [], openers: [] };
  const { chunks, delimiters, openers } = state;

  /** Where a stretch of this text sits in the document. */
  const span = (from: number, to: number): MdRange => rangeOf(raw, from, to);

  let pending = '';
  let pendingAt = 0;
  let at = 0;

  /** Characters that are going to be a text node, once something ends it. */
  const hold = (text: string, from: number) => {
    if (!pending) {
      pendingAt = from;
    }

    pending += text;
  };

  const flush = () => {
    if (pending) {
      chunks.push(textChunk(decodeEntities(pending), span(pendingAt, pendingAt + pending.length)));
      pending = '';
    }
  };

  /** Where in `delimiters` the run that follows this chunk begins. */
  const delimiterBottom = (chunk: Chunk): number => {
    const positions = new Map(chunks.map((each, index) => [each, index]));
    const after = positions.get(chunk) ?? 0;

    for (let index = 0; index < delimiters.length; index += 1) {
      if ((positions.get(delimiters[index]) ?? 0) > after) {
        return index;
      }
    }

    return delimiters.length;
  };

  while (at < source.length) {
    const character = source[at];

    /* A backslash: an escape, or a hard break at the end of a line. */
    if (character === '\\') {
      const next = source[at + 1];

      if (next === '\n') {
        flush();
        chunks.push(nodeChunk({ type: 'break', range: span(at, at + 2) }));
        at += 2;

        while (WHITESPACE.test(source[at] ?? '') && source[at] !== '\n') {
          at += 1;
        }

        continue;
      }

      if (next !== undefined && ESCAPABLE.test(next)) {
        flush();
        chunks.push(textChunk(next, span(at, at + 2)));
        at += 2;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    if (character === '`') {
      const code = readCodeSpan(source, at);

      if (code) {
        flush();
        chunks.push(
          nodeChunk({ type: 'inlineCode', range: span(at, code.end), value: code.value })
        );
        at = code.end;
        continue;
      }

      let run = 0;

      while (source[at + run] === '`') {
        run += 1;
      }

      hold(source.slice(at, at + run), at);
      at += run;
      continue;
    }

    if (character === '<') {
      const rest = source.slice(at);
      const uri = AUTOLINK_URI.exec(rest);

      if (uri) {
        const url = safeUrl(uri[1]);
        const range = span(at, at + uri[0].length);
        const inside = span(at + 1, at + 1 + uri[1].length);
        flush();
        chunks.push(
          url
            ? nodeChunk({
                type: 'link',
                range,
                url,
                title: null,
                children: [{ type: 'text', range: inside, value: uri[1] }]
              })
            : textChunk(uri[1], range)
        );
        at += uri[0].length;
        continue;
      }

      const email = AUTOLINK_EMAIL.exec(rest);

      if (email) {
        flush();
        chunks.push(
          nodeChunk({
            type: 'link',
            range: span(at, at + email[0].length),
            url: `mailto:${email[1]}`,
            title: null,
            children: [
              { type: 'text', range: span(at + 1, at + 1 + email[1].length), value: email[1] }
            ]
          })
        );
        at += email[0].length;
        continue;
      }

      const html = INLINE_HTML.exec(rest);

      if (html) {
        flush();
        // Whether this reaches the page as markup or as four visible characters
        // is the renderer's decision, not the parser's — the tree says what the
        // document says, and policy is applied once, where it can be seen.
        chunks.push(
          nodeChunk({
            type: 'inlineHtml',
            range: span(at, at + html[0].length),
            value: html[0]
          })
        );
        at += html[0].length;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    /* A directive: a construct this parser reads and does not understand. */
    if (character === ':' && source[at - 1] !== ':' && source[at + 1] !== ':') {
      const head = readDirectiveHead(source, at + 1);
      // A name on its own is not enough here. A colon is a colon in far more
      // sentences than it is a directive — `Note:` and `see:foo` among them —
      // so an inline one has to carry a `[label]` or `{attributes}` to be one.
      const named = head !== null && head.end > at + 1 + head.name.length;

      if (head && named) {
        flush();
        chunks.push(
          nodeChunk({
            type: 'textDirective',
            range: span(at, head.end),
            name: head.name,
            attributes: head.attributes,
            children: head.label
              ? parseInline(slice(raw, head.label.start, head.label.end), options)
              : []
          })
        );
        at = head.end;
        continue;
      }
    }

    /* A footnote, which is a label that points at a block written elsewhere. */
    if (character === '[' && source[at + 1] === '^') {
      const close = source.indexOf(']', at + 2);
      const label = close === -1 ? '' : normalizeLabel(source.slice(at + 2, close));

      if (label && options.footnotes.has(label)) {
        flush();
        chunks.push(
          nodeChunk({ type: 'footnoteReference', range: span(at, close + 1), label, index: 0 })
        );
        at = close + 1;
        continue;
      }
    }

    if (character === '[' || (character === '!' && source[at + 1] === '[')) {
      const image = character === '!';
      const text = image ? '![' : '[';
      flush();

      const chunk = textChunk(text, span(at, at + text.length));
      chunk.opener = { image, active: true, textStart: at + text.length };
      chunks.push(chunk);
      openers.push(chunk);
      at += text.length;
      continue;
    }

    if (character === ']') {
      flush();

      const openerChunk = openers.pop();

      if (!openerChunk?.opener) {
        chunks.push(textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      const opener = openerChunk.opener;

      if (!opener.active) {
        // Deactivated by a link that closed inside this one. Both brackets are
        // now text — the opening one stays exactly where it was written, which
        // is what `[a [b](c)](d)` needs to keep its first character.
        chunks.push(textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      const labelText = source.slice(opener.textStart, at);
      let destination: Destination | null = null;
      let end = at + 1;

      if (source[at + 1] === '(') {
        destination = readInlineDestination(source, at + 1);

        if (destination) {
          end = destination.end;
        }
      }

      if (!destination) {
        const reference = readReferenceLabel(source, at + 1);
        const label = normalizeLabel(reference?.label || labelText);
        const found = label ? options.definitions.get(label) : undefined;

        // A shortcut reference cannot have a bracket in its label — but an
        // *escaped* one is a bracket the label is allowed to contain, so the
        // escapes go before the question is asked and `[Foo*bar\]]` is one
        // label rather than a failed reference.
        if (found && (reference || !/[[\]]/.test(labelText.replace(/\\./g, '')))) {
          destination = {
            url: found.url,
            title: found.title,
            end: reference ? reference.end : at + 1
          };
          end = destination.end;
        }
      }

      if (!destination) {
        // Not a link after all. The bracket that opened it is text, and so is
        // this one — but the opener is gone, so a later `]` cannot claim it.
        openerChunk.opener = null;
        chunks.push(textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      processEmphasis(state, delimiterBottom(openerChunk));

      const openerAt = chunks.indexOf(openerChunk);
      const children = chunks.slice(openerAt + 1).map((each) => each.node);
      const url = opener.image ? safeImageUrl(destination.url) : safeUrl(destination.url);
      const taken = chunks.length - openerAt;
      const range: MdRange = { start: openerChunk.node.range.start, end: endOffset(raw, end) };

      if (opener.image && url) {
        chunks.splice(
          openerAt,
          taken,
          nodeChunk({
            type: 'image',
            range,
            url,
            title: destination.title,
            alt: toPlainText(children)
          })
        );
      } else if (opener.image) {
        // A destination we will not follow. An image has nothing to fall back
        // to but the words the author wrote in place of it.
        chunks.splice(openerAt, taken, textChunk(toPlainText(children), range));
      } else if (url) {
        chunks.splice(
          openerAt,
          taken,
          nodeChunk({ type: 'link', range, url, title: destination.title, children })
        );
      } else {
        // The same for a link: the label stays and reads as ordinary text, so a
        // reader sees the sentence rather than a control that does nothing.
        chunks.splice(openerAt, taken, ...children.map(nodeChunk));
      }

      if (!opener.image) {
        for (const other of openers) {
          // Link openers only. An image's description is allowed to hold a
          // link, so the `![` further out is still an image waiting to close.
          if (other.opener && !other.opener.image) {
            other.opener.active = false;
          }
        }
      }

      at = end;
      continue;
    }

    if (character === '*' || character === '_' || (options.gfm && character === '~')) {
      let run = 0;

      while (source[at + run] === character) {
        run += 1;
      }

      // GitHub's strikethrough is exactly two tildes. One is a tilde, and three
      // is somebody drawing a line.
      if (character === '~' && run !== 2) {
        hold(source.slice(at, at + run), at);
        at += run;
        continue;
      }

      const [left, right] = flanking(source, at, at + run);
      const canOpen =
        character === '_' ? left && (!right || PUNCTUATION.test(source[at - 1] ?? ' ')) : left;
      const canClose =
        character === '_' ? right && (!left || PUNCTUATION.test(source[at + run] ?? ' ')) : right;

      flush();

      const chunk = textChunk(source.slice(at, at + run), span(at, at + run));
      chunk.delimiter = { char: character, length: run, original: run, canOpen, canClose };
      chunks.push(chunk);
      delimiters.push(chunk);
      at += run;
      continue;
    }

    if (character === '\n') {
      const hard = /[ \t]{2,}$/.test(pending);
      pending = pending.replace(/[ \t]+$/, '');
      // A hard break is the spaces as well as the newline: they are what makes
      // it one, and they are no part of the text node in front of it.
      const from = hard && pending ? pendingAt + pending.length : at;
      flush();

      chunks.push(
        hard || options.breaks
          ? nodeChunk({ type: 'break', range: span(from, at + 1) })
          : textChunk('\n', span(at, at + 1))
      );

      at += 1;

      while (source[at] === ' ' || source[at] === '\t') {
        at += 1;
      }

      continue;
    }

    hold(character, at);
    at += 1;
  }

  flush();
  processEmphasis(state, 0);

  const nodes = merge(chunks.map((each) => each.node));

  return options.gfm ? merge(linkify(nodes)) : nodes;
}
