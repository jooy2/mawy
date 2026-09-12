import type * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor, MawyViewer } from 'mawy-react';
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

/**
 * A documentation theme, roughly. Bare element names under one class, which is
 * how a sheet that styles prose is written and is exactly the shape that
 * reaches past a library writing `.mawy-root .mawy-md p`.
 */
const HOST = `
  .host h1, .host h2, .host h3, .host h4, .host h5, .host h6 {
    margin: 48px 0 16px;
    padding-top: 24px;
    border-top: 1px solid #f00;
    font-size: 41px;
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: 0.3em;
    color: #f00;
  }
  .host p, .host li, .host dt, .host dd {
    margin: 16px 0;
    padding: 4px 8px;
    font-size: 15px;
    line-height: 2.4;
    letter-spacing: 0.2em;
    color: #f00;
  }
  .host ul, .host ol, .host dl {
    margin: 16px 0;
    padding-left: 1.25rem;
    list-style-position: inside;
  }
  .host ul { list-style-type: square; }
  .host ol { list-style-type: upper-roman; }
  .host blockquote {
    margin: 16px 0;
    padding: 12px 16px;
    border-left: 6px solid #f00;
    background-color: #ff0;
    color: #f00;
    font-style: italic;
  }
  .host pre, .host code {
    margin: 16px 0;
    padding: 20px;
    border: 2px solid #f00;
    border-radius: 0;
    background-color: #ff0;
    color: #f00;
    font-size: 19px;
    line-height: 2.2;
    font-family: Georgia, serif;
  }
  .host table { margin: 16px 0; border-collapse: separate; border-spacing: 7px; width: 100%; }
  .host th, .host td { padding: 20px; border: 2px solid #f00; text-align: right; color: #f00; }
  .host tr { background-color: #ff0; }
  .host hr { margin: 48px 0; border: none; border-top: 4px dashed #f00; }
  .host a { color: #f00; text-decoration-line: overline; text-underline-offset: 9px; }
  .host img { margin: 16px 0; border: 3px solid #f00; border-radius: 0; }
  .host sup { font-size: 19px; vertical-align: sub; }
  .host strong { font-weight: 400; color: #f00; }
  .host em { font-style: normal; color: #f00; }
  .host del { text-decoration-line: overline; color: #f00; }
  .host section { margin: 48px 0; padding: 20px; border: 2px solid #f00; }
  .host input { accent-color: #f00; margin: 12px; width: 24px; height: 24px; }
  .host mark { background-color: #ff0; color: #f00; }
`;

/** What a host sheet sets, and so what has to be measured. */
const PROPERTIES = [
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-left-style',
  'border-top-color',
  'border-left-color',
  'border-top-left-radius',
  'border-collapse',
  'border-spacing',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'color',
  'background-color',
  'text-align',
  'text-decoration-line',
  'text-underline-offset',
  'vertical-align',
  'list-style-type',
  'list-style-position',
  'accent-color'
];

/** Every element inside [root], and what it is drawn like right now. */
function measure(root: Element) {
  const taken = new Map<string, Record<string, string>>();
  const seen = new Map<string, number>();

  for (const element of root.querySelectorAll('.mawy-md, .mawy-md *')) {
    const tag = element.tagName.toLowerCase();
    const count = (seen.get(tag) ?? 0) + 1;

    seen.set(tag, count);

    const style = getComputedStyle(element);
    const values: Record<string, string> = {};

    for (const property of PROPERTIES) {
      values[property] = style.getPropertyValue(property);
    }

    taken.set(`${tag}:${count}`, values);
  }

  return taken;
}

/** What the host's sheet moved, as `element property: before -> after`. */
function moved(before: ReturnType<typeof measure>, after: ReturnType<typeof measure>) {
  const changes: string[] = [];

  for (const [key, values] of before) {
    const now = after.get(key);

    if (!now) {
      continue;
    }

    for (const [property, value] of Object.entries(values)) {
      if (now[property] !== value) {
        changes.push(`${key} ${property}: ${value} -> ${now[property]}`);
      }
    }
  }

  return changes;
}

/**
 * The document measured with the host's sheet off and then on, without
 * rendering it twice: a second render is a second element tree, and a property
 * that is a fraction of a measured width would differ for that reason alone.
 */
async function withHost(container: Element) {
  const before = measure(container);
  const sheet = document.createElement('style');

  sheet.textContent = HOST;
  document.head.append(sheet);

  try {
    // A reflow, so that what is measured is the page with the sheet applied.
    void (container as HTMLElement).offsetHeight;

    return moved(before, measure(container));
  } finally {
    sheet.remove();
  }
}

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
