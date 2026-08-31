import { describe, expect, it } from 'vitest';
import { ruleFor } from '../../src/internal/rules.js';

/**
 * The input rules, as arithmetic on a string.
 *
 * Two of them are written down and the rest are the parser's: `# `, `- `, `1. `
 * and `> ` are formatting the moment they are typed because the document is
 * drawn again from the Markdown on every keystroke, and there is nothing here
 * for them to be tested against. What that actually looks like on the page is
 * in the editor's own file, where there is a surface to type into.
 */

/** `'a|b'` is the caret there — the same notation the commands are written in. */
function at(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf('|');

  return { value: marked.replace('|', ''), caret };
}

/** The rule the next character sets off, written back in the same notation. */
function type(marked: string, text: string): string | null {
  const { value, caret } = at(marked);
  const edit = ruleFor(value, caret, text);

  return edit ? `${edit.value.slice(0, edit.caret)}|${edit.value.slice(edit.caret)}` : null;
}

describe('a fence', () => {
  it('opens closed, with the caret between the two', () => {
    expect(type('``|', '`')).toBe('```\n|\n```');
  });

  it('takes what was on the line inside it', () => {
    expect(type('``|Hello', '`')).toBe('```\n|Hello\n```');
  });

  it('leaves what is under it where it was', () => {
    expect(type('Above.\n\n``|\n\nBelow.', '`')).toBe('Above.\n\n```\n|\n```\n\nBelow.');
  });

  it('carries a list item down onto the lines it adds', () => {
    // Without the indent the closing fence is outside the item that opened it,
    // and everything under the list is inside the code block.
    expect(type('- one\n- ``|two', '`')).toBe('- one\n- ```\n  |two\n  ```');
  });

  it('carries a quotation down as well', () => {
    expect(type('> ``|one', '`')).toBe('> ```\n> |one\n> ```');
  });

  it('counts an ordered marker as wide as it is written', () => {
    expect(type('10. ``|', '`')).toBe('10. ```\n    |\n    ```');
  });

  it('closes with the fence that was opened, character for character', () => {
    expect(type('~~|', '~')).toBe('~~~\n|\n~~~');
    expect(type('```|', '`')).toBe('````\n|\n````');
  });

  it('is not a rule with anything else on the line before it', () => {
    expect(type('x ``|', '`')).toBe(null);
    expect(type('``|', 'x')).toBe(null);
  });
});

describe('a thematic break', () => {
  it('gets a line under it to carry on typing on', () => {
    expect(type('--|', '-')).toBe('---\n\n|');
    expect(type('Above.\n\n--|', '-')).toBe('Above.\n\n---\n\n|');
  });

  it('leaves what is under it where it was', () => {
    expect(type('Above.\n\n--|\n\nBelow.', '-')).toBe('Above.\n\n---\n\n|\n\nBelow.');
  });

  it('is asterisks and underscores as well, spaced or not', () => {
    expect(type('**|', '*')).toBe('***\n\n|');
    expect(type('__|', '_')).toBe('___\n\n|');
    expect(type('- - |', '-')).toBe('- - -\n\n|');
  });

  it('does not fire under a line that is still going', () => {
    // `---` under a paragraph line is that paragraph's underline. Turning the
    // line above into a heading is not what drawing a line means.
    expect(type('Hello\n--|', '-')).toBe(null);
  });

  it('does not fire with anything else on the line', () => {
    expect(type('--|Hello', '-')).toBe(null);
    expect(type('x --|', '-')).toBe(null);
  });
});
