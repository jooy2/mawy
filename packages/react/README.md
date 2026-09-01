<img src="https://mawy.cdget.com/128x128.png" alt="Mawy" width="96" height="96" />

# Mawy for React

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![npm latest package](https://img.shields.io/npm/v/mawy/latest.svg)](https://www.npmjs.com/package/mawy) [![npm downloads](https://img.shields.io/npm/dm/mawy.svg)](https://www.npmjs.com/package/mawy)

### 📘 [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API, in English and Korean. This README is just the quick start.

---

> **Mawy is a Markdown editor that also does the reading.** Write with the document in front of you as it will look, or drop into the Markdown source and work on that — the two are one click apart. When it is finished, the same document goes out through a read-only viewer, looking exactly as it looked while you were writing it.

> [!IMPORTANT] **`0.1.0`, and early.** The parser, `MawyViewer` and `MawyEditor` are written and tested, `wysiwyg` among the editor's surfaces. It is a `0.x`, which means the API can still change between minor versions — pin the version if that matters to you.

- **Editor and viewer are the same library.** They share the parser and the renderer, so what was typed is what a reader sees — rather than what a second, separately maintained renderer makes of it.
- **WYSIWYG and source are two views, not two editors.** Toggling does not round-trip through another implementation and does not lose what the other view could not express.
- **The document becomes React elements, not a string of HTML.** There is no `innerHTML` on the path from Markdown to the page, so the safe default costs nothing: escaping has nothing to do.
- **One runtime dependency.** [`lucide-react`](https://lucide.dev), for the toolbar's icons. A test in the suite fails the build if a source file imports anything that is not declared; anything added later has to earn it and has to be permissively licensed.
- **ESM only, types in the box.** TypeScript declarations ship with the package.

## Install

```bash
npm install mawy-react
```

`react` and `react-dom` are peer dependencies — **React 18 or 19**. Node.js 20.19 or later.

### Setup

Add one line to your app's CSS entry point:

```css
@import 'mawy-react/styles.css';
```

The stylesheet is finished CSS. Everything the library draws goes through `--mawy-*` custom properties, so theming is a matter of redeclaring a token — which cascades, so one declaration on a wrapping element reaches every Mawy surface inside it — rather than out-specifying a rule.

## Usage

```tsx
import { MawyEditor } from 'mawy-react';

export function Write() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

The Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar whose every command is also a keyboard shortcut, and a status bar that counts. It is a real `<textarea>` under a coloured copy of its own text, which is what keeps the IME and the mobile keyboard working — neither of which is worth losing for syntax colouring.

And the read-only half:

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

That is a finished reader: the document rendered, and a toolbar for the things a reader wants to change about it — typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings. None of it touches the document.

`value` is optional, and leaving it out is not an empty state. With nothing to show, the viewer **is** a file picker — drop a `.md` file on it, or choose one:

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

Pick what the toolbar has, and in what order:

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

### Typefaces

By default the typeface menu offers three roles — sans, serif, mono — drawn with whatever the reader's machine already has, and **nothing is fetched**. A catalogue of thirteen open-licensed families (all SIL OFL, five of them Korean) ships with the package and is opted into rather than assumed, because opening a connection to a font CDN is the embedding page's decision and not a component's:

```tsx
import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy-react';

<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />;
```

Your own fonts go in the same list: `{ id, label, stack, href }`.

### What it reads

CommonMark — 630 of the specification's 652 examples, which the test suite runs on every change and which is the number rather than the word — plus GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs, footnotes, and the five alert kinds — and definition lists, which GitHub does not read. Link reference definitions resolve wherever in the file they are written. Code blocks are coloured by whatever `highlight` is given — `mawy-react/highlight` is one, in a separate entry point, fetched only when a document turns out to have a language on a fence.

### What it does not know about

A document can carry a construct this package has never heard of, and say so in the document rather than in HTML:

```md
:::callout[Careful]{kind=warning} Blocks, parsed as blocks. :::
```

`directives` says what each name becomes — `<MawyViewer directives={{ callout: Callout }} />` — and a component is handed the name, the attributes and the pieces already drawn, so it composes elements rather than markup. A name nobody claimed is shown as the characters it was written with. `::name{…}` on a line of its own and `:name[…]` inside a sentence are the other two shapes.

### What it will not do

Raw HTML inside a document is shown as text unless you ask otherwise (`html="sanitize"` or `html="raw"`), and **every URL is checked whichever you choose** — `[click](javascript:…)` is Markdown rather than HTML, so the scheme allowlist is not part of that option and is not switched off with it. A refused destination is drawn as the words the author wrote, with no link around them.

### Types

`MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyDirectives`, `MawyDirectiveProps`, `MawyRange`, `MawyViewerToolbarItem` and `MawyViewerToolbarOption`, all also available from `mawy-react/types` — so an application can name one in its own props without importing a component to get at it.

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

It runs in a real browser rather than a DOM emulator on purpose. Selection ranges, `contenteditable` and `beforeinput` are what this library is made of, and jsdom implements none of them faithfully enough for a passing test to mean anything — `test/environment.test.tsx` is the file that says so and fails first if the harness is wrong. Locally the suite runs in Chromium alone; CI fans it out across Chromium, Firefox and WebKit on Linux, Windows and macOS. Set `VITEST_BROWSER` to pick another engine yourself.

The live previews are the documentation site: `cd ../../docs && npm install && npm run dev` renders the real components from `src/` through a Vite alias, so an edit is on screen without a rebuild.

[CONTRIBUTING.md](../../CONTRIBUTING.md) has the rest.

## License

[MIT](../../LICENSE) © [CDGet](https://cdget.com)
