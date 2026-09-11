/**
 * The editor screenshot the three READMEs open with.
 *
 * `.github/media/editor-split.png` is a picture of a component, so it goes
 * stale the moment the toolbar, the palette or the sample document changes —
 * and a picture nobody can regenerate is one that stays stale. This is how it
 * was made, so that remaking it is a command rather than an afternoon.
 *
 * It photographs the playground's own editor rather than mounting one here.
 * That demo is already the editor with nothing switched off — every surface,
 * the full toolbar, the web fonts, the highlighter — and the document in it is
 * the one written to show what the parser reads. A second arrangement built
 * for the photograph would be a second thing to keep in step.
 *
 * The dev server has to be running:
 *
 *     npm run dev            # in docs/
 *     npm run screenshot     # in docs/, in another shell
 *
 * Playwright is resolved out of `packages/react`, which has it for its own
 * browser tests. This folder does not install it, because one screenshot a
 * release is not worth a second copy of a browser.
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(docsDir, '..');

/** Where the READMEs point. Changing it means changing all three of them. */
const target = resolve(repoRoot, '.github/media/editor-split.png');

const url = process.env.MAWY_DOCS_URL ?? 'http://localhost:5173';

/*
 * 1440 by 320, at twice the scale.
 *
 * The height is what a README can spend on a picture before it stops being a
 * banner and starts being the page. The width is what makes that height work:
 * narrower and the sample document's first paragraph wraps past the bottom of
 * the frame on both sides, which photographs as a sentence cut in half.
 */
const width = 1440;
const height = 320;

const require = createRequire(resolve(repoRoot, 'packages/react/package.json'));

let chromium;

try {
  ({ chromium } = require('playwright'));
} catch {
  throw new Error(
    'playwright is not installed. Run `npm install` in packages/react, then ' +
      '`npx playwright install --with-deps chromium` if the browser is missing too.'
  );
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: 900 },
  deviceScaleFactor: 2,
  // The picture is the same in every README and GitHub serves one file to
  // readers in both themes, so it is the light palette rather than the
  // machine's.
  colorScheme: 'light'
});

try {
  await page.goto(`${url}/guide/playground`, { waitUntil: 'networkidle' });

  const editor = page.locator('.mawy-root.mawy-editor').first();

  await editor.waitFor({ state: 'visible', timeout: 30000 });

  // The playground sizes its stage to whatever is left below the navbar, which
  // is a number about the window rather than about the picture.
  await editor.evaluate((element, to) => {
    element.style.height = `${to}px`;
    element.closest('.mawy-play-pane')?.setAttribute('style', `height: ${to}px`);
  }, height);

  // The web fonts and the highlighter both arrive after the first paint, and
  // photographing between the two catches the document in a typeface the
  // reader will never see.
  await page.waitForTimeout(1500);
  await editor.screenshot({ path: target });

  console.log(`wrote ${target}`);
} finally {
  await browser.close();
}
