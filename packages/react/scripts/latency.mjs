/**
 * What a key costs on a long document, from the key to the frame after it.
 *
 * This is a report and deliberately not a gate. A number of milliseconds belongs
 * to the machine it was read on, and a shared runner is a different machine from
 * one minute to the next, so a limit either fails for no reason or is loose
 * enough to mean nothing. What can fail a change is counted instead: reads of
 * the text and writes to the page in `test/components/editor/cost.test.tsx`, and
 * how the parser grows in `test/internal/markdown/slow.test.ts`. This is here to
 * show how long those counts take, so a change that moves them can be read
 * against the last run.
 *
 * Three things make the number one somebody would feel:
 *
 * - **React is the production build.** The test suite runs the development
 *   build, which spends more time checking than this measures.
 * - **The keys are real keys**, sent through the browser's input pipeline, and
 *   the clock stops after the frame that shows them rather than when the handler
 *   returns: style, layout and paint are part of the wait.
 * - **The documents are this repository's own**, cut to length, because a
 *   generated document has none of the shapes a real one is slow on.
 *
 * Run `npm run latency`. On CI the table also goes to the job's summary.
 */
/* global document, window */
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(root, '../..');

/** The lengths a document is measured at, in characters. */
const LENGTHS = [10_000, 100_000, 300_000];
const SURFACES = ['wysiwyg', 'plain', 'split'];
const KEYS = 24;

/** Real documents, joined and repeated until they are long enough. */
const WRITING = [
  'docs/en/guide/editor.md',
  'docs/en/guide/viewer.md',
  'docs/en/guide/getting-started.md',
  'packages/react/CHANGELOG.md',
  'README.md',
  'CONTRIBUTING.md'
]
  .map((path) => readFileSync(resolve(repository, path), 'utf8'))
  .join('\n\n');

const cut = (length) => {
  const text = WRITING.repeat(Math.ceil(length / WRITING.length)).slice(0, length);

  return text.slice(0, text.lastIndexOf('\n\n') + 1);
};

/** The page's half, which mounts a surface and stops a clock after a frame. */
const PAGE = `
  import * as React from 'react';
  import { flushSync } from 'react-dom';
  import { createRoot } from 'react-dom/client';
  import { MawyEditor, MawyViewer } from './src/index.ts';

  const afterFrame = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        const channel = new MessageChannel();

        channel.port1.onmessage = () => resolve(performance.now());
        channel.port2.postMessage(0);
      });
    });
  const waits = [];
  const clock = () => {
    const started = performance.now();

    afterFrame().then((ended) => waits.push(ended - started));
  };

  window.latency = {
    afterFrame,
    async mount(surface, source) {
      const root = createRoot(document.getElementById('page'));
      const started = performance.now();

      flushSync(() =>
        root.render(
          surface === 'viewer'
            ? React.createElement(MawyViewer, { value: source, style: { height: 700 } })
            : React.createElement(MawyEditor, {
                defaultValue: source,
                mode: surface,
                style: { height: 700 }
              })
        )
      );

      return (await afterFrame()) - started;
    },
    listen(type) {
      waits.length = 0;
      document.addEventListener(type, clock, true);
    },
    stop(type) {
      document.removeEventListener(type, clock, true);

      return waits.slice();
    }
  };
`;

async function bundled() {
  const { outputFiles } = await esbuild.build({
    stdin: { contents: PAGE, resolveDir: root, loader: 'tsx' },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'automatic',
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' }
  });

  return outputFiles[0].text;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.length ? sorted[sorted.length >> 1] : NaN;
};

/** The caret on a paragraph halfway down, which is where a long edit happens. */
async function caretInTheMiddle(page, surface) {
  if (surface !== 'wysiwyg') {
    await page.evaluate(() => {
      const area = document.querySelector('textarea');
      const middle = area.value.indexOf('\n', area.value.length >> 1);

      area.focus();
      area.setSelectionRange(middle, middle);
    });

    return;
  }

  const spot = await page.evaluate(() => {
    const lines = [...document.querySelectorAll('.mawy-document-body > p')].filter(
      (paragraph) => paragraph.textContent.length > 40
    );
    const line = lines[lines.length >> 1];

    line.scrollIntoView({ block: 'center', behavior: 'instant' });

    const { left, top } = line.getBoundingClientRect();

    return { x: left + 40, y: top + 6 };
  });

  await page.mouse.click(spot.x, spot.y);
}

/** How long each of these keys took, stopped at the frame after it. */
async function pressed(page, type, key, times) {
  await page.evaluate((name) => window.latency.listen(name), type);

  for (let press = 0; press < times; press += 1) {
    await page.keyboard.press(key);
    await page.evaluate(() => window.latency.afterFrame());
    await page.evaluate(() => window.latency.afterFrame());
  }

  return median(await page.evaluate((name) => window.latency.stop(name), type));
}

const script = await bundled();
const styles = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const browser = await chromium.launch({ headless: true });
const rows = [];

async function measure(surface, source) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.setContent('<!doctype html><div id="page"></div>');
  await page.addStyleTag({ content: styles });
  await page.addScriptTag({ content: script });

  const opened = await page.evaluate(
    ([name, text]) => window.latency.mount(name, text),
    [surface, source]
  );

  if (surface === 'viewer') {
    await page.close();

    return { surface, opened };
  }

  await caretInTheMiddle(page, surface);
  await page.evaluate(() => window.latency.afterFrame());

  const typed = await pressed(page, 'beforeinput', 'a', KEYS);
  const moved = await pressed(page, 'keydown', 'ArrowLeft', KEYS);
  const entered = await pressed(page, 'beforeinput', 'Enter', 4);

  await page.close();

  return { surface, opened, typed, moved, entered };
}

for (const length of LENGTHS) {
  const source = cut(length);

  for (const surface of ['viewer', ...SURFACES]) {
    rows.push({ length: source.length, ...(await measure(surface, source)) });
  }
}

await browser.close();

const shown = (value) => (value === undefined ? '' : `${value.toFixed(1)} ms`);
const table = [
  '| Document | Surface | Opened | Key | Caret | Enter |',
  '| --- | --- | ---: | ---: | ---: | ---: |',
  ...rows.map(
    ({ length, surface, opened, typed, moved, entered }) =>
      `| ${Math.round(length / 1000)} kB | ${surface} | ${shown(opened)} | ${shown(typed)} | ${shown(moved)} | ${shown(entered)} |`
  )
].join('\n');

console.log(table);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Latency\n\nThe median wait, up to the frame after the key. A report, not a limit.\n\n${table}\n`
  );
}
