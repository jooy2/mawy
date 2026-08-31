import { describe, expect, it } from 'vitest';
import { specifiersIn, withoutComments } from '../support/sources';

/**
 * The helper the other two files in this folder are built on.
 *
 * It reads source as text, which is the right amount of machinery for what it
 * checks and is also exactly why it needs its own tests: the failure mode of a
 * text scanner is not an error, it is a quiet wrong answer — either a
 * dependency test that fails over a line of prose, or one that passes over a
 * real import it did not see.
 */
describe('reading source as text', () => {
  it('ignores an import written inside a comment', () => {
    const source = [
      '/**',
      " * Applications write `import { A } from 'mawy'` to get at this.",
      ' */',
      "import { b } from './b.js'; // and not from 'elsewhere'",
      "export * from './c.js';"
    ].join('\n');

    expect(specifiersIn(source)).toEqual(['./b.js', './c.js']);
  });

  it('does not mistake a URL in a string for a comment', () => {
    const source = "const href = 'https://fonts.example/css2?a=1';\nimport 'x';";

    expect(withoutComments(source)).toContain('https://fonts.example/css2?a=1');
    expect(specifiersIn(source)).toEqual(['x']);
  });

  it('keeps an escaped quote inside a string from ending it', () => {
    const source = "const a = 'it\\\\'s';\nimport './real.js';";

    expect(specifiersIn(source)).toEqual(['./real.js']);
  });

  it('still sees every form of a real import', () => {
    const source = [
      "import a from 'one';",
      "import 'two';",
      "const c = await import('three');",
      "export { d } from 'four';"
    ].join('\n');

    expect(specifiersIn(source)).toEqual(['one', 'two', 'three', 'four']);
  });
});
