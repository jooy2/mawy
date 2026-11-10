/**
 * Finding a run of text in the document, and putting another one in its place.
 *
 * Pure functions over strings, the way `commands.ts` is and for the same
 * reason: what "replace all" does to overlapping matches is a question about
 * arithmetic, and a test that has to mount an editor to ask it is a test nobody
 * writes the awkward half of.
 *
 * Plain text unless a regular expression is asked for. An editor whose find box
 * quietly compiled `(` into a syntax error would be one a writer could not trust
 * with a document, and a Markdown document is full of `*`, `[`, `.` and `+`; so
 * the box is plain text, and a pattern is something switched on. A pattern
 * that is not one finds nothing, and the bar says so. `search.dart` reads the
 * same patterns the same way: Dart's regular expressions are JavaScript's.
 */

/** Where one match sits in the document. */
export interface MawyMatch {
  start: number;
  end: number;
}

/**
 * A copy in lower case that is exactly as long as what went in, character for
 * character.
 *
 * `toLowerCase` over a whole string is neither of those things. It is not
 * length-preserving — `İ` becomes two characters — and every offset this file
 * reports is an offset into the original, so one character that grew puts every
 * match after it in the wrong place and a replacement then takes out the wrong
 * letters. It is also not decided character by character: a `Σ` at the end of a
 * word becomes `ς` and one in the middle becomes `σ`, which would mean a query
 * matching the same word only where it sits the same way round.
 *
 * So the answer is the one a character at a time gives, with anything that
 * would change length left as it was written. What that costs is that `İ`
 * matches only itself, which is a match not found rather than a match reported
 * in the wrong place.
 *
 * Two characters in the whole of Unicode need that treatment, and a text with
 * neither of them in it — which is very nearly every text — is folded in the
 * one native call rather than a character at a time.
 */
/**
 * The characters that have to be looked at one at a time.
 *
 * `Σ` reads its own position in the word, and `İ` is the one that grows. The
 * second of them is already caught by the length below; it is named here so
 * that this file and `search.dart` say the same thing, since on that side the
 * length does not change and the character still has to be left alone.
 */
const AWKWARD = /[\u0130\u03A3]/;

function fold(text: string): string {
  const lower = text.toLowerCase();

  if (lower.length === text.length && !AWKWARD.test(text)) {
    return lower;
  }

  let out = '';

  for (const character of text) {
    const folded = character.toLowerCase();

    out += folded.length === character.length ? folded : character;
  }

  return out;
}

/**
 * Every match, in the order they appear.
 *
 * Matches never overlap: the search carries on from the end of the one it just
 * found, so `aa` in `aaaa` is two rather than three. Which is what makes
 * replacing all of them one pass rather than a fixed point.
 */
export function findMatches(
  value: string,
  query: string,
  matchCase: boolean,
  regex = false
): MawyMatch[] {
  if (!query) {
    return [];
  }

  if (regex) {
    return patternMatches(value, query, matchCase).map(({ start, end }) => ({ start, end }));
  }

  const haystack = matchCase ? value : fold(value);
  const needle = matchCase ? query : fold(query);
  const out: MawyMatch[] = [];
  let at = 0;

  for (;;) {
    const found = haystack.indexOf(needle, at);

    if (found === -1) {
      return out;
    }

    out.push({ start: found, end: found + needle.length });
    at = found + needle.length;
  }
}

/**
 * A query read as a regular expression, or `null` where it is not one.
 *
 * Over the whole document with `^` and `$` at the ends of its lines, which is
 * what somebody looking for a line that starts with something means. Without
 * the Unicode switch, which turns a lone `{` or an escaped `-` into an error, and
 * a find box is somewhere a pattern is typed a character at a time.
 */
export function patternOf(query: string, matchCase: boolean): RegExp | null {
  try {
    return new RegExp(query, matchCase ? 'gm' : 'gim');
  } catch {
    return null;
  }
}

/** Whether a query asked to be read as a pattern is not one. */
export function invalidPattern(query: string, regex: boolean): boolean {
  return regex && query !== '' && patternOf(query, true) === null;
}

/**
 * Every match of a pattern, and what it captured.
 *
 * A match of nothing at all is passed over: `a*` matches nothing between every
 * two letters, and a match that cannot be drawn or replaced is a count that
 * means nothing. The search goes on from the next character.
 */
function patternMatches(
  value: string,
  query: string,
  matchCase: boolean
): Array<MawyMatch & { found: RegExpExecArray }> {
  const pattern = patternOf(query, matchCase);
  const out: Array<MawyMatch & { found: RegExpExecArray }> = [];

  if (!pattern) {
    return out;
  }

  for (let found = pattern.exec(value); found; found = pattern.exec(value)) {
    if (!found[0]) {
      pattern.lastIndex = found.index + 1;
      continue;
    }

    out.push({ start: found.index, end: found.index + found[0].length, found });
  }

  return out;
}

/**
 * A replacement with what a match captured written into it: `$&` is the whole
 * match, `$1` to `$99` a numbered group, `$<name>` a named one and `$$` a dollar
 * sign. A number past the groups there are is the characters it is, and so is
 * any other `$`.
 */
function expand(template: string, found: RegExpExecArray): string {
  const groups = found.length - 1;
  let out = '';

  for (let at = 0; at < template.length; at += 1) {
    const character = template[at];

    if (character !== '$' || at + 1 >= template.length) {
      out += character;
      continue;
    }

    const next = template[at + 1];

    if (next === '$') {
      out += '$';
      at += 1;
      continue;
    }

    if (next === '&') {
      out += found[0];
      at += 1;
      continue;
    }

    if (next === '<' && found.groups) {
      const close = template.indexOf('>', at + 2);

      if (close !== -1) {
        out += found.groups[template.slice(at + 2, close)] ?? '';
        at = close;
        continue;
      }
    }

    const two = Number.parseInt(template.slice(at + 1, at + 3), 10);
    const one = Number.parseInt(next, 10);

    if (/^\d\d$/.test(template.slice(at + 1, at + 3)) && two >= 1 && two <= groups) {
      out += found[two] ?? '';
      at += 2;
      continue;
    }

    if (/^\d$/.test(next) && one >= 1 && one <= groups) {
      out += found[one] ?? '';
      at += 1;
      continue;
    }

    out += character;
  }

  return out;
}

/**
 * What one match of a pattern is replaced with, with what it captured written
 * in. The pattern is read again at the match, since a match is only where it is
 * and not what it captured. See `expand`.
 */
export function replacementFor(
  value: string,
  match: MawyMatch,
  query: string,
  replacement: string,
  matchCase: boolean
): string {
  const pattern = patternOf(query, matchCase);

  if (!pattern) {
    return replacement;
  }

  const anchored = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}y`);

  anchored.lastIndex = match.start;

  const found = anchored.exec(value);

  return found ? expand(replacement, found) : replacement;
}

/**
 * Which match to go to from where the caret is.
 *
 * Forwards means the first match that starts at or after the caret, so pressing
 * next with the caret at the top of the document finds the first one rather
 * than the second. Backwards means the last that starts before it. Both wrap,
 * because a search that stops at the end of the file is a search you have to
 * scroll to the top to finish.
 *
 * `-1` when there is nothing to go to at all.
 */
export function matchFrom(matches: MawyMatch[], caret: number, forwards: boolean): number {
  if (matches.length === 0) {
    return -1;
  }

  if (forwards) {
    const at = matches.findIndex((match) => match.start >= caret);

    return at === -1 ? 0 : at;
  }

  for (let at = matches.length - 1; at >= 0; at -= 1) {
    if (matches[at].start < caret) {
      return at;
    }
  }

  return matches.length - 1;
}

/** One match, replaced. */
export function replaceMatch(
  value: string,
  match: MawyMatch,
  replacement: string
): { value: string; caret: number } {
  return {
    value: value.slice(0, match.start) + replacement + value.slice(match.end),
    caret: match.start + replacement.length
  };
}

/**
 * Every match, replaced in one pass.
 *
 * One pass rather than a loop over `replaceMatch`, and not for speed: replacing
 * `a` with `aa` a match at a time would find the replacement and replace that
 * too, for ever. What is searched is the document as it was.
 */
export function replaceAll(
  value: string,
  query: string,
  replacement: string,
  matchCase: boolean,
  regex = false
): { value: string; count: number } {
  const matches = regex
    ? patternMatches(value, query, matchCase)
    : findMatches(value, query, matchCase);

  if (matches.length === 0) {
    return { value, count: 0 };
  }

  let out = '';
  let at = 0;

  for (const match of matches) {
    out +=
      value.slice(at, match.start) +
      ('found' in match ? expand(replacement, match.found as RegExpExecArray) : replacement);
    at = match.end;
  }

  return { value: out + value.slice(at), count: matches.length };
}
