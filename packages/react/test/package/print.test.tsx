import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor, MawyViewer } from 'mawy-react';
import '../../src/styles.css';

/**
 * The print stylesheet, against the components it is written about.
 *
 * A rule inside `@media print` is the one kind of rule nobody ever sees go
 * wrong: it is not on the screen anybody is looking at, no test that renders a
 * component touches it, and a class renamed in a refactor takes it out
 * silently. Six months later somebody prints a document and gets a toolbar.
 *
 * So this walks the block itself and asks the only question that can be asked
 * without a printer: is every class it hides still a class something renders?
 * It does not prove the page looks right. It proves the sheet is still pointed
 * at the page.
 */

const SAMPLE = [
  '# Title',
  '',
  'Words, a [link](https://example.com) and a footnote.[^one]',
  '',
  '[^one]: The note, so the link back to it is on the page.',
  '',
  '```ts',
  'const a = 1;',
  '```'
].join('\n');

/** The `@media print` block, out of the stylesheet the page actually loaded. */
function printRules(): CSSStyleRule[] {
  const found: CSSStyleRule[] = [];

  for (const sheet of [...document.styleSheets]) {
    let rules: CSSRuleList;

    try {
      rules = sheet.cssRules;
    } catch {
      // A stylesheet from another origin. Not ours, and not readable.
      continue;
    }

    for (const rule of [...rules]) {
      if (rule instanceof CSSMediaRule && rule.conditionText.includes('print')) {
        found.push(...([...rule.cssRules] as CSSStyleRule[]));
      }
    }
  }

  return found;
}

/** Every `.mawy-…` class named by a rule that hides what it selects. */
function hidden(): string[] {
  const names = new Set<string>();

  for (const rule of printRules()) {
    if (rule.style?.display !== 'none') {
      continue;
    }

    for (const name of rule.selectorText.match(/\.mawy-[\w-]+/g) ?? []) {
      names.add(name.slice(1));
    }
  }

  return [...names].sort();
}

/** Every class on every element under a container. */
function classesIn(container: Element): Set<string> {
  const names = new Set<string>();

  for (const element of [container, ...container.querySelectorAll('*')]) {
    for (const name of element.classList) {
      names.add(name);
    }
  }

  return names;
}

/** A toolbar control, pressed by the name it is announced under. */
function press(container: Element, label: string): void {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  if (button === null) {
    throw new Error(`No control called ${label}`);
  }

  button.click();
}

describe('printing', () => {
  it('has a print stylesheet at all', () => {
    expect(printRules().length).toBeGreaterThan(0);
    // Asserted because the test below is a filter over this list, and a filter
    // over nothing passes for the wrong reason.
    expect(hidden().length).toBeGreaterThan(4);
  });

  it('hides nothing that no longer exists', async () => {
    const editor = await render(
      <MawyEditor defaultValue={SAMPLE} mode="split" onColorSchemeChange={() => {}} />
    );
    const viewer = await render(
      <MawyViewer
        value={SAMPLE}
        onColorSchemeChange={() => {}}
        toolbar={['outline', 'colorScheme']}
      />
    );

    // Pressed through the element rather than through a role query, because
    // two components are mounted at once and both toolbars have a `Theme` on
    // them — which is a question about this test rather than about either one.
    press(editor.container, 'Find');
    press(viewer.container, 'Contents');
    press(viewer.container, 'Theme');

    // `mawy-editor-note` only appears when reading a file failed, and there is
    // no way to make one fail from here.
    const excused = new Set(['mawy-editor-note']);

    // Polled, because a panel opens on React's next render rather than on the
    // click.
    await expect
      .poll(() => {
        const rendered = classesIn(document.body);

        return hidden().filter((name) => !rendered.has(name) && !excused.has(name));
      })
      .toEqual([]);
  });

  it('lays the source out as text rather than as a textarea', () => {
    const layer = printRules().find((rule) => rule.selectorText?.includes('.mawy-source-layer'));
    const input = printRules().find((rule) => rule.selectorText?.includes('.mawy-source-input'));

    // A `<textarea>` prints what is inside its own box and loses the rest of
    // the file, so on paper the coloured copy underneath is what prints.
    expect(layer?.style.position).toBe('static');
    expect(input?.style.display).toBe('none');
  });
});
