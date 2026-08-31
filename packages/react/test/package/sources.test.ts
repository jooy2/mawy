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
      " * Applications write `import { A } from 'mawy-react'` to get at this.",
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

  it('does not read a quote inside a regular expression as a string', () => {
    // A highlighter is full of these, and without knowing what a regex literal
    // is, the `"` below opens a string that runs to the next one in the file —
    // taking everything between it and there out of the reckoning.
    const source = ['const STRING = /"(?:\\\\.|[^"])*"/y;', "import { a } from './real.js';"].join(
      '\n'
    );

    expect(specifiersIn(source)).toEqual(['./real.js']);
  });

  it("does not read a list of a language's keywords as an import", () => {
    // `from`, a space and a quote is the shape of an import and also the shape
    // of the end of a line of prose. A specifier is what tells them apart: it
    // has no whitespace in it.
    const source = [
      "const KEYWORDS = 'else except finally for from ' +",
      "  'global if import in is lambda';",
      "import './real.js';"
    ].join('\n');

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
