import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MawyDocument, type MawyDocumentProps } from '../../src/server.js';
import { MawyViewer, type MawyViewerProps } from '../../src/index.js';
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

  /**
   * The way back from the page to the document is a quarter of the HTML, and
   * nothing on a page built this way ever walks it. See `origin`.
   */
  it('writes no way back to the source it was drawn from', () => {
    const html = renderToStaticMarkup(
      <MawyDocument
        value={'# Title\n\nA [link](/a) and `code`.\n\n- one\n- two\n\n```ts\nconst a = 1;\n```'}
        highlight={mawyHighlighter}
      />
    );

    expect(html).not.toContain('data-mawy-range');
    // Everything the range would have been written on is still there.
    expect(html).toContain('<h1 id="title"');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('mawy-hl-keyword');
  });

  it('is the only drawing that leaves them out', () => {
    const html = renderToStaticMarkup(<MawyViewer value={'# Title'} toolbar={false} />);

    expect(html).toContain('data-mawy-range');
  });

  /**
   * A page whose own title is its `h1` and whose document opens with one has
   * told a screen reader and a search engine that it is about two things.
   */
  it('draws the headings from the level it was given', () => {
    const value = '# One\n\n## Two\n\n### Three';

    expect(renderToStaticMarkup(<MawyDocument value={value} />)).toContain('<h1 id="one"');

    const shifted = renderToStaticMarkup(<MawyDocument value={value} headingBase={2} />);

    // Every heading moves by the same amount, so the hierarchy survives.
    expect(shifted).toContain('<h2 id="one"');
    expect(shifted).toContain('<h3 id="two"');
    expect(shifted).toContain('<h4 id="three"');
    // And the anchors stay where a link written by hand is aimed.
    expect(shifted).not.toContain('id="mawy-one"');
  });

  it('flattens against `h6` rather than writing an element that does not exist', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value={'##### Five\n\n###### Six'} headingBase={3} />
    );

    expect(html).toContain('<h6 id="five"');
    expect(html).toContain('<h6 id="six"');
    expect(html).not.toContain('<h7');
    expect(html).not.toContain('<h8');
  });

  it('refuses a base outside the six levels there are', () => {
    expect(renderToStaticMarkup(<MawyDocument value="# One" headingBase={0} />)).toContain('<h1');
    expect(renderToStaticMarkup(<MawyDocument value="# One" headingBase={9} />)).toContain('<h6');
  });

  /**
   * A page carrying documents its readers wrote is a page that has to say what
   * it does and does not vouch for. See `MawyLinkRel`.
   */
  it('adds what the application declares about a link to what it already said', () => {
    const value = '[out](https://example.com) and [in](/a)';
    const html = renderToStaticMarkup(
      <MawyDocument
        value={value}
        linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')}
      />
    );

    // The two that make a new tab safe are not given up to add one more.
    expect(html).toContain('rel="noopener noreferrer nofollow ugc"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('takes a string for every link, and writes no token twice', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value="[a](https://example.com)" linkRel="noopener nofollow" />
    );

    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('says only what the application asked for where nothing opens a new tab', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value="[a](https://example.com)" linkTarget="self" linkRel="nofollow" />
    );

    expect(html).toContain('rel="nofollow"');
    expect(html).not.toContain('noopener');
    expect(html).not.toContain('target=');
  });

  it('asks about the address the reader will actually follow', () => {
    const asked: string[] = [];

    renderToStaticMarkup(
      <MawyDocument
        value="[a](./b.md)"
        resolveUrl={(url) => new URL(url, 'https://example.com/docs/').href}
        linkRel={(href) => {
          asked.push(href);

          return null;
        }}
      />
    );

    expect(asked).toEqual(['https://example.com/docs/b.md']);
  });

  it('never asks about a link this library wrote itself', () => {
    const asked: string[] = [];
    const html = renderToStaticMarkup(
      <MawyDocument
        value={'A sentence.[^a]\n\n[^a]: The note.'}
        linkRel={(href) => {
          asked.push(href);

          return 'nofollow';
        }}
      />
    );

    // A footnote's reference and the arrow back point at this same page.
    expect(asked).toEqual([]);
    expect(html).not.toContain('nofollow');
  });

  it('reads the footnotes and the outline the way the viewer does', () => {
    const html = renderToStaticMarkup(
      <MawyDocument value={'A sentence.[^a]\n\n[^a]: The note.'} />
    );

    expect(html).toContain('mawy-md-footnotes');
    expect(html).toContain('The note.');
  });

  /**
   * What `MawyViewer` takes about how a document is drawn, `MawyDocument`
   * takes too — so moving a page from one to the other is deleting the props
   * that were behaviour, and not rewriting the ones that were not.
   *
   * A compile-time claim as much as a runtime one: `satisfies` checks this
   * object against both, so the two disagreeing fails `npm run typecheck`
   * before it reaches an expectation.
   *
   * Two props are deliberately not shared and are not in here. `value` is
   * optional on the viewer, because a viewer with no document is the file
   * picker, and required here, because a document with no document is
   * nothing. `highlight` takes a function that fetches one on the viewer and
   * only a highlighter here, because a promise has no second render to arrive
   * on — a type error is a better answer than accepting one and ignoring it.
   */
  it('takes what the viewer takes about how a document is drawn', () => {
    const shared = {
      value: '# Post',
      colorScheme: 'system',
      typography: { fontSize: 18 },
      linkTarget: 'blank'
    } satisfies MawyViewerProps & MawyDocumentProps;

    const onAPage = renderToStaticMarkup(<MawyViewer {...shared} toolbar={false} />);
    const onAServer = renderToStaticMarkup(<MawyDocument {...shared} />);

    for (const html of [onAPage, onAServer]) {
      expect(html).toContain('data-mawy-color-scheme="system"');
      expect(html).toContain('--mawy-doc-size:18px');
      // The four the partial left out are the defaults rather than nothing.
      expect(html).toContain('--mawy-doc-line-height:1.7');
    }
  });

  /**
   * The stylesheet turns a document dark under `prefers-color-scheme` only
   * where the attribute says `system`, so a document that writes no attribute
   * is light on a dark screen. That is the right default for a page with a
   * palette of its own and has to be sayable otherwise.
   */
  it('leaves the palette to the page unless asked, and can follow the reader', () => {
    const left = renderToStaticMarkup(<MawyDocument value="# A" />);

    expect(left).not.toContain('data-mawy-color-scheme');
    expect(renderToStaticMarkup(<MawyDocument value="# A" colorScheme="system" />)).toContain(
      'data-mawy-color-scheme="system"'
    );
    expect(renderToStaticMarkup(<MawyDocument value="# A" colorScheme="dark" />)).toContain(
      'data-mawy-color-scheme="dark"'
    );
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
