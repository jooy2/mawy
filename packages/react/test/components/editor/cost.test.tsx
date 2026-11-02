import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MawyEditor, type MawyMode } from 'mawy-react';
import { parseMarkdown } from '../../../src/internal/markdown/parse.js';
import '../../../src/styles.css';

// The real parser, with its calls counted.
vi.mock('../../../src/internal/markdown/parse.js', { spy: true });

/**
 * What a key costs, counted rather than timed.
 *
 * A time depends on the machine, and a test that reads one either fails on a
 * busy runner or is loose enough to pass whatever happens. A count is the same
 * everywhere. Two of them say most of what a key costs on a long document: how
 * many times the whole text was read, and how much of the page was touched.
 * Reading it again for every question anyone had about it took a key on a 300
 * kilobyte document from fifty milliseconds to two hundred and seventy, and
 * nothing failed.
 *
 * The document has a table and a fence on purpose. Without either, `tableRangeAt`
 * and `fencedAt` return before they read anything, and this would be counting
 * the document that costs least.
 */
const paragraphs = Array.from(
  { length: 60 },
  (_, index) => `Paragraph ${index} with **bold** and \`code\` in it.`
).join('\n\n');
const DOCUMENT = `# Title\n\n| a | b |\n| - | - |\n| c | d |\n\n\`\`\`ts\nconst a = 1;\n\`\`\`\n\n${paragraphs}\n`;

/** Long enough for an effect or a deferred render to have happened. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 80));
const parses = () => vi.mocked(parseMarkdown).mock.calls.length;

/** Each test its own text, because the last few readings outlive an editor. */
let run = 0;

/** The surface, with the caret on a paragraph in the middle of the document. */
async function editing(
  mode: MawyMode,
  props: Partial<React.ComponentProps<typeof MawyEditor>> = {}
) {
  run += 1;

  const screen = await render(
    <MawyEditor
      defaultValue={`Run ${run}.\n\n${DOCUMENT}`}
      mode={mode}
      style={{ height: 500 }}
      {...props}
    />
  );

  if (mode === 'wysiwyg') {
    const target = screen.container.querySelectorAll('.mawy-document-body > p')[30];

    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    await userEvent.click(target);
  } else {
    const area = screen.container.querySelector('textarea') as HTMLTextAreaElement;

    area.focus();
    area.setSelectionRange(DOCUMENT.length >> 1, DOCUMENT.length >> 1);
  }

  await settled();

  return screen;
}

describe('the text is read once for each text there is', () => {
  beforeEach(() => {
    vi.mocked(parseMarkdown).mockClear();
  });

  it.each<MawyMode>(['wysiwyg', 'plain', 'split'])('on %s, a key reads it once', async (mode) => {
    await editing(mode);

    for (const key of ['a', 'b', 'c']) {
      vi.mocked(parseMarkdown).mockClear();
      await userEvent.keyboard(key);
      await settled();

      expect(parses()).toBe(1);
    }
  });

  it.each<MawyMode>(['wysiwyg', 'plain', 'split'])(
    'on %s, a caret that moved reads nothing',
    async (mode) => {
      await editing(mode);
      vi.mocked(parseMarkdown).mockClear();

      for (let step = 0; step < 3; step += 1) {
        await userEvent.keyboard('{ArrowLeft}');
        await settled();
      }

      expect(parses()).toBe(0);
    }
  );

  it('reads it once for options an application gave as well as for none', async () => {
    await editing('wysiwyg', { parse: { breaks: true } });
    vi.mocked(parseMarkdown).mockClear();
    await userEvent.keyboard('a');
    await settled();

    // Twice, because `breaks` is what the page is drawn with and the commands
    // read the document the way every other Markdown reader would.
    expect(parses()).toBe(2);
  });
});

describe('a key touches what it changed', () => {
  /** What changed under the document while this ran. */
  async function touched(body: Element, run: () => Promise<void>) {
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));

    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true
    });
    await run();
    await settled();
    observer.disconnect();

    return records;
  }

  it('adds and removes next to nothing on the page', async () => {
    const screen = await editing('wysiwyg');
    const body = screen.container.querySelector('.mawy-document-body') as HTMLElement;
    const records = await touched(body, () => userEvent.keyboard('a'));
    const nodes = records.filter((record) => record.type === 'childList');
    const attributes = new Set(records.flatMap((record) => record.attributeName ?? []));

    // A whole-document redraw would be every block in here.
    expect(nodes.length).toBeLessThanOrEqual(2);
    // Every block behind the caret has moved along by one, which is the one
    // thing a key does to the whole page: the offsets are in the attributes.
    expect([...attributes]).toEqual(['data-mawy-range']);
  });

  it('touches nothing at all when only the caret moved', async () => {
    const screen = await editing('wysiwyg');
    const body = screen.container.querySelector('.mawy-document-body') as HTMLElement;
    const records = await touched(body, () => userEvent.keyboard('{ArrowLeft}'));

    expect(records).toEqual([]);
  });
});
