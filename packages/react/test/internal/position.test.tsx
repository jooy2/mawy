import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyViewer } from 'mawy';
import { sourceAt } from '../../src/internal/position.js';

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
