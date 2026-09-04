import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MawyDocument } from '../../src/server.js';
import { mawyHighlighter } from '../../src/highlight.js';
import { sources } from '../support/sources';

/**
 * The document, drawn on a server and left alone.
 *
 * `renderToStaticMarkup` is the closest a test can get to a React Server
 * Component: it renders once, to a string, with nothing to hydrate afterwards.
 * A hook in that path throws, which is the whole point — this entry point is
 * the drawing without the behaviour, and the behaviour is what needs hooks.
 */
describe('a document rendered on a server', () => {
  it('draws the document, without asking for a client', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value={'# Title\n\nWords with **bold** and a [link](/a).'} />
    );

    expect(html).toContain('<h1 id="title"');
    expect(html).toContain('>bold</strong>');
    expect(html).toContain('href="/a"');
    // No React on the page means no place for anything React puts there.
    expect(html).not.toContain('data-reactroot');
  });

  it('leaves out the controls that would have nothing behind them', () => {
    const html = renderToStaticMarkup(<MawyDocument value={'```ts\nconst a = 1;\n```'} />);

    expect(html).toContain('<pre');
    // A copy button on a page with no JavaScript is a control that lies about
    // being one.
    expect(html).not.toContain('mawy-code-copy');
    expect(html).not.toContain('<button');
  });

  it('colours a code block from a highlighter that answers at once', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value={'```ts\nconst a = 1;\n```'} highlight={mawyHighlighter} />
    );

    expect(html).toContain('mawy-hl-keyword');
  });

  it('draws raw HTML as characters, and as elements only when told to', () => {
    const escaped = renderToStaticMarkup(<MawyDocument value={'<div>hi</div>'} />);
    const sanitised = renderToStaticMarkup(
      <MawyDocument value={'<div>hi</div>'} html="sanitize" />
    );
    const raw = renderToStaticMarkup(<MawyDocument value={'<div>hi</div>'} html="raw" />);

    // There is no DOM to sanitise with here and no render after this one for
    // the elements to arrive on, so `sanitize` says what `escape` says.
    // Each run of markup is its own span, so the characters are there without
    // being one string: `<b>`, then the words, then `</b>`.
    expect(escaped).toContain('&lt;div&gt;hi&lt;/div&gt;');
    expect(sanitised).toContain('&lt;div&gt;hi&lt;/div&gt;');
    expect(raw).toContain('<div>hi</div>');
  });

  it('reads the footnotes and the outline the way the viewer does', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value={'A sentence.[^a]\n\n[^a]: The note.'} />
    );

    expect(html).toContain('mawy-md-footnotes');
    expect(html).toContain('The note.');
  });

  /**
   * The reason this entry point exists. A file that says `'use client'` is a
   * file a bundler ships to the browser, and the point of drawing a document on
   * a server is that none of it has to be.
   */
  it('reaches nothing that says it is for a client', () => {
    const seen = new Set<string>();
    const walk = (path: string) => {
      if (seen.has(path)) {
        return;
      }

      seen.add(path);

      for (const match of sources[path].matchAll(/from\s+'(\.[^']+)'/g)) {
        const to = `${path.replace(/\/[^/]+$/, '')}/${match[1]}`
          .replace(/\/\.\//g, '/')
          .replace(/[^/]+\/\.\.\//g, '')
          .replace(/\.js$/, '');

        for (const candidate of [`${to}.ts`, `${to}.tsx`]) {
          if (sources[candidate]) {
            walk(candidate);
          }
        }
      }
    };

    walk('src/server.tsx');

    // The directive rather than the words: half the files here talk *about*
    // `'use client'` in a comment, and a comment ships nothing.
    const declared = (source: string) =>
      /^(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*'use client'/.test(source);

    expect([...seen].filter((path) => declared(sources[path]))).toEqual([]);
  });
});
