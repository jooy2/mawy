import { describe, expect, it } from 'vitest';
import { isBare, manifest, sources, specifiersIn } from '../support/sources';

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
   * Every entry point named in `exports` is a file that exists, and every file
   * that looks like one is named there.
   *
   * A specifier in `package.json` that points at nothing is a `Cannot find
   * module` on a consumer's machine and nowhere else; a module built and not
   * named is a module nobody can reach. Both are the kind of thing noticed a
   * release later.
   */
  it('names every entry point, and every entry point it names is a module', () => {
    const shape = JSON.parse(manifest) as {
      exports: Record<string, { default?: string } | string>;
    };
    const named = Object.values(shape.exports)
      .map((each) => (typeof each === 'string' ? each : each.default))
      .filter((each): each is string => Boolean(each) && each.endsWith('.js'))
      .map((each) => each.replace('./dist/', 'src/').replace('.js', ''));

    // Every one is a source file, with whichever extension it was written in.
    expect(named.filter((each) => !sources[`${each}.ts`] && !sources[`${each}.tsx`])).toEqual([]);

    // And every module at the top of `src` is reachable: named here, or
    // re-exported from the barrel, which is the only other way in. A file at
    // the top of `src` that is neither is a file nobody can import.
    const barrel = sources[BARREL];
    const top = Object.keys(sources)
      .filter((path) => /^src\/[^/]+\.tsx?$/.test(path))
      .map((path) => path.replace(/\.tsx?$/, ''));

    expect(
      top.filter(
        (each) => !named.includes(each) && !barrel.includes(`'./${each.replace('src/', '')}.js'`)
      )
    ).toEqual([]);
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
      for (const specifier of specifiersIn(source)) {
        if (!isBare(specifier) && !/\.(js|jsx|css|json)$/.test(specifier)) {
          extensionless.push(`${path} imports '${specifier}'`);
        }
      }
    }

    expect(extensionless).toEqual([]);
  });
});
