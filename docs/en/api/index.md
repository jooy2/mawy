---
title: API
order: 2
---

# API

Everything the package exports. Each entry says what it is, what it takes and what it gives back.

:::: warning Early

Both packages are published at `0.1.0`. They are a `0.x`, which means the API can still change between minor versions — pin the version if that matters to you.

::: fw react

The `wysiwyg` surface is partly built — see [the editor](../guide/editor#the-document-surface) for exactly which part. Everything else on this page exists and runs.

:::

::: fw flutter

The Flutter package is the viewer alone for now; the editor is the React package's. Everything on this page that is marked Flutter exists and runs.

:::

::::

## Components

### `MawyEditor`

::: fw flutter

**Not in this package.** `packages/flutter` ships the viewer; the editor is the React package's for now, because what the editing surfaces are built on — `contenteditable`, `beforeinput` and a DOM selection — has no Flutter equivalent a port would find. This section and the editor's types are React's. [`MawyViewer`](#mawyviewer) below has both halves.

:::

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

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

Built on `package:flutter/widgets.dart` alone — no Material and no Cupertino — so it sits inside a `MaterialApp`, a `CupertinoApp` or a bare `WidgetsApp` without dragging a second design system in behind it.

:::

#### The document

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, as Markdown. Passing it makes the document the application's: it will not change on its own. |
| `defaultValue` | `string` | `''` | The document to start with, when the viewer is to keep it itself. |
| `onValueChange` | `(value: string, file: File \| null) => void` | — | A new document, and the file it came from. Called whether or not `value` is being passed. |
| `empty` | `ReactNode` | the file picker | What to draw instead when there is no document. |

With neither `value` nor `defaultValue`, the viewer is the file picker — that is the whole design of the component rather than a fallback.

:::

::: fw flutter

| Argument | Type     | Default  | What it does               |
| -------- | -------- | -------- | -------------------------- |
| `value`  | `String` | required | The document, as Markdown. |

`value` is required here where the React package makes it optional, and that is the one place a file picker would have gone. Picking a file means a plugin — a dependency this package does not have and an application usually already does — so opening the file is yours and drawing it is Mawy's.

:::

#### Reading and drawing

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `{ gfm: true, breaks: false, definitionLists: true }` | How the Markdown is read. |
| `html` | [`MawyHtmlPolicy`](#mawyhtmlpolicy) | `'escape'` | What becomes of raw HTML written inside the document. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | The language of the viewer's own chrome. Nothing to do with the document. |
| `directives` | [`MawyDirectives`](#mawydirectives) | — | What draws the constructs this package does not know about. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `MawyParseOptions()` | How the Markdown is read. |
| `locale` | [`MawyLocale`](#mawylocale) | `MawyLocale.en` | The language of the viewer's own chrome. Nothing to do with the document. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | What a tapped link does. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](#mawydirectivebuilder)`>?` | — | What draws the constructs this package does not know about. |

There is no `html` argument, and there will not be one: raw HTML written inside a document is shown as the characters it was written with, because there is no HTML here to draw it as.

`onLinkTap` is unset by default and a link does nothing until it is given. Opening a URL means handing it to the platform, and which URLs an application is willing to hand over is not a viewer's decision to make. The scheme allowlist has already run by the time it is called — a `javascript:` never reaches it — but the rest is yours.

:::

#### Appearance

::: fw react

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

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](#mawycolorscheme) | `MawyColorScheme.system` | Which palette to draw in. |
| `onColorSchemeChange` | `ValueChanged<MawyColorScheme>?` | — | Called when the reader changes it from the toolbar. |
| `typography` | [`MawyTypography`](#mawytypography)`?` | — | How the document is set, when the application owns it. |
| `defaultTypography` | `MawyTypography` | `MawyTypography()` | How it is set to begin with, when the viewer keeps it itself. |
| `onTypographyChange` | `ValueChanged<MawyTypography>?` | — | Called whether or not `typography` is being passed. |
| `toolbar` | `List<`[`MawyViewerToolbarItem`](#mawyviewertoolbaritem)`>` | [`kMawyViewerToolbar`](#kmawyviewertoolbar) | The controls to draw and the order to draw them in. `const []` for none. |

`MawyTypography` is a class with a default for every field rather than a bag of optional ones, so `MawyTypography(fontSize: 18)` is a whole answer and `copyWith` changes one thing about an existing one. The defaults are `sans`, 16 logical pixels, a line height of 1.7, no extra letter spacing and the `normal` measure.

There is no `fonts` argument. The package ships no typefaces and names none, so a face an application has bundled is named through [`MawyTypography.fontFamilyName`](#mawytypography) rather than offered from a list.

:::

#### Opening files

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `fileDrop` | `boolean` | `true`, unless `value` is passed | Whether a file dropped on the viewer opens in it. |
| `accept` | `string` | every Markdown and text extension | What the file picker offers. |

A file larger than five megabytes is refused rather than read.

:::

::: fw flutter

Nothing here: this package does not open files, and `value` above says why.

:::

#### The screen

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `padding` | `EdgeInsetsGeometry?` | the React package's own numbers | The space around the document. |
| `scrollController` | `ScrollController?` | one of its own | The document's scroller, so an application can drive it or watch it. |

:::

::: fw react

Padding and scrolling are the page's rather than the component's — the viewer is an element in a document that already has both. The numbers it draws with are `--mawy-*` custom properties, which the stylesheet below lists.

:::

## Types

::: fw react

Exported from `mawy-react` and from `mawy-react/types`. The second entry point exists so an application can name one of these in its own props without importing a component to get at it.

:::

::: fw flutter

Exported from `package:mawy/mawy.dart`, which is the whole of this package's public surface — one import, and nothing else to reach for. The editor's types — `MawyMode`, `MawyEditorToolbarItem`, `MawyEditorToolbarOption`, `MawyEditorStatusItem` and `MawyEditorStatusOption` — are the React package's, because the editor is.

:::

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
  | 'image'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule'
  | 'find'
  | 'colorScheme'
  | 'separator';
```

One control on the editor's toolbar. Everything except `mode`, `find`, `colorScheme` and `separator` is a formatting command, and every one of those has a keyboard shortcut — the buttons are a way of finding the commands rather than the way of running them. `find` has one too, `Mod`+`F`, which works whether or not the button is on the toolbar.

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

::: fw react

```ts
type MawyColorScheme = 'light' | 'dark' | 'system';
```

:::

::: fw flutter

```dart
enum MawyColorScheme { light, dark, system }
```

:::

Which palette to draw in. `system` is the default and follows whatever the platform already says — `prefers-color-scheme` in a browser, `MediaQuery.platformBrightnessOf` in an app — because a viewer embedded in something that has answered that question should not be the one white rectangle on a dark screen. `light` and `dark` do not follow it, so an application with a switch of its own drives the viewer from it.

### `MawyLocale`

::: fw react

```ts
type MawyLocale = 'en' | 'ko';
```

:::

::: fw flutter

```dart
enum MawyLocale { en, ko }
```

:::

The language of the viewer's and the editor's own chrome — toolbar labels, menu entries, the text a screen reader is given. It has nothing to do with the language a document is written in.

### `MawyParseOptions`

::: fw react

```ts
interface MawyParseOptions {
  gfm?: boolean; // default: true
  breaks?: boolean; // default: false
  definitionLists?: boolean; // default: true
}
```

:::

::: fw flutter

```dart
class MawyParseOptions {
  const MawyParseOptions({
    this.gfm = true,
    this.breaks = false,
    this.definitionLists = true,
  });
}
```

:::

- **`gfm`** — GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~`, alerts, footnotes and bare URLs becoming links.
- **`breaks`** — whether a single newline inside a paragraph is a line break. Off by default, because that is what Markdown says. On, it matches the way chat clients and issue trackers behave, which is what a reader who has never written Markdown expects.
- **`definitionLists`** — whether a line opening with `: ` under a line of text is a term and what it means. On, and it is the one thing Mawy reads that GitHub does not: the syntax is PHP Markdown Extra's, and it is the one everybody who writes these uses. Turn it off for a document that has to mean exactly what it would mean there.

The three options are the same three in both packages, with the same defaults and the same effect — the parser is one parser, and [a check in CI](https://github.com/jooy2/mawy/blob/main/packages/flutter/tool/parity.dart) diffs the two trees over every Markdown file in the repository.

### `MawyHtmlPolicy`

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

What becomes of raw HTML written inside a document.

- `'escape'` — it is shown as the characters it was written with. The default, and the only one that is safe without qualification.
- `'sanitize'` — it is drawn, with everything outside an allowlist of elements, attributes and URL schemes removed first.
- `'raw'` — it is drawn as written, and the caller owns what happens next.

None of the three affects links. `[click](javascript:…)` is refused under every policy, because it is Markdown rather than HTML and switching the HTML policy was never a statement about it.

**React only.** The Flutter package has no equivalent and needs none: there is no HTML on the path from Markdown to the screen, so raw HTML in a document is always shown as the characters it was written with, and `'escape'` is not a policy there but the only thing that could happen.

### `MawyTypography`

::: fw react

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

:::

::: fw flutter

```dart
class MawyTypography {
  const MawyTypography({
    this.fontFamily = MawyFontFamily.sans,
    this.fontFamilyName, // a bundled family, instead of the platform's own
    this.fontSize = 16, // logical pixels
    this.lineHeight = 1.7, // unitless
    this.letterSpacing = 0, // ems
    this.measure = MawyMeasure.normal,
  });

  MawyTypography copyWith({ /* every field, each optional */ });
}
```

How the document is set. Every field has a default, so `MawyTypography(fontSize: 18)` is a whole answer and the rest stays where it was; `copyWith` changes one thing about a settings object that already exists.

`fontFamilyName` is the extra field, and it is what stands in for the React package's `fonts` list. The package ships no typefaces: each of the three roles maps to the platform's own family for that role unless an application bundles a face and names it here.

:::

### `MawyFontFamily`

::: fw react

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

The `id` of one of the fonts the viewer was given. `sans`, `serif` and `mono` are the three it offers on its own, and they are roles rather than font names: nothing is downloaded, and the stack behind each is a `--mawy-font-*` custom property an application can redeclare. Any other string is the `id` of a font passed through `fonts`.

:::

::: fw flutter

```dart
enum MawyFontFamily { sans, serif, mono }
```

The three roles, and only the three. They are roles rather than font names: each maps to the platform's own family for that role, and an application that wants a particular face bundles it and names it through [`MawyTypography.fontFamilyName`](#mawytypography). There is no fourth value, because there is no list of fonts to add one to.

:::

### `MawyFont`

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

A typeface the toolbar offers. **React only** — with it, `MAWY_SYSTEM_FONTS` and `MAWY_WEB_FONTS`. A stylesheet fetched at the moment a font is first drawn is a browser's trick; the Flutter package names one bundled family through [`MawyTypography.fontFamilyName`](#mawytypography) instead.

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

### `MawyDirectiveKind`

::: fw react

```ts
type MawyDirectiveKind = 'container' | 'leaf' | 'text';
```

:::

::: fw flutter

```dart
enum MawyDirectiveKind { container, leaf, text }
```

:::

Which of the three shapes a directive was written in. The number of colons is the difference and nothing else about it is: `:::container` holds blocks, `::leaf` is a line of its own, and `:text` sits inside a sentence. See [directives](../guide/viewer#directives) for what they are for.

### `MawyDirectives`

::: fw react

```ts
type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;
```

The directives an application knows, by name. A name that is not on the list is drawn as the characters it was written with — the same answer raw HTML gets under the default `html` policy.

:::

::: fw flutter

**React only** as a named type. The Flutter argument is a plain `Map<String, `[`MawyDirectiveBuilder`](#mawydirectivebuilder)`>`, and a name that is not in it is drawn as the characters it was written with.

:::

### `MawyDirectiveProps`

::: fw react

```ts
interface MawyDirectiveProps {
  name: string;
  kind: MawyDirectiveKind;
  attributes: Readonly<Record<string, string>>;
  /** The `[label]`, drawn. `null` when the document wrote none. */
  label: React.ReactNode;
  /** A container's blocks, drawn. `null` for the other two shapes. */
  children: React.ReactNode;
  range: MawyRange;
  /** The characters it was written with. */
  source: string;
}
```

What a directive's component is given. The pieces arrive **already drawn**, so a component composes React elements and never parses Markdown a second time or handles a string of markup.

`attributes` is what was written in `{…}`, in the order it was written: `{#id}` arrives as `id`, `{.a .b}` as `class`, and a bare name arrives with an empty string, which is how a flag is spelled. Every value is a string, because a string is all the document said.

:::

::: fw flutter

**Flutter only** in this shape — see [`MawyDirective`](#mawydirective), which is the same thing as a class.

:::

### `MawyDirective`

::: fw flutter

```dart
class MawyDirective {
  final String name;
  final MawyDirectiveKind kind;
  final Map<String, String> attributes;
  final InlineSpan? label; // the `[label]`, drawn. `null` when there was none
  final List<Widget>? children; // a container's blocks. `null` for the other two
  final MdRange range;
  final String source; // the characters it was written with
}
```

What a directive's builder is given. The pieces arrive **already drawn**, so a builder composes widgets and never parses Markdown a second time.

`attributes` is what was written in `{…}`, in the order it was written: `{#id}` arrives as `id`, `{.a .b}` as `class`, and a bare name arrives with an empty string, which is how a flag is spelled. Every value is a `String`, because a string is all the document said.

:::

::: fw react

**Flutter only.** The React package spells the same thing [`MawyDirectiveProps`](#mawydirectiveprops).

:::

### `MawyDirectiveBuilder`

::: fw flutter

```dart
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);
```

What draws one directive. A `MawyDirectiveKind.text` one is placed in the sentence as a `WidgetSpan`, so a builder for an inline directive should return something that sits on a line of text — a `Text.rich` of its own is usually it.

:::

::: fw react

**Flutter only.** The React package's equivalent is a component type, named through [`MawyDirectives`](#mawydirectives).

:::

### `MawyRange`

::: fw react

```ts
interface MawyRange {
  start: number;
  end: number;
}
```

Where a piece of a document was written, in the offsets of the Markdown the component was given — the same two numbers every element carries as `data-mawy-range`, handed over as numbers where a component gets them directly. Today that is [`MawyDirectiveProps`](#mawydirectiveprops) and nothing else.

:::

::: fw flutter

**React only** under this name. The Dart side's is `MdRange`, which comes out of the parser and is on every node — see [`MdDocument`](#mddocument).

:::

### `MawyMeasure`

::: fw react

```ts
type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';
```

:::

::: fw flutter

```dart
enum MawyMeasure { narrow, normal, wide, full }

extension MawyMeasureWidth on MawyMeasure {
  double? get width; // 560, 704, 880, null
}
```

:::

How wide the text is allowed to run: 34rem, 44rem, 56rem, or no limit — 560, 704 and 880 logical pixels in Flutter, which is the same three widths at the same 16-pixel body size. A line that is too long is the failure that arrives with a larger text size, which is why this sits next to it on the toolbar. `full` is for a viewer that has been given a column of its own and does not need a second one inside it.

### `MawyViewerToolbarItem`

::: fw react

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

:::

::: fw flutter

```dart
enum MawyViewerToolbarItem {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  measure,
  colorScheme,
  outline,
  copy,
  separator,
}
```

:::

One control on the viewer's toolbar. `separator` draws a hairline rather than a control.

::: fw flutter

There is no `open`, for the same reason there is no file picker: opening a file means a plugin this package does not have.

:::

### `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar at all; an array is exactly those controls, in exactly that order. **React only** — the Flutter `toolbar` argument is a plain list, and [`kMawyViewerToolbar`](#kmawyviewertoolbar) is what `true` would have meant.

There is no way in either package to add a control that is not on the list. A toolbar that takes arbitrary children is one the library can no longer make keyboard-operable.

### `kMawyViewerToolbar`

::: fw flutter

```dart
const List<MawyViewerToolbarItem> kMawyViewerToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::

::: fw react

**Flutter only.** The React package spells the same thing `toolbar={true}` — see [`MawyViewerToolbarOption`](#mawyviewertoolbaroption).

:::

## Stylesheet

### `mawy-react/styles.css`

::: fw flutter

**React only.** There is no stylesheet to import here — the widgets carry their own values, and the palette they are drawn from is [`MawyTokens`](#mawytokens) below. The two lists are the same list: every colour in this table has the field of the same name over there, value for value.

:::

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

## Palette

### `MawyTokens`

::: fw flutter

```dart
class MawyTokens {
  static const MawyTokens light;
  static const MawyTokens dark;
  static MawyTokens of(Brightness brightness);
}
```

Every colour a document and its chrome are drawn in, as one object. The fields are the `--mawy-*` custom properties above under the names Dart would give them — `background`, `backgroundSunken`, `backgroundRaised`, `chrome`, `foreground`, `foregroundMuted`, `foregroundSubtle`, `border`, `borderStrong`, `accent`, `accentHover`, `accentForeground`, `accentSoft`, `codeBackground`, `codeForeground`, `markBackground`, `markForeground`, and one per alert kind — and the values are the stylesheet's values, copied rather than re-chosen, so a colour that is `#5b34ea` in a browser is `#5b34ea` in an app.

The viewer picks `light` or `dark` from its own `colorScheme` and does not read a global. It does not yet take one as an argument, so what this export is for today is an application drawing its own chrome beside a document and wanting the same colours in it.

:::

::: fw react

**Flutter only.** In a browser the same palette is the `--mawy-*` custom properties above, which an application can also redeclare — the Dart side has no equivalent of that yet.

:::

### `MawyRadius` and `MawyMotion`

::: fw flutter

```dart
abstract final class MawyRadius {
  static const double small = 6; // a code span, a chip
  static const double medium = 9; // a button, a field
  static const double large = 14; // a card, a menu, a code block
}

abstract final class MawyMotion {
  static const Duration duration = Duration(milliseconds: 140);
  static const Cubic easing = Cubic(0.2, 0, 0.2, 1);
}
```

The corner radii, which are three sizes rather than a scale, and the one duration and one curve everything that moves uses. `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-duration` and `--mawy-easing`, in Dart.

:::

::: fw react

**Flutter only** — `--mawy-radius-*`, `--mawy-duration` and `--mawy-easing` are the same values in the stylesheet above.

:::

## Parser

::: fw react

**Flutter only.** The React package's parser is internal: `MawyViewer` and `MawyEditor` are the supported surface, and the tree behind them is not exported, so it can change without being a breaking change. The three entries below are `package:mawy/mawy.dart`'s.

:::

::: fw flutter

Exported as well as used, because a Dart application that wants the outline of a document, or its footnotes, or its headings' anchors, has no other way to get at them.

:::

### `parseMarkdown`

```dart
MdDocument parseMarkdown(String source, [MawyParseOptions options = const MawyParseOptions()]);
```

Reads `source` as Markdown. This is the same call the viewer makes, with the same options, so a document parsed here and a document drawn there are the same tree.

### `MdDocument`

```dart
class MdDocument {
  final MdRoot root; // the blocks
  final List<MdOutlineEntry> outline; // every heading, in order, each with a unique slug
  final List<MdFootnoteDefinition> footnotes; // the ones something pointed at, in that order
}
```

A parsed document: the tree, its outline, and the footnotes under it. The footnotes are not in `root` — a footnote is written wherever it suits the author and read at the bottom — so whatever draws a document draws these after it.

Every node class is exported with it: `MdHeading`, `MdParagraph`, `MdCode`, `MdList`, `MdTable`, `MdLink`, `MdImage` and the rest, each carrying the `MdRange` it was written at. They are the React package's node types under the same names.

### `slugify`

```dart
String slugify(String text);
```

A heading's anchor, in the spelling GitHub uses. Matching GitHub matters more than any particular scheme would: the anchors in a README are written by hand against it, so a document linking to `#getting-started` is linking to whatever GitHub would have called that heading.
