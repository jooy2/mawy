---
title: API
order: 2
---

# API

Everything the package exports. Each entry says what it is, what it takes and what it gives back.

::: warning Early

`MawyViewer` is the component that exists today. `MawyEditor` lands next — [the editor](../guide/editor) describes what it is being built to do. Nothing is published to npm yet and the API is not stable.

:::

## Components

### `MawyViewer`

A Markdown document, rendered and not editable. See [the viewer](../guide/viewer) for what it does and why.

```tsx
import { MawyViewer } from 'mawy';

<MawyViewer value={document} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

#### The document

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, as Markdown. Passing it makes the document the application's: it will not change on its own. |
| `defaultValue` | `string` | `''` | The document to start with, when the viewer is to keep it itself. |
| `onValueChange` | `(value: string, file: File \| null) => void` | — | A new document, and the file it came from. Called whether or not `value` is being passed. |
| `empty` | `ReactNode` | the file picker | What to draw instead when there is no document. |

With neither `value` nor `defaultValue`, the viewer is the file picker — that is the whole design of the component rather than a fallback.

#### Reading and drawing

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `{ gfm: true, breaks: false }` | How the Markdown is read. |
| `html` | [`MawyHtmlPolicy`](#mawyhtmlpolicy) | `'escape'` | What becomes of raw HTML written inside the document. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | The language of the viewer's own chrome. Nothing to do with the document. |

#### Appearance

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](#mawycolorscheme) | — | The palette, when the application owns it. |
| `defaultColorScheme` | `MawyColorScheme` | `'system'` | The palette to start with. |
| `onColorSchemeChange` | `(scheme: MawyColorScheme) => void` | — | Called whenever it changes, controlled or not. |
| `typography` | `Partial<`[`MawyTypography`](#mawytypography)`>` | — | How the document is set, when the application owns it. |
| `defaultTypography` | `Partial<MawyTypography>` | see below | What it is set as to begin with. |
| `onTypographyChange` | `(typography: MawyTypography) => void` | — | Called whenever it changes, controlled or not. |
| `toolbar` | [`MawyViewerToolbarOption`](#mawyviewertoolbaroption) | `true` | Which controls the toolbar has, and in what order. |

Anything left out of `typography` or `defaultTypography` keeps its default, so `{ fontSize: 18 }` is a whole answer. The defaults are `sans`, 16px, a line height of 1.7, no extra letter spacing and the `normal` measure.

#### Opening files

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `fileDrop` | `boolean` | `true`, unless `value` is passed | Whether a file dropped on the viewer opens in it. |
| `accept` | `string` | every Markdown and text extension | What the file picker offers. |

A file larger than five megabytes is refused rather than read.

## Types

Exported from `mawy` and from `mawy/types`. The second entry point exists so an application can name one of these in its own props without importing a component to get at it.

### `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview';
```

Which surface a document is shown on. The three are views of one document rather than three editors — see [the editor](../guide/editor).

- `'wysiwyg'` — the rendered document, edited in place.
- `'plain'` — the Markdown source, edited as text.
- `'preview'` — the rendered document, read-only.

### `MawyColorScheme`

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

Which palette to draw in. `system` follows `prefers-color-scheme` and is the default: an editor embedded in an application that already answers that query should not be the one white rectangle on a dark page. `light` and `dark` do not follow it, so an application with a switch of its own drives the viewer from it.

### `MawyLocale`

```ts
type MawyLocale = 'en' | 'ko';
```

The language of the editor's own chrome — toolbar labels, menu entries, the text a screen reader is given. It has nothing to do with the language a document is written in.

### `MawyParseOptions`

```ts
interface MawyParseOptions {
  gfm?: boolean; // default: true
  breaks?: boolean; // default: false
}
```

- **`gfm`** — GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~`, alerts and bare URLs becoming links.
- **`breaks`** — whether a single newline inside a paragraph is a line break. Off by default, because that is what Markdown says. On, it matches the way chat clients and issue trackers behave, which is what a reader who has never written Markdown expects.

### `MawyHtmlPolicy`

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

What becomes of raw HTML written inside a document.

- `'escape'` — it is shown as the characters it was written with. The default, and the only one that is safe without qualification.
- `'sanitize'` — it is drawn, with everything outside an allowlist of elements, attributes and URL schemes removed first.
- `'raw'` — it is drawn as written, and the caller owns what happens next.

None of the three affects links. `[click](javascript:…)` is refused under every policy, because it is Markdown rather than HTML and switching the HTML policy was never a statement about it.

### `MawyTypography`

```ts
interface MawyTypography {
  fontFamily: MawyFontFamily; // default: 'sans'
  fontSize: number; // px, 13–26. default: 16
  lineHeight: number; // unitless, 1.3–2.4. default: 1.7
  letterSpacing: number; // em, −0.04–0.16. default: 0
  measure: MawyMeasure; // default: 'normal'
}
```

How the document is set. Every field reaches the page as a `--mawy-doc-*` custom property, so a value out of range is a strange-looking document rather than a broken one.

### `MawyFontFamily`

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono';
```

A family rather than a font name. The library ships no fonts and has no business naming one — what it names is the role, and the stack behind each role is a `--mawy-font-*` custom property an application can redeclare.

### `MawyMeasure`

```ts
type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';
```

How wide the text is allowed to run: 34rem, 44rem, 56rem, or no limit. A line that is too long is the failure that arrives with a larger text size, which is why this sits next to it on the toolbar. `full` is for a viewer that has been given a column of its own and does not need a second one inside it.

### `MawyViewerToolbarItem`

```ts
type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'copy'
  | 'open'
  | 'separator';
```

One control on the viewer's toolbar. `separator` draws a hairline rather than a control.

### `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar at all; an array is exactly those controls, in exactly that order. There is no way to add a control that is not on the list — a toolbar that takes arbitrary children is one the library can no longer make keyboard-operable.

## Stylesheet

### `mawy/styles.css`

The finished stylesheet, imported once by the embedding application. Every value the library draws with is a `--mawy-*` custom property, and that namespace is the entire supported surface for theming.

The tokens are declared on **`.mawy-root`** rather than on `:root`. A component library has no business writing to the document element, and a viewer that read its palette from `:root` could not be dark inside a light page. They cascade, so one declaration on a wrapping element reaches every Mawy surface inside it.

| Group | Tokens |
| --- | --- |
| Type | `--mawy-font-sans`, `--mawy-font-serif`, `--mawy-font-mono` |
| The document | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure` |
| Surfaces | `--mawy-bg`, `--mawy-bg-sunken`, `--mawy-bg-raised`, `--mawy-chrome` |
| Text | `--mawy-fg`, `--mawy-fg-muted`, `--mawy-fg-subtle` |
| Lines | `--mawy-border`, `--mawy-border-strong` |
| Accent | `--mawy-accent`, `--mawy-accent-hover`, `--mawy-accent-fg`, `--mawy-accent-soft` |
| Code | `--mawy-code-bg`, `--mawy-code-fg`, `--mawy-mark-bg`, `--mawy-mark-fg` |
| Alerts | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| Shape and motion | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

The class names the document is drawn with are `.mawy-md-*` and are also part of the supported surface, so an application can restyle a table or a code block without the library exposing a render prop for it.
