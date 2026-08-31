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
 * Every specifier a file imports or re-exports, in source order.
 *
 * A regex rather than a parser: what is being read is a fixed, hand-written
 * shape — `from '…'`, a bare `import '…'` for a side effect, and the dynamic
 * form — and pulling a TypeScript parser into the test suite to recognise three
 * of them would be a dependency bigger than the thing it checks.
 */
export function specifiersIn(source: string): string[] {
  return [
    ...source.matchAll(/\bfrom\s+'([^']+)'/g),
    ...source.matchAll(/\bimport\s+'([^']+)'/g),
    ...source.matchAll(/\bimport\(\s*'([^']+)'\s*\)/g)
  ].map((match) => match[1]);
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
