import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MawyCodeGroup, MawyViewer } from 'mawy-react';

/**
 * One piece of code written several ways, drawn as tabs.
 *
 * The parser reads the shape and stops there, so the name is the
 * application's: what this file is about is the drawing it registers for one.
 */

const GROUP = [
  '::: code-group',
  '',
  '```js',
  'sub(10, 1, 5);',
  '```',
  '',
  '```dart',
  'sub(<int>[10, 1, 5]);',
  '```',
  '',
  ':::'
].join('\n');

const draw = (value: string) =>
  render(
    <MawyViewer value={value} directives={{ 'code-group': MawyCodeGroup, lang: MawyCodeGroup }} />
  );

describe('MawyCodeGroup', () => {
  it('draws a tab per block, named by the language the fence was written with', async () => {
    const screen = await draw(GROUP);
    const tabs = screen.container.querySelectorAll('[role="tab"]');

    expect([...tabs].map((tab) => tab.textContent)).toEqual(['js', 'dart']);

    // One of them showing, and one of them in the tab order.
    expect(screen.container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(screen.container.textContent).toContain('sub(10, 1, 5);');
    expect(screen.container.textContent).not.toContain('sub(<int>[10, 1, 5]);');
    expect([...tabs].map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1']);
  });

  it('shows the block whose tab was chosen', async () => {
    const screen = await draw(GROUP);

    await screen.getByRole('tab', { name: 'dart' }).click();

    expect(screen.container.textContent).toContain('sub(<int>[10, 1, 5]);');
    expect(screen.container.textContent).not.toContain('sub(10, 1, 5);');
  });

  it('moves between the tabs with the arrows, and to the ends', async () => {
    const screen = await draw(GROUP);
    const first = screen.getByRole('tab', { name: 'js' });

    await first.click();
    await userEvent.keyboard('{ArrowRight}');

    await expect
      .element(screen.getByRole('tab', { name: 'dart' }))
      .toHaveAttribute('aria-selected', 'true');

    // And round the end rather than stopping at it, which is what the pattern
    // asks for and what a row of two makes easy to check.
    await userEvent.keyboard('{ArrowRight}');

    await expect.element(first).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{End}');

    await expect
      .element(screen.getByRole('tab', { name: 'dart' }))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('takes the names the document gave, where a language is not the word to show', async () => {
    const screen = await draw(
      GROUP.replace('::: code-group', '::: code-group{tabs=Browser,Flutter}')
    );

    expect(
      [...screen.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    ).toEqual(['Browser', 'Flutter']);
  });

  /**
   * `[Some name]` after the language is how every tool that ships this block
   * spells a tab's name, so a document written for one of those arrives here
   * with its tabs already named.
   */
  it('takes the name a fence wrote in brackets after its language', async () => {
    const screen = await draw(
      GROUP.replace('```js', '```js [Browser]').replace('```dart', '```dart [Flutter]')
    );

    expect(
      [...screen.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    ).toEqual(['Browser', 'Flutter']);
  });

  it("lets the group's own list of names beat the ones the fences wrote", async () => {
    const screen = await draw(
      GROUP.replace('::: code-group', '::: code-group{tabs=One,Two}').replace(
        '```js',
        '```js [Browser]'
      )
    );

    expect(
      [...screen.container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)
    ).toEqual(['One', 'Two']);
  });

  /**
   * A group that named itself is one answer written out rather than a block
   * per tab: `::: lang js` is the JavaScript of something, prose and code
   * together, and a tab per paragraph in it is a row of numbers nobody wrote.
   */
  it('makes a titled group one tab holding everything in it', async () => {
    const screen = await draw(
      [
        '::: lang js',
        '',
        'Words about it.',
        '',
        '```javascript',
        'const a = 1;',
        '```',
        '',
        'And more words.',
        '',
        ':::'
      ].join('\n')
    );
    const tabs = screen.container.querySelectorAll('[role="tab"]');

    expect([...tabs].map((tab) => tab.textContent)).toEqual(['js']);
    expect(screen.container.textContent).toContain('Words about it.');
    expect(screen.container.textContent).toContain('const a = 1;');
    expect(screen.container.textContent).toContain('And more words.');
  });

  it('draws nothing for a group with nothing in it', async () => {
    const screen = await draw('::: code-group\n:::');

    expect(screen.container.querySelector('.mawy-md-code-group')).toBeNull();
  });
});
