import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  MAWY_SYSTEM_FONTS,
  MAWY_WEB_FONTS,
  MawyViewer,
  type MawyCodeToken,
  type MawyDirectiveProps,
  type MawyHighlighter
} from 'mawy-react';

/**
 * The viewer, as a reader meets it.
 *
 * The parser has its own file and is tested as a tree there, so what is left
 * for this one is everything that only exists once the two are put together:
 * the empty state, the toolbar, the settings reaching the document, and the
 * places where the safety story has to survive contact with the DOM.
 */

const SAMPLE = [
  '# Title',
  '',
  'A paragraph with **strong** text and a [link](https://example.com).',
  '',
  '## Second',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '```ts',
  'const a = 1;',
  '```'
].join('\n');

describe('the document', () => {
  it('renders headings, prose and a table', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);

    await expect
      .element(screen.getByRole('heading', { name: 'Title', level: 1 }))
      .toBeInTheDocument();
    await expect.element(screen.getByRole('table')).toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'link' }))
      .toHaveAttribute('href', 'https://example.com');
  });

  it('opens a link in a new tab, and in this one when asked', async () => {
    const away = await render(<MawyViewer value={SAMPLE} />);
    const link = away.container.querySelector('.mawy-md-link') as HTMLElement;

    // A viewer is usually a piece of a page rather than the page, and in an
    // editor there is unsaved work behind that link.
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    const here = await render(<MawyViewer value={SAMPLE} linkTarget="self" />);
    const same = here.container.querySelector('.mawy-md-link') as HTMLElement;

    expect(same.hasAttribute('target')).toBe(false);
    expect(same.hasAttribute('rel')).toBe(false);
  });

  it('keeps a footnote and its way back in the tab they are on', async () => {
    const screen = await render(<MawyViewer value={'Words.[^a]\n\n[^a]: A note.'} />);
    const reference = screen.container.querySelector('.mawy-md-footnote-ref a') as HTMLElement;
    const back = screen.container.querySelector('.mawy-md-footnote-back') as HTMLElement;

    // Both point at this page, so `linkTarget` has nothing to say about them.
    expect(reference.hasAttribute('target')).toBe(false);
    expect(back.hasAttribute('target')).toBe(false);
  });

  it('gives every heading the id its outline links to', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);
    const heading = screen.getByRole('heading', { name: 'Second' }).element();

    expect(heading.id).toBe('second');
  });

  it('puts a tight list item on one line and a loose one in a paragraph', async () => {
    const tight = await render(<MawyViewer value={'- [x] done\n- [ ] not'} />);

    // A `<p>` inside a tight item is what puts a task list's checkbox on the
    // line above its own label, which is the whole reason the flag exists.
    expect(tight.container.querySelectorAll('.mawy-md-task p')).toHaveLength(0);
    expect(tight.container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);

    const loose = await render(<MawyViewer value={'- one\n\n- two'} />);

    expect(loose.container.querySelectorAll('.mawy-md-list li > p')).toHaveLength(2);
  });

  it('reads breaks and gfm the way the parse option says', async () => {
    const screen = await render(<MawyViewer value={'a\nb'} parse={{ breaks: true }} />);

    expect(screen.container.querySelectorAll('br')).toHaveLength(1);
  });

  it('says which characters of the source each block was drawn from', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);
    const drawn = [...screen.container.querySelectorAll('[data-mawy-range]')].map((element) => {
      const [start, end] = (element.getAttribute('data-mawy-range') ?? '').split(',');

      return SAMPLE.slice(Number(start), Number(end));
    });

    // Every element that carries one is pointing at the text it is showing,
    // which is what a preview scrolling with the source reads it for.
    expect(drawn).toContain('# Title');
    expect(drawn).toContain('## Second');
    expect(drawn).toContain('```ts\nconst a = 1;\n```');
    expect(drawn).toContain('| 1 | 2 |');
    expect(drawn).toContain('A paragraph with **strong** text and a [link](https://example.com).');
  });
});

describe('safety', () => {
  it('draws a refused link as words rather than as a control', async () => {
    const screen = await render(<MawyViewer value="[click](javascript:alert(1))" />);

    expect(screen.container.querySelector('a')).toBeNull();
    await expect.element(screen.getByText('click')).toBeInTheDocument();
  });

  it('shows raw HTML as text by default', async () => {
    const screen = await render(<MawyViewer value={'<img src=x onerror=alert(1)>'} />);

    expect(screen.container.querySelector('img')).toBeNull();
    expect(screen.container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('keeps the element and drops the handler when asked to sanitise', async () => {
    const screen = await render(
      <MawyViewer
        html="sanitize"
        value={'<p class="k" onclick="alert(1)">hi</p><script></script>'}
      />
    );

    const paragraph = screen.container.querySelector('.mawy-md-html p');

    expect(paragraph).not.toBeNull();
    expect(paragraph?.getAttribute('onclick')).toBeNull();
    expect(paragraph?.getAttribute('class')).toBe('k');
    expect(screen.container.querySelector('script')).toBeNull();
  });

  it('drops a script and everything in it, however it is wrapped', async () => {
    const screen = await render(
      <MawyViewer
        html="sanitize"
        value={'<div><script>alert(1)</script></div><nope><script>alert(2)</script></nope>'}
      />
    );

    // Not merely "no `<script>` element": an unwrapped one would put its own
    // source on the page as a line of visible text.
    expect(screen.container.querySelector('script')).toBeNull();
    expect(screen.container.textContent).not.toContain('alert(1)');
    expect(screen.container.textContent).not.toContain('alert(2)');
  });

  it('strips an attribute it does not allow, and one whose URL it will not follow', async () => {
    const screen = await render(
      <MawyViewer
        html="sanitize"
        value={'<img src="/a.png" srcset="/a.png 1x" style="position:fixed" alt="a">'}
      />
    );

    const image = screen.container.querySelector('.mawy-md-html img');

    expect(image?.getAttribute('src')).toBe('/a.png');
    expect(image?.getAttribute('alt')).toBe('a');
    expect(image?.hasAttribute('srcset')).toBe(false);
    expect(image?.hasAttribute('style')).toBe(false);
  });

  it('draws raw HTML as written only when told to', async () => {
    const screen = await render(<MawyViewer html="raw" value={'<p id="wrote">hi</p>'} />);

    expect(screen.container.querySelector('#wrote')).not.toBeNull();
  });
});

/**
 * A picture the document points at, and who fetches it.
 *
 * Which URLs an application is willing to reach for is not a viewer's decision
 * to make — a document from somewhere else has somebody else's URLs in it, and
 * fetching them all without asking tells whoever wrote them which documents are
 * being read.
 */
describe('images', () => {
  it('writes an `img` on its own, with what the document said about it', async () => {
    const screen = await render(<MawyViewer value={'![a cat](/c.png "Mine")'} />);
    const image = screen.container.querySelector('img') as HTMLImageElement;

    expect(image.getAttribute('src')).toBe('/c.png');
    expect(image.getAttribute('alt')).toBe('a cat');
    expect(image.getAttribute('title')).toBe('Mine');
  });

  it('hands the picture over where the application says how to draw one', async () => {
    const asked: { src: string; alt: string; title: string | null }[] = [];
    const Mine = (props: { src: string; alt: string; title: string | null }) => {
      asked.push(props);

      return <span data-mine={props.src}>{props.alt}</span>;
    };

    const screen = await render(<MawyViewer value={'![a cat](/c.png "Mine")'} image={Mine} />);

    expect(asked).toEqual([{ src: '/c.png', alt: 'a cat', title: 'Mine' }]);
    expect(screen.container.querySelector('[data-mine="/c.png"]')).not.toBeNull();
    // And nothing was fetched behind its back.
    expect(screen.container.querySelector('img')).toBeNull();
  });

  it('never hands over a URL the scheme allowlist refused', async () => {
    const asked: string[] = [];
    const Mine = ({ src }: { src: string }) => {
      asked.push(src);

      return <span />;
    };

    const screen = await render(<MawyViewer value="![a cat](javascript:alert(1))" image={Mine} />);

    expect(asked).toEqual([]);
    await expect.element(screen.getByText('a cat')).toBeInTheDocument();
  });
});

describe('with no document', () => {
  it('offers to open a file', async () => {
    const screen = await render(<MawyViewer />);

    await expect.element(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument();
  });

  it('opens a file that is dropped on it', async () => {
    const onValueChange = vi.fn();
    const screen = await render(<MawyViewer onValueChange={onValueChange} />);
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    const transfer = new DataTransfer();
    transfer.items.add(new File(['# Dropped'], 'note.md', { type: 'text/markdown' }));
    root.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));

    await expect.element(screen.getByRole('heading', { name: 'Dropped' })).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith('# Dropped', expect.any(File));
  });

  it('leaves a controlled document to the application', async () => {
    const onValueChange = vi.fn();
    const screen = await render(<MawyViewer value="# Kept" onValueChange={onValueChange} />);
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    const transfer = new DataTransfer();
    transfer.items.add(new File(['# Dropped'], 'note.md'));
    root.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));

    // `fileDrop` defaults to off when the value is the application's, so the
    // drop does nothing at all — not even a callback.
    await expect.element(screen.getByRole('heading', { name: 'Kept' })).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('renders whatever the application would rather show instead', async () => {
    const screen = await render(<MawyViewer empty={<p>Nothing here</p>} />);

    await expect.element(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('offers nothing to open when a file opened here would go nowhere', async () => {
    const screen = await render(<MawyViewer value="" toolbar={['open']} />);

    // The document is the application's and there is no `onValueChange`, so a
    // chosen file has nothing to become. A control that cannot do what it says
    // is worse than no control — this is what the editor's preview of an empty
    // document was drawing.
    await expect.element(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
    expect(screen.container.querySelector('.mawy-empty-action')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open a file' }).element()).toBeDisabled();
  });
});

describe('the toolbar', () => {
  it('draws every control by default, and none when turned off', async () => {
    const all = await render(<MawyViewer value={SAMPLE} />);

    await expect.element(all.getByRole('toolbar')).toBeInTheDocument();
    expect(all.container.querySelectorAll('.mawy-toolbar-controls .mawy-button')).toHaveLength(10);

    const none = await render(<MawyViewer value={SAMPLE} toolbar={false} />);

    expect(none.container.querySelector('.mawy-toolbar')).toBeNull();
  });

  it('draws exactly the controls it was given, in that order', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['colorScheme', 'copy']} />);
    const labels = [
      ...screen.container.querySelectorAll('.mawy-toolbar-controls .mawy-button')
    ].map((button) => button.getAttribute('aria-label'));

    expect(labels).toEqual(['Theme', 'Copy the Markdown']);
  });

  it('speaks the locale it was given', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} locale="ko" toolbar={['outline']} />);

    await expect.element(screen.getByRole('button', { name: '목차' })).toBeInTheDocument();
  });

  it('is one tab stop, with the arrows moving inside it', async () => {
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={['colorScheme', 'outline', 'copy']} />
    );
    const buttons = [
      ...screen.container.querySelectorAll<HTMLButtonElement>('.mawy-toolbar-controls .mawy-button')
    ];

    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);

    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('changes the theme through its menu, and shuts it again', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['colorScheme']} />);
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    expect(root.dataset.mawyColorScheme).toBe('system');

    await screen.getByRole('button', { name: 'Theme' }).click();
    await screen.getByRole('radio', { name: 'Dark' }).click();

    expect(root.dataset.mawyColorScheme).toBe('dark');
    // Picking one is the end of what the panel was opened for, and a panel
    // still standing over the thing it has just changed is a panel hiding the
    // answer to the question it was asked.
    await expect.element(screen.getByRole('group')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Theme' }).element());
  });

  it('keeps a menu open while a slider inside it is being moved', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['fontSize']} />);

    await screen.getByRole('button', { name: 'Text size' }).click();

    const slider = screen.getByRole('slider').element() as HTMLInputElement;

    slider.value = '21';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    // A size is arrived at by moving it, and a panel that shut on the first
    // step would have to be reopened for the second.
    await expect.element(screen.getByRole('group')).toBeInTheDocument();
  });

  it('sets the document type from the typography controls', async () => {
    const onTypographyChange = vi.fn();
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={['fontFamily']} onTypographyChange={onTypographyChange} />
    );
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    await screen.getByRole('button', { name: 'Typeface' }).click();
    await screen.getByRole('radio', { name: 'Serif', exact: true }).click();

    expect(root.style.getPropertyValue('--mawy-doc-font')).toBe('var(--mawy-font-serif)');
    expect(onTypographyChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontFamily: 'serif' })
    );
  });

  it('starts from the typography it was given', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} defaultTypography={{ fontSize: 21 }} />);
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    expect(root.style.getPropertyValue('--mawy-doc-size')).toBe('21px');
    // Everything left out keeps its default rather than being dropped.
    expect(root.style.getPropertyValue('--mawy-doc-line-height')).toBe('1.7');
  });

  it('shuts a menu on Escape', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['colorScheme']} />);

    await screen.getByRole('button', { name: 'Theme' }).click();
    await expect.element(screen.getByRole('group')).toBeInTheDocument();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect.element(screen.getByRole('group')).not.toBeInTheDocument();
  });
});

/**
 * Finding, in a document rather than in its source.
 *
 * What is searched is what the page draws — `text` inside a `**strong**` is
 * found by looking for `text`, not by looking for the asterisks — which is the
 * whole difference between this bar and the editor's.
 */
describe('finding', () => {
  const findField = (screen: { container: HTMLElement }) =>
    screen.container.querySelector('.mawy-find-input') as HTMLInputElement;

  /** Typed into rather than assigned to. See the editor's tests. */
  const type = (field: HTMLInputElement, text: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const open = async (screen: { container: HTMLElement }) => {
    (screen.container.querySelector('button[data-mawy-tip="Find"]') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(screen.container.querySelector('.mawy-find')).not.toBe(null));
  };

  it('marks every match in the drawn text, and the one it is on apart', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);

    await open(screen);

    type(findField(screen), 'a');

    await vi.waitFor(() => {
      const hits = screen.container.querySelectorAll('.mawy-md .mawy-find-hit');

      expect(hits.length).toBeGreaterThan(1);
      expect([...hits].filter((hit) => hit.hasAttribute('data-mawy-current')).length).toBe(1);
    });
  });

  it('finds a word the markup had split the source of', async () => {
    const screen = await render(<MawyViewer value="A **strong** word." />);

    await open(screen);

    type(findField(screen), 'strong');

    // One match, inside the `<strong>` rather than beside the asterisks that
    // are not on the page at all.
    await vi.waitFor(() => {
      const hits = screen.container.querySelectorAll('.mawy-md .mawy-find-hit');

      expect(hits.length).toBe(1);
      expect(hits[0].closest('strong')).not.toBe(null);
    });

    expect(screen.container.querySelector('.mawy-find-count')?.textContent).toBe('1 of 1');
  });

  it('does not find the markup itself', async () => {
    const screen = await render(<MawyViewer value="A **strong** word." />);

    await open(screen);

    type(findField(screen), '**');

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-find-count')?.textContent).toBe('No matches')
    );
  });

  it('steps on Enter, keeping the keyboard in the field', async () => {
    const screen = await render(<MawyViewer value="one two one two one" />);

    await open(screen);

    const field = findField(screen);

    type(field, 'one');

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-find-count')?.textContent).toBe('1 of 3')
    );

    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-find-count')?.textContent).toBe('2 of 3')
    );

    expect(document.activeElement).toBe(field);
  });

  it('offers nothing to replace with', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);

    await open(screen);

    // One row and one field: a viewer has nothing to put anything in place of.
    expect(screen.container.querySelectorAll('.mawy-find-row').length).toBe(1);
  });

  it('opens on the shortcut, and not where the toolbar left it out', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} />);
    const scroll = screen.container.querySelector('.mawy-viewer-scroll') as HTMLElement;

    scroll.focus();
    scroll.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => expect(screen.container.querySelector('.mawy-find')).not.toBe(null));

    const without = await render(<MawyViewer value={SAMPLE} toolbar={['copy']} />);
    const quiet = without.container.querySelector('.mawy-viewer-scroll') as HTMLElement;

    quiet.focus();
    quiet.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true, cancelable: true })
    );

    expect(without.container.querySelector('.mawy-find')).toBe(null);
  });
});

describe('typefaces', () => {
  const links = () => [...document.querySelectorAll('link[data-mawy-font]')];

  // Which quote goes around a family name is the browser's to choose, and the
  // three do not agree: WebKit rewrites `'` as `"` on the way back out of a
  // custom property, and Firefox keeps the quotes that Chromium and WebKit drop
  // off a `font-family`. The stack is what is being checked, not the
  // punctuation, so the punctuation goes.
  const unquoted = (value: string) => value.replace(/['"]/g, '');

  it('offers the three the machine already has, and fetches nothing', async () => {
    const before = links().length;
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['fontFamily']} />);

    await screen.getByRole('button', { name: 'Typeface' }).click();

    const options = [...screen.container.querySelectorAll('[role="radio"]')].map(
      (option) => option.textContent
    );

    expect(options).toEqual(['Sans serif', 'Serif', 'Monospace']);
    // The default list is the whole of the privacy story: no `href`, no request.
    expect(MAWY_SYSTEM_FONTS.some((font) => font.href)).toBe(false);
    expect(links()).toHaveLength(before);
  });

  it('lists the fonts it was given, and sets the document in the one chosen', async () => {
    const fonts = [{ id: 'sans' }, { id: 'quire', label: 'Quire', stack: "'Quire', serif" }];
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={['fontFamily']} fonts={fonts} />
    );
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    await screen.getByRole('button', { name: 'Typeface' }).click();
    await screen.getByRole('radio', { name: 'Quire' }).click();

    expect(unquoted(root.style.getPropertyValue('--mawy-doc-font'))).toBe('Quire, serif');
  });

  it('shows every name in its own face', async () => {
    const fonts = [{ id: 'quire', label: 'Quire', stack: "'Quire', serif" }];
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={['fontFamily']} fonts={fonts} />
    );

    await screen.getByRole('button', { name: 'Typeface' }).click();

    const option = screen.container.querySelector('[role="radio"]') as HTMLElement;

    expect(unquoted(option.style.fontFamily)).toBe('Quire, serif');
  });

  it('fetches a web font once the document is set in it', async () => {
    const href = 'data:text/css,/* chosen */';
    const fonts = [{ id: 'chosen', label: 'Chosen', stack: "'Chosen'", href }];

    expect(links().some((link) => link.getAttribute('href') === href)).toBe(false);

    await render(
      <MawyViewer
        value={SAMPLE}
        toolbar={false}
        fonts={fonts}
        defaultTypography={{ fontFamily: 'chosen' }}
      />
    );

    expect(links().filter((link) => link.getAttribute('href') === href)).toHaveLength(1);
  });

  it('fetches the rest only when the menu that shows them is opened', async () => {
    const href = 'data:text/css,/* offered */';
    const fonts = [{ id: 'sans' }, { id: 'offered', label: 'Offered', stack: "'Offered'", href }];
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={['fontFamily']} fonts={fonts} />
    );

    // Offered but not chosen: a reader who never opens the menu never asks.
    expect(links().some((link) => link.getAttribute('href') === href)).toBe(false);

    await screen.getByRole('button', { name: 'Typeface' }).click();

    expect(links().filter((link) => link.getAttribute('href') === href)).toHaveLength(1);
  });

  it('asks for a font without telling its host which page wanted it', async () => {
    const href = 'data:text/css,/* private */';
    const fonts = [{ id: 'private', label: 'Private', stack: "'Private'", href }];

    await render(
      <MawyViewer value={SAMPLE} fonts={fonts} typography={{ fontFamily: 'private' }} />
    );

    const link = links().find((each) => each.getAttribute('href') === href);

    // Which page a reader has open is the reader's business, and a font host
    // needs none of it to answer with a stylesheet.
    expect(link?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('falls back to the first font offered when the chosen one is not on the list', async () => {
    const fonts = [{ id: 'quire', label: 'Quire', stack: "'Quire', serif" }];
    const screen = await render(
      <MawyViewer value={SAMPLE} fonts={fonts} defaultTypography={{ fontFamily: 'gone' }} />
    );
    const root = screen.container.querySelector('.mawy-viewer') as HTMLElement;

    expect(unquoted(root.style.getPropertyValue('--mawy-doc-font'))).toBe('Quire, serif');
  });

  it('ships a catalogue that is all open-licensed and all over https', () => {
    expect(MAWY_WEB_FONTS.length).toBeGreaterThan(8);

    for (const font of MAWY_WEB_FONTS) {
      expect(font.label, `${font.id} has a label`).toBeTruthy();
      expect(font.stack, `${font.id} has a stack`).toBeTruthy();
      expect(font.href, `${font.id} has an href`).toMatch(/^https:\/\//);
    }

    // Ids are what `fontFamily` is set to, so two the same is one unreachable.
    const ids = MAWY_WEB_FONTS.map((font) => font.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('copying', () => {
  it('puts the Markdown source on the clipboard, not the rendering', async () => {
    const written: string[] = [];
    const clipboard = navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          written.push(text);

          return Promise.resolve();
        }
      }
    });

    try {
      const screen = await render(<MawyViewer value="# Title" toolbar={['copy']} />);

      await screen.getByRole('button', { name: 'Copy the Markdown' }).click();
      await expect.element(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
      expect(written).toEqual(['# Title']);
    } finally {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    }
  });

  it('has nothing to copy when there is no document', async () => {
    const screen = await render(<MawyViewer toolbar={['copy']} />);

    await expect.element(screen.getByRole('button', { name: 'Copy the Markdown' })).toBeDisabled();
  });
});

/**
 * Footnotes, which are the one thing on the page whose place is the renderer's
 * decision rather than the document's: a footnote is written wherever it suited
 * the author and read at the bottom.
 */
describe('footnotes', () => {
  const NOTED = [
    'A sentence.[^one] Another.[^two] The first again.[^one]',
    '',
    '[^one]: The first note.',
    '',
    '[^two]: The second note.'
  ].join('\n');

  it('draws the mentions as numbers and the notes underneath', async () => {
    const screen = await render(<MawyViewer value={NOTED} toolbar={false} />);
    const marks = [...screen.container.querySelectorAll('.mawy-md-footnote-ref')];

    expect(marks.map((mark) => mark.textContent)).toEqual(['1', '2', '1']);
    expect(
      [...screen.container.querySelectorAll('.mawy-md-footnotes li p')].map(
        (note) => note.textContent
      )
    ).toEqual(['The first note.', 'The second note.']);
  });

  it('points the mention and the note at each other', async () => {
    const screen = await render(<MawyViewer value={NOTED} toolbar={false} />);
    const [first] = [...screen.container.querySelectorAll('.mawy-md-footnote-ref a')];
    const note = screen.container.querySelector(first.getAttribute('href') as string);

    expect(note).toBeTruthy();
    expect(note?.querySelector('.mawy-md-footnote-back')?.getAttribute('href')?.slice(1)).toBe(
      first.id
    );
  });

  it('gives the second mention of one note an id of its own', async () => {
    // Two elements with the same `id` is a link that lands on whichever the
    // browser met first.
    const screen = await render(<MawyViewer value={NOTED} toolbar={false} />);
    const ids = [...screen.container.querySelectorAll('.mawy-md-footnote-ref a')].map(
      (mark) => mark.id
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws nothing at all for a document with no footnotes in it', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={false} />);

    expect(screen.container.querySelector('.mawy-md-footnotes')).toBe(null);
  });

  it('says where every part of a note came from', async () => {
    const screen = await render(<MawyViewer value={NOTED} toolbar={false} />);
    const note = screen.container.querySelector('.mawy-md-footnotes li') as HTMLElement;
    const [start, end] = (note.dataset.mawyRange ?? '').split(',').map(Number);

    expect(NOTED.slice(start, end)).toBe('[^one]: The first note.');
  });
});

/**
 * A term and what it means.
 */
describe('definition lists', () => {
  it('draws a term and its meaning as one', async () => {
    const screen = await render(
      <MawyViewer value={'Markdown\n: A way of writing.'} toolbar={false} />
    );

    expect(screen.container.querySelector('dl')?.className).toBe('mawy-md-definitions');
    expect(screen.container.querySelector('dt')?.textContent).toBe('Markdown');
    expect(screen.container.querySelector('dd')?.textContent).toBe('A way of writing.');
    // Tight, so the meaning is the words rather than a paragraph around them.
    expect(screen.container.querySelector('dd p')).toBe(null);
  });

  it('wraps a loose one in paragraphs, the way a loose bullet list is wrapped', async () => {
    const screen = await render(
      <MawyViewer value={'Markdown\n\n: A way of writing.'} toolbar={false} />
    );

    expect(screen.container.querySelector('dd p')?.textContent).toBe('A way of writing.');
  });

  it('is a paragraph when the option is off', async () => {
    const screen = await render(
      <MawyViewer
        value={'Markdown\n: A way of writing.'}
        toolbar={false}
        parse={{ definitionLists: false }}
      />
    );

    expect(screen.container.querySelector('dl')).toBe(null);
    expect(screen.container.querySelector('p')?.textContent).toBe('Markdown\n: A way of writing.');
  });
});

/**
 * Colouring a code block, which the viewer does not do on its own.
 *
 * A highlighter is the largest thing a Markdown renderer can be made to carry
 * and most documents have nothing in them to colour, so it is a prop — and a
 * prop that may be a *function*, called only when a document turns out to have
 * a language on a fence.
 */
describe('highlighting', () => {
  /** A highlighter that colours the word it was told to and nothing else. */
  const wordSpotter = (word: string): MawyHighlighter => ({
    supports: (language) => language === 'ts',
    highlight: (code) =>
      code
        .split(new RegExp(`(${word})`))
        .filter(Boolean)
        .map((text) => ({ text, kind: text === word ? ('keyword' as const) : null }))
  });

  it('draws a code block plain when nobody offered to colour one', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={false} />);

    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
    expect(screen.container.querySelector('.mawy-hl-keyword')).toBe(null);
  });

  it('draws the tokens a highlighter hands back', async () => {
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={false} highlight={wordSpotter('const')} />
    );

    expect(screen.container.querySelector('.mawy-hl-keyword')?.textContent).toBe('const');
    // The code is still the code: what is drawn joins back into exactly what
    // the document said.
    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
  });

  it('says where a coloured piece of the code came from', async () => {
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={false} highlight={wordSpotter('const')} />
    );
    const range = screen.container
      .querySelector('.mawy-hl-keyword')
      ?.getAttribute('data-mawy-range');
    const [start, end] = (range ?? '').split(',').map(Number);

    expect(SAMPLE.slice(start, end)).toBe('const');
  });

  it('leaves a language it was told nothing about alone', async () => {
    const screen = await render(
      <MawyViewer
        value={['```rust', 'const a = 1;', '```'].join('\n')}
        toolbar={false}
        highlight={wordSpotter('const')}
      />
    );

    expect(screen.container.querySelector('.mawy-hl-keyword')).toBe(null);
  });

  it('throws the tokens away when they are not the code any more', async () => {
    // Colour is not worth a page that says something the document does not.
    const liar: MawyHighlighter = {
      supports: () => true,
      highlight: () => [{ text: 'something else entirely', kind: 'keyword' }]
    };
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={false} highlight={liar} />);

    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
    expect(screen.container.querySelector('.mawy-hl-keyword')).toBe(null);
  });

  it('draws a kind it has never heard of as the text it is', async () => {
    const inventive = {
      supports: () => true,
      highlight: (code: string) => [{ text: code, kind: 'onload=alert(1)' }]
    } as unknown as MawyHighlighter;
    const screen = await render(
      <MawyViewer value={SAMPLE} toolbar={false} highlight={inventive} />
    );

    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
    expect(screen.container.querySelector('.mawy-md-lang span')).toBe(null);
  });

  it('keeps drawing when a highlighter throws', async () => {
    const broken: MawyHighlighter = {
      supports: () => true,
      highlight: () => {
        throw new Error('no');
      }
    };
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={false} highlight={broken} />);

    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
  });

  it('draws plain until one that answers later has answered', async () => {
    let answer: (tokens: MawyCodeToken[]) => void = () => {};
    const slow: MawyHighlighter = {
      supports: () => true,
      highlight: () => new Promise<MawyCodeToken[]>((resolve) => (answer = resolve))
    };
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={false} highlight={slow} />);

    expect(screen.container.querySelector('.mawy-md-lang')?.textContent).toBe('const a = 1;');
    expect(screen.container.querySelector('.mawy-hl-string')).toBe(null);

    answer([{ text: 'const a = 1;', kind: 'string' }]);

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-hl-string')?.textContent).toBe('const a = 1;')
    );
  });

  it('fetches one only when a document has a language on a fence', async () => {
    const fetched = vi.fn(async () => wordSpotter('const'));

    const prose = await render(
      <MawyViewer
        value={'Just words.\n\n```\nno language\n```'}
        toolbar={false}
        highlight={fetched}
      />
    );

    expect(prose.container.querySelector('.mawy-md-lang')).toBeTruthy();
    expect(fetched).not.toHaveBeenCalled();

    const withCode = await render(
      <MawyViewer value={SAMPLE} toolbar={false} highlight={fetched} />
    );

    await vi.waitFor(() =>
      expect(withCode.container.querySelector('.mawy-hl-keyword')?.textContent).toBe('const')
    );
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  /**
   * `highlight={() => import('mawy-react/highlight')}` written in the JSX is a
   * different function on every render, which is how an application actually
   * writes it — and asking again for each of them is a request per render for
   * the largest thing this package can be made to carry.
   */
  it('asks once even when the loader is a new function every render', async () => {
    const asked = vi.fn(async () => wordSpotter('const'));

    function Host() {
      const [count, again] = React.useState(0);

      return (
        <>
          <button type="button" onClick={() => again(count + 1)}>
            again
          </button>
          <MawyViewer value={SAMPLE} toolbar={false} highlight={() => asked()} />
        </>
      );
    }

    const screen = await render(<Host />);
    const button = screen.container.querySelector('button') as HTMLButtonElement;

    await vi.waitFor(() =>
      expect(screen.container.querySelector('.mawy-hl-keyword')?.textContent).toBe('const')
    );

    button.click();
    button.click();

    await vi.waitFor(() => expect(screen.container.textContent).toContain('const'));
    expect(asked).toHaveBeenCalledTimes(1);
  });

  it('finds a fence inside a list or a quotation too', async () => {
    const fetched = vi.fn(async () => wordSpotter('const'));

    await render(
      <MawyViewer
        value={'- one\n\n  ```ts\n  const a = 1;\n  ```'}
        toolbar={false}
        highlight={fetched}
      />
    );

    await vi.waitFor(() => expect(fetched).toHaveBeenCalled());
  });
});

/**
 * Directives, which are the way a document carries something this package has
 * never heard of.
 *
 * The library's part is small on purpose: read the shape, hand it over, and
 * show the characters the author typed when nobody claimed the name. What is
 * worth checking here is that the handing over is complete — a component gets
 * the attributes, the label and the blocks already drawn, so it never has to
 * parse anything or be given a string of HTML.
 */
describe('directives', () => {
  const Callout = ({ attributes, label, children }: MawyDirectiveProps) => (
    <section data-kind={attributes.kind}>
      <h3>{label}</h3>
      {children}
    </section>
  );

  it('hands a container to the component registered for the name', async () => {
    const screen = await render(
      <MawyViewer
        value={':::callout[Careful]{kind=warning}\nBody **text**.\n:::'}
        toolbar={false}
        directives={{ callout: Callout }}
      />
    );
    const section = screen.container.querySelector('section') as HTMLElement;

    expect(section.dataset.kind).toBe('warning');
    expect(section.querySelector('h3')?.textContent).toBe('Careful');
    expect(section.querySelector('p')?.textContent).toBe('Body text.');
    expect(section.querySelector('strong')?.textContent).toBe('text');
  });

  it('draws one inside a sentence, in the sentence', async () => {
    const Kbd = ({ label }: MawyDirectiveProps) => <kbd>{label}</kbd>;
    const screen = await render(
      <MawyViewer value="Press :kbd[Ctrl] to go." toolbar={false} directives={{ kbd: Kbd }} />
    );

    expect(screen.container.querySelector('p')?.textContent).toBe('Press Ctrl to go.');
    expect(screen.container.querySelector('kbd')?.textContent).toBe('Ctrl');
  });

  it('tells the component which shape it was written in, and where', async () => {
    const seen: MawyDirectiveProps[] = [];
    const Spy = (props: MawyDirectiveProps) => {
      seen.push(props);

      return null;
    };
    const value = '::a{x=1}\n\n:::b\nBody.\n:::';

    await render(<MawyViewer value={value} toolbar={false} directives={{ a: Spy, b: Spy }} />);

    expect(seen.map((props) => props.kind)).toEqual(['leaf', 'container']);
    expect(seen[0].attributes).toEqual({ x: '1' });
    expect(seen[0].label).toBe(null);
    expect(value.slice(seen[1].range.start, seen[1].range.end)).toBe(':::b\nBody.\n:::');
    expect(seen[0].source).toBe('::a{x=1}');
  });

  it('shows a name nobody claimed as the characters it was written with', async () => {
    const screen = await render(<MawyViewer value={'::video{src=/a.mp4}'} toolbar={false} />);
    const shown = screen.container.querySelector('.mawy-md-directive-source') as HTMLElement;

    expect(shown.textContent).toBe('::video{src=/a.mp4}');
    // Nothing is lost and nothing is invented: the same answer raw HTML gets
    // under the default policy.
    expect(screen.container.querySelector('video')).toBe(null);
  });

  /**
   * A name that is a property of every object is still a name nobody claimed.
   *
   * `constructor` and `toString` are both spelled the way a directive is, and
   * an ordinary object literal answers for both — with something off
   * `Object.prototype`, which React would have called as a component. The
   * document would have been choosing what runs.
   */
  it('does not find a name the registry only inherited', async () => {
    const Callout = () => <section />;
    const screen = await render(
      <MawyViewer
        value={'::constructor\n\n:::toString\nBody.\n:::\n\nA :valueOf[x] sentence.'}
        toolbar={false}
        directives={{ callout: Callout }}
      />
    );
    const shown = [...screen.container.querySelectorAll('.mawy-md-directive-source')].map(
      (element) => element.textContent
    );

    expect(shown).toEqual(['::constructor', ':::toString\nBody.\n:::', ':valueOf[x]']);
    expect(screen.container.querySelector('section')).toBe(null);
  });

  it('says where an unclaimed one came from, like everything else it draws', async () => {
    const value = 'Before.\n\n::video{src=/a.mp4}';
    const screen = await render(<MawyViewer value={value} toolbar={false} />);
    const range = screen.container
      .querySelector('.mawy-md-directive-source')
      ?.getAttribute('data-mawy-range');
    const [start, end] = (range ?? '').split(',').map(Number);

    expect(value.slice(start, end)).toBe('::video{src=/a.mp4}');
  });

  it('cannot be used to put markup on the page', async () => {
    const screen = await render(
      <MawyViewer value={'::a{x="<img src=x onerror=alert(1)>"}'} toolbar={false} />
    );

    expect(screen.container.querySelector('img')).toBe(null);
    expect(screen.container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('the outline', () => {
  it('lists the headings and jumps to one', async () => {
    const screen = await render(<MawyViewer value={SAMPLE} toolbar={['outline']} />);

    await screen.getByRole('button', { name: 'Contents' }).click();

    const link = screen.getByRole('button', { name: 'Second' });
    await expect.element(link).toBeInTheDocument();

    await link.click();

    expect(document.activeElement?.id).toBe('second');
    // Somewhere the focus can be put, drawn that way rather than made that way
    // by writing into a tree React owns — and still not a stop on the way
    // anywhere, which is what `-1` says.
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
  });

  it('says so when there is nothing to list', async () => {
    const screen = await render(<MawyViewer value="just a paragraph" toolbar={['outline']} />);

    await screen.getByRole('button', { name: 'Contents' }).click();

    await expect.element(screen.getByText('This document has no headings.')).toBeInTheDocument();
  });

  it('marks the entry that was pressed, and not whatever the scroll passed', async () => {
    const document_ = `# One\n\n${'Words. '.repeat(200)}\n\n## Two\n\nMore.\n\n## Three\n\nLast.`;
    const screen = await render(
      <MawyViewer value={document_} toolbar={['outline']} style={{ height: '20rem' }} />
    );

    await screen.getByRole('button', { name: 'Contents' }).click();
    await screen.getByRole('button', { name: 'Three' }).click();

    const scroller = screen.container.querySelector('.mawy-viewer-scroll') as HTMLElement;
    const marked = () => screen.container.querySelector('[aria-current="location"]')?.textContent;
    // The measuring is one frame behind a scroll, so a check that has not waited
    // for it is a check that passes either way.
    const settled = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

    // Where the scroll is on the way to the heading, and where the last heading
    // of a document leaves it, are both somewhere else. What was pressed is not
    // measured, so neither of those can take the mark off it.
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event('scroll'));
    await settled();

    expect(marked()).toBe('Three');

    // Until the reader goes somewhere of their own.
    scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
    scroller.dispatchEvent(new Event('scroll'));

    await vi.waitFor(() => expect(marked()).toBe('One'));
  });
});
