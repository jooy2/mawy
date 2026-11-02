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

/** The words a selection goes between, in two runs of text. */
function select(root: HTMLElement, from: [string, number], to: [string, number]): void {
  root.focus();

  const find = (saying: string) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node as Text).data === saying) {
        return node;
      }
    }

    throw new Error(`no text node saying ${JSON.stringify(saying)}`);
  };

  document.getSelection()?.setBaseAndExtent(find(from[0]), from[1], find(to[0]), to[1]);
}

/**
 * A press on a picture, dispatched: the address in these documents fetches
 * nothing, so there is no picture on the page for a pointer to reach.
 */
function press(picture: HTMLElement): void {
  picture.closest<HTMLElement>('.mawy-document-body')?.focus();
  picture.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Lets the selection the editor reads catch up with one set from outside. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('a space', () => {
  it('steps past one the page does not draw at the end of a line', async () => {
    const { body, writes, said } = await editing('first\n\nhello ');

    put(body, 'hello', 5);
    await settled();
    await userEvent.keyboard(' x');

    await writes('first\n\nhello x');
    expect(said()).toBeUndefined();
  });

  it('is written in front of the two a hard break ends a line with', async () => {
    const { body, writes } = await editing('one  \ntwo');

    put(body, 'one', 3);
    await settled();
    await userEvent.keyboard(' x');

    await writes('one x  \ntwo');
  });

  it('is left out of the front of a line, where nothing would draw it', async () => {
    for (const [value, words] of [
      ['words', 'words'],
      ['# words', 'words'],
      ['- words', 'words'],
      ['> words', 'words']
    ]) {
      const { body, screen, onChange, said } = await editing(value);

      put(body, words, 0);
      await settled();
      await userEvent.keyboard(' ');
      await settled();

      expect(onChange).not.toHaveBeenCalled();
      expect(said()).toBeUndefined();
      await screen.unmount();
    }
  });

  it('goes after a bold run ended by it, so the run is never drawn undone', async () => {
    const { body, writes } = await editing('**hello**');

    put(body, 'hello', 5);
    await settled();
    await userEvent.keyboard(' ');
    await writes('**hello** ');

    expect(body.querySelector('strong')?.textContent).toBe('hello');
    expect(body.textContent).not.toContain('*');

    await userEvent.keyboard('world');
    await writes('**hello world**');
  });

  it('goes in as itself in front of held formatting', async () => {
    const { body, writes } = await editing('x');

    put(body, 'x', 1);
    await settled();
    await userEvent.keyboard('{Control>}b{/Control} bold');

    await writes('x **bold**');
  });
});

describe('Enter', () => {
  it('breaks once in front of a space, with no paragraph drawn between', async () => {
    const { body, writes } = await editing('hello world');

    put(body, 'hello world', 5);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes('hello\n\nworld');
    expect(body.querySelectorAll('p')).toHaveLength(2);
    expect(document.getSelection()?.anchorNode?.textContent).toBe('world');
  });

  it('ends a line of a paragraph without adding to it', async () => {
    const { body, writes } = await editing('one\ntwo');

    put(body, 'one\ntwo', 3);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes('one\n\ntwo');
  });

  it('leaves a bold run whole at its edge, and closes it either side inside', async () => {
    const edge = await editing('a **bold** b');

    put(edge.body, 'bold', 4);
    await settled();
    await userEvent.keyboard('{Enter}');
    await edge.writes('a **bold**\n\nb');
    await edge.screen.unmount();

    const inside = await editing('a **bold** b');

    put(inside.body, 'bold', 2);
    await settled();
    await userEvent.keyboard('{Enter}X');
    await inside.writes('a **bo**\n\n**Xld** b');
  });

  it('gives each half of a link its address', async () => {
    const { body, writes } = await editing('[words](http://a.b)');

    put(body, 'words', 2);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes('[wo](http://a.b)\n\n[rds](http://a.b)');
  });

  it('takes a heading down whole from in front of its words', async () => {
    const { body, writes } = await editing('# Title');

    put(body, 'Title', 0);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes('\n\n# Title');
  });

  it('pushes an item or a quoted line down from in front of its words', async () => {
    const item = await editing('- one\n- two');

    put(item.body, 'one', 0);
    await settled();
    await userEvent.keyboard('{Enter}');
    await item.writes('- \n- one\n- two');
    await item.screen.unmount();

    const quoted = await editing('> one\n> two');

    put(quoted.body, 'one\ntwo', 4);
    await settled();
    await userEvent.keyboard('{Enter}');
    await quoted.writes('> one\n> \n> two');
  });

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

describe('Enter again', () => {
  it('does not write a second empty paragraph from the words under the first', async () => {
    const { body, writes, said } = await editing('aa bb');

    put(body, 'aa bb', 2);
    await settled();
    await userEvent.keyboard('{Enter}{Enter}');
    await writes('aa\n\n\n\nbb');

    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(said()).toBe('Only one blank line in a row.'));
    await writes('aa\n\n\n\nbb');
  });

  it('has nothing to do in a code block with nothing in it yet', async () => {
    const { body, writes } = await editing('');

    beside(body, body.querySelector('p') as Element, 0);
    await settled();
    await userEvent.keyboard('```');
    await writes('```\n\n```');
    await settled();

    await userEvent.keyboard('{Enter}x');
    await writes('```\nx\n```');
  });
});

describe('Shift+Enter', () => {
  it('draws the line it starts, at the end of a paragraph', async () => {
    const { body, writes } = await editing('hello');

    put(body, 'hello', 5);
    await settled();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await writes('hello  \n');

    const paragraph = body.querySelector('p') as HTMLElement;

    await vi.waitFor(() => expect(paragraph.querySelectorAll('br')).toHaveLength(2));

    const [one, other] = [...paragraph.querySelectorAll('br')];

    expect(other.getBoundingClientRect().top).toBeGreaterThan(one.getBoundingClientRect().top);

    await userEvent.keyboard('x');
    await writes('hello  \nx');
    expect(paragraph.querySelectorAll('br')).toHaveLength(1);
  });

  it('takes the break back with Backspace, and with Enter ends the paragraph', async () => {
    const back = await editing('hello');

    put(back.body, 'hello', 5);
    await settled();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await back.writes('hello  \n');
    await settled();
    await userEvent.keyboard('{Backspace}');
    await back.writes('hello');
    await back.screen.unmount();

    const on = await editing('hello');

    put(on.body, 'hello', 5);
    await settled();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await on.writes('hello  \n');
    await settled();
    await userEvent.keyboard('{Enter}');
    await on.writes('hello\n\n');
  });

  it('draws it inside a list item and a quotation', async () => {
    for (const [value, words, broken] of [
      ['- a', 'a', '- a  \n  x'],
      ['> a', 'a', '> a  \n> x']
    ]) {
      const { body, screen, writes } = await editing(value);

      put(body, words, 1);
      await settled();
      await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
      await vi.waitFor(() => expect(body.querySelectorAll('br')).toHaveLength(2));
      await userEvent.keyboard('x');
      await writes(broken);
      await screen.unmount();
    }
  });

  it('goes after a run it is pressed at the end of', async () => {
    const { body, writes } = await editing('**bold**');

    put(body, 'bold', 4);
    await settled();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

    await writes('**bold**  \n');
    expect(body.querySelector('strong')?.textContent).toBe('bold');
  });

  it('ends a heading, which holds no break', async () => {
    const { body, writes } = await editing('# head');

    put(body, 'head', 4);
    await settled();
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

    await writes('# head\n\n');
  });
});

describe('a list inside a quotation', () => {
  it('goes on as a list', async () => {
    const { body, writes } = await editing('> - one');

    put(body, 'one', 3);
    await settled();
    await userEvent.keyboard('{Enter}two');

    await writes('> - one\n> - two');
  });
});

describe('a heading typed over', () => {
  it('takes the level typed in front of its words', async () => {
    const { body, writes } = await editing('## Title');

    put(body, 'Title', 0);
    await settled();
    await userEvent.keyboard('### ');

    await writes('### Title');
    expect(body.querySelector('h3')?.textContent).toBe('Title');
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

  it('takes Enter beside it', async () => {
    const { body, writes, said } = await editing(PICTURE);

    beside(body, body.querySelector('p') as Element, 1);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes(`${PICTURE}\n\n`);
    expect(said()).toBeUndefined();
  });

  it('can be taken out of a document with nothing else in it', async () => {
    const { body, writes } = await editing(PICTURE);

    press(body.querySelector('img') as HTMLElement);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('');
  });

  it('keeps Enter from replacing it while it is selected', async () => {
    const { body, writes } = await editing(PICTURE);

    press(body.querySelector('img') as HTMLElement);
    await settled();
    await userEvent.keyboard('{Enter}');

    await writes(`${PICTURE}\n\n`);
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

  it('is marked while it is selected', async () => {
    const { body } = await editing(`words\n\n${PICTURE}`);
    const picture = body.querySelector('img') as HTMLElement;

    press(picture);
    await vi.waitFor(() => expect(picture.hasAttribute('data-mawy-picked')).toBe(true));

    await userEvent.keyboard('{ArrowRight}');
    await vi.waitFor(() => expect(picture.hasAttribute('data-mawy-picked')).toBe(false));
  });

  it('goes on the clipboard as it is written, and comes back as it went', async () => {
    const { body, writes } = await editing(`${PICTURE}\n\nend`);

    press(body.querySelector('img') as HTMLElement);
    await settled();

    const clipboardData = new DataTransfer();
    const event = new ClipboardEvent('cut', { bubbles: true, cancelable: true, clipboardData });

    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    body.dispatchEvent(event);

    expect(clipboardData.getData('text/plain')).toBe(PICTURE);
    expect(clipboardData.getData('text/html')).toContain('<img');
    await writes('\n\nend');

    put(body, 'end', 3);
    await settled();

    const paste = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData });

    Object.defineProperty(paste, 'clipboardData', { value: clipboardData });
    body.dispatchEvent(paste);

    await writes(`\n\nend${PICTURE}`);
  });

  it('survives a syllable composed beside it, with nothing else in the paragraph', async () => {
    const { body, writes } = await editing(PICTURE);
    const paragraph = body.querySelector('p') as Element;

    beside(body, paragraph, 1);
    await settled();

    body.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    paragraph.appendChild(document.createTextNode('한'));
    body.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' }));

    await writes(`${PICTURE}한`);
    expect(body.querySelector('img')).not.toBeNull();
  });
});

describe('a place the arrows stop', () => {
  it('moves on from a divider, so what is typed next is typed somewhere', async () => {
    const { body, writes } = await editing('up\n\n---\n\ndown');

    put(body, 'up', 2);
    await settled();
    await userEvent.keyboard('{ArrowRight}');
    await settled();
    await userEvent.keyboard('x');

    await vi.waitFor(() => expect(body.textContent).toContain('x'));
    await writes('up\n\n---\n\nxdown');
  });

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

  it('keeps the number of a footnote out of the way of what is typed', async () => {
    const { body, writes } = await editing('a[^1]\n\n[^1]: note');

    put(body, 'a', 1);
    await settled();
    await userEvent.keyboard('{Delete}');

    await writes('a\n\n[^1]: note');
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

describe('a selection', () => {
  it('keeps the markers of a run it ends inside', async () => {
    const { body, writes } = await editing('a **bold** tail');

    select(body, ['bold', 2], [' tail', 3]);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('a **bo**il');
  });

  it('leaves one run where it ends in a run like the one it began in', async () => {
    const { body, writes } = await editing('**one**\n\n**two**');

    select(body, ['one', 1], ['two', 2]);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('**oo**');
  });

  it('stops at the words of a block when it only reaches the next one', async () => {
    const remove = await editing('first\n\n# Head');

    select(remove.body, ['first', 0], ['Head', 0]);
    await settled();
    await userEvent.keyboard('{Backspace}');
    await remove.writes('# Head');
    await remove.screen.unmount();

    const over = await editing('first\n\n# Head');

    select(over.body, ['first', 0], ['Head', 0]);
    await settled();
    await userEvent.keyboard('X');
    await over.writes('X\n\n# Head');
    await over.screen.unmount();

    const bold = await editing('first\n\n- item');

    select(bold.body, ['first', 0], ['item', 0]);
    await settled();
    await userEvent.keyboard('{Control>}b{/Control}');
    await bold.writes('**first**\n\n- item');
  });

  it('takes a table with everything else when everything is selected', async () => {
    const { body, writes } = await editing('| a |\n| - |\n| 1 |');

    put(body, 'a', 0);
    document.getSelection()?.selectAllChildren(body);
    await settled();
    await userEvent.keyboard('{Backspace}');

    await writes('');
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

describe('a code block', () => {
  it('takes Tab as indentation', async () => {
    const { body, writes } = await editing('```\nab\n```');

    put(body, 'ab', 2);
    await settled();
    await userEvent.keyboard('{Tab}');

    await writes('```\nab  \n```');
  });
});
