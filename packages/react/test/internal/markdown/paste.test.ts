import { describe, expect, it } from 'vitest';
import {
  markdownFromHtml,
  markupHasContent,
  pasteFromHtml,
  wrappedPlainText
} from '../../../src/internal/markdown/paste.js';
import { PIXEL_DATA, PIXEL_HEX, rtfPicture, wordHtml, wordRtf } from '../../support/word.js';

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

  /**
   * A drawing is not prose, and `tagName` does not say so in the case the rest
   * of the file is written in: an `<svg>` answers `svg`, so it matched nothing
   * and its labels came through as a sentence.
   */
  it('drops a drawing rather than pasting the words inside it', () => {
    expect(markdownFromHtml('<p>a</p><svg><text>label</text></svg><p>b</p>')).toBe('a\n\nb');
    expect(markdownFromHtml('<p>a<math><mi>x</mi></math>b</p>')).toBe('ab');
  });

  it('gives nothing back for nothing', () => {
    expect(markdownFromHtml('')).toBe('');
    expect(markdownFromHtml('<div>   </div>')).toBe('');
  });
});

/**
 * A `data:` picture is bytes rather than an address, and where there is an
 * `onUploadImage` the paste takes it out to be uploaded and says where it stood.
 */
describe('pictures carried inline', () => {
  const DOT = 'data:image/png;base64,iVBORw0KGgo=';

  it('takes them out and says where each one stood', () => {
    expect(
      pasteFromHtml(
        `<h2>Two</h2><p>A <img src="${DOT}" alt="dot"> and <img src="/b.png" alt="b"></p><p><img src="${DOT}"></p>`
      )
    ).toEqual({
      markdown: '## Two\n\nA  and ![b](/b.png)\n\n',
      images: [
        { at: 10, url: DOT, alt: 'dot' },
        { at: 29, url: DOT, alt: '' }
      ]
    });
  });

  it('leaves them in the Markdown when nobody asked for them to be taken out', () => {
    expect(markdownFromHtml(`<p><img src="${DOT}" alt="dot"></p>`)).toBe(`![dot](${DOT})`);
  });

  it('does not mistake the character it marks them with for one of them', () => {
    expect(pasteFromHtml('<p>a\uFFFCb</p>')).toEqual({ markdown: 'ab', images: [] });
    // Nor where it arrives in code, or in another picture's description.
    expect(pasteFromHtml(`<p><code>a\uFFFCb</code> then <img src="${DOT}" alt="d"></p>`)).toEqual({
      markdown: '`ab` then ',
      images: [{ at: 10, url: DOT, alt: 'd' }]
    });
    expect(
      pasteFromHtml(`<p><img src="/a.png" alt="x\uFFFCy"> <img src="${DOT}" alt="d"></p>`)
    ).toEqual({ markdown: '![xy](/a.png) ', images: [{ at: 14, url: DOT, alt: 'd' }] });
    expect(pasteFromHtml(`<pre><code>a\uFFFCb</code></pre><p><img src="${DOT}"></p>`)).toEqual({
      markdown: '```\nab\n```\n\n',
      images: [{ at: 12, url: DOT, alt: '' }]
    });
  });

  it('does not count them, or a description with no picture, as something to paste', () => {
    expect(markupHasContent(`<img src="${DOT}" alt="png (1×1)">`)).toBe(false);
    expect(markupHasContent('<img src="blob:https://a.test/x" alt="x (1×1)">')).toBe(false);
    expect(markupHasContent('<img src="https://a.test/x.png">')).toBe(true);
    expect(markupHasContent('<p>words</p>')).toBe(true);
  });
});

/**
 * What a word processor puts beside its markup: the same document in RTF, with
 * every picture's bytes in it. Word writes an `<img>` whose address is a file on
 * the machine that copied it, which no page can open, and the picture is lost
 * unless it is read back out of the RTF. See `test/support/word.ts`.
 */
describe('pictures read out of the RTF beside the markup', () => {
  const LOCAL = 'file:///PATH/clip_image001.png';

  it('takes a picture the markup cannot point at from the RTF', () => {
    expect(pasteFromHtml(wordHtml(LOCAL), wordRtf(PIXEL_HEX))).toEqual({
      markdown: 'Some words.\n\n',
      images: [{ at: 13, url: PIXEL_DATA, alt: '' }]
    });
    // Word breaks the hexadecimal into lines, which are not part of it.
    const broken = PIXEL_HEX.replace(/(.{40})/g, '$1\r\n');

    expect(pasteFromHtml(wordHtml(LOCAL), wordRtf(broken)).images).toEqual([
      { at: 13, url: PIXEL_DATA, alt: '' }
    ]);
  });

  it('matches the pictures in the order both write them, bytes in the markup and all', () => {
    const jpeg = rtfPicture('jpegblip', 'ffd8ffe000104a46494600');

    expect(
      pasteFromHtml(
        wordHtml(PIXEL_DATA, LOCAL),
        `{\\rtf1 Some words.\\par ${rtfPicture('pngblip', PIXEL_HEX)}${jpeg}}`
      ).images
    ).toEqual([
      { at: 13, url: PIXEL_DATA, alt: '' },
      { at: 13, url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgA=', alt: '' }
    ]);
  });

  it('is not thrown off by the escapes in the words before a picture', () => {
    // A brace written as a character, a backslash, and a letter written as its
    // two hexadecimal digits — none of which opens or closes a group. Read as a
    // brace, the one inside the fallback would end it early, and its metafile
    // would be counted as a second picture.
    const fallback = rtfPicture('wmetafile8', '0100', true).replace(
      '{\\nonshppict',
      '{\\nonshppict \\} '
    );
    const rtf = `{\\rtf1 A \\{brace\\} and \\\\ and caf\\'e9.\\par ${rtfPicture('pngblip', PIXEL_HEX)}${fallback}}`;

    expect(pasteFromHtml(wordHtml(LOCAL), rtf).images).toEqual([
      { at: 13, url: PIXEL_DATA, alt: '' }
    ]);
  });

  it('takes nothing from RTF without one picture for every picture in the markup', () => {
    // Which RTF picture goes with which `<img>` is only known by counting, and a
    // picture in the wrong place is worse than one left out.
    expect(pasteFromHtml(wordHtml(LOCAL, LOCAL), wordRtf(PIXEL_HEX)).images).toEqual([]);
    expect(pasteFromHtml(wordHtml(LOCAL), wordRtf(PIXEL_HEX, PIXEL_HEX)).images).toEqual([]);
  });

  it('takes no picture in a format nothing can open as a file, and no RTF without a paste', () => {
    const metafile = `{\\rtf1 ${rtfPicture('wmetafile8', '0100090000')}}`;

    expect(pasteFromHtml(wordHtml(LOCAL), metafile).images).toEqual([]);
    expect(pasteFromHtml(wordHtml(LOCAL)).images).toEqual([]);
    expect(pasteFromHtml(wordHtml(LOCAL), '{\\rtf1 {\\pict\\pngblip\\bin4 abcd}}').images).toEqual(
      []
    );
  });
});

/**
 * A browser given a `text/plain` file draws it inside one `<pre>` and puts that
 * on the clipboard as its HTML. Read as the preformatted block it looks like, a
 * Markdown file copied out of one arrives inside a fence, headings and all.
 */
describe('a document a browser was showing as plain text', () => {
  const file = '# Title\n\nSome **words**.\n\n- one\n- two\n';
  const wrapper = `<pre style="word-wrap: break-word; white-space: pre-wrap;">${file}</pre>`;

  it('is the text it showed rather than a fence around it', () => {
    expect(wrappedPlainText(wrapper, file)).toBe(true);
    // Which is what the reading would otherwise have made of it.
    expect(markdownFromHtml(wrapper)).toBe(`\`\`\`\n${file.trim()}\n\`\`\``);
  });

  it('is not a code block somebody copied off a page', () => {
    const code = '<pre><code class="language-js">const a = 1;</code></pre>';

    // A `<code>` inside, and a class from whatever coloured it: markup a page
    // wrote rather than a wrapper a browser did.
    expect(wrappedPlainText(code, 'const a = 1;')).toBe(false);
    expect(wrappedPlainText('<pre class="hl">const a = 1;</pre>', 'const a = 1;')).toBe(false);
    // And a block that came with the rest of a page around it.
    expect(wrappedPlainText(`<p>Before.</p>${wrapper}`, file)).toBe(false);
  });

  it('is the wrapper whatever else the clipboard wrote around it', () => {
    // A browser writes the charset in front of the markup and marks where the
    // selection began, and neither is something the page showed.
    expect(wrappedPlainText(`<meta charset='utf-8'>${wrapper}`, file)).toBe(true);
    expect(
      wrappedPlainText(
        `<meta charset='utf-8'><!--StartFragment-->${wrapper}<!--EndFragment-->`,
        file
      )
    ).toBe(true);
    expect(
      wrappedPlainText(
        `<html><head><meta charset="utf-8"></head><body>${wrapper}</body></html>`,
        file
      )
    ).toBe(true);
  });

  it('reads the two flavours as lines, because they need not end them the same way', () => {
    // The plain flavour is whatever the platform writes, and the markup's text
    // is what the parser read: one may be `\r\n` where the other is `\n`.
    expect(wrappedPlainText(wrapper, file.replace(/\n/g, '\r\n'))).toBe(true);
  });

  it('says nothing about markup whose text is not what the clipboard carried', () => {
    expect(wrappedPlainText(wrapper, 'something else')).toBe(false);
    expect(wrappedPlainText(wrapper, '')).toBe(false);
    expect(wrappedPlainText('', file)).toBe(false);
  });
});
