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

/** The caret either side of a child of an element, which is where a picture has it. */
function beside(root: HTMLElement, parent: Element, offset: number): void {
  root.focus();
  document.getSelection()?.collapse(parent, offset);
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

describe('a picture', () => {
  const PICTURE = '![a](/i.png)';

  it('stays when the line under it is joined to it', async () => {
    const { body, writes } = await editing(`up\n\n${PICTURE}\n\nunder`);

    put(body, 'under', 0);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes(`up\n\n${PICTURE}under`);
    expect(body.querySelector('img')).not.toBeNull();
  });

  it('stays when the line over it is joined to it', async () => {
    const { body, writes } = await editing(`over\n\n${PICTURE}`);

    put(body, 'over', 4);
    await settled();
    await userEvent.keyboard('{Delete}');

    await writes(`over${PICTURE}`);
  });

  it('keeps letters typed in front of it in front of it', async () => {
    const { body, writes } = await editing(PICTURE);

    beside(body, body.querySelector('p') as Element, 0);
    await settled();
    await userEvent.keyboard('ab');

    await writes(`ab${PICTURE}`);
    await userEvent.keyboard('{Backspace}');
    await writes(`a${PICTURE}`);
  });
});

describe('a place the arrows stop', () => {
  it('takes a divider away from the start of the words under it', async () => {
    const { body, writes } = await editing('up\n\n---\n\ndown');

    put(body, 'down', 0);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('up\n\ndown');
  });

  it("writes in front of a task's words from in front of its box", async () => {
    const { body, writes } = await editing('- [ ] todo');

    beside(body, body.querySelector('li') as Element, 0);
    await settled();
    await userEvent.keyboard('x');

    await writes('- [ ] xtodo');
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

  it('goes whole, for an emoji of two units or of several', async () => {
    for (const emoji of ['😀', '👨‍👩‍👧']) {
      const back = await editing(`a${emoji}b`);

      put(back.body, `a${emoji}b`, 1 + emoji.length);
      await settled();
      await userEvent.keyboard('{Backspace}');
      await back.writes('ab');
      await back.screen.unmount();

      const ahead = await editing(`a${emoji}b`);

      put(ahead.body, `a${emoji}b`, 1);
      await settled();
      await userEvent.keyboard('{Delete}');
      await ahead.writes('ab');
      await ahead.screen.unmount();
    }
  });

  it('takes the markers with the last letter of a run', async () => {
    for (const value of ['a **b**', 'a `b`', 'a *b*', 'a [b](u)']) {
      const { body, screen, writes } = await editing(value);

      put(body, 'b', 1);
      await settled();
      await userEvent.keyboard('{Backspace}');
      await writes('a ');
      await screen.unmount();
    }
  });
});

describe('the top of the document', () => {
  it('gives a marker up with Backspace, with nothing above to join to', async () => {
    for (const [value, words, after] of [
      ['# one', 'one', 'one'],
      ['- one', 'one', 'one'],
      ['> one', 'one', 'one'],
      ['1. one\n2. two', 'one', 'one\n\n2. two']
    ]) {
      const { body, screen, writes } = await editing(value);

      put(body, words, 0);
      await settled();
      await userEvent.keyboard('{Backspace}');
      await writes(after);
      await screen.unmount();
    }
  });
});
