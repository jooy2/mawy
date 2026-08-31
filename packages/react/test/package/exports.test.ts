import { describe, expect, it } from 'vitest';
import { isBare, sources } from '../support/sources';

const BARREL = 'src/index.ts';

/**
 * Two invariants about the shape of the package that nothing else checks, and
 * that both fail on a consumer's machine rather than on ours.
 */
describe('package shape', () => {
  it('has a barrel that re-exports the shared types', () => {
    expect(sources[BARREL]).toContain("export * from './types.js'");
  });

  /**
   * A component that exists but is not in `src/index.ts` is a component nobody
   * can import. It compiles, it is tested, and it is missing from the package —
   * which is exactly the kind of thing that is noticed a release later.
   */
  it('re-exports every component from the barrel', () => {
    const barrel = sources[BARREL];
    const missing = Object.keys(sources)
      .filter((path) => /^src\/components\/[^/]+\/index\.tsx?$/.test(path))
      .map((path) => path.replace(/^src\//, './').replace(/\.tsx?$/, '.js'))
      .filter((specifier) => !barrel.includes(`from '${specifier}'`));

    expect(missing).toEqual([]);
  });

  /**
   * The package is ESM, and an ESM runtime does not guess at extensions. `tsc`
   * emits relative specifiers exactly as they are written, so a `'./types'`
   * that TypeScript resolves happily is a `Cannot find module` the moment Node
   * loads the built file — which no amount of typechecking will surface,
   * because typechecking is where it works.
   */
  it('writes every relative import with its extension', () => {
    const extensionless: string[] = [];

    for (const [path, source] of Object.entries(sources)) {
      for (const specifier of source.matchAll(/\bfrom\s+'([^']+)'/g)) {
        if (!isBare(specifier[1]) && !/\.(js|jsx|css|json)$/.test(specifier[1])) {
          extensionless.push(`${path} imports '${specifier[1]}'`);
        }
      }
    }

    expect(extensionless).toEqual([]);
  });
});
