import { describe, expect, it } from 'vitest';
import {
  altFor,
  imageFilesIn,
  markdownForImage,
  pastedImagesIn
} from '../../src/internal/images.js';

/**
 * An image on its way into the Markdown.
 *
 * Where the bytes go is the application's answer, through `onUploadImage`, and
 * there is nothing here about that. What is here is the part that is easy to
 * get wrong and silent when it is: a file called `a (1).png` has a bracket in
 * its name and a parenthesis in its URL, and both mean something in the
 * sentence they are about to be written into.
 */

const file = (name: string, type = 'image/png'): File =>
  new File([new Uint8Array([1, 2, 3])], name, { type });

const transfer = (files: File[], kinds: Record<string, string> = {}): DataTransfer => {
  const data = new DataTransfer();

  for (const each of files) {
    data.items.add(each);
  }

  for (const [kind, value] of Object.entries(kinds)) {
    data.setData(kind, value);
  }

  return data;
};

describe('what a file is called', () => {
  it('is the name without the extension it is stored under', () => {
    expect(altFor(file('Screenshot 2026-08-31.png'))).toBe('Screenshot 2026-08-31');
    expect(altFor(file('no-extension'))).toBe('no-extension');
  });
});

describe('the files on a transfer', () => {
  it('is the images and nothing else', () => {
    const files = imageFilesIn(
      transfer([file('a.png'), file('notes.md', 'text/markdown'), file('b.jpg', 'image/jpeg')])
    );

    expect(files.map((each) => each.name)).toEqual(['a.png', 'b.jpg']);
  });

  it('is nothing at all when there is no transfer', () => {
    expect(imageFilesIn(null)).toEqual([]);
  });

  it('leaves a clipboard alone when it is carrying markup as well', () => {
    // An image copied out of a web page arrives with an `<img>` that already
    // says where it lives, and re-uploading a picture that is already on the
    // web is work nobody asked for.
    const withMarkup = transfer([file('a.png')], { 'text/html': '<img src="/a.png">' });

    expect(pastedImagesIn(withMarkup)).toEqual([]);
    expect(pastedImagesIn(transfer([file('a.png')])).map((each) => each.name)).toEqual(['a.png']);
  });
});

describe('the Markdown an upload turns into', () => {
  it('is the URL, with what the file was called as the description', () => {
    expect(markdownForImage('/i/a.png', file('A photo.png'))).toBe('![A photo](/i/a.png)');
  });

  it('takes the description and the title the application gave instead', () => {
    expect(
      markdownForImage({ url: '/a.png', alt: 'A cat', title: 'Taken in 2026' }, file('a.png'))
    ).toBe('![A cat](/a.png "Taken in 2026")');
  });

  it('puts a URL with a space or a bracket in it inside angle brackets', () => {
    expect(markdownForImage('/i/a (1).png', file('a.png'))).toBe('![a](</i/a (1).png>)');
    expect(markdownForImage('/i/a b.png', file('a.png'))).toBe('![a](</i/a b.png>)');
  });

  it('escapes what would otherwise end the description or the title early', () => {
    expect(markdownForImage('/a.png', file('a [1].png'))).toBe('![a \\[1\\]](/a.png)');
    expect(markdownForImage({ url: '/a.png', title: 'a "b"' }, file('a.png'))).toBe(
      '![a](/a.png "a \\"b\\"")'
    );
  });
});
