import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import axe from 'axe-core';
import { MawyEditor, MawyViewer } from 'mawy-react';
import '../../src/styles.css';

/**
 * What the two components are like for somebody not using them the usual way.
 *
 * The other test files ask whether a control does what it says; this one asks
 * whether it can be reached, named and read at all, and it asks with axe rather
 * than with opinions — an `aria-label` somebody remembered to write is easy to
 * assert and easy to be smug about, and it is the rule nobody thought of that
 * costs somebody the page.
 *
 * Every surface is checked in both palettes, because half of what is here is
 * colour contrast and a palette that passes in the light is not evidence about
 * the dark one. The stylesheet is imported for the same reason: an audit
 * against unstyled markup is an audit of the half that was never in doubt.
 */

const SAMPLE = [
  '# Title',
  '',
  'A paragraph with **strong** text and a [link](https://example.com).',
  '',
  '## Second',
  '',
  '- [x] done',
  '- [ ] not',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '> [!NOTE]',
  '> An alert.',
  '',
  'A footnote.[^one]',
  '',
  '[^one]: The note.',
  '',
  'Markdown',
  ': A way of writing.',
  '',
  '```ts',
  'const a = 1;',
  '```'
].join('\n');

/**
 * Every violation axe finds, in a shape a failure message can be read from.
 *
 * Nothing is audited while it is still arriving. A menu panel fades in over
 * `--mawy-duration`, and text at half opacity over the page behind it does not
 * meet contrast — correctly, and about a state that is gone in 140ms and that
 * nobody reads. Auditing into it made this suite fail on whichever runner was
 * slowest that morning, which is a test that reports the weather.
 *
 * There is no animation in this library that does not end, so waiting on all of
 * them is waiting rather than hanging.
 */
async function violations(container: Element) {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));

  const results = await axe.run(container as HTMLElement, { resultTypes: ['violations'] });

  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 6).map((node) => node.target.join(' '))
  }));
}

const SCHEMES = ['light', 'dark'] as const;
const MODES = ['plain', 'split', 'preview', 'wysiwyg'] as const;

describe('the viewer', () => {
  for (const colorScheme of SCHEMES) {
    it(`has nothing to answer for with a document, in ${colorScheme}`, async () => {
      const screen = await render(
        <MawyViewer value={SAMPLE} colorScheme={colorScheme} onColorSchemeChange={() => {}} />
      );

      expect(await violations(screen.container)).toEqual([]);
    });

    it(`has nothing to answer for as the file picker, in ${colorScheme}`, async () => {
      const screen = await render(
        <MawyViewer colorScheme={colorScheme} onColorSchemeChange={() => {}} />
      );

      expect(await violations(screen.container)).toEqual([]);
    });
  }

  it('has nothing to answer for with the outline open', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['outline']} />);

    await screen.getByRole('button', { name: 'Contents' }).click();
    // Asserted before the audit, because an audit of a panel that never opened
    // is an audit of nothing that passes for the wrong reason.
    await expect.element(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();

    expect(await violations(screen.container)).toEqual([]);
  });

  it('lets a keyboard reach the end of what scrolls sideways', async () => {
    const screen = await render(
      <MawyViewer value={'| a | b |\n| - | - |\n| 1 | 2 |\n\n```\ncode\n```'} toolbar={false} />
    );

    // A box that scrolls sideways and cannot be focused is content a keyboard
    // cannot reach the right-hand end of.
    for (const selector of ['.mawy-md-table-scroll', '.mawy-md-pre pre']) {
      const box = screen.container.querySelector(selector) as HTMLElement;

      expect(box.getAttribute('tabindex'), selector).toBe('0');
    }
  });

  it('gives a choice one tab stop and moves inside it with the arrows', async () => {
    const screen = await render(
      <MawyViewer value={SAMPLE} onColorSchemeChange={() => {}} toolbar={['colorScheme']} />
    );

    await screen.getByRole('button', { name: 'Theme' }).click();

    const options = [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];

    // Four options that are each their own stop is four presses of `Tab` to get
    // past a question with one answer. The stop is the answer already given.
    expect(options.map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '-1', '0']);

    options[2].focus();
    options[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(options[0]);

    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(options[2]);

    // The arrows move and do not pick: a `Choice` may run a command against the
    // document, and arrowing past one would leave an edit behind.
    expect(options[2].getAttribute('aria-checked')).toBe('true');
  });

  it('says which language its own words are in, and does not say it about the document', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} locale="ko" />);
    const root = screen.container.querySelector('.mawy-root') as HTMLElement;
    const toolbar = screen.container.querySelector('.mawy-toolbar') as HTMLElement;
    const article = screen.container.querySelector('.mawy-md') as HTMLElement;
    const claimed: string[] = [];

    for (let at = article; at && at !== root.parentElement; at = at.parentElement as HTMLElement) {
      if (at.hasAttribute('lang')) {
        claimed.push(at.className);
      }
    }

    // The toolbar's words are this library's, and a page that declares itself
    // English reads them in an English voice whatever language they are in.
    expect(toolbar.getAttribute('lang')).toBe('ko');
    // The document's is the author's and is not known here, so nothing between
    // it and the root claims one for it.
    expect(claimed).toEqual([]);
  });

  it('has nothing to answer for with a menu open', async () => {
    const screen = await render(
      <MawyViewer value={SAMPLE} onColorSchemeChange={() => {}} toolbar={['colorScheme']} />
    );

    await screen.getByRole('button', { name: 'Theme' }).click();
    await expect.element(screen.getByRole('radio', { name: 'Dark' })).toBeInTheDocument();

    expect(await violations(screen.container)).toEqual([]);
  });
});

describe('the editor', () => {
  for (const colorScheme of SCHEMES) {
    for (const mode of MODES) {
      it(`has nothing to answer for on ${mode}, in ${colorScheme}`, async () => {
        const screen = await render(
          <MawyEditor
            defaultValue={SAMPLE}
            mode={mode}
            modes={[...MODES]}
            colorScheme={colorScheme}
            onColorSchemeChange={() => {}}
          />
        );

        expect(await violations(screen.container)).toEqual([]);
      });
    }
  }

  it('puts the tooltips away on Escape, and back on the next move', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['copy']} />);
    const root = screen.container.querySelector('.mawy-root') as HTMLElement;

    expect(root.hasAttribute('data-mawy-tips')).toBe(false);

    // A tooltip that cannot be dismissed without moving the pointer sits over
    // whatever is under it for as long as the hand stays still.
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(root.getAttribute('data-mawy-tips')).toBe('off'));

    root.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await vi.waitFor(() => expect(root.hasAttribute('data-mawy-tips')).toBe(false));
  });

  it('says what the status line is, in words a screen reader reads', async () => {
    const screen = await render(<MawyEditor defaultValue={SAMPLE} mode="plain" />);
    const status = screen.container.querySelector('.mawy-status') as HTMLElement;

    // An `aria-label` on a paragraph names something with no name to give, and
    // most screen readers read the text and drop the label.
    expect(status.hasAttribute('aria-label')).toBe(false);
    expect(status.textContent?.startsWith('Document statistics')).toBe(true);
  });

  it('has nothing to answer for with find and replace open', async () => {
    // A short toolbar, so that `find` is a button in the row rather than one of
    // the controls the overflow menu is holding at this width. The menu has an
    // audit of its own below.
    const screen = await render(
      <MawyEditor defaultValue={SAMPLE} mode="plain" toolbar={['find']} />
    );

    await screen.getByRole('button', { name: 'Find' }).click();
    await expect.element(screen.getByRole('search', { name: 'Find' })).toBeInTheDocument();

    expect(await violations(screen.container)).toEqual([]);
  });

  it('has nothing to answer for with the overflow menu open', async () => {
    const screen = await render(<MawyEditor defaultValue={SAMPLE} mode="plain" />);

    await screen.getByRole('button', { name: 'More controls' }).click();
    await expect.element(screen.getByRole('group', { name: 'More controls' })).toBeInTheDocument();

    expect(await violations(screen.container)).toEqual([]);
  });
});
