import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';
import { isBare, packageOf, sources, specifiersIn } from '../support/sources';

/**
 * Close to zero runtime dependencies is the point of this package rather than a
 * boast about it: a Markdown editor is a component inside somebody else's
 * application, and everything it drags in is something they did not choose.
 *
 * The rule that keeps it true is not "do not add dependencies" — it is that a
 * dependency has to be *declared*. A package that is imported but is only a
 * devDependency works on a developer's machine and fails on a consumer's
 * install, and that is the failure this file exists to catch before a release
 * does.
 */
describe('runtime dependencies', () => {
  const declared = new Set([
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.peerDependencies)
  ]);

  it('imports nothing that is not declared as a dependency or a peer', () => {
    const undeclared: string[] = [];

    for (const [path, source] of Object.entries(sources)) {
      for (const specifier of specifiersIn(source)) {
        if (!isBare(specifier)) {
          continue;
        }

        const name = packageOf(specifier);

        // `node:` is the runtime rather than a package, and nothing in `src/`
        // should be reaching for it either — a browser has no `node:fs`.
        if (!declared.has(name)) {
          undeclared.push(`${path} imports '${specifier}'`);
        }
      }
    }

    expect(undeclared).toEqual([]);
  });

  it('declares react and react-dom as peers rather than as dependencies', () => {
    // A second copy of React in a consumer's bundle is not a slower build, it
    // is broken hooks.
    expect(Object.keys(packageJson.peerDependencies)).toEqual(
      expect.arrayContaining(['react', 'react-dom'])
    );
    expect(packageJson.dependencies).not.toHaveProperty('react');
    expect(packageJson.dependencies).not.toHaveProperty('react-dom');
  });
});
