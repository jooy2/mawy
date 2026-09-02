import { describe, expect, it } from 'vitest';
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
    await expect.element(screen.getByRole('dialog', { name: 'More controls' })).toBeInTheDocument();

    expect(await violations(screen.container)).toEqual([]);
  });
});
