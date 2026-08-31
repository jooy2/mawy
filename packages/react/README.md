<img src="https://mawy.cdget.com/128x128.png" alt="Mawy" width="96" height="96" />

# Mawy for React

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![npm latest package](https://img.shields.io/npm/v/mawy/latest.svg)](https://www.npmjs.com/package/mawy) [![npm downloads](https://img.shields.io/npm/dm/mawy.svg)](https://www.npmjs.com/package/mawy)

### 📘 [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API, in English and Korean. This README is just the quick start.

---

> **Mawy is a Markdown editor that also does the reading.** Write with the document in front of you as it will look, or drop into the Markdown source and work on that — the two are one click apart. When it is finished, the same document goes out through a read-only viewer, looking exactly as it looked while you were writing it.

> [!IMPORTANT] **Not published yet.** This package is the scaffolding for the editor rather than the editor: it builds, it lints, it typechecks and its tests run in three real browsers, and the components are being written on top of it. The API below is what exists today, which is the shared type vocabulary and nothing else.

- **Editor and viewer are the same library.** They share the parser and the renderer, so what was typed is what a reader sees — rather than what a second, separately maintained renderer makes of it.
- **WYSIWYG and source are two views, not two editors.** Toggling does not round-trip through another implementation and does not lose what the other view could not express.
- **Close to zero dependencies.** The package declares none, and a test in the suite fails the build if a source file imports something that is not declared. Anything added later has to earn it and has to be permissively licensed.
- **ESM only, types in the box.** TypeScript declarations ship with the package.

## Install

```bash
npm install mawy
```

`react` and `react-dom` are peer dependencies — **React 18 or 19**. Node.js 20.19 or later.

### Setup

Add one line to your app's CSS entry point:

```css
@import 'mawy/styles.css';
```

The stylesheet is finished CSS. Everything the library draws goes through `--mawy-*` custom properties, so theming is a matter of redeclaring a token — which cascades, so one declaration on a wrapping element reaches every Mawy surface inside it — rather than out-specifying a rule.

## Usage

The components land with the next release. What the package exports today is the type vocabulary they are written in:

```ts
import type { MawyColorScheme, MawyLocale, MawyMode } from 'mawy';
```

`MawyMode` is `'wysiwyg' | 'plain' | 'preview'` — the three views of one document. The same types are also available from `mawy/types`, so an application can name one in its own props without importing a component to get at it.

## Development

Everything is run from this folder; there is no install at the repository root.

```bash
npm install
npm run lint         # ESLint
npm run typecheck    # tsc, source and tests
npm test             # Vitest, in a real browser
npm run build        # dist/
```

The suite drives [Playwright](https://playwright.dev), so the first run needs a browser:

```bash
npx playwright install --with-deps chromium
```

It runs in a real browser rather than a DOM emulator on purpose. Selection ranges, `contenteditable` and `beforeinput` are what this library is made of, and jsdom implements none of them faithfully enough for a passing test to mean anything — `test/environment.test.tsx` is the file that says so and fails first if the harness is wrong. Locally the suite runs in Chromium alone; CI fans it out across Chromium, Firefox and WebKit on Linux, Windows and macOS. Set `VITEST_BROWSER` to pick another engine yourself.

[CONTRIBUTING.md](../../CONTRIBUTING.md) has the rest.

## License

[MIT](../../LICENSE) © [CDGet](https://cdget.com)
