import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyViewer } from 'mawy-react';
import { domAt, sourceAt } from '../../src/internal/position.js';

/**
 * A place on the page, read back as a place in the document.
 *
 * This is the half of the mapping that has to work against a real tree, so the
 * viewer draws the document and the assertions are made against the DOM it
 * produced. Nearly every one of them checks the answer against `indexOf` on the
 * source, which is a statement of what the right answer is rather than a copy
 * of what the code did.
 */

/** The first text node saying exactly `value`, asked where it came from. */
function at(container: HTMLElement, source: string, value: string, offset = 0): number | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node as Text).data === value) {
      return sourceAt(container, node, offset, source);
    }
  }

  throw new Error(`no text node saying ${JSON.stringify(value)}`);
}

describe('a run of text', () => {
  it('is found where it was written, inside a paragraph', async () => {
    const source = 'A paragraph with words in it.';
    const screen = await render(<MawyViewer value={source} />);

    expect(at(screen.container, source, source, 0)).toBe(0);
    expect(at(screen.container, source, source, 12)).toBe(12);
  });

  it('is found past the markers of whatever holds it', async () => {
    const source = '# A title\n\nText with **bold** and `code` in it.';
    const screen = await render(<MawyViewer value={source} />);

    expect(at(screen.container, source, 'A title')).toBe(source.indexOf('A title'));
    expect(at(screen.container, source, 'bold')).toBe(source.indexOf('bold'));
    expect(at(screen.container, source, 'code')).toBe(source.indexOf('code'));
  });

  it('takes the occurrence after the element before it, not the first one', async () => {
    const source = 'a **a** a';
    const screen = await render(<MawyViewer value={source} />);

    // The last `a`, which is the third one written and the second one drawn.
    expect(at(screen.container, source, ' a', 1)).toBe(8);
  });

  it('is found inside a table cell and inside a list item', async () => {
    const source = '| head | other |\n| - | - |\n| cell | more |\n\n- item one\n- item two';
    const screen = await render(<MawyViewer value={source} />);

    expect(at(screen.container, source, 'cell')).toBe(source.indexOf('cell'));
    expect(at(screen.container, source, 'item two')).toBe(source.indexOf('item two'));
  });

  it('is found inside the label of a link rather than in its URL', async () => {
    const source = 'See [the docs](/docs) for docs.';
    const screen = await render(<MawyViewer value={source} />);

    expect(at(screen.container, source, 'the docs')).toBe(source.indexOf('the docs'));
  });

  it('reads across the marker a container puts in front of every line', async () => {
    const source = '> one\n> two';
    const screen = await render(<MawyViewer value={source} />);

    // The paragraph reads `one\ntwo` and is written `> one\n> two`, so a search
    // for the whole of it finds nothing at all. Each line is found on its own.
    expect(at(screen.container, source, 'one\ntwo', 0)).toBe(2);
    expect(at(screen.container, source, 'one\ntwo', 4)).toBe(source.indexOf('two'));
    expect(at(screen.container, source, 'one\ntwo', 7)).toBe(source.length);
  });

  it('lands early rather than elsewhere when the text is not what was written', async () => {
    // `&amp;` is one character drawn and five written, and nothing is left to
    // say where the other four went. The answer stays inside the paragraph.
    const source = 'AT&amp;T and others';
    const screen = await render(<MawyViewer value={source} />);
    const answer = at(screen.container, source, 'AT&T and others', 6) as number;

    expect(answer).toBeGreaterThanOrEqual(0);
    expect(answer).toBeLessThanOrEqual(source.length);
  });
});

describe('a place that is not text', () => {
  it('gives an element its own start and its own end', async () => {
    const source = 'Text with **bold** in it.';
    const screen = await render(<MawyViewer value={source} />);
    const strong = screen.container.querySelector('strong') as HTMLElement;

    expect(sourceAt(screen.container, strong.parentNode as Node, 1, source)).toBe(
      source.indexOf('**bold**')
    );
    expect(sourceAt(screen.container, strong, strong.childNodes.length, source)).toBe(
      source.indexOf('**bold**') + '**bold**'.length
    );
  });

  it('says nothing about a place the renderer did not draw', async () => {
    const screen = await render(<MawyViewer value="text" />);
    const outside = document.createElement('div');

    outside.textContent = 'elsewhere';

    expect(sourceAt(screen.container, outside.firstChild as Node, 0, 'text')).toBeNull();
  });
});

/**
 * The mapping read the other way, which is what puts the caret back after the
 * document has been parsed and drawn again underneath it.
 *
 * The way down is a descent rather than a search: an element says which
 * characters it was drawn from, so nothing inside one whose range misses the
 * offset can hold it. What the tests below pin is that the descent still lands
 * where the search did — inside the innermost run, and past a wrapper the
 * renderer put in that carries no range of its own.
 */
describe('a place in the document, read as a place on the page', () => {
  /** The text and the offset `domAt` came back with, in a shape to assert on. */
  const drawn = (container: HTMLElement, source: string, offset: number) => {
    const found = domAt(container, offset, source);

    return found && [(found.node as Text).data, found.offset];
  };

  it('lands in the run the offset is inside, not in the one before it', async () => {
    const source = 'Text with **bold** and more.';
    const screen = await render(<MawyViewer value={source} />);

    expect(drawn(screen.container, source, source.indexOf('bold'))).toEqual(['bold', 0]);
    expect(drawn(screen.container, source, source.indexOf('bold') + 2)).toEqual(['bold', 2]);
    expect(drawn(screen.container, source, 5)).toEqual(['Text with ', 5]);
  });

  it('descends past a wrapper that was not drawn from anywhere', async () => {
    // The box a wide table scrolls inside has no range on it, and the cells
    // underneath it do.
    const source = '| head | other |\n| - | - |\n| cell | more |';
    const screen = await render(<MawyViewer value={source} />);

    expect(screen.container.querySelector('.mawy-md-table-scroll')).not.toBe(null);
    expect(drawn(screen.container, source, source.indexOf('cell'))).toEqual(['cell', 0]);
  });

  it('goes into the block the offset is in and no further, across a long document', async () => {
    const source = Array.from({ length: 40 }, (_, index) => `Paragraph ${index}.`).join('\n\n');
    const screen = await render(<MawyViewer value={source} />);

    expect(drawn(screen.container, source, source.indexOf('Paragraph 39.'))).toEqual([
      'Paragraph 39.',
      0
    ]);
  });

  it('falls back to the nearest place before one nothing was drawn from', async () => {
    // Past the end of the document, and inside the markers of a bold run: both
    // are places a caret cannot go, and the answer is the last one it can.
    const screen = await render(<MawyViewer value="**bold**" />);

    expect(drawn(screen.container, '**bold**', 99)).toEqual(['bold', 4]);
    // Between the two asterisks there is nothing drawn, so the answer is the
    // element they were drawn as, in front of everything in it.
    expect(domAt(screen.container, 1, '**bold**')).toEqual({
      node: screen.container.querySelector('strong'),
      offset: 0
    });
  });
});
