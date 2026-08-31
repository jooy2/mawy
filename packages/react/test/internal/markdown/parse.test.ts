import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import type { MdBlock, MdInline } from '../../../src/internal/markdown/ast.js';

/**
 * The parser, read back as a tree.
 *
 * These assert the shape rather than the rendering on purpose: the renderer is
 * a `switch` over these nodes and has no opinions of its own, so a document
 * that comes out of here right is a document that draws right. What is worth
 * testing about the two together is in the component's own file.
 */

const blocks = (source: string): MdBlock[] => parseMarkdown(source).root.children;
const first = (source: string): MdBlock => blocks(source)[0];

/** A block's inline children, for the blocks that have them. */
function inline(block: MdBlock): MdInline[] {
  return 'children' in block ? (block.children as MdInline[]) : [];
}

describe('block structure', () => {
  it('reads ATX headings, with the closing hashes taken off', () => {
    expect(first('## Hello ##')).toMatchObject({ type: 'heading', depth: 2 });
    expect(inline(first('## Hello ##'))).toEqual([{ type: 'text', value: 'Hello' }]);
  });

  it('does not read a hash with no space after it as a heading', () => {
    expect(first('#nope').type).toBe('paragraph');
  });

  it('reads setext headings', () => {
    expect(first('Title\n=====')).toMatchObject({ type: 'heading', depth: 1 });
    expect(first('Title\n-----')).toMatchObject({ type: 'heading', depth: 2 });
  });

  it('reads a fenced code block with its language, and keeps the text exactly', () => {
    expect(first('```ts twoslash\nconst a = 1;\n\n  indented\n```')).toEqual({
      type: 'code',
      lang: 'ts',
      meta: 'twoslash',
      value: 'const a = 1;\n\n  indented'
    });
  });

  it('reads an indented code block', () => {
    expect(first('    one\n    two')).toMatchObject({
      type: 'code',
      lang: null,
      value: 'one\ntwo'
    });
  });

  it('separates a thematic break from a list', () => {
    expect(first('- - -').type).toBe('thematicBreak');
    expect(first('***').type).toBe('thematicBreak');
    expect(first('- one').type).toBe('list');
  });

  it('nests a list inside a list item', () => {
    const list = first('- one\n  - two\n- three');

    expect(list).toMatchObject({ type: 'list', ordered: false, loose: false });
    expect(list.type === 'list' && list.children).toHaveLength(2);
    expect(list.type === 'list' && list.children[0].children[1]).toMatchObject({ type: 'list' });
  });

  it('keeps an ordered list start', () => {
    expect(first('3. three\n4. four')).toMatchObject({ type: 'list', ordered: true, start: 3 });
  });

  it('calls a list loose when its items are separated by a blank line', () => {
    expect(first('- one\n\n- two')).toMatchObject({ loose: true });
    expect(first('- one\n- two')).toMatchObject({ loose: false });
  });

  it('reads task list markers', () => {
    const list = first('- [ ] todo\n- [x] done');

    expect(list.type === 'list' && list.children.map((item) => item.checked)).toEqual([
      false,
      true
    ]);
  });

  it('reads a blockquote, and a lazy continuation of one', () => {
    const quote = first('> one\ntwo');

    expect(quote).toMatchObject({ type: 'blockquote', alert: null });
    expect(quote.type === 'blockquote' && quote.children[0].type).toBe('paragraph');
  });

  it('reads a GitHub alert as a kind rather than as a paragraph', () => {
    const quote = first('> [!WARNING]\n> Careful.');

    expect(quote).toMatchObject({ type: 'blockquote', alert: 'warning' });
    expect(quote.type === 'blockquote' && quote.children).toHaveLength(1);
  });

  it('reads a table with its alignments', () => {
    const table = first('| a | b | c |\n| :- | :-: | -: |\n| 1 | 2 | 3 |');

    expect(table).toMatchObject({ type: 'table', align: ['left', 'center', 'right'] });
    expect(table.type === 'table' && table.children).toHaveLength(2);
    expect(table.type === 'table' && table.children[0].header).toBe(true);
  });

  it('does not read a table when gfm is off', () => {
    const document = parseMarkdown('| a |\n| - |\n| 1 |', { gfm: false });

    expect(document.root.children[0].type).toBe('paragraph');
  });

  it('lets a heading interrupt a paragraph but not a stray hash', () => {
    expect(blocks('text\n# head').map((block) => block.type)).toEqual(['paragraph', 'heading']);
    expect(blocks('text\nmore').map((block) => block.type)).toEqual(['paragraph']);
  });
});

describe('inline structure', () => {
  it('pairs emphasis and strong the way the specification does', () => {
    expect(inline(first('*foo**bar**baz*'))).toEqual([
      {
        type: 'emphasis',
        children: [
          { type: 'text', value: 'foo' },
          { type: 'strong', children: [{ type: 'text', value: 'bar' }] },
          { type: 'text', value: 'baz' }
        ]
      }
    ]);
  });

  it('leaves an unpaired delimiter as the character it is', () => {
    expect(inline(first('a * b'))).toEqual([{ type: 'text', value: 'a * b' }]);
  });

  it('does not emphasise inside a word with underscores', () => {
    expect(inline(first('snake_case_name'))).toEqual([{ type: 'text', value: 'snake_case_name' }]);
  });

  it('reads a code span, and a code span holding a backtick', () => {
    expect(inline(first('`a *b* c`'))).toEqual([{ type: 'inlineCode', value: 'a *b* c' }]);
    expect(inline(first('`` ` ``'))).toEqual([{ type: 'inlineCode', value: '`' }]);
  });

  it('reads strikethrough only as a pair of tildes', () => {
    expect(inline(first('~~gone~~'))).toEqual([
      { type: 'delete', children: [{ type: 'text', value: 'gone' }] }
    ]);
    expect(inline(first('a ~ b'))).toEqual([{ type: 'text', value: 'a ~ b' }]);
  });

  it('reads an inline link with a title', () => {
    expect(inline(first('[text](/path "Title")'))).toEqual([
      { type: 'link', url: '/path', title: 'Title', children: [{ type: 'text', value: 'text' }] }
    ]);
  });

  it('resolves a reference link defined further down the file', () => {
    expect(inline(first('See [the docs][ref].\n\n[REF]: https://example.com'))).toContainEqual({
      type: 'link',
      url: 'https://example.com',
      title: null,
      children: [{ type: 'text', value: 'the docs' }]
    });
  });

  it('drops a definition rather than drawing it', () => {
    expect(blocks('[ref]: /a\n\ntext').map((block) => block.type)).toEqual(['paragraph']);
  });

  it('reads an image, with the label as its alt text', () => {
    expect(inline(first('![a *b*](/i.png)'))).toEqual([
      { type: 'image', url: '/i.png', title: null, alt: 'a b' }
    ]);
  });

  it('reads an autolink and a bare URL', () => {
    expect(inline(first('<https://a.example>'))[0]).toMatchObject({
      type: 'link',
      url: 'https://a.example'
    });
    expect(inline(first('see https://a.example/x, then'))).toEqual([
      { type: 'text', value: 'see ' },
      {
        type: 'link',
        url: 'https://a.example/x',
        title: null,
        children: [{ type: 'text', value: 'https://a.example/x' }]
      },
      { type: 'text', value: ', then' }
    ]);
  });

  it('does not linkify inside a link that is already one', () => {
    expect(inline(first('[https://a.example](/b)'))).toEqual([
      {
        type: 'link',
        url: '/b',
        title: null,
        children: [{ type: 'text', value: 'https://a.example' }]
      }
    ]);
  });

  it('keeps both brackets of an outer link a nested one stole', () => {
    // The inner link deactivates the outer opener, and the `[` it opened with
    // is then text — text that has to still be there.
    const nodes = inline(first('[a [b](c)](d)'));

    expect(nodes[0]).toEqual({ type: 'text', value: '[a ' });
    expect(nodes[1]).toMatchObject({ type: 'link', url: 'c' });
    expect(nodes[2]).toEqual({ type: 'text', value: '](d)' });
  });

  it('decodes character references', () => {
    expect(inline(first('AT&T &amp; co &#65; &nope;'))).toEqual([
      { type: 'text', value: 'AT&T & co A &nope;' }
    ]);
  });

  it('reads a backslash escape, and a hard break', () => {
    expect(inline(first('\\*not emphasis\\*'))).toEqual([
      { type: 'text', value: '*not emphasis*' }
    ]);
    expect(inline(first('a  \nb'))).toEqual([
      { type: 'text', value: 'a' },
      { type: 'break' },
      { type: 'text', value: 'b' }
    ]);
  });

  it('makes every newline a break when asked to', () => {
    const paragraph = parseMarkdown('a\nb', { breaks: true }).root.children[0];

    expect(inline(paragraph).some((node) => node.type === 'break')).toBe(true);
  });
});

describe('safety', () => {
  it('refuses a javascript: link and keeps the words', () => {
    expect(inline(first('[click](javascript:alert(1))'))).toEqual([
      { type: 'text', value: 'click' }
    ]);
  });

  it('refuses a javascript: URL written with a newline inside the scheme', () => {
    expect(inline(first('[click](java\\\nscript:alert(1))'))[0].type).not.toBe('link');
  });

  it('allows a data: URL for an image and refuses one for a link', () => {
    expect(inline(first('![a](data:image/png;base64,AAAA)'))[0]).toMatchObject({ type: 'image' });
    expect(inline(first('[a](data:text/html,<script>)'))[0].type).not.toBe('link');
  });

  it('leaves raw HTML in the tree for the renderer to decide about', () => {
    expect(first('<div>hi</div>')).toEqual({ type: 'html', value: '<div>hi</div>' });
    expect(inline(first('a <b>c</b>'))).toContainEqual({ type: 'inlineHtml', value: '<b>' });
  });
});

describe('the outline', () => {
  it('slugs every heading and makes repeats unique', () => {
    const { outline } = parseMarkdown('# One\n## One\n### 두 번째');

    expect(outline).toEqual([
      { depth: 1, slug: 'one', text: 'One' },
      { depth: 2, slug: 'one-1', text: 'One' },
      { depth: 3, slug: '두-번째', text: '두 번째' }
    ]);
  });

  it('gives the renderer the same slug it gave the outline', () => {
    const { root, outline } = parseMarkdown('# A & B!');
    const heading = root.children[0];

    expect(heading.type === 'heading' && heading.slug).toBe(outline[0].slug);
    expect(outline[0].slug).toBe('a--b');
  });

  it('finds headings inside blockquotes and list items', () => {
    expect(parseMarkdown('> # Quoted\n\n- # Listed').outline.map((entry) => entry.text)).toEqual([
      'Quoted',
      'Listed'
    ]);
  });
});
