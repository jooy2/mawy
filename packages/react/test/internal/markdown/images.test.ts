import { describe, expect, it } from 'vitest';
import { markdownForImage } from '../../../src/internal/images.js';
import { imageUrls } from '../../../src/internal/markdown/images.js';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';

const urls = (source: string) => imageUrls(parseMarkdown(source));

/**
 * Which pictures a document points at, which is what an application compares
 * with the files it stored to find the ones nothing needs any more.
 *
 * A miss here is the expensive direction: an address left off the list is a
 * file the application deletes while a document still draws it. So most of
 * what follows is about the places a picture can be written that a walk over
 * paragraphs would not reach.
 */
describe('the pictures a document points at', () => {
  it('lists each address once, in the order the document first gives it', () => {
    expect(urls('![a](/a.png) and ![b](/b.png)\n\n![a again](/a.png)')).toEqual([
      '/a.png',
      '/b.png'
    ]);
  });

  it('reads a reference, a destination in angle brackets and a picture inside a link', () => {
    expect(
      urls('![r][pic] and ![s](</s p.png> "T") and [![l](/l.png)](/href)\n\n[pic]: /r.png')
    ).toEqual(['/r.png', '/s p.png', '/l.png']);
  });

  it('leaves out a picture with no address, and one written in code', () => {
    expect(urls('![empty]() and `![code](/code.png)`\n\n    ![block](/block.png)')).toEqual([]);
  });

  it('reaches a table cell, a quotation, a list and a definition', () => {
    expect(
      urls(
        '| a |\n| - |\n| ![c](/cell.png) |\n\n> ![q](/quote.png)\n\n- ![l](/list.png)\n\nTerm\n: ![d](/definition.png)'
      )
    ).toEqual(['/cell.png', '/quote.png', '/list.png', '/definition.png']);
  });

  it("reaches a directive's label as well as what it holds", () => {
    expect(urls(':::note[![l](/label.png)]\n![i](/inside.png)\n:::')).toEqual([
      '/label.png',
      '/inside.png'
    ]);
  });

  it('reaches a footnote something refers to, and not one nothing does', () => {
    expect(urls('Noted[^1].\n\n[^1]: ![f](/foot.png)\n\n[^2]: ![u](/unused.png)')).toEqual([
      '/foot.png'
    ]);
  });

  it('reads the `src` of an `<img>` in raw HTML, in a block and in a sentence', () => {
    expect(
      urls(
        '<p><img src="/block.png" alt="x"><IMG SRC=\'/upper.png\'></p>\n\nInline <img src=/bare.png> and <image src="/image.png">.'
      )
    ).toEqual(['/block.png', '/upper.png', '/bare.png', '/image.png']);
  });

  it('keeps the first `src` on a tag and reads its references', () => {
    expect(urls('<img alt=x src="/q&amp;s.png" src="/second.png">')).toEqual(['/q&s.png']);
  });

  it('reads a picture inside an HTML comment, and not a tag that is not an image', () => {
    expect(
      urls(
        '<!-- <img src="/comment.png"> --> and <imgs src="/no.png"> and <img data-src="/no.png">'
      )
    ).toEqual(['/comment.png']);
  });

  /**
   * The promise the list makes: what `onUploadImage` answered with is what
   * comes back out, however awkward the address, because the editor writes it
   * and the parser reads it.
   */
  it('gives back the address an upload answered with', () => {
    const file = new File([''], 'a.png', { type: 'image/png' });

    for (const url of [
      'https://cdn.example.com/u/a.png?x=1&y=2',
      'https://cdn.example.com/a (1).png',
      'https://cdn.example.com/a b.png',
      'https://cdn.example.com/a\\b<c>.png',
      '/relative/a.png'
    ]) {
      expect(urls(`Before ${markdownForImage(url, file)} after.`), url).toEqual([url]);
    }
  });
});
