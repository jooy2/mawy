import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MawyEditor } from 'mawy-react';
// The pane has to scroll for the caret to be kept in view, and without the
// stylesheet nothing does.
import '../../../src/styles.css';

/**
 * The drawn document, used the way somebody uses it.
 *
 * `MawyEditor.test.tsx` holds what each rule is for. This holds what came out of
 * sitting down and typing: real keys rather than dispatched events, because the
 * caret after a key is half of what is being checked, and every case here is a
 * place where the document and the page stopped saying the same thing.
 */

const bodyOf = (screen: { container: HTMLElement }) =>
  screen.container.querySelector('.mawy-document-body') as HTMLElement;

/** A surface holding this, and what it last told the application. */
async function editing(defaultValue: string, style?: React.CSSProperties) {
  const onChange = vi.fn();
  const screen = await render(
    <MawyEditor defaultValue={defaultValue} mode="wysiwyg" onChange={onChange} style={style} />
  );
  const body = bodyOf(screen);

  return {
    screen,
    body,
    onChange,
    /** Waits for the document to be this. */
    writes: (expected: string) =>
      vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expected)),
    said: () => screen.container.querySelector('.mawy-notice')?.textContent
  };
}

/** The caret inside the run of text saying exactly this. */
function put(root: HTMLElement, saying: string, offset: number): void {
  root.focus();

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if ((node as Text).data === saying) {
      document.getSelection()?.collapse(node, offset);

      return;
    }
  }

  throw new Error(`no text node saying ${JSON.stringify(saying)}`);
}

/** Lets the selection the editor reads catch up with one set from outside. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('Enter', () => {
  it('keeps the caret on screen at the bottom of the pane', async () => {
    const words = Array.from({ length: 30 }, (_, index) => `Paragraph ${index}.`).join('\n\n');
    const { body, screen } = await editing(words, { height: 300 });
    const pane = screen.container.querySelector('.mawy-document') as HTMLElement;

    put(body, 'Paragraph 29.', 13);
    pane.scrollTop = pane.scrollHeight;
    await settled();

    for (let press = 0; press < 6; press += 1) {
      await userEvent.keyboard('{Enter}x');
    }

    await vi.waitFor(() => {
      const caret = document.getSelection()?.getRangeAt(0).getClientRects()[0];

      expect(caret?.bottom).toBeLessThanOrEqual(pane.getBoundingClientRect().bottom);
    });
  });
});

describe('a character', () => {
  it('lands where the caret is after a character reference', async () => {
    const { body, writes } = await editing('a &amp; b &copy; c');

    put(body, 'a & b © c', 5);
    await settled();
    await userEvent.keyboard('X');

    await writes('a &amp; bX &copy; c');
    expect(document.getSelection()?.anchorOffset).toBe(6);
  });

  it('takes a whole reference out with one key', async () => {
    const { body, writes } = await editing('a&amp;b');

    put(body, 'a&b', 2);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('ab');
  });
});
