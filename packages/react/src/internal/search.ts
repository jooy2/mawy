/**
 * Finding a run of text in the document, and putting another one in its place.
 *
 * Pure functions over strings, the way `commands.ts` is and for the same
 * reason: what "replace all" does to overlapping matches is a question about
 * arithmetic, and a test that has to mount an editor to ask it is a test nobody
 * writes the awkward half of.
 *
 * Plain text, never a regular expression. That is a decision rather than a
 * missing feature: an editor whose find box quietly compiles `(` into a syntax
 * error is one a writer cannot trust with a document, and a Markdown document
 * is full of `*`, `[`, `.` and `+`. What is here instead is the case-sensitive
 * switch, which is the option people actually reach for.
 */

/** Where one match sits in the document. */
export interface MawyMatch {
  start: number;
  end: number;
}

/**
 * Every match, in the order they appear.
 *
 * Matches never overlap: the search carries on from the end of the one it just
 * found, so `aa` in `aaaa` is two rather than three. Which is what makes
 * replacing all of them one pass rather than a fixed point.
 */
export function findMatches(value: string, query: string, matchCase: boolean): MawyMatch[] {
  if (!query) {
    return [];
  }

  const haystack = matchCase ? value : value.toLowerCase();
  const needle = matchCase ? query : query.toLowerCase();
  const out: MawyMatch[] = [];
  let at = 0;

  for (;;) {
    const found = haystack.indexOf(needle, at);

    if (found === -1) {
      return out;
    }

    out.push({ start: found, end: found + query.length });
    at = found + query.length;
  }
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
  matchCase: boolean
): { value: string; count: number } {
  const matches = findMatches(value, query, matchCase);

  if (matches.length === 0) {
    return { value, count: 0 };
  }

  let out = '';
  let at = 0;

  for (const match of matches) {
    out += value.slice(at, match.start) + replacement;
    at = match.end;
  }

  return { value: out + value.slice(at), count: matches.length };
}
