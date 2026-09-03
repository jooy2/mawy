import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { MawyViewer } from 'mawy-react';

/**
 * The server's answer and the browser's first answer, which have to be the same
 * one.
 *
 * React hydrates by walking what the server sent and expecting to find what it
 * would have drawn itself. Anywhere the two differ it warns, throws the markup
 * away, or — worse — keeps going with a tree that does not match the page.
 *
 * The place this library can get that wrong is raw HTML: `sanitize` needs a DOM
 * to parse with and a server has none, so the server draws the markup as
 * characters. The browser has to draw the characters too, once, before it draws
 * the elements.
 */

/**
 * What React says about the markup, caught rather than printed.
 *
 * Only what it says about hydration: the runner also complains about `act`,
 * which is a remark about the test rather than about what was drawn.
 */
const MISMATCH = /hydrat|did not match|server (?:rendered|html)/i;

/** What React says when the two do not agree, caught rather than printed. */
async function hydrating(element: React.ReactElement): Promise<string[]> {
  const complaints: string[] = [];
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const said = args.map(String).join(' ');

    if (MISMATCH.test(said)) {
      complaints.push(said);
    }
  });
  const host = document.createElement('div');

  host.innerHTML = renderToString(element);
  document.body.append(host);

  const root = await act(async () => hydrateRoot(host, element));

  await act(async () => {});

  root.unmount();
  host.remove();
  error.mockRestore();

  return complaints;
}

describe('a document drawn on a server and picked up in a browser', () => {
  it('agrees with itself over prose, a table and a code block', async () => {
    expect(
      await hydrating(
        <MawyViewer
          value={'# Title\n\nWords and a [link](https://example.com).\n\n```ts\nconst a = 1;\n```'}
          toolbar={false}
        />
      )
    ).toEqual([]);
  });

  it('agrees with itself over raw HTML it is asked to sanitise', async () => {
    // The server has no `DOMParser` and draws the characters; the browser has to
    // draw the characters as well before it draws the elements.
    expect(
      await hydrating(<MawyViewer html="sanitize" value={'<p class="k">hi</p>'} toolbar={false} />)
    ).toEqual([]);
  });

  it('sanitises once it is running in the browser', async () => {
    const host = document.createElement('div');
    const element = <MawyViewer html="sanitize" value={'<p class="k">hi</p>'} toolbar={false} />;

    host.innerHTML = renderToString(element);
    document.body.append(host);

    // What the server sent is the markup as text.
    expect(host.querySelector('.mawy-md-html p')).toBe(null);
    expect(host.textContent).toContain('<p class="k">hi</p>');

    const root = await act(async () => hydrateRoot(host, element));

    await act(async () => {});

    // And the render after hydration is the elements.
    expect(host.querySelector('.mawy-md-html p')?.getAttribute('class')).toBe('k');

    root.unmount();
    host.remove();
  });
});
