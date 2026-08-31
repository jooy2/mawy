import { describe, expect, it } from 'vitest';
import { MAWY_HIGHLIGHT_LANGUAGES, mawyHighlighter } from '../src/highlight.js';
import type { MawyCodeToken } from '../src/types.js';

/**
 * Mawy's own highlighter.
 *
 * It is approximate on purpose, so most of what is worth asserting is not
 * "every token is right" — that is a moving target and a bad one. It is the two
 * promises the rest of the library rests on: the tokens *are* the code, and a
 * language it does not know is a language it says it does not know.
 */

const tokens = (code: string, language: string): MawyCodeToken[] =>
  mawyHighlighter.highlight(code, language) as MawyCodeToken[];

/** The code back out of the tokens, which has to be what went in. */
const rejoin = (code: string, language: string): string =>
  tokens(code, language)
    .map((token) => token.text)
    .join('');

/** The text of every token of one kind, in order. */
const kinds = (code: string, language: string, kind: string): string[] =>
  tokens(code, language)
    .filter((token) => token.kind === kind)
    .map((token) => token.text);

describe('what it will and will not answer to', () => {
  it('knows the names a fence is likely to use, and says so about the rest', () => {
    expect(mawyHighlighter.supports('ts')).toBe(true);
    expect(mawyHighlighter.supports('TSX')).toBe(true);
    expect(mawyHighlighter.supports('bash')).toBe(true);
    expect(mawyHighlighter.supports('brainfuck')).toBe(false);
    expect(mawyHighlighter.supports('')).toBe(false);
  });

  it('lists what it answers to', () => {
    expect(MAWY_HIGHLIGHT_LANGUAGES).toContain('javascript');
    expect(MAWY_HIGHLIGHT_LANGUAGES).toContain('yaml');
    expect(MAWY_HIGHLIGHT_LANGUAGES).not.toContain('brainfuck');
  });

  it('hands back the code untouched for a language it does not know', () => {
    expect(tokens('nothing to say', 'brainfuck')).toEqual([{ text: 'nothing to say', kind: null }]);
  });
});

/**
 * The one promise. A highlighter that drops a character or invents one would
 * have the page showing something the document does not say — the renderer
 * checks for it too, and draws the block plain, but the check being there is
 * not a reason for this to fail it.
 */
describe('the tokens are the code', () => {
  const samples: [string, string][] = [
    ['typescript', "const a: Record<string, number> = { 'x': 1 }; // note\n/* over\ntwo */"],
    ['javascript', 'const t = `a ${b + 1} c`;\nfoo(/[a-z"\']+/g);'],
    ['json', '{ "a": [1, 2.5e3, true, null], "b": { "c": "d" } }'],
    ['html', '<p class="x" data-y=\'z\'>Text &amp; more</p><!-- gone -->'],
    ['css', '.a > b::after { color: #fff; width: calc(100% - 2px); --v: 1 }'],
    ['bash', 'set -e\n# a comment\necho "${HOME}/x" | grep -v \'y\''],
    ['python', 'def f(x: int) -> str:\n    """doc"""\n    return f"{x!r}"  # note'],
    ['yaml', 'a: 1\nb:\n  - c: true\n  - &ref "d"\n# note'],
    ['sql', "SELECT count(*) FROM t WHERE a = 'b' -- note"],
    ['go', 'func main() {\n\tfmt.Println("hi")\n}'],
    ['rust', 'fn main() { let x: Option<u8> = Some(1); }'],
    ['java', 'public class A { void b() { System.out.println("c"); } }'],
    ['cpp', '#include <vector>\nint main() { return 0; /* done */ }'],
    // The unclosed and the half-written, which is what a document full of
    // fragments is actually made of.
    ['typescript', 'const a = "unterminated\nconst b = /* also'],
    ['javascript', ''],
    ['html', '<']
  ];

  for (const [language, code] of samples) {
    it(`gives ${language} back exactly`, () => {
      expect(rejoin(code, language)).toBe(code);
    });
  }

  it('gives back a code block too large to be worth colouring, in one piece', () => {
    const huge = `const a = 1;\n`.repeat(20_000);

    expect(tokens(huge, 'ts')).toEqual([{ text: huge, kind: null }]);
  });
});

describe('what it makes of a few things', () => {
  it('finds keywords, strings and comments in TypeScript', () => {
    const code = 'export const name: string = "Mawy"; // and a note';

    expect(kinds(code, 'ts', 'keyword')).toEqual(['export', 'const']);
    expect(kinds(code, 'ts', 'string')).toEqual(['"Mawy"']);
    expect(kinds(code, 'ts', 'comment')).toEqual(['// and a note']);
    // A primitive is a type where it stands rather than a keyword. `const` and
    // `string` are not the same colour to anybody reading TypeScript.
    expect(kinds(code, 'ts', 'type')).toEqual(['string']);
  });

  it('tells a name in JSON from a value', () => {
    const code = '{ "name": "Mawy" }';

    expect(kinds(code, 'json', 'attribute')).toEqual(['"name"']);
    expect(kinds(code, 'json', 'string')).toEqual(['"Mawy"']);
  });

  it('tells a tag from an attribute in markup', () => {
    const code = '<a href="/x">y</a>';

    expect(kinds(code, 'html', 'tag')).toEqual(['<a', '</a']);
    expect(kinds(code, 'html', 'attribute')).toEqual(['href']);
  });

  it('reads a name with a bracket after it as something being called', () => {
    expect(kinds('doTheThing(1)', 'js', 'function')).toEqual(['doTheThing']);
    expect(kinds('const Thing = 1', 'js', 'type')).toEqual(['Thing']);
  });

  it('takes a comment to the end of the line and no further', () => {
    expect(kinds('a // one\nb // two', 'js', 'comment')).toEqual(['// one', '// two']);
  });
});
