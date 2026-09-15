import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../src/internal/markdown/parse.js';
import {
  alertWritten,
  blockRemoved,
  codeLanguageWritten,
  imageWritten,
  inlineRemoved,
  inserted,
  linkRemoved,
  linkWritten,
  targetAt,
  type MawyBlockTarget
} from '../../src/internal/overlays.js';

/**
 * What the drawn document's floating bars write, as arithmetic on a string.
 *
 * `^` is where the caret is, the way the table tests write it: the notation the
 * command tests use, `|`, is half of what a table is made of.
 */
function at(marked: string): { value: string; caret: number } {
  const caret = marked.indexOf('^');

  return { value: marked.replace('^', ''), caret };
}

function target(marked: string): MawyBlockTarget | null {
  const { value, caret } = at(marked);

  return targetAt(parseMarkdown(value).root.children, caret, caret, value);
}

function shown(edit: { value: string; caret: number } | null): string | null {
  return edit && `${edit.value.slice(0, edit.caret)}^${edit.value.slice(edit.caret)}`;
}

describe('what a bar is for', () => {
  it('finds the picture, the link, the code block or the alert the caret is in', () => {
    expect(target('A ![a hill](hill.png)^ here.')).toMatchObject({
      kind: 'image',
      url: 'hill.png',
      alt: 'a hill'
    });
    expect(target('See [the **office**^](https://example.org "Stormwater").')).toMatchObject({
      kind: 'link',
      url: 'https://example.org',
      title: 'Stormwater',
      text: 'the office'
    });
    expect(target('```ts\nconst a^ = 1;\n```')).toMatchObject({ kind: 'code', lang: 'ts' });
    expect(target('> [!NOTE]\n> Worth kno^wing.')).toMatchObject({ kind: 'alert', alert: 'note' });
  });

  it('takes the innermost, and nothing for words, a quotation or indented code', () => {
    expect(target('> [!TIP]\n> See [here^](x).')).toMatchObject({ kind: 'link' });
    expect(target('Just wo^rds.')).toBe(null);
    expect(target('> Quo^ted.')).toBe(null);
    expect(target('    in^dented')).toBe(null);
  });
});

describe('what a bar writes', () => {
  it('writes a picture again with its address and description', () => {
    const { value, caret } = at('A ![a hill](hill.png "Top")^ here.');
    const image = targetAt(parseMarkdown(value).root.children, caret, caret, value);

    expect(
      shown(imageWritten(value, image as never, { url: 'my hill.png', alt: 'a [big] hill' }))
    ).toBe('A ![a \\[big\\] hill](<my hill.png> "Top")^ here.');
    expect(shown(inlineRemoved(value, image!.range))).toBe('A ^ here.');
  });

  it('keeps the formatting of words left alone, and writes changed words plain', () => {
    const { value, caret } = at('See [the **office**^](https://a.org).');
    const link = targetAt(parseMarkdown(value).root.children, caret, caret, value);

    expect(
      shown(linkWritten(value, link as never, { url: 'https://b.org', text: 'the office' }))
    ).toBe('See [the **office**^](https://b.org).');
    expect(shown(linkWritten(value, link as never, { url: 'https://a.org', text: 'desk' }))).toBe(
      'See [desk^](https://a.org).'
    );
    expect(shown(linkRemoved(value, link as never))).toBe('See the **office**^.');
  });

  it('writes a new link or picture in place of what was selected', () => {
    expect(
      shown(
        inserted(
          'See it.',
          { start: 4, end: 6 },
          { url: 'https://a.org', text: 'it', image: false }
        )
      )
    ).toBe('See [it](https://a.org)^.');
    expect(
      shown(
        inserted('See .', { start: 4, end: 4 }, { url: 'https://a.org', text: '', image: false })
      )
    ).toBe('See [https://a.org](https://a.org)^.');
    expect(
      shown(inserted('', { start: 0, end: 0 }, { url: 'hill.png', text: 'a hill', image: true }))
    ).toBe('![a hill](hill.png)^');
  });

  it('names the language on a fence, or takes it off with what followed it', () => {
    const value = 'Intro.\n\n```ts twoslash\nconst a = 1;\n```';
    const range = { start: 8, end: value.length };
    const caret = value.indexOf('a =');

    expect(shown(codeLanguageWritten(value, range, 'python', caret))).toBe(
      'Intro.\n\n```python twoslash\nconst ^a = 1;\n```'
    );
    expect(shown(codeLanguageWritten(value, range, '', caret))).toBe(
      'Intro.\n\n```\nconst ^a = 1;\n```'
    );
  });

  it('makes an alert another kind, and takes a block out whole', () => {
    const value = 'Intro.\n\n> [!NOTE]\n> Worth knowing.\n\nAfter.';
    const range = { start: 8, end: value.indexOf('\n\nAfter.') };

    expect(shown(alertWritten(value, range, 'warning', value.indexOf('Worth')))).toBe(
      'Intro.\n\n> [!WARNING]\n> ^Worth knowing.\n\nAfter.'
    );
    expect(shown(blockRemoved(value, range))).toBe('Intro.\n\n^After.');
  });
});
