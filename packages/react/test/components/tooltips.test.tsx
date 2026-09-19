import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MawyEditor, MawyViewer } from 'mawy-react';
import '../../src/styles.css';

/**
 * Where the name of a control is drawn, when the control is at the end of a bar.
 *
 * A tip is a pseudo-element on the control and is centred under it, which hangs
 * half its width off the end of the last button on the bar — cut off by
 * whatever box the surface sits in, and on a page that clips its content most
 * of the word. The stylesheet answers that by hanging the ones near an end from
 * that end instead.
 *
 * It said so only as a descendant — `> *:last-child [data-mawy-tip]` — and a
 * plain button *is* the child of its group and carries the attribute itself, so
 * the rule reached the handful of controls that open a menu and left every
 * other one centred. That is what this file is here to keep fixed: the rules
 * are two selectors each now, and nothing but a real browser can say whether
 * they match.
 */

/** How the tip under a control is hung: from its own end, or centred on it. */
function hung(element: Element): 'end' | 'centre' {
  const after = getComputedStyle(element, '::after');

  return after.translate === '0px' && after.right === '0px' ? 'end' : 'centre';
}

/** The controls of a bar, in the order they are drawn. */
function controls(container: HTMLElement, selector: string): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(`${selector} [data-mawy-tip]`)];
}

describe("a control's name", () => {
  it('hangs from the end of the bar on the last control of a viewer', async () => {
    const screen = await render(
      <MawyViewer value="# A document" toolbar={['outline', 'find', 'copy', 'open']} />
    );
    const bar = controls(screen.container, '.mawy-toolbar-controls');
    const last = bar[bar.length - 1];

    expect(last.getAttribute('data-mawy-tip')).toBeTruthy();
    // The one at the edge, and the one beside it which has room to be centred.
    expect(hung(last)).toBe('end');
    expect(hung(bar[bar.length - 2])).toBe('centre');
  });

  it('hangs from the end on the last two of a group in the editor', async () => {
    const screen = await render(<MawyEditor value="# A document" />);
    const groups = [...screen.container.querySelectorAll<HTMLElement>('.mawy-toolbar-group')];
    const wide = groups.find((group) => group.children.length >= 4);

    expect(wide).toBeTruthy();

    const kids = [...wide!.children];
    const tipOf = (element: Element): Element =>
      element.hasAttribute('data-mawy-tip')
        ? element
        : (element.querySelector('[data-mawy-tip]') ?? element);

    expect(hung(tipOf(kids[kids.length - 1]))).toBe('end');
    expect(hung(tipOf(kids[kids.length - 2]))).toBe('end');
    // Far enough from the edge to keep its name centred under it.
    expect(hung(tipOf(kids[kids.length - 3]))).toBe('centre');
  });

  it('reaches a control that carries the tip itself, which is most of them', async () => {
    const screen = await render(<MawyEditor value="# A document" />);
    const hungFromEnd = [...screen.container.querySelectorAll('[data-mawy-tip]')].filter(
      (each) => hung(each) === 'end'
    );

    // A plain button is the child of its group and says `data-mawy-tip` on
    // itself; only a control that opens a menu or a palette wraps one. Said as
    // a descendant alone, the rules reached the wrapped ones and nothing else.
    const plain = hungFromEnd.filter((each) =>
      each.parentElement?.matches('.mawy-toolbar-group, .mawy-toolbar-controls')
    );

    expect(plain.length).toBeGreaterThan(0);
  });
});
