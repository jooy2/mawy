import { defineConfig } from 'vitest/config';
import ReactPlugin from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));

const SUPPORTED_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;

type SupportedBrowser = (typeof SUPPORTED_BROWSERS)[number];

// Locally we only run Chromium so a plain `npm test` needs a single browser
// installed. CI fans out across all three via the `VITEST_BROWSER` env var,
// which also accepts a comma-separated list.
function resolveBrowsers(): SupportedBrowser[] {
  const requested = process.env.VITEST_BROWSER;

  if (!requested) {
    return ['chromium'];
  }

  const names = requested
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const unsupported = names.filter(
    (name) => !SUPPORTED_BROWSERS.includes(name as SupportedBrowser)
  );

  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported VITEST_BROWSER value(s): ${unsupported.join(', ')}. ` +
        `Supported browsers are: ${SUPPORTED_BROWSERS.join(', ')}.`
    );
  }

  return names as SupportedBrowser[];
}

export default defineConfig({
  plugins: [ReactPlugin()],
  resolve: {
    alias: {
      // Tests import from 'mawy-react' exactly as a consumer would.
      'mawy-react': resolve(rootDir, 'src/index.ts')
    },
    // One React, however many packages ask for it. Two copies is not a bigger
    // bundle, it is a null hook dispatcher the moment a second package renders.
    dedupe: ['react', 'react-dom']
  },
  // Named explicitly so the prebundler puts them in shared chunks rather than
  // inlining a second React into whichever dependency reached it first — which
  // is exactly the two-copies failure `dedupe` above cannot see.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'lucide-react', 'vitest-browser-react']
  },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    // One file at a time. Test files run as frames of one browser, and a
    // browser has a single focus and a single selection to hand out: a click in
    // one file takes both from whichever file was holding them. Focus and
    // selection are most of what this library does, and the failures that
    // produces only ever appear in a full run.
    fileParallelism: false,
    // The editing surfaces are built on selection ranges, `contenteditable` and
    // `beforeinput`. A DOM emulator implements none of the three faithfully
    // enough for a passing test to mean anything, so the suite runs in a real
    // browser instead.
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: resolveBrowsers().map((browser) => ({ browser }))
    }
  }
});
