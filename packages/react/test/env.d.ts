/**
 * `?raw` is a file's text before any transform at all. `test/package` reads
 * source files rather than importing them, because what those tests assert is
 * about the source rather than about what it evaluates to — the shape of an
 * import specifier, a re-export that has to be present in the barrel.
 */
declare module '*?raw' {
  const source: string;
  export default source;
}

/**
 * `import.meta.glob` is Vite's, and `vite/client` is deliberately not in
 * `types`: one form is used here, so one form is declared. Narrowed to the
 * options `test/package` passes — the raw text of every match — rather than to
 * Vite's full signature.
 */
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true }
  ): Record<string, string>;
}
