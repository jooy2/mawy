import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor } from 'mawy-react';
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

const bodyOf = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.mawy-document-body') as HTMLElement;

/** Put the caret inside the run of text saying exactly this. */
function put(root: HTMLElement, saying: string, offset: number, through = offset): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node as Text).data === saying) {
      const range = document.createRange();
      const selection = document.getSelection() as Selection;

      range.setStart(node, offset);
      range.setEnd(node, through);
      selection.removeAllRanges();
      selection.addRange(range);

      return;
    }
  }

  if (saying === '') {
    // A block with nothing in it has no run of text to put the caret inside,
    // so the caret goes on the block.
    const element = [...root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')].find(
      (child) => !child.textContent
    );
    const range = document.createRange();
    const selection = document.getSelection() as Selection;

    if (element) {
      range.setStart(element, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      return;
    }
  }

  throw new Error(`no run saying ${JSON.stringify(saying)}`);
}

const type = (root: HTMLElement, inputType: string, data?: string) =>
  root.dispatchEvent(
    new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true })
  );

/** A shortcut, pressed. `metaKey` and `ctrlKey` are both accepted, so one does. */
const keys = (element: HTMLElement, key: string, shift = false) =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      metaKey: true,
      shiftKey: shift,
      bubbles: true,
      cancelable: true
    })
  );

/**
 * A `paste`, carrying this clipboard.
 *
 * Firefox throws the `clipboardData` handed to the constructor away and hands
 * the event an empty transfer of its own, so the clipboard goes on afterwards
 * as an own property, which shadows the getter in every browser.
 */
function clipboardEvent(clipboard: DataTransfer): ClipboardEvent {
  const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });

  if (event.clipboardData !== clipboard) {
    Object.defineProperty(event, 'clipboardData', { value: clipboard, configurable: true });
  }

  return event;
}

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

  it('draws the document itself on the wysiwyg surface', async () => {
    const screen = await render(<MawyEditor defaultValue={DOCUMENT} mode="wysiwyg" />);

    expect(screen.container.querySelector('.mawy-source')).toBeNull();
    await expect
      .element(screen.getByRole('heading', { name: 'Title', level: 1 }))
      .toBeInTheDocument();
    expect(
      screen.container.querySelector('.mawy-document-body')?.getAttribute('contenteditable')
    ).toBe('true');
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

  it('indents with Tab, and lets go of it after Escape', async () => {
    const screen = await render(<MawyEditor defaultValue="one" modes={['plain']} />);
    const input = sourceOf(screen);
    const press = (key: string, shift = false) => {
      const event = new KeyboardEvent('keydown', {
        key,
        shiftKey: shift,
        bubbles: true,
        cancelable: true
      });

      input.dispatchEvent(event);

      return event;
    };

    input.focus();
    input.setSelectionRange(0, 0);

    expect(press('Tab').defaultPrevented).toBe(true);
    await expect.element(screen.getByRole('textbox')).toHaveValue('  one');

    // Going back takes the line's indentation off rather than the two
    // characters in front of the caret, which is what `Shift`+`Tab` means.
    input.setSelectionRange(2, 2);
    expect(press('Tab', true).defaultPrevented).toBe(true);
    await expect.element(screen.getByRole('textbox')).toHaveValue('one');

    // A textarea that swallows Tab is a keyboard trap, so Escape opens it —
    // and the next Tab after that is the browser's, which is the way out.
    press('Escape');
    expect(press('Tab').defaultPrevented).toBe(false);
    await expect.element(screen.getByRole('textbox')).toHaveValue('one');

    // And the door closes again behind whatever is typed next.
    press('a');
    expect(press('Tab').defaultPrevented).toBe(true);
  });

  it('says how to get out, where a screen reader will hear it', async () => {
    const screen = await render(<MawyEditor defaultValue="one" modes={['plain']} />);
    const input = sourceOf(screen);
    const hint = screen.container.querySelector(`#${input.getAttribute('aria-describedby')}`);

    expect(hint?.textContent).toContain('Escape');
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

/**
 * Finding and replacing.
 *
 * The arithmetic has its own file. What is left for a browser is the part that
 * only exists once there is a surface: the bar taking the focus, the selection
 * landing on the match, and `Escape` giving the focus back to the document
 * rather than dropping it on the page.
 */
describe('finding', () => {
  const open = async (screen: { container: HTMLElement }) => {
    sourceOf(screen).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => expect(screen.container.querySelector('.mawy-find')).not.toBe(null));
  };

  const findField = (screen: { container: HTMLElement }) =>
    screen.container.querySelector('.mawy-find-input') as HTMLInputElement;

  /**
   * Typed into, rather than assigned to.
   *
   * React watches a controlled input through its own `value` setter, so writing
   * to the property directly tells the tracker the value is already what it is
   * and `onChange` never fires — the next render puts the old value back. Going
   * through the prototype's setter is what leaves the tracker behind.
   */
  const type = (field: HTMLInputElement, text: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('opens on the shortcut, takes the focus, and counts what it found', async () => {
    const screen = await render(<MawyEditor defaultValue="one two one" modes={['plain']} />);

    await open(screen);

    const field = findField(screen);

    await vi.waitFor(() => expect(document.activeElement).toBe(field));

    type(field, 'one');

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-find-count')?.textContent).toBe('1 of 2')
    );
  });

  it('selects the match it went to, in the source', async () => {
    const screen = await render(<MawyEditor defaultValue="one two one" modes={['plain']} />);
    const input = sourceOf(screen);

    await open(screen);

    const field = findField(screen);

    type(field, 'one');

    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => expect([input.selectionStart, input.selectionEnd]).toEqual([8, 11]));
  });

  it('opens with what was selected already in it', async () => {
    const screen = await render(<MawyEditor defaultValue="one two one" modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(4, 7);
    await open(screen);

    await vi.waitFor(() => expect(findField(screen).value).toBe('two'));
  });

  it('replaces the one it is on, and then all of them', async () => {
    const screen = await render(<MawyEditor defaultValue="one two one" modes={['plain']} />);

    await open(screen);

    const field = findField(screen);

    type(field, 'one');

    const replacement = screen.container.querySelectorAll(
      '.mawy-find-input'
    )[1] as HTMLInputElement;

    type(replacement, 'ONE');

    (screen.container.querySelector('button[title="Replace"]') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(sourceOf(screen).value).toBe('ONE two one'));

    (screen.container.querySelector('button[title="Replace all"]') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(sourceOf(screen).value).toBe('ONE two ONE'));
  });

  it('closes on Escape and gives the focus back to the source', async () => {
    const screen = await render(<MawyEditor defaultValue="one two one" modes={['plain']} />);

    await open(screen);

    findField(screen).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => expect(screen.container.querySelector('.mawy-find')).toBe(null));
    expect(document.activeElement).toBe(sourceOf(screen));
  });

  it('is not offered where there is no source to search', async () => {
    const screen = await render(<MawyEditor defaultValue="one" modes={['preview']} />);

    expect(screen.container.querySelector('.mawy-find')).toBe(null);
  });
});

/**
 * Opening a file, and saving one.
 *
 * The naming and the reading are pure functions with a file of their own. What
 * is left here is the wiring: the picker reaching the document, and `onSave`
 * being handed the text and the name rather than the browser being handed a
 * download.
 */
describe('files', () => {
  it('opens a file into the document, and offers its name back when saving', async () => {
    const saved: [string, string][] = [];
    const screen = await render(
      <MawyEditor
        defaultValue="Before."
        modes={['plain']}
        onSave={(value, name) => saved.push([value, name])}
      />
    );
    const picker = screen.container.querySelector('input[type="file"]') as HTMLInputElement;
    const transfer = new DataTransfer();

    transfer.items.add(new File(['# Opened'], 'notes.md', { type: 'text/markdown' }));
    picker.files = transfer.files;
    picker.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => expect(sourceOf(screen).value).toBe('# Opened'));

    (screen.container.querySelector('button[title="Save"]') as HTMLButtonElement).click();

    expect(saved).toEqual([['# Opened', 'notes.md']]);
  });

  it('names a document nobody opened after its first heading', async () => {
    const saved: string[] = [];
    const screen = await render(
      <MawyEditor
        defaultValue={'# Getting started\n\nWords.'}
        modes={['plain']}
        onSave={(_, name) => saved.push(name)}
      />
    );

    (screen.container.querySelector('button[title="Save"]') as HTMLButtonElement).click();

    expect(saved).toEqual(['Getting started.md']);
  });

  it('reaches saving from the keyboard, where the browser would have saved the page', async () => {
    const saved: string[] = [];
    const screen = await render(
      <MawyEditor defaultValue="Words." modes={['plain']} onSave={(value) => saved.push(value)} />
    );
    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true
    });

    sourceOf(screen).focus();
    sourceOf(screen).dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(saved).toEqual(['Words.']);
  });

  it('says so about a file it will not read, rather than reading it', async () => {
    const screen = await render(<MawyEditor defaultValue="Before." modes={['plain']} />);
    const picker = screen.container.querySelector('input[type="file"]') as HTMLInputElement;
    const huge = new File(['x'], 'big.md');
    const transfer = new DataTransfer();

    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
    transfer.items.add(huge);
    picker.files = transfer.files;
    picker.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-editor-note')?.textContent).toContain('large')
    );
    expect(sourceOf(screen).value).toBe('Before.');
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

/**
 * The document, edited in place.
 *
 * Every assertion here goes through `beforeinput`, because that is the only way
 * anything reaches this surface: the browser is refused and the event is turned
 * into an edit to the Markdown, which is then parsed and drawn again. So what is
 * being checked each time is the *string* that came out, which is the thing the
 * application is given and the thing that has to be right.
 */
describe('the document surface', () => {
  it('types into a paragraph and into the middle of a bold run', async () => {
    const onChange = vi.fn();
    const source = 'One two.\n\nA **bold** word.';
    const screen = await render(
      <MawyEditor defaultValue={source} mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'One two.', 3);
    type(body, 'insertText', ' and');

    expect(onChange).toHaveBeenLastCalledWith('One and two.\n\nA **bold** word.');

    // The surface reads the document it was last given, so the next edit is
    // made against the one that is now drawn rather than the one that was.
    await vi.waitFor(() => expect(bodyOf(screen).textContent).toContain('One and two.'));

    put(bodyOf(screen), 'bold', 2);
    type(bodyOf(screen), 'insertText', 'LD');

    // Inside the asterisks, which is what the markers being part of the range
    // rather than part of the text is for.
    expect(onChange).toHaveBeenLastCalledWith('One and two.\n\nA **boLDld** word.');
  });

  it('writes a link out as its own characters when the caret is inside it', async () => {
    const screen = await render(
      <MawyEditor defaultValue="See [the docs](/guide) for more." mode="wysiwyg" />
    );

    // Drawn as a link until something is in it.
    expect(bodyOf(screen).querySelector('a')?.textContent).toBe('the docs');

    put(bodyOf(screen), 'the docs', 3);

    // And then as the source, one character for one — which is the only way
    // there is anywhere on the page for `/guide` to be typed over.
    await vi.waitFor(() => {
      expect(bodyOf(screen).querySelector('.mawy-md-source')?.textContent).toBe(
        '[the docs](/guide)'
      );
    });
    expect(bodyOf(screen).querySelector('a')).toBeNull();
  });

  it('draws it as a link again once the caret has left', async () => {
    const screen = await render(
      <MawyEditor defaultValue="See [the docs](/guide) for more." mode="wysiwyg" />
    );

    put(bodyOf(screen), 'the docs', 3);
    await vi.waitFor(() => expect(bodyOf(screen).querySelector('.mawy-md-source')).not.toBeNull());

    put(bodyOf(screen), 'See ', 1);
    await vi.waitFor(() => expect(bodyOf(screen).querySelector('.mawy-md-source')).toBeNull());

    expect(bodyOf(screen).querySelector('a')?.textContent).toBe('the docs');
  });

  it('types into a destination, which is the whole point of writing it out', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor
        defaultValue="See [the docs](/guide) for more."
        mode="wysiwyg"
        onChange={onChange}
      />
    );

    put(bodyOf(screen), 'the docs', 3);
    await vi.waitFor(() => expect(bodyOf(screen).querySelector('.mawy-md-source')).not.toBeNull());

    // Inside `(/guide)`, after the `e`, where before this there was no
    // character on the page at all.
    put(bodyOf(screen), '[the docs](/guide)', 17);
    type(bodyOf(screen), 'insertText', '/2');

    expect(onChange).toHaveBeenLastCalledWith('See [the docs](/guide/2) for more.');

    // And again, which is the half that is not obvious: the link's range grew
    // under the caret, and it has to still be the one being written out or the
    // second keystroke lands somewhere else entirely.
    await vi.waitFor(() => {
      expect(bodyOf(screen).querySelector('.mawy-md-source')?.textContent).toBe(
        '[the docs](/guide/2)'
      );
    });

    type(bodyOf(screen), 'insertText', '3');

    expect(onChange).toHaveBeenLastCalledWith('See [the docs](/guide/23) for more.');
  });

  it('writes an image out too, since its destination is drawn even less', async () => {
    const screen = await render(
      <MawyEditor defaultValue="Before ![a](/i.png) after." mode="wysiwyg" />
    );

    expect(bodyOf(screen).querySelector('img')).not.toBeNull();

    put(bodyOf(screen), 'Before ', 7);

    await vi.waitFor(() => {
      expect(bodyOf(screen).querySelector('.mawy-md-source')?.textContent).toBe('![a](/i.png)');
    });
  });

  it('leaves the toolbar link placeholder where it can be typed over', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Words." mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'Words.', 6);
    await screen.getByRole('button', { name: 'Link' }).click();

    expect(onChange).toHaveBeenLastCalledWith('Words.[](url)');

    // The placeholder is on the page, and it is what is selected — so the next
    // thing typed replaces it rather than landing in the words.
    await vi.waitFor(() => {
      expect(bodyOf(screen).querySelector('.mawy-md-source')?.textContent).toBe('[](url)');
    });
    expect(document.getSelection()?.getRangeAt(0).toString()).toBe('url');

    type(bodyOf(screen), 'insertText', '/a');

    expect(onChange).toHaveBeenLastCalledWith('Words.[](/a)');
  });

  it('replaces what was selected', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One two three." mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'One two three.', 4, 7);
    type(body, 'insertText', 'six');

    expect(onChange).toHaveBeenLastCalledWith('One six three.');
  });

  it('deletes one drawn character, not one written one', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="A **bold** word." mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    // The caret after `bold`, where the next character written is an asterisk
    // and the next character drawn is the `d`.
    put(body, 'bold', 4);
    type(body, 'deleteContentBackward');

    expect(onChange).toHaveBeenLastCalledWith('A **bol** word.');
  });

  it('joins a paragraph to the one above it when backspace starts it', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'First.\n\n## Second'} mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'Second', 0);
    type(body, 'deleteContentBackward');

    // The blank line and the heading's own hashes both go, which is what joining
    // two blocks means when one of them was a heading.
    expect(onChange).toHaveBeenLastCalledWith('First.Second');
  });

  it('deletes forward, and across a block boundary', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'One.\n\nTwo.'} mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'One.', 4);
    type(body, 'deleteContentForward');

    expect(onChange).toHaveBeenLastCalledWith('One.Two.');
  });

  it('splits a paragraph in two', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One two." mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'One two.', 4);
    type(body, 'insertParagraph');

    expect(onChange).toHaveBeenLastCalledWith('One \n\ntwo.');
  });

  it('leaves somewhere to type when Enter ends the document', async () => {
    const screen = await render(<MawyEditor defaultValue="One." mode="wysiwyg" />);

    put(bodyOf(screen), 'One.', 4);
    type(bodyOf(screen), 'insertParagraph');

    // Markdown cannot write an empty paragraph, so the surface draws one for as
    // long as the caret is in it. Without it Enter would look like it did
    // nothing at all.
    await vi.waitFor(() => {
      const blocks = [...bodyOf(screen).children];

      expect(blocks).toHaveLength(2);
      expect(blocks[1].textContent).toBe('');
    });
  });

  it('draws an empty document as somewhere to start', async () => {
    const onChange = vi.fn();
    const screen = await render(<MawyEditor mode="wysiwyg" onChange={onChange} />);
    const body = bodyOf(screen);

    expect(body.children).toHaveLength(1);

    put(body, '', 0);
    type(body, 'insertText', 'Hello');

    expect(onChange).toHaveBeenLastCalledWith('Hello');
  });

  it('types inside a list item, a quotation, a table cell and a code block', async () => {
    const cases: [string, string, string][] = [
      ['- one\n- two', 'one', '- one!\n- two'],
      ['> quoted', 'quoted', '> quoted!'],
      ['| a | b |\n| - | - |\n| 1 | 2 |', '1', '| a | b |\n| - | - |\n| 1! | 2 |'],
      ['```ts\nconst a = 1;\n```', 'const a = 1;', '```ts\nconst a = 1;!\n```']
    ];

    for (const [source, run, expected] of cases) {
      const onChange = vi.fn();
      const screen = await render(
        <MawyEditor defaultValue={source} mode="wysiwyg" onChange={onChange} />
      );

      put(bodyOf(screen), run, run.length);
      type(bodyOf(screen), 'insertText', '!');

      expect(onChange).toHaveBeenLastCalledWith(expected);
    }
  });

  it('carries a list marker down, and gives it up on an item still empty', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'- one\n- two'} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'one', 3);
    type(bodyOf(screen), 'insertParagraph');

    expect(onChange).toHaveBeenLastCalledWith('- one\n- \n- two');

    const gone = vi.fn();
    const empty = await render(
      <MawyEditor defaultValue={'- one\n- '} mode="wysiwyg" onChange={gone} />
    );

    expect(empty.container.querySelectorAll('li')).toHaveLength(2);

    put(bodyOf(empty), '', 0);
    type(bodyOf(empty), 'insertParagraph');

    // The bullet goes rather than a second empty one arriving, which is how a
    // list is left — the same rule the source surface has on `Enter`.
    expect(gone).toHaveBeenLastCalledWith('- one\n');
  });

  it('carries a quotation down, and a code block takes one newline', async () => {
    const quoted = vi.fn();
    const quote = await render(
      <MawyEditor defaultValue={'> one\n> two'} mode="wysiwyg" onChange={quoted} />
    );

    put(bodyOf(quote), 'one\ntwo', 7);
    type(bodyOf(quote), 'insertParagraph');

    // A quotation's lines run on into one paragraph, so ending one takes a
    // blank quoted line rather than a new quoted line.
    expect(quoted).toHaveBeenLastCalledWith('> one\n> two\n> \n> ');

    const coded = vi.fn();
    const code = await render(
      <MawyEditor defaultValue={'```ts\nconst a = 1;\n```'} mode="wysiwyg" onChange={coded} />
    );

    put(bodyOf(code), 'const a = 1;', 5);
    type(bodyOf(code), 'insertParagraph');

    // Everything in a code block is the characters it is, blank lines included.
    expect(coded).toHaveBeenLastCalledWith('```ts\nconst\n a = 1;\n```');
  });

  it('leaves a table alone where a row is a line and a cell is a cell', async () => {
    const source = '| a | b |\n| - | - |\n| 1 | 2 |';
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={source} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), '2', 0);
    type(bodyOf(screen), 'insertParagraph');
    type(bodyOf(screen), 'deleteContentBackward');

    // There is nowhere in the file for a second row to go, and joining two
    // cells would be eating the pipe between them.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('joins a list item to the one above it', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'- one\n- two'} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'two', 0);
    type(bodyOf(screen), 'deleteContentBackward');

    expect(onChange).toHaveBeenLastCalledWith('- onetwo');
  });

  it('takes out an image, and a hard break, as the one thing each of them is', async () => {
    const image = vi.fn();
    const withImage = await render(
      <MawyEditor defaultValue={'Before ![a](/i.png) after.'} mode="wysiwyg" onChange={image} />
    );

    put(bodyOf(withImage), ' after.', 0);
    type(bodyOf(withImage), 'deleteContentBackward');

    // An image is one character to a reader and none at all to a walk over the
    // runs of text; without saying so, this would have taken the `e` of
    // `Before` from the other side of it.
    expect(image).toHaveBeenLastCalledWith('Before  after.');

    const broken = vi.fn();
    const withBreak = await render(
      <MawyEditor defaultValue={'one  \ntwo'} mode="wysiwyg" onChange={broken} />
    );

    put(bodyOf(withBreak), 'two', 0);
    type(bodyOf(withBreak), 'deleteContentBackward');

    expect(broken).toHaveBeenLastCalledWith('onetwo');
  });

  it('refuses an edit inside raw HTML it is drawing rather than showing', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor
        defaultValue={'<div>hi</div>'}
        mode="wysiwyg"
        html="sanitize"
        onChange={onChange}
      />
    );

    put(bodyOf(screen), 'hi', 2);
    type(bodyOf(screen), 'insertText', '!');

    // It reached the page through `dangerouslySetInnerHTML`, so React does not
    // know what is in there and could not put it back.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('runs a toolbar command on the caret it has', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One two three." mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'One two three.', 4, 7);

    await screen.getByRole('button', { name: 'Bold' }).click();

    expect(onChange).toHaveBeenLastCalledWith('One **two** three.');
  });

  /**
   * A composition, played out the way a browser plays one.
   *
   * There is no way to drive a real input method from a test, and there does not
   * need to be: what an input method does to the page is exactly this — say it
   * has started, change the run of text under the caret as many times as it
   * likes, move the caret, and say it has finished. What is being checked is
   * that the surface keeps its hands off in between and reads the result
   * afterwards.
   */
  function compose(root: HTMLElement, saying: string, at: number, typed: string): Text {
    put(root, saying, at);

    const node = (document.getSelection() as Selection).anchorNode as Text;

    root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    node.data = node.data.slice(0, at) + typed + node.data.slice(at);

    const range = document.createRange();
    const selection = document.getSelection() as Selection;

    range.setStart(node, at + typed.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    root.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: typed }));

    return node;
  }

  it('takes a composed word into the document once it is finished', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Hello." mode="wysiwyg" onChange={onChange} />
    );

    compose(bodyOf(screen), 'Hello.', 5, ' 한글');

    expect(onChange).toHaveBeenLastCalledWith('Hello 한글.');
  });

  it('composes inside a bold run without disturbing its markers', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="A **bold** word." mode="wysiwyg" onChange={onChange} />
    );

    compose(bodyOf(screen), 'bold', 4, '한');

    expect(onChange).toHaveBeenLastCalledWith('A **bold한** word.');
  });

  it('leaves the tree to the browser while a composition is running', async () => {
    const screen = await render(<MawyEditor defaultValue="Hello." mode="wysiwyg" />);
    const body = bodyOf(screen);

    put(body, 'Hello.', 5);
    body.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    const event = new InputEvent('beforeinput', {
      inputType: 'insertCompositionText',
      data: 'ㅎ',
      bubbles: true,
      cancelable: true
    });

    body.dispatchEvent(event);

    // Refusing this is refusing the composition, and a Korean keyboard composes
    // a jamo at a time — every one of them would be eaten.
    expect(event.defaultPrevented).toBe(false);

    body.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
  });

  it('changes nothing when a composition came to nothing', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Hello." mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'Hello.', 5);
    body.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    body.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('composes into the empty paragraph Enter just made', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One." mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'One.', 4);
    type(bodyOf(screen), 'insertParagraph');

    await vi.waitFor(() => expect(bodyOf(screen).children).toHaveLength(2));

    const body = bodyOf(screen);
    const room = body.children[1] as HTMLElement;
    const selection = document.getSelection() as Selection;
    const at = document.createRange();

    at.setStart(room, 0);
    at.collapse(true);
    selection.removeAllRanges();
    selection.addRange(at);

    body.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    // A block with nothing in it has no run of text for the composition to be
    // in, so the browser makes one — which is why the block itself is what gets
    // remembered when the caret is on one.
    room.textContent = '한글';

    const after = document.createRange();

    after.setStart(room.firstChild as Text, 2);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);
    body.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한글' }));

    expect(onChange).toHaveBeenLastCalledWith('One.\n\n한글');
  });

  it('leaves the caret after what was composed', async () => {
    const screen = await render(<MawyEditor defaultValue="Hello." mode="wysiwyg" />);

    compose(bodyOf(screen), 'Hello.', 5, ' 한글');

    await vi.waitFor(() => {
      const selection = document.getSelection() as Selection;

      expect((selection.anchorNode as Text).data).toBe('Hello 한글.');
      expect(selection.anchorOffset).toBe(8);
    });
  });

  it('types a space at the end of a block, where the page has nowhere to draw one', async () => {
    // Markdown does not keep the whitespace at the end of a line, so the space
    // is in the file and drawn nowhere: the caret comes back in front of it,
    // and without remembering where it meant to be, every word after it would
    // go in front of it too and `One two` could not be typed a letter at a
    // time at all.
    for (const [before, after] of [
      ['One', 'One two'],
      ['# One', '# One two'],
      ['- One', '- One two'],
      ['> One', '> One two']
    ]) {
      const onChange = vi.fn();
      const screen = await render(
        <MawyEditor defaultValue={before} mode="wysiwyg" onChange={onChange} />
      );

      put(bodyOf(screen), 'One', 3);

      let written = before;

      for (const character of ' two') {
        written += character;
        type(bodyOf(screen), 'insertText', character);

        // The space changes the file and changes nothing on the page, so what
        // there is to wait for is the document coming back, not the drawing.
        await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(written));
      }

      expect(onChange).toHaveBeenLastCalledWith(after);
    }
  });

  it('takes the space back off the end again, rather than the letter in front of it', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One" mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'One', 3);
    type(bodyOf(screen), 'insertText', ' ');

    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('One '));

    type(bodyOf(screen), 'deleteContentBackward');

    // There is no drawn character in front of the caret to take — the space is
    // in the file and nowhere else — so the written one goes.
    expect(onChange).toHaveBeenLastCalledWith('One');
  });

  it('edits a footnote where it is drawn, which is not where it was written', async () => {
    const onChange = vi.fn();
    const source = 'A sentence.[^one]\n\n[^one]: The note.';
    const screen = await render(
      <MawyEditor defaultValue={source} mode="wysiwyg" onChange={onChange} />
    );

    // The note is drawn at the bottom and the caret still finds its way back to
    // the line it was written on.
    put(bodyOf(screen), 'The note.', 9);
    type(bodyOf(screen), 'insertText', ' Longer.');

    expect(onChange).toHaveBeenLastCalledWith('A sentence.[^one]\n\n[^one]: The note. Longer.');
  });

  it('edits a term and what it means', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'Apple\n: A fruit.'} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'A fruit.', 8);
    type(bodyOf(screen), 'insertText', ' Red.');

    expect(onChange).toHaveBeenLastCalledWith('Apple\n: A fruit. Red.');
  });

  it('carries a definition marker down the way a bullet is carried down', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'Apple\n: A fruit.'} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'A fruit.', 8);
    type(bodyOf(screen), 'insertParagraph');

    expect(onChange).toHaveBeenLastCalledWith('Apple\n: A fruit.\n: ');
  });

  it('does not change a read-only document', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="One two." mode="wysiwyg" readOnly onChange={onChange} />
    );
    const body = bodyOf(screen);

    expect(body.getAttribute('contenteditable')).not.toBe('true');

    put(body, 'One two.', 4);
    type(body, 'insertText', 'x');

    expect(onChange).not.toHaveBeenCalled();
  });
});

/**
 * Input rules: the shorthand typed at the start of a line becoming what it is
 * shorthand for, on the spot.
 *
 * Most of them are not rules at all, and that is the thing worth pinning down:
 * the document is drawn again from the Markdown after every keystroke, so `# `
 * *is* a heading the moment the space lands. Two need writing down, and they
 * are the two where the marker changes the meaning of text nobody is typing.
 */
describe('input rules', () => {
  /**
   * A run of characters, one keystroke at a time, with the document drawn again
   * in between — which is the whole point. A rule fires on one keystroke, and
   * the keystroke after it lands on whatever that left behind.
   */
  async function typing(body: () => HTMLElement, text: string): Promise<void> {
    for (const character of text) {
      const before = body().innerHTML;

      type(body(), 'insertText', character);

      await vi.waitFor(() => expect(body().innerHTML).not.toBe(before));
    }
  }

  it('makes the formatting the shorthand is shorthand for, as it is typed', async () => {
    const shorthands: [string, string, string][] = [
      ['# ', '# Hello', 'h1'],
      ['- ', '- Hello', 'li'],
      ['1. ', '1. Hello', 'ol li'],
      ['> ', '> Hello', 'blockquote p']
    ];

    for (const [shorthand, written, drawn] of shorthands) {
      const onChange = vi.fn();
      const screen = await render(
        <MawyEditor defaultValue="Hello" mode="wysiwyg" onChange={onChange} />
      );
      const body = () => bodyOf(screen);

      put(body(), 'Hello', 0);
      await typing(body, shorthand);

      expect(onChange).toHaveBeenLastCalledWith(written);
      // The marker is written in the file and drawn nowhere: what is on the
      // page is a heading saying `Hello`, not a paragraph saying `# Hello`.
      expect(body().querySelector(drawn)?.textContent).toBe('Hello');
    }
  });

  it('opens a fence closed, so it does not swallow the document under it', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'Above.\n\nBelow.'} mode="wysiwyg" onChange={onChange} />
    );
    const body = () => bodyOf(screen);

    put(body(), 'Above.', 6);
    type(body(), 'insertParagraph');
    await vi.waitFor(() => expect(body().children).toHaveLength(3));
    await typing(body, '```');

    expect(onChange).toHaveBeenLastCalledWith('Above.\n\n```\n\n```\n\nBelow.');

    // And the caret is between the fences, in a code block with nothing in it —
    // which is a place only because the `code` element says which offsets it
    // stands for.
    await typing(body, 'ab');

    expect(onChange).toHaveBeenLastCalledWith('Above.\n\n```\nab\n```\n\nBelow.');
  });

  it('carries a list item down onto the lines the fence adds', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'- one\n- two'} mode="wysiwyg" onChange={onChange} />
    );
    const body = () => bodyOf(screen);

    put(body(), 'two', 0);
    await typing(body, '```');

    // Without the indent the closing fence is outside the item that opened it.
    expect(onChange).toHaveBeenLastCalledWith('- one\n- ```\n  two\n  ```');
  });

  it('gives a thematic break a line under it to carry on typing on', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Above." mode="wysiwyg" onChange={onChange} />
    );
    const body = () => bodyOf(screen);

    put(body(), 'Above.', 6);
    type(body(), 'insertParagraph');
    await vi.waitFor(() => expect(body().children).toHaveLength(2));
    await typing(body, '---');

    expect(onChange).toHaveBeenLastCalledWith('Above.\n\n---\n\n');
    expect(body().querySelector('hr')).toBeTruthy();

    // A break draws no characters of its own, so a caret left on one would have
    // nowhere on the page to be.
    await typing(body, 'X');

    expect(onChange).toHaveBeenLastCalledWith('Above.\n\n---\n\nX');
  });

  it('leaves a shorthand alone inside a code block, where it is the characters it is', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'```\nx\n```'} mode="wysiwyg" onChange={onChange} />
    );
    const body = () => bodyOf(screen);

    put(body(), 'x', 0);
    await typing(body, '```');

    expect(onChange).toHaveBeenLastCalledWith('```\n```x\n```');
  });
});

/**
 * Pasting, on both surfaces.
 *
 * What is on a clipboard as HTML is read back as Markdown — a heading copied
 * from a web page arrives as `## `, not as the word it said. What is on it as
 * nothing but text is left to the browser, whose own paste is exactly right and
 * keeps the caret, the scroll and the undo run where they were.
 */
describe('pasting', () => {
  /** A clipboard, and the event that carries it. */
  function paste(element: HTMLElement, kinds: Record<string, string>): ClipboardEvent {
    const clipboard = new DataTransfer();

    for (const [kind, value] of Object.entries(kinds)) {
      clipboard.setData(kind, value);
    }

    const event = clipboardEvent(clipboard);

    element.dispatchEvent(event);

    return event;
  }

  it('reads HTML back as Markdown on the drawn document', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Before." mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'Before.', 7);
    paste(bodyOf(screen), {
      'text/html': '<p>A <strong>bold</strong> <a href="/u">link</a>.</p>',
      'text/plain': 'A bold link.'
    });

    expect(onChange).toHaveBeenLastCalledWith('Before.A **bold** [link](/u).');
  });

  it('pastes the plain text into a code block, where markup is not markup', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'```\ncode\n```'} mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'code', 4);
    paste(bodyOf(screen), { 'text/html': '<h1>Title</h1>', 'text/plain': 'Title' });

    expect(onChange).toHaveBeenLastCalledWith('```\ncodeTitle\n```');
  });

  it('reads HTML back as Markdown on the source surface too', async () => {
    const screen = await render(<MawyEditor defaultValue="Before." modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(7, 7);
    paste(input, { 'text/html': '<h2>Title</h2>', 'text/plain': 'Title' });

    await vi.waitFor(() => expect(input.value).toBe('Before.## Title'));
  });

  it('leaves a clipboard with nothing but text on it to the browser', async () => {
    const screen = await render(<MawyEditor defaultValue="Before." modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(7, 7);

    const event = paste(input, { 'text/plain': 'plain words' });

    expect(event.defaultPrevented).toBe(false);
  });
});

/**
 * Putting an image in.
 *
 * The toolbar's button writes `![](url)` and needs nothing from anybody. A file
 * dropped or pasted needs somewhere for its bytes to go, and where that is is
 * the application's answer through `onUploadImage` — so with no answer, nothing
 * happens at all, which is half of what these check.
 */
describe('images', () => {
  const png = (name = 'A photo.png') =>
    new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/png' });

  /** A transfer carrying files, and whatever else was asked for. */
  function carrying(files: File[], kinds: Record<string, string> = {}): DataTransfer {
    const data = new DataTransfer();

    for (const file of files) {
      data.items.add(file);
    }

    for (const [kind, value] of Object.entries(kinds)) {
      data.setData(kind, value);
    }

    return data;
  }

  function drop(element: HTMLElement, files: File[]): DragEvent {
    const data = carrying(files);

    element.dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: data, bubbles: true, cancelable: true })
    );

    const event = new DragEvent('drop', {
      dataTransfer: data,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(event);

    return event;
  }

  function pasteFiles(element: HTMLElement, files: File[], kinds: Record<string, string> = {}) {
    const event = clipboardEvent(carrying(files, kinds));

    element.dispatchEvent(event);

    return event;
  }

  it('writes an image the toolbar button was pressed for', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Look: " modes={['plain']} onChange={onChange} />
    );
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(6, 6);
    (screen.container.querySelector('button[aria-label="Image"]') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(input.value).toBe('Look: ![](url)'));
  });

  it('uploads a dropped file and writes what came back', async () => {
    const onChange = vi.fn();
    const onUploadImage = vi.fn(async () => '/uploads/a.png');
    const screen = await render(
      <MawyEditor
        defaultValue="Before."
        modes={['plain']}
        onChange={onChange}
        onUploadImage={onUploadImage}
      />
    );
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(7, 7);
    const event = drop(screen.container.querySelector('.mawy-editor') as HTMLElement, [png()]);

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('Before.![A photo](/uploads/a.png)')
    );
    expect(onUploadImage).toHaveBeenCalledTimes(1);
  });

  it('puts a file dropped on the drawn document where it was let go', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor
        defaultValue={'First.\n\nSecond.'}
        mode="wysiwyg"
        onChange={onChange}
        onUploadImage={async () => '/a.png'}
        // Tall enough that the document is under the toolbar rather than
        // behind it: the browser is being asked what is at a point, and it
        // answers about whatever is drawn on top.
        style={{ height: '22rem' }}
      />
    );

    const second = bodyOf(screen).querySelectorAll('p')[1];
    const box = second.getBoundingClientRect();
    const data = new DataTransfer();

    data.items.add(png('cat.png'));
    bodyOf(screen).dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: data, bubbles: true, cancelable: true })
    );
    second.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: data,
        clientX: box.left + 1,
        clientY: box.top + box.height / 2,
        bubbles: true,
        cancelable: true
      })
    );

    // In the second paragraph, where the pointer was — not at the caret, which
    // never went anywhere.
    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('First.\n\n![cat](/a.png)Second.')
    );
  });

  it('does nothing at all with a file when nobody said where an image goes', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Before." modes={['plain']} onChange={onChange} />
    );

    const event = drop(screen.container.querySelector('.mawy-editor') as HTMLElement, [png()]);

    // Not even refused: Mawy has nowhere to put bytes, so the drop is not one
    // it is taking, and the page is left to do whatever it was going to.
    expect(event.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes a screenshot off the clipboard, on both surfaces', async () => {
    for (const modes of [['plain'], ['wysiwyg']] as const) {
      const onChange = vi.fn();
      const screen = await render(
        <MawyEditor
          defaultValue="Before."
          modes={modes}
          onChange={onChange}
          onUploadImage={async () => ({ url: '/s.png', alt: 'A screenshot' })}
        />
      );

      if (modes[0] === 'plain') {
        const input = sourceOf(screen);

        input.focus();
        input.setSelectionRange(7, 7);
        pasteFiles(input, [png()]);
      } else {
        put(bodyOf(screen), 'Before.', 7);
        pasteFiles(bodyOf(screen), [png()]);
      }

      await vi.waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith('Before.![A screenshot](/s.png)')
      );
    }
  });

  it('leaves a clipboard that has markup on it to the markup', async () => {
    const onChange = vi.fn();
    const onUploadImage = vi.fn(async () => '/never.png');
    const screen = await render(
      <MawyEditor
        defaultValue="Before."
        modes={['plain']}
        onChange={onChange}
        onUploadImage={onUploadImage}
      />
    );
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(7, 7);
    pasteFiles(input, [png()], {
      'text/html': '<p>A <img src="/already.png" alt="cat"> here</p>'
    });

    // The image is already on the web and the page said what it was called.
    await vi.waitFor(() => expect(input.value).toContain('![cat](/already.png)'));
    expect(onUploadImage).not.toHaveBeenCalled();
  });

  it('says so while it is uploading, and says so when it could not', async () => {
    let settle: (url: string) => void = () => {};
    const screen = await render(
      <MawyEditor
        defaultValue="Before."
        modes={['plain']}
        onUploadImage={() => new Promise<string>((resolve) => (settle = resolve))}
      />
    );
    const editor = screen.container.querySelector('.mawy-editor') as HTMLElement;

    drop(editor, [png()]);

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-editor-note')?.textContent).toBe(
        'Adding the image…'
      )
    );

    settle('/a.png');

    await vi.waitFor(() => expect(screen.container.querySelector('.mawy-editor-note')).toBe(null));

    const failing = await render(
      <MawyEditor
        defaultValue="Before."
        modes={['plain']}
        onUploadImage={() => {
          throw new Error('nope');
        }}
      />
    );

    drop(failing.container.querySelector('.mawy-editor') as HTMLElement, [png()]);

    await vi.waitFor(() => {
      const note = failing.container.querySelector('.mawy-editor-note');

      expect(note?.textContent).toBe('That image could not be added.');
      expect(note?.getAttribute('data-mawy-failed')).toBe('true');
    });
  });

  it('does not upload into a read-only editor', async () => {
    const onUploadImage = vi.fn(async () => '/a.png');
    const screen = await render(
      <MawyEditor defaultValue="Before." modes={['plain']} readOnly onUploadImage={onUploadImage} />
    );

    drop(screen.container.querySelector('.mawy-editor') as HTMLElement, [png()]);

    expect(onUploadImage).not.toHaveBeenCalled();
  });
});

/**
 * Undo, over the document rather than over a surface.
 *
 * The source surface has the browser's own stack and the drawn one has nothing
 * — a `contenteditable` that refuses every input never gets an entry on it — so
 * both put their changes on one history of Mawy's own. What that buys, and what
 * these check, is that a step made on one surface can be taken back on the
 * other.
 */
describe('undo', () => {
  it('takes a command back on the source surface, and puts it back again', async () => {
    const screen = await render(<MawyEditor defaultValue="one two three" modes={['plain']} />);
    const input = sourceOf(screen);

    input.focus();
    input.setSelectionRange(4, 7);
    keys(input, 'b');

    await vi.waitFor(() => expect(input.value).toBe('one **two** three'));

    keys(input, 'z');

    await vi.waitFor(() => expect(input.value).toBe('one two three'));

    keys(input, 'z', true);

    await vi.waitFor(() => expect(input.value).toBe('one **two** three'));
  });

  it('takes an edit back on the drawn document', async () => {
    const screen = await render(<MawyEditor defaultValue="One two." mode="wysiwyg" />);

    put(bodyOf(screen), 'One two.', 3);
    type(bodyOf(screen), 'insertText', ' and');

    await vi.waitFor(() => expect(bodyOf(screen).textContent).toBe('One and two.'));

    keys(bodyOf(screen), 'z');

    await vi.waitFor(() => expect(bodyOf(screen).textContent).toBe('One two.'));
  });

  it('takes a rule back in one step, because the line it added closed the run', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue="Hello" mode="wysiwyg" onChange={onChange} />
    );

    put(bodyOf(screen), 'Hello', 5);
    type(bodyOf(screen), 'insertParagraph');

    await vi.waitFor(() => expect(bodyOf(screen).children).toHaveLength(2));

    for (const character of '---') {
      const before = bodyOf(screen).innerHTML;

      type(bodyOf(screen), 'insertText', character);

      await vi.waitFor(() => expect(bodyOf(screen).innerHTML).not.toBe(before));
    }

    expect(onChange).toHaveBeenLastCalledWith('Hello\n\n---\n\n');

    keys(bodyOf(screen), 'z');

    // Back to the two dashes rather than back to before the whole run: a rule
    // writes a line ending, and a line ending closes the run behind it.
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('Hello\n\n--'));
  });

  it('takes back on one surface what was done on the other', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor
        defaultValue="One two."
        defaultMode="wysiwyg"
        modes={['wysiwyg', 'plain']}
        onChange={onChange}
      />
    );

    put(bodyOf(screen), 'One two.', 3);
    type(bodyOf(screen), 'insertText', ' and');

    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('One and two.'));

    await screen.getByRole('radio', { name: 'Source' }).click();

    const input = sourceOf(screen);

    expect(input.value).toBe('One and two.');

    input.focus();
    keys(input, 'z');

    // The edit was made where there is no source to look at, and taken back
    // where there is nothing else. One history, or switching surface would step
    // back through half of what happened and then stop.
    await vi.waitFor(() => expect(input.value).toBe('One two.'));
  });

  it('leaves a read-only document alone', async () => {
    const screen = await render(<MawyEditor defaultValue="one" modes={['plain']} readOnly />);
    const input = sourceOf(screen);

    input.focus();
    keys(input, 'z');

    await new Promise((done) => setTimeout(done, 30));

    expect(input.value).toBe('one');
  });
});
