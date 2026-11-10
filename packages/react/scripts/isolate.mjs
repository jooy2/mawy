/**
 * `styles.isolated.css`: the package's stylesheet with every rule one class
 * stronger, for a page whose own rules are more specific than this library's.
 *
 * `styles.css` takes the document back from a page that styles bare element
 * names, and gives way, on purpose, to a rule with two classes and an element
 * in it: `.article .content li` is an application overriding a library, and
 * should win. An application in charge of its pages can write that rule or
 * not. A component library that embeds a viewer is in charge of none of the
 * pages it lands on, and the only defence it had was copying this sheet's
 * declarations with `!important`, which goes stale the next time a value here
 * changes.
 *
 * So the same sheet is shipped a second time with `.mawy-root.mawy-root` where
 * every rule began with `.mawy-root`. Doubling a class adds one to the
 * specificity and matches exactly what the class alone matched, so nothing is
 * drawn differently on a page without rules of its own, and a page rule needs
 * three classes rather than two to reach in. Every rule is lifted and not only
 * the document's, because a rule lifted past one that used to beat it would
 * start winning a fight it was written to lose, and lifting all of them keeps
 * every rule in this file where it was against every other.
 *
 * Two things keep the strength they had. The three palettes are `:where()` and
 * stay at nothing, and a `--mawy-*` declaration anywhere else is left on the
 * selector it was written under: redeclaring a token is how an application
 * themes this library, and it has to mean the same thing under either sheet.
 * A rule that declares both is written twice, its tokens under the selector it
 * had and the rest under the stronger one.
 *
 * The build runs it on the minified sheet, and it takes comments out itself so
 * that `test/package/isolated.test.tsx` can run it on the source. The walk below
 * only has to know about strings, brackets and braces.
 */

/** Doubles the root class at the head of one complex selector, if it has one. */
function lift(selector) {
  const trimmed = selector.trim();

  return /^\.mawy-root(?![\w-])/.test(trimmed) ? `.mawy-root${trimmed}` : trimmed;
}

/**
 * [text] cut at every [separator] that is outside a string and outside
 * brackets, so a comma inside `:where(a, b)` or a semicolon inside `url(…)`
 * stays where it is.
 */
function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];

    if (quote) {
      if (char === '\\') {
        at += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth -= 1;
    } else if (char === separator && depth === 0) {
      parts.push(text.slice(start, at));
      start = at + 1;
    }
  }

  parts.push(text.slice(start));

  return parts;
}

/**
 * Where the block that opens at [open] closes, counting braces outside
 * strings.
 */
function closing(css, open) {
  let depth = 0;
  let quote = null;

  for (let at = open; at < css.length; at += 1) {
    const char = css[at];

    if (quote) {
      if (char === '\\') {
        at += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return at;
      }
    }
  }

  throw new Error('isolate: a block that never closes');
}

/** Where the next `{` or `;` outside a string and outside brackets is. */
function headEnd(css, from) {
  let depth = 0;
  let quote = null;

  for (let at = from; at < css.length; at += 1) {
    const char = css[at];

    if (quote) {
      if (char === '\\') {
        at += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth -= 1;
    } else if ((char === '{' || char === ';') && depth === 0) {
      return at;
    }
  }

  return css.length;
}

/** At-rules whose block holds rules, and so is walked into. */
const GROUPING = /^@(media|supports|container|layer|scope)\b/;

/** One style rule, written again with its selectors lifted. */
function rule(selectors, body) {
  const all = splitTopLevel(selectors, ',');
  const lifted = all.map(lift);

  if (lifted.every((each, at) => each === all[at].trim())) {
    return `${selectors}{${body}}`;
  }

  const declarations = splitTopLevel(body, ';').filter((each) => each.trim() !== '');
  const tokens = declarations.filter((each) => each.trim().startsWith('--'));
  const rest = declarations.filter((each) => !each.trim().startsWith('--'));
  let written = '';

  if (tokens.length > 0) {
    written += `${selectors}{${tokens.join(';')}}`;
  }

  if (rest.length > 0) {
    written += `${lifted.join(',')}{${rest.join(';')}}`;
  }

  return written;
}

/** Every rule in [css], at this level and inside every grouping at-rule. */
function walk(css) {
  let written = '';
  let at = 0;

  while (at < css.length) {
    const end = headEnd(css, at);
    const head = css.slice(at, end).trim();

    if (end >= css.length) {
      written += css.slice(at);
      break;
    }

    if (css[end] === ';') {
      // A statement, `@import` or `@charset`, with no block to walk.
      written += `${head};`;
      at = end + 1;
      continue;
    }

    const close = closing(css, end);
    const body = css.slice(end + 1, close);

    if (head.startsWith('@')) {
      // `@keyframes`, `@font-face` and the like hold no selectors to lift.
      written += GROUPING.test(head) ? `${head}{${walk(body)}}` : `${head}{${body}}`;
    } else {
      written += rule(head, body);
    }

    at = close + 1;
  }

  return written;
}

/** [css], minified, with every rule that begins at the root one class stronger. */
export function isolate(css) {
  return walk(css.replace(/\/\*[\s\S]*?\*\//g, ''));
}
