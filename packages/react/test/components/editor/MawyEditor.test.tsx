import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor } from 'mawy';
// The one test file that needs the real stylesheet. The source surface is two
// layers that have to lay out identically, and without the CSS there is only
// one layout to check against itself.
import '../../../src/styles.css';

/**
 * The editor, once the pieces are put together.
 *
 * The commands and the highlighter have their own files and are tested as
 * functions there, so what is left here is what only exists in a browser: the
 * two layers of the source surface lining up, the value contract, the modes,
 * and the keyboard actually reaching a command.
 */

const DOCUMENT = ['# Title', '', 'Some words here.', '', '- one', '- two'].join('\n');

const sourceOf = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.mawy-source-input') as HTMLTextAreaElement;

describe('the source surface', () => {
  it('draws a line number for every line, and a coloured copy of every line', async () => {
    const screen = await render(<MawyEditor defaultValue={DOCUMENT} modes={['plain']} />);

    expect(screen.container.querySelectorAll('.mawy-source-number')).toHaveLength(6);
    expect(screen.container.querySelectorAll('.mawy-source-line')).toHaveLength(6);
    expect(
      [...screen.container.querySelectorAll('.mawy-source-line')].map((line) => line.textContent)
    ).toEqual(DOCUMENT.split('\n'));
  });

  it('leaves the numbers out when asked, and keeps the lines', async () => {
    const screen = await render(
      <MawyEditor defaultValue={DOCUMENT} modes={['plain']} lineNumbers={false} />
    );

    expect(screen.container.querySelectorAll('.mawy-source-number')).toHaveLength(0);
    expect(screen.container.querySelectorAll('.mawy-source-line')).toHaveLength(6);
  });

  it('wraps the copy underneath exactly as the textarea wraps', async () => {
    // The one thing that cannot be checked anywhere but in a browser, and the
    // one that makes the whole surface wrong when it is off by a line.
    const long = `A line long enough to wrap. ${'word '.repeat(60)}\n${'x'.repeat(90)}`;
    const screen = await render(
      <MawyEditor
        defaultValue={long}
        modes={['plain']}
        style={{ height: '18rem', width: '24rem' }}
      />
    );

    const input = sourceOf(screen);
    const overlay = screen.container.querySelector('.mawy-source-lines') as HTMLElement;

    expect(input.scrollHeight).toBe(Math.round(overlay.getBoundingClientRect().height));
  });

  it('colours the syntax it finds', async () => {
    const screen = await render(<MawyEditor defaultValue={DOCUMENT} modes={['plain']} />);

    expect(screen.container.querySelector('.mawy-tok-heading')?.textContent).toBe(' Title');
    expect(screen.container.querySelectorAll('.mawy-tok-marker')).toHaveLength(3);
  });
});

describe('the document', () => {
  it('keeps its own when it was given a default, and reports every change', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="a" modes={['plain']} onChange={onChange} />
    );
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(1, 1);
    document.execCommand('insertText', false, 'b');

    await expect.element(screen.getByRole('textbox')).toHaveValue('ab');
    expect(onChange).toHaveBeenLastCalledWith('ab');
  });

  it('leaves a controlled document alone and only reports what was asked', async () => {
    const onChange = vi.fn();
    const screen = await render(<MawyEditor value="a" modes={['plain']} onChange={onChange} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(1, 1);
    document.execCommand('insertText', false, 'b');

    expect(onChange).toHaveBeenLastCalledWith('ab');
    await expect.element(screen.getByRole('textbox')).toHaveValue('a');
  });

  it('can be read but not written when it is read-only', async () => {
    const screen = await render(<MawyEditor defaultValue="a" modes={['plain']} readOnly />);

    await expect.element(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });
});

describe('the modes', () => {
  it('shows the source, the preview, or both', async () => {
    const source = await render(<MawyEditor defaultValue={DOCUMENT} defaultMode="plain" />);

    expect(source.container.querySelector('.mawy-source')).not.toBeNull();
    expect(source.container.querySelector('.mawy-editor-preview')).toBeNull();

    const preview = await render(<MawyEditor defaultValue={DOCUMENT} defaultMode="preview" />);

    expect(preview.container.querySelector('.mawy-source')).toBeNull();
    await expect.element(preview.getByRole('heading', { name: 'Title' })).toBeInTheDocument();

    const both = await render(<MawyEditor defaultValue={DOCUMENT} defaultMode="split" />);

    expect(both.container.querySelector('.mawy-source')).not.toBeNull();
    expect(both.container.querySelector('.mawy-editor-preview')).not.toBeNull();
  });

  it('offers only the surfaces it was given, and none at all when given one', async () => {
    const screen = await render(
      <MawyEditor defaultValue={DOCUMENT} modes={['plain', 'preview']} />
    );
    const buttons = [...screen.container.querySelectorAll('[role="radio"]')].map((button) =>
      button.getAttribute('aria-label')
    );

    expect(buttons).toEqual(['Source', 'Preview']);

    const alone = await render(<MawyEditor defaultValue={DOCUMENT} modes={['plain']} />);

    expect(alone.container.querySelectorAll('[role="radio"]')).toHaveLength(1);
  });

  it('switches when the control is used, and says so', async () => {
    const onModeChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={DOCUMENT} defaultMode="plain" onModeChange={onModeChange} />
    );

    await screen.getByRole('radio', { name: 'Preview' }).click();

    expect(onModeChange).toHaveBeenCalledWith('preview');
    expect(screen.container.querySelector('.mawy-source')).toBeNull();
  });

  it('shows the source for a surface that is not built yet', async () => {
    const screen = await render(<MawyEditor defaultValue={DOCUMENT} mode="wysiwyg" />);

    expect(screen.container.querySelector('.mawy-source')).not.toBeNull();
  });
});

/**
 * `split`, and the two panes staying on the same part of the document.
 *
 * Only a browser can answer this: it is two boxes, laid out, scrolled, and
 * measured against each other. A document with a code block in it is the shape
 * that catches a preview scrolled by the fraction of the way through the file
 * instead — sixty lines of source that are sixty lines of page, with prose on
 * either side that is neither.
 */
describe('the two panes of split', () => {
  const LONG = [
    '# Title',
    '',
    '```text',
    ...Array.from({ length: 60 }, (_, at) => `code line ${at}`),
    '```',
    '',
    ...Array.from({ length: 8 }, (_, at) => `## Section ${at}\n\nA short paragraph.\n`),
    'The end.',
    ''
  ].join('\n');

  /** Where the source has to be scrolled to for a line to be at the top of it. */
  function scrollTo(container: HTMLElement, offset: number): void {
    const input = container.querySelector('.mawy-source-input') as HTMLTextAreaElement;
    const layer = container.querySelector('.mawy-source-lines') as HTMLElement;
    const rows = [...container.querySelectorAll('.mawy-source-line')] as HTMLElement[];
    const row = rows[LONG.slice(0, offset).split('\n').length - 1];

    input.scrollTop = row.getBoundingClientRect().top - layer.getBoundingClientRect().top;
  }

  it('scrolls the preview to the block the top line of the source belongs to', async () => {
    const screen = await render(
      <MawyEditor
        defaultValue={LONG}
        defaultMode="split"
        style={{ height: '20rem', width: '60rem' }}
      />
    );

    const scroller = screen.container.querySelector('.mawy-viewer-scroll') as HTMLElement;

    // Two of them, at different depths of the document. One block landing at
    // the top could be a fraction that happened to be right; two cannot, since
    // a fraction is one straight line and this document is not.
    for (const heading of ['## Section 2', '## Section 6']) {
      const at = LONG.indexOf(heading);

      scrollTo(screen.container, at);

      await vi.waitFor(() => {
        const element = scroller.querySelector(`[data-mawy-range^="${at},"]`);
        const top = element!.getBoundingClientRect().top - scroller.getBoundingClientRect().top;

        expect(Math.abs(top)).toBeLessThan(2);
      });
    }
  });

  it('puts the caret on the word a click in the preview landed on', async () => {
    const source = 'A paragraph with **strong** words.\n\n## A heading here\n\nMore words.';
    const screen = await render(
      <MawyEditor defaultValue={source} defaultMode="split" style={{ height: '24rem' }} />
    );
    const input = sourceOf(screen);

    /** A click where the element actually is, which is what the caret follows. */
    const clickCentreOf = (selector: string) => {
      const element = screen.container.querySelector(
        `.mawy-editor-preview ${selector}`
      ) as HTMLElement;
      const box = element.getBoundingClientRect();

      element.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2
        })
      );
    };

    clickCentreOf('strong');

    await vi.waitFor(() => {
      expect(input.selectionStart).toBeGreaterThanOrEqual(source.indexOf('strong'));
      expect(input.selectionStart).toBeLessThanOrEqual(source.indexOf('strong') + 6);
    });

    clickCentreOf('h2');

    await vi.waitFor(() => {
      expect(input.selectionStart).toBeGreaterThanOrEqual(source.indexOf('A heading here'));
      expect(input.selectionStart).toBeLessThanOrEqual(source.indexOf('here') + 4);
    });
  });

  it('leaves a link in the preview alone', async () => {
    const source = 'Words and [a link](https://example.com) after them.';
    const screen = await render(
      <MawyEditor defaultValue={source} defaultMode="split" style={{ height: '24rem' }} />
    );
    const input = sourceOf(screen);
    const link = screen.container.querySelector('.mawy-editor-preview a') as HTMLElement;
    const box = link.getBoundingClientRect();

    input.setSelectionRange(0, 0);
    // The click is a real one and would take the test off the page with it.
    link.addEventListener('click', (event) => event.preventDefault(), { capture: true });
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2
      })
    );

    await new Promise((done) => setTimeout(done, 30));

    // Following the link is what a click on one is for, and moving the caret
    // out from under it would be a second thing happening at the same time.
    expect(input.selectionStart).toBe(0);
  });

  it('hears the textarea scroll, which does not bubble to the pane around it', async () => {
    const screen = await render(
      <MawyEditor
        defaultValue={LONG}
        defaultMode="split"
        style={{ height: '20rem', width: '60rem' }}
      />
    );

    const scroller = screen.container.querySelector('.mawy-viewer-scroll') as HTMLElement;

    scrollTo(screen.container, LONG.indexOf('## Section 6'));

    await vi.waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0));
  });
});

describe('the toolbar and the keyboard', () => {
  it('runs a command on the selection, and draws itself as pressed once it has', async () => {
    const screen = await render(<MawyEditor defaultValue="one two three" modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(4, 7);

    await screen.getByRole('button', { name: 'Bold' }).click();

    expect(input.value).toBe('one **two** three');
    await expect
      .element(screen.getByRole('button', { name: 'Bold' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('reaches the same command from the keyboard', async () => {
    const screen = await render(<MawyEditor defaultValue="one two three" modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(4, 7);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true, cancelable: true })
    );

    await expect.element(screen.getByRole('textbox')).toHaveValue('one **two** three');
  });

  it('carries a list marker down on Enter, and takes it away on the empty item', async () => {
    const screen = await render(<MawyEditor defaultValue="- one" modes={['plain']} />);
    const input = sourceOf(screen);
    const enter = () =>
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );

    input.focus();
    input.setSelectionRange(5, 5);
    enter();

    await expect.element(screen.getByRole('textbox')).toHaveValue('- one\n- ');

    enter();

    await expect.element(screen.getByRole('textbox')).toHaveValue('- one\n');
  });

  it('draws only the controls it was given', async () => {
    const screen = await render(
      <MawyEditor defaultValue={DOCUMENT} toolbar={['bold', 'italic']} modes={['plain']} />
    );
    const labels = [...screen.container.querySelectorAll('.mawy-toolbar .mawy-button')].map(
      (button) => button.getAttribute('aria-label')
    );

    expect(labels).toEqual(['Bold', 'Italic']);
  });
});

describe('the status bar', () => {
  it('counts lines, words, characters and bytes', async () => {
    const screen = await render(
      <MawyEditor
        defaultValue={'one two\nthree'}
        modes={['plain']}
        status={['lines', 'words', 'characters', 'size']}
      />
    );
    const status = screen.container.querySelector('.mawy-status') as HTMLElement;

    expect(status.textContent).toContain('2 lines');
    expect(status.textContent).toContain('3 words');
    expect(status.textContent).toContain('13 characters');
    expect(status.textContent).toContain('13 B');
  });

  it('counts a language that is written without spaces as its characters', async () => {
    const screen = await render(
      <MawyEditor defaultValue={'漢字漢字 and words'} modes={['plain']} status={['words']} />
    );

    // Four ideographs and two English words, rather than three space-separated
    // tokens or fourteen characters.
    expect(screen.container.querySelector('.mawy-status')?.textContent).toContain('6 words');
  });

  it('counts bytes rather than characters, which are not the same outside ASCII', async () => {
    const screen = await render(
      <MawyEditor defaultValue="한글" modes={['plain']} status={['characters', 'size']} />
    );
    const status = screen.container.querySelector('.mawy-status') as HTMLElement;

    expect(status.textContent).toContain('2 characters');
    expect(status.textContent).toContain('6 B');
  });

  it('follows the caret', async () => {
    const screen = await render(
      <MawyEditor defaultValue={'one\ntwo'} modes={['plain']} status={['position']} />
    );
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(5, 5);

    await expect.element(screen.getByText('Ln 2, Col 2')).toBeInTheDocument();
  });

  it('is left out when it was turned off', async () => {
    const screen = await render(<MawyEditor defaultValue="a" modes={['plain']} status={false} />);

    expect(screen.container.querySelector('.mawy-status')).toBeNull();
  });
});
