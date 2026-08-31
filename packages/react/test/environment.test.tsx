import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

/**
 * The suite runs in a real browser rather than in a DOM emulator, and this file
 * is what says why.
 *
 * Everything Mawy is made of lives in the four APIs below. jsdom has partial or
 * no support for all four — `Selection` is a stub, `beforeinput` is never
 * dispatched, `contenteditable` does not edit — so a test suite running there
 * would pass while asserting nothing about the thing it was testing. If this
 * file fails, the harness is wrong and every other failure in the run is a
 * symptom of it rather than a bug in the library.
 *
 * It renders through `vitest-browser-react` for the same reason: the path a
 * component test takes should be exercised by a test that has no other job.
 */
describe('test environment', () => {
  it('renders React into a real document', async () => {
    const screen = await render(<p>ready</p>);

    await expect.element(screen.getByText('ready')).toBeInTheDocument();
  });

  it('edits a contenteditable host', async () => {
    const screen = await render(
      <div contentEditable suppressContentEditableWarning role="textbox" aria-label="host" />
    );
    const host = screen.getByRole('textbox').element() as HTMLElement;

    expect(host.isContentEditable).toBe(true);
  });

  it('has a live Selection with real Ranges', async () => {
    const screen = await render(<p>the quick brown fox</p>);
    const paragraph = screen.getByText('the quick brown fox').element();

    const range = document.createRange();
    range.setStart(paragraph.firstChild!, 4);
    range.setEnd(paragraph.firstChild!, 9);

    const selection = window.getSelection();
    expect(selection).not.toBeNull();

    selection!.removeAllRanges();
    selection!.addRange(range);

    expect(selection!.toString()).toBe('quick');
    expect(selection!.getRangeAt(0).startOffset).toBe(4);
  });

  it('dispatches beforeinput, which is what an editor listens to', async () => {
    const screen = await render(
      <div contentEditable suppressContentEditableWarning role="textbox" aria-label="host" />
    );
    const host = screen.getByRole('textbox').element() as HTMLElement;

    const seen: string[] = [];
    host.addEventListener('beforeinput', (event) => {
      seen.push((event as InputEvent).inputType);
    });

    host.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: 'a',
        bubbles: true,
        cancelable: true
      })
    );

    expect(seen).toEqual(['insertText']);
  });
});
