import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import type {
  MdBlock,
  MdCode,
  MdInline,
  MdNode,
  MdRange
} from '../../../src/internal/markdown/ast.js';

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

/**
 * The same tree with every range taken off — a node's own, and the `content`
 * range a code block carries as well.
 *
 * The assertions about shape are read far more often than they are written, and
 * a range in each of them would bury what any one is checking. The ranges have
 * a section of their own further down, where they are the subject.
 */
function bare<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map(bare) as T;
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => key !== 'range' && key !== 'content')
        .map(([key, value]) => [key, bare(value)])
    ) as T;
  }

  return node;
}

describe('block structure', () => {
  it('reads ATX headings, with the closing hashes taken off', () => {
    expect(first('## Hello ##')).toMatchObject({ type: 'heading', depth: 2 });
    expect(bare(inline(first('## Hello ##')))).toEqual([{ type: 'text', value: 'Hello' }]);
  });

  it('does not read a hash with no space after it as a heading', () => {
    expect(first('#nope').type).toBe('paragraph');
  });

  it('reads setext headings', () => {
    expect(first('Title\n=====')).toMatchObject({ type: 'heading', depth: 1 });
    expect(first('Title\n-----')).toMatchObject({ type: 'heading', depth: 2 });
  });

  it('reads a fenced code block with its language, and keeps the text exactly', () => {
    expect(bare(first('```ts twoslash\nconst a = 1;\n\n  indented\n```'))).toEqual({
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
    expect(bare(inline(first('*foo**bar**baz*')))).toEqual([
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
    expect(bare(inline(first('a * b')))).toEqual([{ type: 'text', value: 'a * b' }]);
  });

  it('does not emphasise inside a word with underscores', () => {
    expect(bare(inline(first('snake_case_name')))).toEqual([
      { type: 'text', value: 'snake_case_name' }
    ]);
  });

  it('reads a code span, and a code span holding a backtick', () => {
    expect(bare(inline(first('`a *b* c`')))).toEqual([{ type: 'inlineCode', value: 'a *b* c' }]);
    expect(bare(inline(first('`` ` ``')))).toEqual([{ type: 'inlineCode', value: '`' }]);
  });

  it('reads strikethrough only as a pair of tildes', () => {
    expect(bare(inline(first('~~gone~~')))).toEqual([
      { type: 'delete', children: [{ type: 'text', value: 'gone' }] }
    ]);
    expect(bare(inline(first('a ~ b')))).toEqual([{ type: 'text', value: 'a ~ b' }]);
  });

  it('reads an inline link with a title', () => {
    expect(bare(inline(first('[text](/path "Title")')))).toEqual([
      { type: 'link', url: '/path', title: 'Title', children: [{ type: 'text', value: 'text' }] }
    ]);
  });

  it('resolves a reference link defined further down the file', () => {
    expect(
      bare(inline(first('See [the docs][ref].\n\n[REF]: https://example.com')))
    ).toContainEqual({
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
    expect(bare(inline(first('![a *b*](/i.png)')))).toEqual([
      { type: 'image', url: '/i.png', title: null, alt: 'a b' }
    ]);
  });

  it('reads an autolink and a bare URL', () => {
    expect(inline(first('<https://a.example>'))[0]).toMatchObject({
      type: 'link',
      url: 'https://a.example'
    });
    expect(bare(inline(first('see https://a.example/x, then')))).toEqual([
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
    expect(bare(inline(first('[https://a.example](/b)')))).toEqual([
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

    expect(bare(nodes[0])).toEqual({ type: 'text', value: '[a ' });
    expect(nodes[1]).toMatchObject({ type: 'link', url: 'c' });
    expect(bare(nodes[2])).toEqual({ type: 'text', value: '](d)' });
  });

  it('decodes character references', () => {
    expect(bare(inline(first('AT&T &amp; co &#65; &nope;')))).toEqual([
      { type: 'text', value: 'AT&T & co A &nope;' }
    ]);
  });

  it('reads a backslash escape, and a hard break', () => {
    expect(bare(inline(first('\\*not emphasis\\*')))).toEqual([
      { type: 'text', value: '*not emphasis*' }
    ]);
    expect(bare(inline(first('a  \nb')))).toEqual([
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
    expect(bare(inline(first('[click](javascript:alert(1))')))).toEqual([
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
    expect(bare(first('<div>hi</div>'))).toEqual({ type: 'html', value: '<div>hi</div>' });
    expect(bare(inline(first('a <b>c</b>')))).toContainEqual({
      type: 'inlineHtml',
      value: '<b>'
    });
  });
});

describe('the outline', () => {
  it('slugs every heading and makes repeats unique', () => {
    const { outline } = parseMarkdown('# One\n## One\n### 두 번째');

    expect(bare(outline)).toEqual([
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

/**
 * Where every node says it came from.
 *
 * Nothing in the library reads these yet, and that is exactly why they are
 * tested this closely: a range that is quietly two characters out is invisible
 * until a preview scrolls to the wrong paragraph or an edit is written back
 * over the wrong word. The assertions below mostly read the range back out of
 * the source, so a wrong one fails as the wrong text rather than as a number.
 */
describe('source positions', () => {
  /** The text a node was read out of. */
  const at = (source: string, node: { range: MdRange }): string =>
    source.slice(node.range.start, node.range.end);

  /** Every node in the tree, each with whatever holds it. */
  function walk(root: MdNode, visit: (node: MdNode, parent: MdNode | null) => void): void {
    const step = (node: MdNode, parent: MdNode | null) => {
      visit(node, parent);

      if ('children' in node) {
        for (const child of node.children as MdNode[]) {
          step(child, node);
        }
      }
    };

    step(root, null);
  }

  /** A document with one of most things in it. */
  const sample = [
    '# A title',
    '',
    'Under it',
    '========',
    '',
    'A paragraph with **strong**, *emphasis*, `code`, [a link](/u) and',
    'AT&amp;T at https://example.com/a\\_b, ending in a hard break.  ',
    'The line after it.',
    '',
    '> [!NOTE]',
    '> A quotation that runs on',
    'without its marker.',
    '',
    '- [ ] one',
    '- two',
    '  - nested',
    '',
    '| a | b\\|c |',
    '| :- | -: |',
    '| 1 | 2 |',
    '',
    '```ts',
    'const a = 1;',
    '```',
    '',
    '    indented code',
    '',
    '<div>raw</div>',
    '',
    '---',
    '',
    'See [the docs][ref].',
    '',
    '[ref]: https://example.com'
  ].join('\n');

  it('points a block at the lines it was written on', () => {
    const source = '# Title\n\nA paragraph\nover two lines.\n\n---\n';
    const [heading, paragraph, rule] = blocks(source);

    expect(at(source, heading)).toBe('# Title');
    expect(at(source, paragraph)).toBe('A paragraph\nover two lines.');
    expect(at(source, rule)).toBe('---');
  });

  it('takes in a fence, and an underline', () => {
    const fenced = '```ts\nconst a = 1;\n```\n';
    const indented = 'text\n\n    one\n    two\n\nmore';
    const setext = 'Title\n=====\n';

    expect(at(fenced, first(fenced))).toBe('```ts\nconst a = 1;\n```');
    expect(at(indented, blocks(indented)[1])).toBe('    one\n    two');
    expect(at(setext, first(setext))).toBe('Title\n=====');
  });

  it('points a code block at the code, as well as at the fences round it', () => {
    // The block's own range holds the fences, the info string and the indent.
    // The code inside is a second answer, and the one an editor needs: it is
    // the part a caret can be in.
    const inside = (source: string): string => {
      const code = first(source) as MdCode;

      return source.slice(code.content.start, code.content.end);
    };

    expect(inside('```ts\nconst a = 1;\nconst b = 2;\n```')).toBe('const a = 1;\nconst b = 2;');
    expect(inside('  ```\n  one\n  ```')).toBe('one');
    expect(inside('    one\n    two')).toBe('one\n    two');

    // Nothing between the fences is still a place, and the empty one just past
    // the opening fence is the only one it can be.
    const empty = first('```\n```') as MdCode;

    expect(empty.content).toEqual({ start: 4, end: 4 });

    // An unclosed fence with nothing after it has no line at all to point at.
    const alone = first('```') as MdCode;

    expect(alone.content).toEqual({ start: 3, end: 3 });
  });

  it('reaches inside a paragraph', () => {
    const source = 'a **bold** and `code` and [text](/u) and ![i](/i.png).';
    const [, strong, , code, , link, , image] = inline(first(source));

    expect(at(source, strong)).toBe('**bold**');
    expect(at(source, code)).toBe('`code`');
    expect(at(source, link)).toBe('[text](/u)');
    expect(at(source, image)).toBe('![i](/i.png)');
  });

  it('keeps the delimiters a run did not use', () => {
    const source = '***x*';
    const [text, emphasis] = inline(first(source));

    expect(at(source, text)).toBe('**');
    expect(at(source, emphasis)).toBe('*x*');
  });

  it('spans the prefix a container puts on the lines it continues', () => {
    const source = '> one\n> two';
    const quote = first(source);
    const inside = quote.type === 'blockquote' ? quote.children[0] : quote;

    expect(at(source, quote)).toBe('> one\n> two');
    // The paragraph starts after the first `>` and ends at the end of the
    // second line, across the marker in between: a range says where a node
    // begins and where it ends, not that every character between is its own.
    expect(at(source, inside)).toBe('one\n> two');
  });

  it('gives a list item its own marker', () => {
    const source = '- one\n- two\n  more';
    const list = first(source);
    const items = list.type === 'list' ? list.children : [];

    expect(at(source, list)).toBe(source);
    expect(at(source, items[0])).toBe('- one');
    expect(at(source, items[1])).toBe('- two\n  more');
  });

  it('gives a table cell the text between its pipes, escapes and all', () => {
    const source = '| a | b\\|c |\n| - | - |\n| 1 | 2 |';
    const table = first(source);
    const rows = table.type === 'table' ? table.children : [];

    expect(at(source, rows[0])).toBe('| a | b\\|c |');
    expect(at(source, rows[0].children[1])).toBe('b\\|c');
    expect(at(source, rows[1].children[1])).toBe('2');
  });

  it('counts the document that was handed in, not the one it was tidied into', () => {
    const windows = '# Title\r\n\r\nA paragraph.\r\n';
    const [heading, paragraph] = blocks(windows);
    const marked = '\uFEFF# Title';
    const tabbed = 'text\n\n\tindented';

    expect(at(windows, heading)).toBe('# Title');
    expect(at(windows, paragraph)).toBe('A paragraph.');
    expect(at(marked, first(marked))).toBe('# Title');
    expect(at(tabbed, blocks(tabbed)[1])).toBe('\tindented');
  });

  it('gives the outline the range of the heading it names', () => {
    const source = '# One\n\ntext\n\n## Two';
    const { outline } = parseMarkdown(source);

    expect(outline.map((entry) => at(source, entry))).toEqual(['# One', '## Two']);
  });

  it('holds a text node to the characters it was written with', () => {
    const source = 'plain words, and *emphasis*';
    const [text] = inline(first(source));

    expect(at(source, text)).toBe('plain words, and ');
  });

  it('nests every node inside the one that holds it, in order', () => {
    const { root } = parseMarkdown(sample);

    expect(at(sample, root)).toBe(sample);

    walk(root, (node, parent) => {
      expect(node.range.end).toBeGreaterThanOrEqual(node.range.start);
      expect(node.range.end).toBeLessThanOrEqual(sample.length);

      if (parent) {
        expect(node.range.start).toBeGreaterThanOrEqual(parent.range.start);
        expect(node.range.end).toBeLessThanOrEqual(parent.range.end);
      }

      if (!('children' in node)) {
        return;
      }

      const children = node.children as MdNode[];

      for (let index = 1; index < children.length; index += 1) {
        expect(children[index].range.start).toBeGreaterThanOrEqual(children[index - 1].range.end);
      }
    });
  });

  /**
   * Lines to stitch documents out of.
   *
   * The invariants below are the whole point of a range and they hold over an
   * endless number of documents, so they are checked over documents nobody
   * wrote. What matters is the combinations: a table inside a list inside a
   * quotation is where a container forgets to pass an offset on, and there are
   * more of those than anyone is going to sit down and enumerate.
   */
  const fragments = [
    '# Heading ###',
    '## A & B!',
    'Title',
    '=====',
    '-----',
    '',
    'plain prose with words',
    'a **bold** and *em* and ***both*** and `code`',
    '*foo**bar**baz*',
    '__under__ snake_case_name a_b_c',
    '~~gone~~ a ~ b ~~~three~~~',
    '[text](/path "Title") [ref][r] [a [b](c)](d) ![i](/i.png)',
    '[r]: https://example.com "T"',
    '<https://a.example> me@example.com see https://a.example/x, then',
    'AT&amp;T &#65; &nope; \\*escaped\\* \\',
    'trailing spaces  ',
    '> quoted',
    '> [!WARNING]',
    '>> nested quote',
    '- item',
    '- [ ] todo',
    '  - nested',
    '    deeper',
    '1. one',
    '3) three',
    '- - -',
    '| a | b\\|c |',
    '| :- | -: |',
    '| 1 | 2 |',
    '```ts twoslash',
    'const a = 1;',
    '```',
    '    indented code',
    '\ttab indented',
    '<div>',
    'raw html',
    '</div>',
    '<!-- comment -->',
    'https://x.example/a_b_c and https://y.example/(a)b.',
    'text with | pipe',
    '   three spaces in',
    'unicode 두 번째 テスト'
  ];

  /** The same sequence every run, so a failure is one that can be looked at. */
  function rolls(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;

      return state / 0x100000000;
    };
  }

  it('nests and orders over documents nobody wrote', () => {
    const next = rolls(20260831);
    let failure: string | null = null;

    const check = (source: string, node: MdNode, parent: MdNode | null) => {
      const wrong =
        node.range.end < node.range.start
          ? 'inverted'
          : node.range.end > source.length
            ? 'past the end of the document'
            : parent && node.range.start < parent.range.start
              ? 'starts before its parent'
              : parent && node.range.end > parent.range.end
                ? 'ends after its parent'
                : null;

      if (wrong && !failure) {
        failure = `${node.type} ${wrong} in ${JSON.stringify(source)}`;
      }

      if (!('children' in node)) {
        return;
      }

      const children = node.children as MdNode[];

      children.forEach((child, index) => {
        if (index > 0 && child.range.start < children[index - 1].range.end && !failure) {
          failure = `${child.type} out of order in ${JSON.stringify(source)}`;
        }

        check(source, child, node);
      });
    };

    for (let round = 0; round < 2000 && !failure; round += 1) {
      const lines: string[] = [];
      const count = 1 + Math.floor(next() * 12);

      for (let line = 0; line < count; line += 1) {
        lines.push(fragments[Math.floor(next() * fragments.length)]);
      }

      const source = (next() < 0.1 ? '\uFEFF' : '') + lines.join(next() < 0.2 ? '\r\n' : '\n');

      check(source, parseMarkdown(source).root, null);
    }

    expect(failure).toBeNull();
  });

  it('holds the same shape when the same document arrives with Windows endings', () => {
    const windows = sample.replace(/\n/g, '\r\n');
    const { root } = parseMarkdown(windows);

    walk(root, (node, parent) => {
      expect(node.range.end).toBeGreaterThanOrEqual(node.range.start);
      expect(node.range.end).toBeLessThanOrEqual(windows.length);

      if (parent) {
        expect(node.range.start).toBeGreaterThanOrEqual(parent.range.start);
        expect(node.range.end).toBeLessThanOrEqual(parent.range.end);
      }
    });

    expect(bare(root)).toEqual(bare(parseMarkdown(sample).root));
  });
});
