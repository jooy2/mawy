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
  /**
   * Whether quotation marks are turned round, and `--`, `...` and `(c)` drawn
   * as the marks they stand in for.
   */
  typographer: boolean;
  /**
   * Whether a bare address carrying any scheme the link policy trusts becomes
   * a link, on top of the web addresses GFM reads.
   */
  autolinkSchemes: boolean;
  /** The four marks a quotation is drawn with, already filled in. */
  quotes: ResolvedQuotes;
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
  /**
   * How deep the tree under `node` goes, counting the node itself as one.
   *
   * Carried rather than measured, because measuring it would walk the subtree
   * that was just built and every node would be walked once per level above
   * it. See `NESTING`.
   */
  depth: number;
  /** What this chunk sits between. See `Chain`. */
  prev: Chunk | null;
  next: Chunk | null;
}

/**
 * The chunks of one run of text, in the order they were read.
 *
 * A list rather than an array, and that is the one structural decision in this
 * file. What this algorithm does to the chunks is take a span out of the middle
 * and put one node in its place, once for every pair of delimiters and once for
 * every link — and in an array that moves everything after the cut, so a
 * paragraph of `*a*` repeated cost the square of its own length. Reading them
 * back in order is the only other thing anybody does with them, and a list is
 * as good at that as an array is.
 */
interface Chain {
  head: Chunk | null;
  tail: Chunk | null;
}

interface State {
  chunks: Chain;
  /**
   * The chunks that are delimiter runs, in source order, with a hole where one
   * has been used up.
   *
   * An array, because the pairing walks it by index and remembers positions in
   * it — `openersBottom` is a note that says "no opener for this kind before
   * here". So a run that is finished with is replaced by `null` rather than
   * taken out, which keeps every position anybody is holding and costs nothing:
   * removing from the middle moved the rest, once per pair.
   */
  delimiters: (Chunk | null)[];
  /** The `[` and `![` chunks that have not been closed, innermost last. */
  openers: Chunk[];
}

/**
 * How deep emphasis, strong, strikethrough and links may nest inside one
 * paragraph before the delimiters left over are drawn as characters.
 *
 * The block parser has the same limit for the same reason, written up under
 * its own `NESTING`: reading a document is a stack of calls as deep as the
 * document is nested, and so is every walk of the tree afterwards. `*` written
 * sixteen thousand times is a paragraph eight thousand levels deep, and it ran
 * the stack out — in the renderer, in the merge pass, in an application's own
 * walk of the tree — at a different depth in each of the two languages this
 * parser is written in.
 *
 * A hundred is past anything a person writes. Past it, pairing simply stops
 * for the rest of the paragraph and what is left of the run is the characters
 * it was written with, which is what an unmatched delimiter is anyway.
 */
const NESTING = 100;

function textChunk(value: string, range: MdRange): Chunk {
  return {
    node: { type: 'text', range, value },
    delimiter: null,
    opener: null,
    depth: 1,
    prev: null,
    next: null
  };
}

function nodeChunk(node: MdInline, depth = 1): Chunk {
  return { node, delimiter: null, opener: null, depth, prev: null, next: null };
}

/** Onto the end of the chain, which is where reading puts every chunk. */
function append(chain: Chain, chunk: Chunk): Chunk {
  chunk.prev = chain.tail;
  chunk.next = null;

  if (chain.tail) {
    chain.tail.next = chunk;
  } else {
    chain.head = chunk;
  }

  chain.tail = chunk;

  return chunk;
}

/** Out of the chain, leaving what was on either side of it beside each other. */
function unlink(chain: Chain, chunk: Chunk): void {
  if (chunk.prev) {
    chunk.prev.next = chunk.next;
  } else {
    chain.head = chunk.next;
  }

  if (chunk.next) {
    chunk.next.prev = chunk.prev;
  } else {
    chain.tail = chunk.prev;
  }

  chunk.prev = null;
  chunk.next = null;
}

/** Everything from `chunk` to the end of the chain goes, and `chunk` with it. */
function cut(chain: Chain, chunk: Chunk): void {
  chain.tail = chunk.prev;

  if (chunk.prev) {
    chunk.prev.next = null;
  } else {
    chain.head = null;
  }
}

/**
 * The nodes strictly between two chunks, and how deep the deepest of them goes.
 *
 * `to` of `null` means the end of the chain, which is what a link's label is:
 * everything written after the `[` that opened it.
 */
function between(from: Chunk, to: Chunk | null): { children: MdInline[]; depth: number } {
  const children: MdInline[] = [];
  let depth = 0;

  for (let at = from.next; at && at !== to; at = at.next) {
    children.push(at.node);

    if (at.depth > depth) {
      depth = at.depth;
    }
  }

  return { children, depth };
}

/** One chunk in place of everything between these two. */
function fold(opener: Chunk, made: Chunk, closer: Chunk): void {
  opener.next = made;
  made.prev = opener;
  made.next = closer;
  closer.prev = made;
}

/* -------------------------------------------------------------------------
 * Character classes
 * ---------------------------------------------------------------------- */

const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/;
/**
 * The five characters the specification calls whitespace, by code.
 *
 * Not `\s`, which is every Unicode space there is — and a no-break space is
 * one of those and is not one of these. `[link](/url\u00a0"title")` has a
 * destination of `/url\u00a0"title"` and no title at all, because nothing
 * separated the two.
 *
 * The flanking rules above *do* want `\s`: those are written in terms of
 * Unicode whitespace rather than these five, which is why both are here.
 *
 * A code rather than a pattern, because the caller that matters reads a
 * destination one character at a time and reads it again from every `]` after
 * it, which is the length of a paragraph squared on a document written to make
 * it. A regular expression run for every single character was most of what
 * that cost.
 */
const isAsciiWhitespaceCode = (code: number) =>
  code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d;

/**
 * ASCII punctuation, which is the whole of what a backslash may escape.
 *
 * The four ranges are `!` to `/`, `:` to `@`, `[` to a backtick, and `{` to
 * `~`, which is every printable ASCII character that is neither a letter nor a
 * digit.
 */
const isEscapableCode = (code: number) =>
  (code >= 0x21 && code <= 0x2f) ||
  (code >= 0x3a && code <= 0x40) ||
  (code >= 0x5b && code <= 0x60) ||
  (code >= 0x7b && code <= 0x7e);

/** The code at `index`, or `-1` where there is no character there. */
const codeAt = (source: string, index: number) =>
  index >= 0 && index < source.length ? source.charCodeAt(index) : -1;

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

    // A hole, where a run that used to be here has been used up.
    if (!closerChunk) {
      closerIndex += 1;
      continue;
    }

    const closer = closerChunk.delimiter as Delimiter;

    if (!closer.canClose) {
      closerIndex += 1;
      continue;
    }

    const key = `${closer.char}:${closer.original % 3}:${closer.canOpen}`;
    const floor = Math.max(openersBottom.get(key) ?? bottom, bottom);
    let found = -1;

    for (let at = closerIndex - 1; at >= floor; at -= 1) {
      const candidate = delimiters[at]?.delimiter as Delimiter | undefined;

      if (
        candidate?.canOpen &&
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
        delimiters[closerIndex] = null;
      }

      closerIndex += 1;
      continue;
    }

    const openerChunk = delimiters[found] as Chunk;
    const opener = openerChunk.delimiter as Delimiter;
    const use = closer.char === '~' || (opener.length >= 2 && closer.length >= 2) ? 2 : 1;
    const { children, depth: under } = between(openerChunk, closerChunk);
    const depth = under + 1;

    // Too deep to wrap, and every pair still waiting is one level deeper than
    // this one — so nothing more is paired in this paragraph and the runs that
    // are left stay the characters they were written with. See `NESTING`.
    if (depth > NESTING) {
      break;
    }

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

    fold(openerChunk, nodeChunk(node, depth), closerChunk);

    // Everything between the two is inside the node now, so no run in there can
    // pair with anything ever again.
    for (let at = found + 1; at < closerIndex; at += 1) {
      delimiters[at] = null;
    }

    opener.length -= use;
    closer.length -= use;
    openerNode.value = closer.char.repeat(opener.length);
    openerNode.range = { start: openerNode.range.start, end: range.start };
    closerNode.value = closer.char.repeat(closer.length);
    closerNode.range = { start: range.end, end: closerNode.range.end };

    if (closer.length === 0) {
      unlink(chunks, closerChunk);
      delimiters[closerIndex] = null;
    }

    if (opener.length === 0) {
      unlink(chunks, openerChunk);
      delimiters[found] = null;
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

/**
 * Where a destination read from each place could first stop, or `-1` for the
 * places a read from which runs off the end of the text.
 *
 * A destination that never closes is read to the end, and read again from every
 * `]` written after it, so `[a](` repeated cost the square of its own length —
 * the one shape left after the chunks became a list. This is what lets the
 * second read answer without reading: a run that stops nowhere is refused,
 * always, because the check at the end of the read wants a `)` and there is
 * none.
 *
 * Three things stop a read, and the table holds the nearest of them:
 *
 * - A space, which is where a bare destination ends.
 * - A `)` the read is not inside a pair of brackets for. Whether it is depends
 *   on where the read began, and the running count of brackets is what says so:
 *   a read from `s` breaks at the first `)` at `r` where the count is what it
 *   was at `s`, because that is what a depth of zero means.
 * - A backslash, which is not a stop at all and is counted as one anyway. What
 *   it escapes depends on where the read began — `\\(` is a bracket to a read
 *   starting on the second character and an escape to one starting on the
 *   first — so one table cannot answer for both, and the answer is to stop
 *   claiming to. A run with a backslash in it is read the long way.
 *
 * Built once, and only after a read has run off the end and been refused, so a
 * document whose destinations all close pays nothing for it.
 */
function reachOf(source: string): Int32Array {
  const stop = new Int32Array(source.length + 1).fill(-1);
  const closes = new Map<number, number>();
  // Counted from the right, so it is the count at `at` rather than up to it.
  // Only ever compared against itself, so where it starts does not matter.
  let brackets = 0;
  let halt = -1;

  for (let at = source.length - 1; at >= 0; at -= 1) {
    const code = source.charCodeAt(at);

    if (code === 0x28) {
      brackets -= 1;
    } else if (code === 0x29) {
      brackets += 1;
    }

    if (isAsciiWhitespaceCode(code) || code === 0x5c) {
      halt = at;
    } else if (code === 0x29) {
      closes.set(brackets, at);
    }

    const close = closes.get(brackets) ?? -1;

    stop[at] = halt === -1 ? close : close === -1 ? halt : Math.min(halt, close);
  }

  return stop;
}

/** What has been worked out about a run of text, once anything needed it. */
interface Reach {
  stop: Int32Array | null;
}

/** `(url "title")` — the parenthesised half of an inline link. */
function readInlineDestination(source: string, start: number, reach: Reach): Destination | null {
  let at = start + 1;

  const skipSpace = () => {
    while (at < source.length && isAsciiWhitespaceCode(source.charCodeAt(at))) {
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

      if (source[at] === '\\' && isEscapableCode(codeAt(source, at + 1))) {
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
    // Already known to read to the end of the text, and a read that does that
    // is refused below whatever it read. See `reachOf`.
    if (reach.stop && reach.stop[at] === -1) {
      return null;
    }

    let depth = 0;

    while (at < source.length) {
      const character = source[at];

      if (isAsciiWhitespaceCode(source.charCodeAt(at))) {
        break;
      }

      if (character === '\\' && isEscapableCode(codeAt(source, at + 1))) {
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

    // Off the end, which is refused below and will be refused every time. The
    // table is what makes the next one cheap, and this is the first moment
    // anybody needs it.
    if (at >= source.length) {
      reach.stop ??= reachOf(source);
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
      if (source[at] === '\\' && isEscapableCode(codeAt(source, at + 1))) {
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

    if (character === '\\' && isEscapableCode(codeAt(source, at + 1))) {
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

/**
 * A host with a dot in it, which is what tells an address from a word.
 *
 * `example.com` and `a.b.co.uk` are addresses and `localhost` is not, which is
 * also what keeps `//server/share` — a path on a Windows network — from being
 * read as an address that left its scheme to the page.
 */
const HOST = String.raw`[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)+`;

/**
 * An e-mail address, written with no markup around it.
 *
 * The local part is held to sixty-four characters, which is the limit RFC 5321
 * puts on it. Without a bound the `+` reads to the end of the paragraph looking
 * for an `@`, gives the last character back, looks again, and does that from
 * every position it could start at — so a run of letters with no space in it,
 * a base64 blob among them, cost the square of its own length. Sixty-four
 * kilobytes of it took seven seconds and now takes fourteen milliseconds.
 */
const EMAIL = String.raw`[A-Za-z\d._%+-]{1,64}@${HOST}`;

/** A bare URL or an address, in the three shapes GFM reads. */
const LITERAL = new RegExp(String.raw`(?:https?://|www\.)[^\s<]+|${EMAIL}`, 'g');

/**
 * The same, widened to every other scheme and to an address that left its
 * scheme to the page.
 *
 * Which schemes is not decided here: the run only has to *look* like an address
 * with a scheme on it, and `safeUrl` then refuses every scheme the library will
 * not follow. So this and the allowlist cannot disagree about what `ftp://` is,
 * and a `TODO:x` in a sentence is read, refused and drawn as the words it is.
 *
 * The web addresses come first on purpose. `www.example.com:8080/x` has a colon
 * in it and would otherwise be read as a scheme of `www.example.com`, which is
 * no scheme at all, and a host GFM already reads would stop being a link the
 * moment this option was turned on.
 */
const WIDE_LITERAL = new RegExp(
  String.raw`(?:https?://|www\.)[^\s<]+|[A-Za-z][A-Za-z\d+.-]{1,31}:[^\s<]+|//${HOST}[^\s<]*|${EMAIL}`,
  'g'
);

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
 * Where a bare address points, or `null` where the link policy will not follow
 * it there.
 *
 * Four shapes reach here and each says its destination a different way. A
 * `www.` host is an address missing its scheme, one starting `//` is missing
 * only that and the page supplies it, anything carrying a scheme already says
 * where it goes, and what is left is an e-mail address.
 */
function addressUrl(text: string): string | null {
  if (/^www\./i.test(text)) {
    return safeUrl(`http://${text}`);
  }

  if (text.startsWith('//') || /^[A-Za-z][A-Za-z\d+.-]{1,31}:/.test(text)) {
    return safeUrl(text);
  }

  return safeUrl(`mailto:${text}`);
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
function linkifyText(node: MdText, pattern: RegExp): MdInline[] {
  const { value } = node;
  const offset = (index: number) => Math.min(node.range.start + index, node.range.end);
  const out: MdInline[] = [];
  let last = 0;

  pattern.lastIndex = 0;

  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    const at = match.index;

    if (!canStartLiteral(at === 0 ? undefined : value[at - 1])) {
      continue;
    }

    const text = trimLiteral(match[0]);

    if (!text) {
      continue;
    }

    const url = addressUrl(text);

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
    pattern.lastIndex = last;
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
function linkify(nodes: MdInline[], pattern: RegExp): MdInline[] {
  const out: MdInline[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      out.push(...linkifyText(node, pattern));
      continue;
    }

    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
      out.push({ ...node, children: linkify(node.children, pattern) });
      continue;
    }

    out.push(node);
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Typography
 * ---------------------------------------------------------------------- */

/**
 * The four marks a quotation is drawn with, with nothing left to fill in.
 *
 * English and Korean both write a quotation the same way, so the default set
 * covers every language this library's own interface speaks. It is an option
 * because the document is not the interface: German writes „a“, French
 * «a», and a reader of one of those meets the wrong mark otherwise.
 */
export interface ResolvedQuotes {
  doubleOpen: string;
  doubleClose: string;
  singleOpen: string;
  singleClose: string;
}

/** What a document gets when it says nothing: the English and Korean marks. */
export const DEFAULT_QUOTES: ResolvedQuotes = {
  doubleOpen: '“',
  doubleClose: '”',
  singleOpen: '‘',
  singleClose: '’'
};

/**
 * The apostrophe, which is not one of the four.
 *
 * It is the same character as English's closing single quote and is not the
 * same *mark*: `dogs’ bones` wants this whatever a document's quotations are
 * drawn with, and a German document that set its single marks to ‚‘ would
 * otherwise come out as `dogs‘ bones`.
 */
const APOSTROPHE = '’';

/** `(c)`, `(tm)` and `(r)`, which are typed for marks a keyboard has no key for. */
const MARK = /\((?:c|tm|r)\)/i;
const MARKS = /\((c|tm|r)\)/gi;
const MARKED: Record<string, string> = { c: '©', r: '®', tm: '™' };

/**
 * Anything the substitutions below could touch.
 *
 * A paragraph has none of it far more often than it has some, and the eight
 * passes underneath are eight walks of the string. This is one.
 */
const RARE = /\+-|\.\.|\?{4}|!{4}|,,|--/;

/** Both quotation marks, which the pairing below reads a run for. */
const QUOTES = /['"]/g;

/**
 * How many quotation marks may be left open in one run before it is given up on.
 *
 * A bound rather than a rule: a paragraph written with a thousand unclosed
 * quotation marks is not prose, and the pairing is what would go on holding all
 * of them. Everything paired before the bound is reached is still drawn paired.
 */
const OPENERS = 1000;

/**
 * The substitutions, in the order they have to be made.
 *
 * The order is the whole of it. An ellipsis is made before `?...` is put back
 * as `?..`, so that the three dots are one character by the time the question
 * mark is looked at; and three hyphens are taken before two, so that `---` is
 * an em dash rather than an en dash with a hyphen left over.
 *
 * The list is markdown-it's, character for character, and that is deliberate:
 * these are conventions rather than decisions, and a document written against
 * the reader most of the internet uses has to come out of this one the same
 * way. `..` becoming an ellipsis and `????` collapsing to three are both on it,
 * and both look like too much until a document written elsewhere arrives.
 */
function substituted(value: string): string {
  const marked = MARK.test(value)
    ? value.replace(MARKS, (_, name: string) => MARKED[name.toLowerCase()])
    : value;

  if (!RARE.test(marked)) {
    return marked;
  }

  return (
    marked
      .replace(/\+-/g, '±')
      .replace(/\.{2,}/g, '…')
      .replace(/([?!])…/g, '$1..')
      .replace(/([?!]){4,}/g, '$1$1$1')
      .replace(/,{2,}/g, ',')
      .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1—')
      // Two hyphens twice, because "between two spaces" and "between two
      // characters that are neither" are the two ways a dash is written and
      // one pass cannot be both.
      .replace(/(^|\s)--(?=\s|$)/gm, '$1–')
      .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1–')
  );
}

/**
 * The same, with every bare address in the run left as it was written.
 *
 * `http://a.co/a--b` is one address and `http://a.co/a–b` is another, and a
 * dash drawn into the middle of one is a link to a page that is not there. So
 * an address is never prose here — and whether it is going to be *drawn* as a
 * link does not come into it, since a reader copies the characters either way
 * and `autolinkSchemes` would otherwise decide what a dash means.
 *
 * What counts as one is the destination rather than the shape. A run has to be
 * somewhere the link policy would follow, so `ftp://x.io/a--b` is an address
 * with the option off as much as on, while `re:invent...` and `TODO:fix...`
 * are the prose they look like — nothing on the allowlist is called `re` or
 * `TODO`, and a sentence should not lose its ellipsis to a colon.
 */
function typeset(value: string): string {
  WIDE_LITERAL.lastIndex = 0;

  let out = '';
  let last = 0;

  for (let match = WIDE_LITERAL.exec(value); match; match = WIDE_LITERAL.exec(value)) {
    const at = match.index;
    const text = trimLiteral(match[0]);

    if (!text || !addressUrl(text)) {
      continue;
    }

    out += substituted(value.slice(last, at)) + text;
    last = at + text.length;
    WIDE_LITERAL.lastIndex = last;
  }

  return last === 0 ? substituted(value) : out + substituted(value.slice(last));
}

/**
 * One place in the run, as the quotation marks are read.
 *
 * A quotation mark is decided by what sits either side of it, and what sits
 * beside it is often in another node: the `"` in `**a** "b"` has the `a` of a
 * `strong` behind it. So the tree is flattened to this list first, and the
 * characters around a mark are then the ones next to it in the document rather
 * than the ones next to it in its own node.
 */
interface Spot {
  /** The node to rewrite, or `null` for one that is only read for context. */
  node: MdText | null;
  text: string;
  /**
   * How deep in the run it sits. A quotation may not be opened inside emphasis
   * and closed outside it, the same way emphasis may not, so the pairing below
   * only pairs marks that came from the same depth.
   */
  depth: number;
  /** A hard break, which neither side reads across. */
  stop: boolean;
}

/**
 * The run flattened, in the order a reader meets it.
 *
 * `written` holds the start of every text node the document wrote as a
 * backslash escape. An author who typed `\\-\\-` meant two hyphens and an escape
 * is how Markdown says so, so those nodes go in as something to read and never
 * as something to rewrite — which is also why `merge` was told to leave them
 * beside their neighbours rather than joining them in.
 */
function spotsIn(
  nodes: MdInline[],
  depth: number,
  written: ReadonlySet<number>,
  into: Spot[]
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        into.push({
          node: written.has(node.range.start) ? null : node,
          text: node.value,
          depth,
          stop: false
        });
        break;

      // Read and never written: what a code span or a piece of markup says is
      // the characters the author typed, and this pass does not touch those.
      // They still sit next to a quotation mark and still decide which way it
      // faces.
      case 'inlineCode':
      case 'inlineHtml':
        into.push({ node: null, text: node.value, depth, stop: false });
        break;

      case 'image':
        into.push({ node: null, text: node.alt, depth, stop: false });
        break;

      case 'break':
        into.push({ node: null, text: '', depth, stop: true });
        break;

      case 'emphasis':
      case 'strong':
      case 'delete':
      case 'link':
      case 'textDirective':
        spotsIn(node.children, depth + 1, written, into);
        break;

      default:
        break;
    }
  }
}

/** The character in front of a position, or a space where the run begins. */
function before(spots: Spot[], index: number, at: number): string {
  if (at > 0) {
    return spots[index].text[at - 1];
  }

  for (let each = index - 1; each >= 0; each -= 1) {
    if (spots[each].stop) {
      break;
    }

    const { text } = spots[each];

    if (text) {
      return text[text.length - 1];
    }
  }

  return ' ';
}

/** And the one after it, or a space where the run ends. */
function after(spots: Spot[], index: number, at: number): string {
  const { text } = spots[index];

  if (at < text.length) {
    return text[at];
  }

  for (let each = index + 1; each < spots.length; each += 1) {
    if (spots[each].stop) {
      break;
    }

    const next = spots[each].text;

    if (next) {
      return next[0];
    }
  }

  return ' ';
}

/** A quotation mark that opened and is waiting for the one that closes it. */
interface QuoteOpener {
  spot: number;
  at: number;
  single: boolean;
  depth: number;
  /** The opener of the same kind underneath this one, so the heads unwind. */
  under: number;
}

/**
 * Every quotation mark in the run turned round the way it faces, and every
 * apostrophe drawn as one.
 *
 * Which way a mark faces is not a property of the mark. `'` is an apostrophe in
 * `it's`, an opening mark in `'tis a pity` and a closing one in `dogs' bones`,
 * and the three are told apart by what is on either side: a mark may open when
 * something other than a space follows it, and may close when something other
 * than a space precedes it. A mark that could do both is decided by the
 * punctuation around it, and one that could do neither is an apostrophe.
 *
 * The marks that do open are kept on a stack until one closes them, so that
 * `"a 'b' c"` comes out nested rather than crossed. A mark nothing closes is
 * left exactly as the author typed it, which is what makes `5" 6"` still say
 * inches.
 */
function quoted(spots: Spot[], quotes: ResolvedQuotes): void {
  const stack: QuoteOpener[] = [];
  const head = { single: -1, double: -1 };
  /** What to put where, by spot, as a position and the character to put there. */
  const changes = new Map<number, [number, string][]>();

  const unwind = (to: number) => {
    while (stack.length > to) {
      const opener = stack.pop() as QuoteOpener;

      if (opener.single) {
        head.single = opener.under;
      } else {
        head.double = opener.under;
      }
    }
  };

  const change = (spot: number, at: number, character: string) => {
    const list = changes.get(spot);

    if (list) {
      list.push([at, character]);
    } else {
      changes.set(spot, [[at, character]]);
    }
  };

  let full = false;

  for (let index = 0; index < spots.length && !full; index += 1) {
    const spot = spots[index];
    let above = stack.length - 1;

    // Anything opened deeper than here can no longer be closed, because the
    // node it was opened in has been left.
    while (above >= 0 && stack[above].depth > spot.depth) {
      above -= 1;
    }

    unwind(above + 1);

    if (!spot.node) {
      continue;
    }

    const { text } = spot;

    QUOTES.lastIndex = 0;

    for (let match = QUOTES.exec(text); match; match = QUOTES.exec(text)) {
      const at = match.index;
      const single = match[0] === "'";
      const last = before(spots, index, at);
      const next = after(spots, index, at + 1);
      const lastSpace = WHITESPACE.test(last);
      const nextSpace = WHITESPACE.test(next);
      const lastMark = PUNCTUATION.test(last);
      const nextMark = PUNCTUATION.test(next);

      let canOpen = true;
      let canClose = true;

      if (nextSpace) {
        canOpen = false;
      } else if (nextMark && !(lastSpace || lastMark)) {
        canOpen = false;
      }

      if (lastSpace) {
        canClose = false;
      } else if (lastMark && !(nextSpace || nextMark)) {
        canClose = false;
      }

      // `5" 6"` is five feet six, and neither mark is a quotation.
      if (!single && next === '"' && last >= '0' && last <= '9') {
        canOpen = false;
        canClose = false;
      }

      if (canOpen && canClose) {
        canOpen = lastMark;
        canClose = nextMark;
      }

      if (!canOpen && !canClose) {
        if (single) {
          change(index, at, APOSTROPHE);
        }

        continue;
      }

      if (canClose) {
        const which = single ? head.single : head.double;

        if (which >= 0 && stack[which].depth === spot.depth) {
          const opener = stack[which];

          change(index, at, single ? quotes.singleClose : quotes.doubleClose);
          change(opener.spot, opener.at, single ? quotes.singleOpen : quotes.doubleOpen);
          unwind(which);
          continue;
        }
      }

      if (canOpen) {
        if (stack.length >= OPENERS) {
          full = true;
          break;
        }

        stack.push({
          spot: index,
          at,
          single,
          depth: spot.depth,
          under: single ? head.single : head.double
        });

        if (single) {
          head.single = stack.length - 1;
        } else {
          head.double = stack.length - 1;
        }

        continue;
      }

      // Not an opener and nothing to close: a single mark here is an
      // apostrophe after all, as in `dogs' bones`.
      if (single) {
        change(index, at, APOSTROPHE);
      }
    }
  }

  // Written back at the end rather than as they are found, because an opening
  // mark is only known to be one once the mark that closes it has been read,
  // and by then the run has been walked past the node it sits in.
  for (const [index, list] of changes) {
    const node = spots[index].node as MdText;
    const sorted = [...list].sort((one, other) => one[0] - other[0]);

    let out = '';
    let from = 0;

    for (const [at, character] of sorted) {
      out += node.value.slice(from, at) + character;
      from = at + 1;
    }

    node.value = out + node.value.slice(from);
  }
}

/**
 * The typographer, over one run of inline content.
 *
 * Two passes and the order matters: the substitutions first, because they
 * change how long a text node is and the quotation marks are found by position;
 * then the marks, which need the run flattened and so cannot be done a node at
 * a time.
 *
 * The nodes are rewritten where they stand. They were built a moment ago by
 * `parseInline` and nothing else has seen them yet.
 */
function typography(nodes: MdInline[], written: ReadonlySet<number>, quotes: ResolvedQuotes): void {
  const spots: Spot[] = [];

  spotsIn(nodes, 0, written, spots);

  for (const spot of spots) {
    if (spot.node) {
      spot.node.value = typeset(spot.node.value);
      spot.text = spot.node.value;
    }
  }

  quoted(spots, quotes);
}

/* -------------------------------------------------------------------------
 * Tidying
 * ---------------------------------------------------------------------- */

/**
 * Adjacent text nodes joined, empty ones dropped.
 *
 * `apart` names the ones to leave where they are, by the offset each starts at:
 * a character the document wrote as a backslash escape is its own node, and the
 * typographer has to still be able to tell it from the characters around it. It
 * is empty every other time this runs, including the run after the typographer
 * has finished, which is what puts those nodes back with their neighbours.
 */
function merge(nodes: MdInline[], apart: ReadonlySet<number> | null = null): MdInline[] {
  const out: MdInline[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      if (!node.value) {
        continue;
      }

      const previous = out[out.length - 1];

      if (
        previous?.type === 'text' &&
        !apart?.has(previous.range.start) &&
        !apart?.has(node.range.start)
      ) {
        previous.value += node.value;
        previous.range = { start: previous.range.start, end: node.range.end };
        continue;
      }

      out.push({ type: 'text', range: node.range, value: node.value });
      continue;
    }

    if (node.type === 'emphasis' || node.type === 'strong' || node.type === 'delete') {
      out.push({ ...node, children: merge(node.children, apart) });
      continue;
    }

    if (node.type === 'link') {
      out.push({ ...node, children: merge(node.children, apart) });
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
  const state: State = { chunks: { head: null, tail: null }, delimiters: [], openers: [] };
  /** Where each character the document wrote as a backslash escape ended up. */
  const escaped = new Set<number>();
  const reach: Reach = { stop: null };
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
      append(
        chunks,
        textChunk(decodeEntities(pending), span(pendingAt, pendingAt + pending.length))
      );
      pending = '';
    }
  };

  /**
   * Where in `delimiters` the run that follows this chunk begins.
   *
   * Asked of where each chunk was written rather than of where it sits in the
   * array, because the two orders are the same one — chunks are appended as
   * the source is read, and what replaces a span of them covers that same span
   * — and the array position had to be looked up. Building a map of every
   * chunk to do it, on every link that closes, was the length of a paragraph
   * squared for a paragraph that is a list of links.
   */
  const delimiterBottom = (chunk: Chunk): number => {
    const after = chunk.node.range.start;

    for (let index = 0; index < delimiters.length; index += 1) {
      const each = delimiters[index];

      if (each && each.node.range.start > after) {
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
        append(chunks, nodeChunk({ type: 'break', range: span(at, at + 2) }));
        at += 2;

        while (WHITESPACE.test(source[at] ?? '') && source[at] !== '\n') {
          at += 1;
        }

        continue;
      }

      if (next !== undefined && isEscapableCode(next.charCodeAt(0))) {
        const chunk = textChunk(next, span(at, at + 2));

        flush();
        append(chunks, chunk);

        // Only the typographer asks, and only it pays for the answer.
        if (options.typographer) {
          escaped.add(chunk.node.range.start);
        }

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
        append(
          chunks,
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
        append(
          chunks,
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
        append(
          chunks,
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
        append(
          chunks,
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
        append(
          chunks,
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
        append(
          chunks,
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
      append(chunks, chunk);
      openers.push(chunk);
      at += text.length;
      continue;
    }

    if (character === ']') {
      flush();

      const openerChunk = openers.pop();

      if (!openerChunk?.opener) {
        append(chunks, textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      const opener = openerChunk.opener;

      if (!opener.active) {
        // Deactivated by a link that closed inside this one. Both brackets are
        // now text — the opening one stays exactly where it was written, which
        // is what `[a [b](c)](d)` needs to keep its first character.
        append(chunks, textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      const labelText = source.slice(opener.textStart, at);
      let destination: Destination | null = null;
      let end = at + 1;

      if (source[at + 1] === '(') {
        destination = readInlineDestination(source, at + 1, reach);

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
        append(chunks, textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      processEmphasis(state, delimiterBottom(openerChunk));

      // Everything after the opener is this link's own label.
      const { children, depth: under } = between(openerChunk, null);
      const url = opener.image ? safeImageUrl(destination.url) : safeUrl(destination.url);
      const depth = under + 1;
      const range: MdRange = { start: openerChunk.node.range.start, end: endOffset(raw, end) };

      if (opener.image && url) {
        // An image is one node however deep its description was: the words are
        // all that is kept of it.
        cut(chunks, openerChunk);
        append(
          chunks,
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
        cut(chunks, openerChunk);
        append(chunks, textChunk(toPlainText(children), range));
      } else if (url && depth <= NESTING) {
        cut(chunks, openerChunk);
        append(
          chunks,
          nodeChunk({ type: 'link', range, url, title: destination.title, children }, depth)
        );
      } else {
        // The same for a link: the label stays and reads as ordinary text, so a
        // reader sees the sentence rather than a control that does nothing.
        // A link too deep to wrap lands here as well, keeping its label and
        // losing only what it pointed at. See `NESTING`.
        unlink(chunks, openerChunk);
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
      append(chunks, chunk);
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

      append(
        chunks,
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

  const read: MdInline[] = [];

  for (let each = chunks.head; each; each = each.next) {
    read.push(each.node);
  }

  // The escapes are held apart for the typographer and joined back in after it,
  // so the tree it leaves is the tree every other option would have left.
  let nodes = merge(read, options.typographer ? escaped : null);

  // Before the linkifier rather than after it, so that an address is still the
  // characters it was written with when the linkifier reads one.
  if (options.typographer) {
    typography(nodes, escaped, options.quotes);
    nodes = merge(nodes);
  }

  return options.gfm
    ? merge(linkify(nodes, options.autolinkSchemes ? WIDE_LITERAL : LITERAL))
    : nodes;
}
