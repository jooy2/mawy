/**
 * Markdown as marks on the source, for the editor to colour.
 *
 * This is not the parser, and it deliberately is not. The parser answers "what
 * does this document mean", throws the syntax away on the way, and cannot say
 * where in the text anything was — which is the one thing colouring an editor
 * needs. It also has to be *wrong* in a way the parser must not be: a line
 * being typed is half-written most of the time, and a highlighter that waits
 * for `**bold` to be closed before it admits anything is happening is a
 * highlighter that flickers.
 *
 * So: a line at a time, with just enough state to know it is inside a fence,
 * and approximate inline patterns over the rest. What it produces is offsets,
 * which the editor lays under a transparent textarea.
 */

export type MdTokenKind =
  | 'heading'
  | 'quote'
  | 'marker'
  | 'task'
  | 'rule'
  | 'fence'
  | 'code'
  | 'emphasis'
  | 'strong'
  | 'strike'
  | 'link'
  | 'url'
  | 'html'
  | 'escape'
  | 'table'
  | 'reference';

export interface MdToken {
  /** Both offsets are into the line, not into the document. */
  start: number;
  end: number;
  kind: MdTokenKind;
}

export interface MdHighlightedLine {
  text: string;
  /** In order, never overlapping. */
  tokens: MdToken[];
}

/**
 * The lines worth locating the syntax in, as a half-open range of line indexes.
 *
 * Everything outside it still comes back, and comes back with its text — a
 * caller windowing this is windowing what it *colours*, not what it holds. What
 * is saved is the scan of each line and the tokens it would have produced,
 * which for a document with five thousand lines and forty of them on the screen
 * is nearly all of the work.
 */
export interface MdHighlightWindow {
  from: number;
  /** Exclusive. */
  to: number;
}

/** The tokens of a line nobody asked to colour. Shared, so it costs nothing. */
const NONE: MdToken[] = [];

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX = /^( {0,3}#{1,6})(\s.*)?$/;
const RULE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const QUOTE = /^ {0,3}>[ \t]?/;
/** A bullet, a number, or the colon a definition's meaning opens with. */
const BULLET = /^([ \t]*)([-*+]|:|\d{1,9}[.)])([ \t]+)/;
const TASK = /^\[([ xX])\](?=[ \t]|$)/;
const DELIMITER_ROW = /^ {0,3}\|?(?:[ \t]*:?-+:?[ \t]*\|)*[ \t]*:?-+:?[ \t]*\|?[ \t]*$/;
const DEFINITION = /^ {0,3}(\[[^\]\n]+\]:)/;

/**
 * The inline patterns, in the order they are allowed to claim text.
 *
 * Order is precedence: a `*` inside a code span belongs to the code span, so
 * code is tried first and everything after it skips what is already spoken for.
 * Each entry says which capture group is the part to mark, or marks the whole
 * match when there is none.
 */
const INLINE: { kind: MdTokenKind; pattern: RegExp; second?: MdTokenKind }[] = [
  { kind: 'code', pattern: /(`+)[^`]*\1/g },
  { kind: 'escape', pattern: /\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g },
  // The label and the destination are coloured differently: one is the
  // sentence the reader sees, the other is machinery.
  { kind: 'link', pattern: /(!?\[[^\]\n]*\])(\([^)\n]*\)|\[[^\]\n]*\])/g, second: 'url' },
  { kind: 'html', pattern: /<[^<>\s][^<>]*>/g },
  { kind: 'strong', pattern: /(\*\*|__)(?![\s*_])(?:(?!\1)[\s\S])+?\1/g },
  { kind: 'strike', pattern: /~~(?![\s~])(?:(?!~~)[\s\S])+?~~/g },
  { kind: 'emphasis', pattern: /([*_])(?![\s*_])(?:(?!\1)[\s\S])+?\1/g }
];

/** Whether any part of `[start, end)` has already been claimed. */
function free(tokens: MdToken[], start: number, end: number): boolean {
  return !tokens.some((token) => start < token.end && token.start < end);
}

/**
 * @param text The part of the line still to be read — everything after any
 *   block marker that has already been taken off the front of it.
 * @param offset Where that part starts in the line, so the tokens come out in
 *   the line's own coordinates rather than the substring's.
 */
function scanInline(text: string, offset: number, tokens: MdToken[]): void {
  for (const { kind, pattern, second } of INLINE) {
    pattern.lastIndex = 0;

    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      // A pattern that can match nothing would spin here forever.
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }

      const start = offset + match.index;
      const end = start + match[0].length;

      if (!free(tokens, start, end)) {
        continue;
      }

      if (second && match[1] && match[2]) {
        tokens.push({ start, end: start + match[1].length, kind });
        tokens.push({ start: start + match[1].length, end, kind: second });
      } else {
        tokens.push({ start, end, kind });
      }
    }
  }
}

/**
 * Every line of the source, with the syntax in it located.
 *
 * The state that survives a line is one thing — whether a fenced block is open
 * — which is what makes this cheap enough to run on every keystroke.
 *
 * With a `within`, only the lines inside it are read for syntax; the rest come
 * back with their text and no tokens. The one thing a skipped line still has to
 * do is say whether it opened or closed a fence, because the line after it
 * cannot be read without knowing — so a fence is the only thing looked for
 * outside the window, and it is one anchored pattern rather than the dozen a
 * line is otherwise put through.
 */
export function highlightMarkdown(
  source: string,
  gfm = true,
  within?: MdHighlightWindow
): MdHighlightedLine[] {
  const lines = source.split('\n');
  const out: MdHighlightedLine[] = [];
  let fence: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index];

    if (within && (index < within.from || index >= within.to)) {
      const opening = FENCE.exec(text);

      if (fence) {
        const closing = opening?.[1];

        if (closing && closing[0] === fence[0] && closing.length >= fence.length) {
          fence = null;
        }
      } else if (opening) {
        fence = opening[1];
      }

      out.push({ text, tokens: NONE });
      continue;
    }

    const tokens: MdToken[] = [];
    const opening = FENCE.exec(text);

    if (fence) {
      const closing = opening?.[1];

      if (closing && closing[0] === fence[0] && closing.length >= fence.length) {
        tokens.push({ start: 0, end: text.length, kind: 'fence' });
        fence = null;
      } else {
        tokens.push({ start: 0, end: text.length, kind: 'code' });
      }

      out.push({ text, tokens });
      continue;
    }

    if (opening) {
      fence = opening[1];
      tokens.push({ start: 0, end: text.length, kind: 'fence' });
      out.push({ text, tokens });
      continue;
    }

    if (RULE.test(text)) {
      out.push({ text, tokens: [{ start: 0, end: text.length, kind: 'rule' }] });
      continue;
    }

    const heading = ATX.exec(text);

    if (heading) {
      tokens.push({ start: 0, end: heading[1].length, kind: 'marker' });

      if (heading[2]) {
        tokens.push({ start: heading[1].length, end: text.length, kind: 'heading' });
      }

      out.push({ text, tokens });
      continue;
    }

    const definition = DEFINITION.exec(text);

    if (definition) {
      tokens.push({ start: 0, end: definition[0].length, kind: 'reference' });
      scanInline(text, 0, tokens);
      out.push({ text, tokens: tokens.sort((a, b) => a.start - b.start) });
      continue;
    }

    // Everything below can sit inside a quotation, so the marker comes off
    // first and the rest is read at the offset it really starts at.
    let at = 0;
    const quote = QUOTE.exec(text);

    if (quote) {
      tokens.push({ start: 0, end: quote[0].length, kind: 'quote' });
      at = quote[0].length;
    }

    const rest = text.slice(at);
    const bullet = BULLET.exec(rest);

    if (bullet) {
      const markerStart = at + bullet[1].length;
      tokens.push({
        start: markerStart,
        end: markerStart + bullet[2].length,
        kind: 'marker'
      });
      at += bullet[0].length;

      const task = gfm ? TASK.exec(text.slice(at)) : null;

      if (task) {
        tokens.push({ start: at, end: at + task[0].length, kind: 'task' });
        at += task[0].length;
      }
    } else if (gfm && DELIMITER_ROW.test(rest) && rest.includes('-')) {
      tokens.push({ start: at, end: text.length, kind: 'table' });
      out.push({ text, tokens });
      continue;
    }

    scanInline(text.slice(at), at, tokens);

    if (gfm) {
      // The pipes, and only the pipes: the cells are ordinary inline content
      // and have already been read as such.
      for (let index = at; index < text.length; index += 1) {
        if (text[index] === '|' && text[index - 1] !== '\\' && free(tokens, index, index + 1)) {
          tokens.push({ start: index, end: index + 1, kind: 'table' });
        }
      }
    }

    out.push({ text, tokens: tokens.sort((a, b) => a.start - b.start) });
  }

  return out;
}
