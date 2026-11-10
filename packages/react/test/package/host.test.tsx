import type * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor, MawyViewer } from 'mawy-react';
import { measure, moved, withHost } from '../support/host';
import '../../src/styles.css';

/**
 * What a host page's own stylesheet can reach inside a Mawy surface.
 *
 * `--mawy-*` is the whole of what an application is invited to change, and
 * every rule in `styles.css` is written under `.mawy-root` — which settles who
 * wins a property both sheets set, and says nothing at all about a property
 * only the host sets. There a page's own rules land on the document unopposed,
 * and the first one anybody noticed was a documentation theme's `h2`: the
 * footnotes' heading set neither a border nor a padding, so the page drew a
 * rule through the section and left a gap above it.
 *
 * So this is the same question asked of every element the renderer emits, by
 * measuring the document twice. The stylesheet below is what a documentation
 * theme does to a page, written against bare element names the way those
 * sheets are written, and anything that moves between the two measurements is
 * a property the host reached through.
 *
 * It is not an assertion that the document looks right. It is an assertion that
 * what it looks like is this library's decision.
 */

const SAMPLE = [
  '# One',
  '',
  'A paragraph with **strong**, _em_, ~~struck~~, `code` and a [link](https://example.com).',
  '',
  '## Two',
  '',
  '### Three',
  '',
  '#### Four',
  '',
  '##### Five',
  '',
  '###### Six',
  '',
  '- one',
  '- two',
  '',
  '1. first',
  '1. second',
  '',
  '- [x] done',
  '- [ ] not',
  '',
  '> A quotation.',
  '',
  '> [!NOTE]',
  '> An alert.',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '---',
  '',
  '```ts',
  'const a = 1;',
  '```',
  '',
  '![a picture](data:image/gif;base64,R0lGODlhAQABAAAAACw=)',
  '',
  'Markdown',
  ': A way of writing.',
  '',
  'A footnote.[^one]',
  '',
  '[^one]: The note, which has a way back from it.'
].join('\n');

describe('the document', () => {
  /**
   * The reset is a defence rather than a design: on a page with no rules of
   * its own, taking it out has to change nothing. `revert` makes that worth
   * asking, because it rolls back every author declaration and not only the
   * host's — the shell's own `:where(button, input)` is weaker than this rule
   * and was rolled back with everything else, which took the task checkbox's
   * type down to the browser's own and shrank a box that is an em square.
   */
  it('is drawn the same with the reset taken out of the sheet', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);
    const before = measure(screen.container);
    const taken: { sheet: CSSStyleSheet; index: number; text: string }[] = [];

    for (const sheet of [...document.styleSheets]) {
      let rules: CSSRuleList;

      try {
        rules = sheet.cssRules;
      } catch {
        // A stylesheet from another origin. Not ours, and not readable.
        continue;
      }

      for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index];

        if (rule instanceof CSSStyleRule && rule.cssText.includes('revert')) {
          taken.push({ sheet, index, text: rule.cssText });
          sheet.deleteRule(index);
        }
      }
    }

    try {
      // One rule, which is the one this is about. A second would mean the
      // sheet has grown another and this test is now measuring both.
      expect(taken).toHaveLength(1);
      expect(moved(before, measure(screen.container))).toEqual([]);
    } finally {
      // Put back, or every test after this one runs against a sheet this one
      // took a rule out of.
      for (const { sheet, index, text } of taken.reverse()) {
        sheet.insertRule(text, index);
      }
    }
  });

  /**
   * A palette that reaches the text and not what it sits on is half a palette.
   *
   * `floating` gives up the border, the bar across the end and the room around
   * the prose. Not the ground: without it a reader who picks dark in the
   * toolbar gets the dark palette's light grey on the page's white.
   */
  it('keeps the ground under the document whichever frame it is', async () => {
    for (const frame of ['box', 'floating'] as const) {
      const screen = await render(<MawyViewer value="# One" frame={frame} colorScheme="dark" />);
      const root = screen.container.querySelector('.mawy-root');

      expect(root && getComputedStyle(root).backgroundColor, frame).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  it('gives the ground up where the page asks for it', async () => {
    const screen = await render(
      <MawyViewer
        value="# One"
        frame="floating"
        style={{ '--mawy-bg': 'transparent' } as React.CSSProperties}
      />
    );
    const root = screen.container.querySelector('.mawy-root');

    expect(root && getComputedStyle(root).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('cannot be reached by a host page through its own element rules', async () => {
    const screen = await render(
      <div className="host">
        <MawyViewer value={SAMPLE} />
      </div>
    );

    expect(await withHost(screen.container)).toEqual([]);
  });

  it('cannot be reached in an editor either', async () => {
    const screen = await render(
      <div className="host">
        <MawyEditor defaultValue={SAMPLE} mode="split" />
      </div>
    );

    expect(await withHost(screen.container)).toEqual([]);
  });
});

/**
 * Where a token an application redeclares reaches.
 *
 * A custom property declared on an element beats the value it would have
 * inherited, and every Mawy root declares every token, so the answer is the
 * root and whatever is inside it. What these hold is that the answer is the same
 * whichever stylesheet loaded first and whichever palette is showing, and that
 * a root inside a root — the viewer an editor draws its preview with — does not
 * take back what was given to the one around it.
 */
describe('a token', () => {
  const RED = 'rgb(255, 0, 0)';
  const LINK = '[a link](https://example.com)';

  /** A sheet put in front of the library's, so that it loses every tie. */
  function before(css: string) {
    const sheet = document.createElement('style');

    sheet.textContent = css;
    document.head.prepend(sheet);

    return sheet;
  }

  const linkIn = (container: Element, scope = '') =>
    getComputedStyle(container.querySelector(`${scope} .mawy-md a`) as Element).color;

  it("reaches the editor's preview when it is given to the editor", async () => {
    const screen = await render(
      <MawyEditor
        defaultValue={LINK}
        mode="split"
        style={{ '--mawy-accent': 'red' } as React.CSSProperties}
      />
    );

    expect(linkIn(screen.container, '.mawy-editor-preview')).toBe(RED);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    it(`given through a class, wins whichever sheet loaded first, in ${colorScheme}`, async () => {
      const sheet = before('.brand { --mawy-accent: red; }');

      try {
        const screen = await render(
          <MawyViewer value={LINK} className="brand" colorScheme={colorScheme} />
        );

        expect(linkIn(screen.container)).toBe(RED);
      } finally {
        sheet.remove();
      }
    });

    it(`given to every root inside a wrapper, reaches them all, in ${colorScheme}`, async () => {
      const sheet = before('.my-docs .mawy-root { --mawy-accent: red; }');

      try {
        const screen = await render(
          <div className="my-docs">
            <MawyViewer value={LINK} colorScheme={colorScheme} />
            <MawyEditor defaultValue={LINK} mode="split" colorScheme={colorScheme} />
          </div>
        );

        expect(linkIn(screen.container, '.mawy-viewer:not(.mawy-editor-preview > *)')).toBe(RED);
        expect(linkIn(screen.container, '.mawy-editor-preview')).toBe(RED);
      } finally {
        sheet.remove();
      }
    });
  }

  it('given for one palette, leaves the other alone', async () => {
    const sheet = before(
      ".my-docs .mawy-root[data-mawy-color-scheme='dark'] { --mawy-accent: red; }"
    );

    try {
      const screen = await render(
        <div className="my-docs">
          <MawyViewer value={LINK} colorScheme="dark" />
          <MawyViewer value={LINK} colorScheme="light" />
        </div>
      );
      const [dark, light] = [...screen.container.querySelectorAll('.mawy-md a')];

      expect(getComputedStyle(dark).color).toBe(RED);
      expect(getComputedStyle(light).color).toBe('rgb(91, 52, 234)');
    } finally {
      sheet.remove();
    }
  });

  it('keeps each palette where nothing was given', async () => {
    const screen = await render(
      <div>
        <MawyViewer value={LINK} colorScheme="dark" />
        <MawyEditor defaultValue={LINK} mode="split" colorScheme="dark" />
      </div>
    );

    // The dark accent in the viewer and in the preview the editor draws: the
    // preview takes its palette from the editor rather than declaring one.
    for (const link of screen.container.querySelectorAll('.mawy-md a')) {
      expect(getComputedStyle(link).color).toBe('rgb(157, 134, 255)');
    }
  });
});
