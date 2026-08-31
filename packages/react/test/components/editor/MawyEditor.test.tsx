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
