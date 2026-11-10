import type * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor, MawyViewer } from 'mawy-react';
import { isolate } from '../../scripts/isolate.mjs';
import { HOST, PROPERTIES, moved, withHost } from '../support/host';
import source from '../../src/styles.css?raw';

/**
 * `styles.isolated.css`, against `styles.css`.
 *
 * The isolated sheet is the same rules a class stronger, so there are two
 * things to hold it to. On a page with no rules of its own it has to draw
 * exactly what `styles.css` draws, in the document and in the interface around
 * it — a lift that moved one rule past another it used to lose to would show
 * up here and nowhere else. And on a page whose rules are more specific than
 * this library's, it has to keep them out where `styles.css` lets them in.
 *
 * Neither sheet is imported the usual way, because both would then be on the
 * page at once. Each is put in and taken out around what it is measured on.
 */

const PLAIN = source;
const ISOLATED = isolate(source);

const SAMPLE = [
  '# One',
  '',
  'A paragraph with **strong**, _em_, ~~struck~~, `code` and a [link](https://example.com).',
  '',
  '## Two',
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
  'Markdown',
  ': A way of writing.',
  '',
  'A footnote.[^one]',
  '',
  '[^one]: The note.'
].join('\n');

/**
 * What a page whose rules mean it looks like: the same theme as the one
 * `styles.css` is measured against, with one class more in every selector.
 * Two classes and an element is the strength `styles.css` gives way to.
 */
const STRONGER = HOST.replaceAll('.host ', '.host .content ');

let mounted: HTMLStyleElement | null = null;

/** [css] as the page's only Mawy stylesheet. */
function swapIn(css: string) {
  mounted?.remove();
  mounted = document.createElement('style');
  mounted.textContent = css;
  document.head.append(mounted);
  // A reflow, so that what is measured next is drawn with this sheet.
  void document.body.offsetHeight;
}

afterEach(() => {
  mounted?.remove();
  mounted = null;
});

/** Every element under [root] and what it is drawn like, the shell included. */
function measureAll(root: Element) {
  const taken = new Map<string, Record<string, string>>();
  const properties = [...PROPERTIES, 'display', 'position', 'width', 'height', 'opacity'];

  [root, ...root.querySelectorAll('*')].forEach((element, index) => {
    const style = getComputedStyle(element);

    taken.set(
      `${index}:${element.tagName.toLowerCase()}`,
      Object.fromEntries(properties.map((name) => [name, style.getPropertyValue(name)]))
    );
  });

  return taken;
}

const SURFACES: [string, () => React.ReactElement][] = [
  ['the viewer', () => <MawyViewer value={SAMPLE} toolbar={['outline', 'colorScheme']} />],
  ['the viewer in dark', () => <MawyViewer value={SAMPLE} colorScheme="dark" />],
  ['the editor on split', () => <MawyEditor defaultValue={SAMPLE} mode="split" />],
  ['the editor on wysiwyg', () => <MawyEditor defaultValue={SAMPLE} mode="wysiwyg" />]
];

describe('the isolated stylesheet', () => {
  it('lifts every rule but the palettes, and declares every token', () => {
    // Out of the rules rather than the prose, which names tokens as well.
    const declared = (css: string) =>
      new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/--mawy-[\w-]+(?=\s*:)/g));

    expect([...declared(PLAIN)].filter((name) => !declared(ISOLATED).has(name))).toEqual([]);
    expect(ISOLATED).toContain('.mawy-root.mawy-root .mawy-md p');
    // The three palettes, still at nothing, so a token redeclared on the root
    // wins under this sheet exactly as it does under the other.
    expect(ISOLATED.match(/:where\(\.mawy-root\[data-mawy-color-scheme/g)).toHaveLength(2);
  });

  for (const [name, surface] of SURFACES) {
    it(`draws ${name} as styles.css does`, async () => {
      const screen = await render(surface());

      swapIn(PLAIN);
      const plain = measureAll(screen.container);

      swapIn(ISOLATED);
      expect(moved(plain, measureAll(screen.container))).toEqual([]);
    });
  }

  it('keeps out a page rule that styles.css gives way to', async () => {
    const screen = await render(
      <div className="host">
        <div className="content">
          <MawyViewer value={SAMPLE} />
        </div>
      </div>
    );

    // Asserted first, because a theme that reaches nothing under either sheet
    // is a test that passes for the wrong reason.
    swapIn(PLAIN);
    expect((await withHost(screen.container, STRONGER)).length).toBeGreaterThan(0);

    swapIn(ISOLATED);
    expect(await withHost(screen.container, STRONGER)).toEqual([]);
  });

  it('keeps the editor out of reach as well', async () => {
    const screen = await render(
      <div className="host">
        <div className="content">
          <MawyEditor defaultValue={SAMPLE} mode="split" />
        </div>
      </div>
    );

    swapIn(ISOLATED);
    expect(await withHost(screen.container, STRONGER)).toEqual([]);
  });

  it('takes a token redeclared on the root the way styles.css does', async () => {
    const theme = document.createElement('style');

    // In front of the library's sheet, so that it would lose any tie.
    theme.textContent = '.brand { --mawy-accent: red; }';
    document.head.prepend(theme);

    try {
      const screen = await render(
        <MawyViewer value="[a link](https://example.com)" className="brand" colorScheme="dark" />
      );

      swapIn(ISOLATED);
      expect(getComputedStyle(screen.container.querySelector('.mawy-md a') as Element).color).toBe(
        'rgb(255, 0, 0)'
      );
    } finally {
      theme.remove();
    }
  });
});
