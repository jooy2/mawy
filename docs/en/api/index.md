---
title: API
order: 2
---

# API

Everything the package exports. Each entry says what it is, what it takes and what it gives back.

::: warning Early

Nothing is published to npm yet and the API is not stable. The `wysiwyg` surface is partly built — see [the editor](../guide/editor#the-document-surface) for exactly which part. Everything else on this page exists and runs.

:::

## Components

### `MawyEditor`

A Markdown editor with the viewer beside it. See [the editor](../guide/editor).

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue="# Hello" onChange={save} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

#### The document

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, when the application owns it. |
| `defaultValue` | `string` | `''` | The document to start with, when the editor is to keep it. |
| `onChange` | `(value: string) => void` | — | Every change, controlled or not. |
| `readOnly` | `boolean` | `false` | The document can still be read, selected and copied. |
| `placeholder` | `string` | a localised prompt | Shown while the document is empty. |

#### Surfaces

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | [`MawyMode`](#mawymode) | — | Which surface, when the application owns it. |
| `defaultMode` | `MawyMode` | the first of `modes` | Which surface to start on. |
| `onModeChange` | `(mode: MawyMode) => void` | — | Called whenever it changes. |
| `modes` | `readonly MawyMode[]` | `['plain', 'split', 'preview']` | Which surfaces the switch offers. Give it one and the switch disappears. |

`'wysiwyg'` is not on the default list. It draws the document and edits it in place, and it is partly built — pass it in `modes` to offer it.

#### Chrome

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `toolbar` | [`MawyEditorToolbarOption`](#mawyeditortoolbaroption) | `true` | Which controls the toolbar has, and in what order. |
| `status` | [`MawyEditorStatusOption`](#mawyeditorstatusoption) | `true` | What the status bar counts. |
| `lineNumbers` | `boolean` | `true` | The gutter down the left of the source. |

#### The preview, and the palette

`parse`, `html`, `fonts`, `typography`, `defaultTypography`, `colorScheme`, `defaultColorScheme`, `onColorSchemeChange` and `locale` mean exactly what they mean on [`MawyViewer`](#mawyviewer), and the first five are passed straight through to the preview.

### `MawyViewer`

A Markdown document, rendered and not editable. See [the viewer](../guide/viewer) for what it does and why.

```tsx
import { MawyViewer } from 'mawy-react';

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
| `fonts` | `readonly `[`MawyFont`](#mawyfont)`[]` | `MAWY_SYSTEM_FONTS` | The typefaces the toolbar offers, in the order it lists them. |

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
type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';
```

Which surface a document is shown on. These are views of one document rather than four editors — see [the editor](../guide/editor).

- `'wysiwyg'` — the rendered document, edited in place. Partly built, and not on the default list.
- `'plain'` — the Markdown source, edited as text.
- `'preview'` — the rendered document, read-only.
- `'split'` — the source on one side and the preview on the other, at once.

`split` is on this list rather than beside it because of what a reader does with the control: the four are one group of buttons, one at a time, and "both" is the fourth answer to the same question.

### `MawyEditorToolbarItem`

```ts
type MawyEditorToolbarItem =
  | 'mode'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule'
  | 'colorScheme'
  | 'separator';
```

One control on the editor's toolbar. Everything except `mode`, `colorScheme` and `separator` is a formatting command, and every one of those has a keyboard shortcut — the buttons are a way of finding the commands rather than the way of running them.

### `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar; an array is exactly those, in that order.

### `MawyEditorStatusItem`

```ts
type MawyEditorStatusItem = 'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';
```

What the editor counts along its bottom edge. `characters` are code points, so an emoji is one. `words` adds every Han, hiragana and katakana character to the space-separated count, because those are written without spaces; Korean is spaced, so an eojeol is one word. `size` is UTF-8 bytes, which is what a file on disk will be.

### `MawyEditorStatusOption`

```ts
type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];
```

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
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

The `id` of one of the fonts the viewer was given. `sans`, `serif` and `mono` are the three it offers on its own, and they are roles rather than font names: nothing is downloaded, and the stack behind each is a `--mawy-font-*` custom property an application can redeclare. Any other string is the `id` of a font passed through `fonts`.

### `MawyFont`

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

A typeface the toolbar offers.

- **`id`** — what `typography.fontFamily` is set to in order to choose this font.
- **`label`** — what the toolbar shows. `sans`, `serif` and `mono` take theirs from the locale when it is left out; anything else falls back to its `id`.
- **`stack`** — the CSS `font-family` value. Defaults to `var(--mawy-font-{id})`.
- **`href`** — a stylesheet that has to arrive before the font can be drawn. Fetched once per page, the first time the font is drawn or its name is shown in the typeface menu.

### `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

The three roles, drawn with whatever the reader's machine already has. None of them has an `href`, so the default viewer fetches nothing at all.

### `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

Thirteen open-licensed families, ready to be offered — every one under the SIL Open Font License, which permits commercial use, embedding and redistribution. Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, and five for Korean: Pretendard, Noto Sans KR, Noto Serif KR, Nanum Myeongjo and Gowun Dodum.

**It is never used unless an application passes it in.** A component embedded in somebody else's page has no business opening a connection to a font CDN they did not choose, so this is an export rather than a default:

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

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
