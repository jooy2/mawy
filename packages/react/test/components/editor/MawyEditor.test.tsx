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
      const element = [...root.children].find((child) => !child.textContent);
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

  it('refuses an edit it has no rule for yet', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <MawyEditor defaultValue={'- one\n- two'} mode="wysiwyg" onChange={onChange} />
    );
    const body = bodyOf(screen);

    put(body, 'one', 3);
    type(body, 'insertText', '!');

    // A list is drawn and read but not yet edited, and the answer to that is
    // nothing rather than something half-right.
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
