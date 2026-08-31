/**
 * Every TypeScript file in `src/`, as text, keyed by its path relative to the
 * package root.
 *
 * The tests in `test/package` are about the *source* rather than about what it
 * evaluates to — whether an import carries an extension, whether the barrel
 * re-exports a component — so they read the files instead of importing them.
 * The glob is here rather than in each test because Vite requires a literal
 * pattern, which means the relative depth is baked into whichever file writes
 * it, and one file writing it is one file to fix when the layout moves.
 */
const modules = import.meta.glob('../../src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true
});

/** `../../src/index.ts` → `src/index.ts`. */
function normalize(path: string): string {
  return path.replace(/^(\.\.\/)+/, '');
}

export const sources: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, source]) => [normalize(path), source])
);

/**
 * The same source with its comments blanked out.
 *
 * A documentation comment that shows how to import something contains the
 * word `import` and a specifier in quotes, and to a regular expression that is
 * indistinguishable from the real thing — which made `src/fonts.ts` look like
 * it imported `mawy` because it explains, in prose, that an application does.
 *
 * Strings are tracked as well as comments, and not for tidiness: half the
 * specifiers in this package are URLs, and `https://…` inside a string literal
 * is a `//` that starts no comment at all.
 */
export function withoutComments(source: string): string {
  let out = '';
  let at = 0;

  while (at < source.length) {
    const two = source.slice(at, at + 2);

    if (two === '//') {
      while (at < source.length && source[at] !== '\n') {
        at += 1;
      }

      continue;
    }

    if (two === '/*') {
      const end = source.indexOf('*/', at + 2);
      // An unterminated block comment runs to the end of the file, and there is
      // nothing after it to look at.
      at = end === -1 ? source.length : end + 2;
      continue;
    }

    const quote = source[at];

    if (quote === "'" || quote === '"' || quote === '`') {
      const start = at;
      at += 1;

      while (at < source.length && source[at] !== quote) {
        // A backslash takes the next character with it, whatever it is.
        at += source[at] === '\\' ? 2 : 1;
      }

      // Copied through rather than blanked: a string is not a comment, and the
      // specifier in `from 'react'` is the thing being looked for.
      at = Math.min(at + 1, source.length);
      out += source.slice(start, at);
      continue;
    }

    out += source[at];
    at += 1;
  }

  return out;
}

/**
 * Every specifier a file imports or re-exports, in source order.
 *
 * A regex rather than a parser: what is being read is a fixed, hand-written
 * shape — `from '…'`, a bare `import '…'` for a side effect, and the dynamic
 * form — and pulling a TypeScript parser into the test suite to recognise three
 * of them would be a dependency bigger than the thing it checks. What it does
 * need is for the comments to be gone first.
 */
export function specifiersIn(source: string): string[] {
  const forms = /\bfrom\s+'([^']+)'|\bimport\s+'([^']+)'|\bimport\(\s*'([^']+)'\s*\)/g;

  return [...withoutComments(source).matchAll(forms)].map(
    (match) => (match[1] ?? match[2] ?? match[3]) as string
  );
}

/** A specifier that resolves to a package rather than to a file of ours. */
export function isBare(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/');
}

/** `@scope/name/sub` → `@scope/name`; `name/sub` → `name`. */
export function packageOf(specifier: string): string {
  const parts = specifier.split('/');

  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
