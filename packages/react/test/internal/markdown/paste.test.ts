import { describe, expect, it } from 'vitest';
import { markdownFromHtml } from '../../../src/internal/markdown/paste.js';

/**
 * What arrives on the clipboard, read once for what can be made of it.
 *
 * The direction matters: this is markup from somewhere else being read *into*
 * Markdown, not Mawy's own drawing being read back out of the page. It is
 * allowed to lose things, and what it must not do is invent them — a stray
 * asterisk in somebody's prose has to survive as an asterisk.
 */
describe('HTML, read back as Markdown', () => {
  it('reads headings, paragraphs and a rule', () => {
    expect(markdownFromHtml('<h2>Title</h2><p>Words.</p><hr><p>More.</p>')).toBe(
      '## Title\n\nWords.\n\n---\n\nMore.'
    );
  });

  it('reads the four inline markers', () => {
    expect(markdownFromHtml('<p><b>a</b> <i>b</i> <s>c</s> <code>d</code></p>')).toBe(
      '**a** *b* ~~c~~ `d`'
    );
  });

  it('moves the spaces outside the markers', () => {
    // `** bold **` is four asterisks and a word: a run with whitespace against
    // its inside opens nothing.
    expect(markdownFromHtml('<p>a<strong> bold </strong>b</p>')).toBe('a **bold** b');
  });

  it('fences a code span around the backticks inside it', () => {
    expect(markdownFromHtml('<p><code>a `b` c</code></p>')).toBe('``a `b` c``');
  });

  it('reads a link, and keeps the words of one it may not follow', () => {
    expect(markdownFromHtml('<p>See <a href="/docs">the docs</a>.</p>')).toBe(
      'See [the docs](/docs).'
    );
    expect(markdownFromHtml('<p><a href="javascript:alert(1)">click</a></p>')).toBe('click');
  });

  it('reads an image, and keeps the alt text of one it may not load', () => {
    expect(markdownFromHtml('<p><img src="/i.png" alt="a cat"></p>')).toBe('![a cat](/i.png)');
    expect(markdownFromHtml('<p><img src="javascript:x" alt="a cat"></p>')).toBe('a cat');
  });

  it('reads lists, with an ordered one starting where it says', () => {
    expect(markdownFromHtml('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two');
    expect(markdownFromHtml('<ol start="3"><li>three</li><li>four</li></ol>')).toBe(
      '3. three\n4. four'
    );
  });

  it('keeps a nested list tight and inside its item', () => {
    expect(markdownFromHtml('<ul><li>one<ul><li>inner</li></ul></li><li>two</li></ul>')).toBe(
      '- one\n  - inner\n- two'
    );
  });

  it('reads a quotation, and the blocks inside one', () => {
    expect(markdownFromHtml('<blockquote><p>one</p><p>two</p></blockquote>')).toBe(
      '> one\n>\n> two'
    );
  });

  it('reads a code block with its language, and does not escape what is in it', () => {
    expect(markdownFromHtml('<pre><code class="language-ts">const a = *1*;\n</code></pre>')).toBe(
      '```ts\nconst a = *1*;\n```'
    );
  });

  it('reads a table', () => {
    expect(
      markdownFromHtml('<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>')
    ).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });

  it('escapes what would otherwise have meant something', () => {
    expect(markdownFromHtml('<p>2 * 3 _ 4 [5] &lt;b&gt;</p>')).toBe(
      '2 \\* 3 \\_ 4 \\[5\\] \\<b\\>'
    );
  });

  it('escapes a line that would have opened a block it was not', () => {
    expect(markdownFromHtml('<p># not a heading</p>')).toBe('\\# not a heading');
    expect(markdownFromHtml('<p>- not a list</p>')).toBe('\\- not a list');
  });

  it('drops what is not prose, and keeps what was inside what it does not know', () => {
    expect(markdownFromHtml('<p>a<script>alert(1)</script>b</p>')).toBe('ab');
    expect(markdownFromHtml('<p>a<span class="x">b</span>c</p>')).toBe('abc');
  });

  it('gives nothing back for nothing', () => {
    expect(markdownFromHtml('')).toBe('');
    expect(markdownFromHtml('<div>   </div>')).toBe('');
  });
});
