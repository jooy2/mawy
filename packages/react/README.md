<img src="https://mawy.cdget.com/128x128.png" alt="Mawy" width="96" height="96" />

# Mawy for React

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![npm latest package](https://img.shields.io/npm/v/mawy-react/latest.svg)](https://www.npmjs.com/package/mawy-react) [![npm downloads](https://img.shields.io/npm/dm/mawy-react.svg)](https://www.npmjs.com/package/mawy-react)

### [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API, in English and Korean. This README is the quick start.

---

> **Mawy is a Markdown editor and viewer in one package.** Write with the document in front of you as it will look, or switch to the Markdown source and work on that. When the document is finished, a read-only viewer shows it exactly as it looked while you were writing it.

> [!IMPORTANT] **`1.0.0`.** The parser, `MawyViewer` and `MawyEditor` are written and tested, `wysiwyg` among the editor's surfaces. The exported API is under semantic versioning from here: a name that goes away or changes shape waits for a major version.

- **Editor and viewer are the same library.** They share the parser and the renderer, so what was typed is what a reader sees, not what a second renderer makes of it.
- **WYSIWYG and source are two views of one value.** Toggling does not round-trip through another implementation, so nothing is lost that the other view could not express.
- **The document becomes React elements, not a string of HTML.** There is no `innerHTML` on the path from Markdown to the page, so there is nothing to escape.
- **One runtime dependency.** [`lucide-react`](https://lucide.dev), for the toolbar's icons. A test in the suite fails the build if a source file imports anything undeclared, and anything added later has to be permissively licensed.
- **ESM only, with TypeScript declarations included.**

## Install

```bash
npm install mawy-react
```

`react` and `react-dom` are peer dependencies, and **React 18 or 19** is supported. Building needs Node.js 20.19 or later.

### Setup

Add one line to your app's CSS entry point:

```css
@import 'mawy-react/styles.css';
```

The stylesheet is finished CSS. Everything the library draws goes through `--mawy-*` custom properties, so you theme it by redeclaring a token instead of competing on selector specificity. Tokens cascade, so one declaration on a wrapping element reaches every Mawy surface inside it.

## Usage

```tsx
import { MawyEditor } from 'mawy-react';

export function Write() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

You get the Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar whose every command is also a keyboard shortcut, and a status bar that counts lines, words and characters. The source surface is a real `<textarea>` under a coloured copy of its own text, which keeps the IME and the mobile keyboard working.

And the read-only half:

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

That gives you a finished reader: the rendered document, and a toolbar for the typeface, text size, line height, letter spacing, column width, light or dark theme, and an outline of the headings. None of it changes the document.

`value` is optional. With nothing to show, the viewer becomes a file picker: drop a `.md` file on it, or choose one.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

Pick what the toolbar has, and in what order:

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

### Typefaces

By default the typeface menu offers three roles, sans, serif and mono, drawn with whatever the reader's machine already has, and **nothing is fetched**. A catalogue of thirteen open-licensed families (all SIL OFL, five of them Korean) ships with the package and has to be opted into, because opening a connection to a font CDN is the embedding page's decision rather than a component's:

```tsx
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';

<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />;
```

Your own fonts go in the same list: `{ id, label, stack, href }`.

### Supported syntax

CommonMark, at 640 of the specification's 652 examples, which the test suite checks on every change. On top of that come GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs, footnotes, and the five alert kinds. Definition lists are also read, which GitHub does not do. Link reference definitions resolve wherever in the file they are written. Code blocks are coloured by whatever `highlight` is given, and `mawy-react/highlight` is one such highlighter, in a separate entry point, fetched only when a document turns out to have a language on a fence.

### Directives

A document can carry a construct this package has never heard of, written in the document rather than in HTML:

```md
:::callout[Careful]{kind=warning} Blocks, parsed as blocks. :::
```

`directives` says what each name becomes, as in `<MawyViewer directives={{ callout: Callout }} />`. A component is handed the name, the attributes and the pieces already drawn, so it composes elements rather than markup. An unregistered name is shown as the characters it was written with. `::name{…}` on a line of its own and `:name[…]` inside a sentence are the other two shapes.

### Safety

Raw HTML inside a document is shown as text unless you ask otherwise (`html="sanitize"` or `html="raw"`), and **every URL is checked whichever you choose**. `[click](javascript:…)` is Markdown rather than HTML, so the scheme allowlist is not part of that option and is not switched off with it. A refused destination is drawn as the words the author wrote, with no link around them.

### Types

`MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyDirectives`, `MawyDirectiveProps`, `MawyRange`, `MawyViewerToolbarItem` and `MawyViewerToolbarOption`. They are also available from `mawy-react/types`, so an application can name one in its own props without importing a component.

The full reference is at [mawy.cdget.com/api/](https://mawy.cdget.com/api/).

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

It runs in a real browser rather than a DOM emulator on purpose. Selection ranges, `contenteditable` and `beforeinput` are what this library is built on, and jsdom implements none of them faithfully enough for a passing test to mean anything. `test/environment.test.tsx` records that and fails first if the harness is wrong. Locally the suite runs in Chromium alone, and CI runs it across Chromium, Firefox and WebKit on Linux, Windows and macOS. Set `VITEST_BROWSER` to pick another engine yourself.

The live previews are on the documentation site. `cd ../../docs && npm install && npm run dev` renders the real components from `src/` through a Vite alias, so an edit appears on screen without a rebuild.

[CONTRIBUTING.md](../../CONTRIBUTING.md) has the rest.

## License

[MIT](../../LICENSE) © [CDGet](https://cdget.com)
