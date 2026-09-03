---
title: API
order: 2
---

# API

This page lists everything the package exports, with what each one is, what it takes and what it gives back.

:::: tip `1.0.0`

Both packages are published at `1.0.0`. From here the names on this page are under semantic versioning: one that goes away or changes shape waits for a major version.

Everything on this page exists and runs, in whichever package the switch above the menu is set to. A name only the other package has is not on this page at all while that one is selected.

::::

## Components

### `MawyEditor`

A Markdown editor with the viewer beside it. See [the editor](../guide/editor).

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

<MawyEditor defaultValue="# Hello" onChange={save} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyEditor(defaultValue: '# Hello', onChange: save);
```

Built on `package:flutter/widgets.dart` alone, like the viewer, and holding its own document unless it is handed one.

:::

#### The document

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, when the application owns it. |
| `defaultValue` | `string` | `''` | The document to start with, when the editor is to keep it. |
| `onChange` | `(value: string) => void` | — | Every change, controlled or not. |
| `readOnly` | `boolean` | `false` | The document can still be read, selected and copied. |
| `placeholder` | `string` | a localised prompt | Shown while the document is empty. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `String?` | — | The document, when the application owns it. |
| `defaultValue` | `String` | `''` | The document to start with, when the editor is to keep it. |
| `onChange` | `ValueChanged<String>?` | — | Every change, held or handed over. |
| `readOnly` | `bool` | `false` | The document can still be read, selected and copied. |
| `placeholder` | `String?` | a localised prompt | Shown while the document is empty. |

The two arrangements are the ones every text field in Flutter offers, and they are the React package's as well.

:::

#### Surfaces

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | [`MawyMode`](#mawymode) | — | Which surface, when the application owns it. |
| `defaultMode` | `MawyMode` | the first of `modes` | Which surface to start on. |
| `onModeChange` | `(mode: MawyMode) => void` | — | Called whenever it changes. |
| `modes` | `readonly MawyMode[]` | `['wysiwyg', 'plain', 'split', 'preview']` | Which surfaces the switch offers. Give it one and the switch disappears. |

`'wysiwyg'` draws the document and edits it in place. It is the first of the default list; leave it out of `modes` to not offer it.

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `mode` | [`MawyEditorMode?`](#mawyeditormode) | — | Which surface, when the application owns it. |
| `defaultMode` | `MawyEditorMode` | `MawyEditorMode.split` | Which surface to open on. |
| `onModeChange` | `ValueChanged<MawyEditorMode>?` | — | Called when the reader picks a different one. |
| `modes` | `List<MawyEditorMode>` | [`kMawyEditorModes`](#kmawyeditormodes) | Which surfaces the switch offers. Give it one and the switch disappears. |

**Three surfaces rather than the React package's four**, and the missing one is `wysiwyg`. Editing a document where it is drawn rests entirely on `contenteditable` — a browser telling a component what somebody tried to do to a tree, so the component can refuse it and change the Markdown instead — and Flutter has nothing of the kind: an `EditableText` owns a string. Drawing a document that is also a text field would mean a second model of what the document is, and the two disagree the first time anybody writes something unusual.

:::

#### The interface

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `toolbar` | [`MawyEditorToolbarOption`](#mawyeditortoolbaroption) | `true` | Which controls the toolbar has, and in what order. |
| `status` | [`MawyEditorStatusOption`](#mawyeditorstatusoption) | `true` | What the status bar counts. |
| `lineNumbers` | `boolean` | `true` | The gutter down the left of the source. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | The language of the editor's own interface — toolbar labels, menu entries, the words along the status bar, the text a screen reader is given. Handed to the preview as well. Nothing to do with the document. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `toolbar` | `List<MawyEditorToolbarItem>` | [`kMawyEditorToolbar`](#kmawyeditortoolbar) | Which controls the toolbar has, and in what order. `const []` for none. |
| `status` | `List<MawyEditorStatusItem>` | [`kMawyEditorStatus`](#kmawyeditorstatus) | What the status bar counts. `const []` for none. |
| `lineNumbers` | `bool` | `true` | The gutter down the leading edge of the source. |
| `locale` | [`MawyLocale`](#mawylocale) | `MawyLocale.en` | The language of the editor's own interface — toolbar labels, menu entries, the words along the status bar, the text a screen reader is given. Handed to the preview as well. Nothing to do with the document. |

A list rather than a `true`, for the same reason the viewer's [`toolbar`](#mawyviewer) is one.

:::

#### Opening and saving

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `onSave` | `(value: string, name: string) => void` | — | Where a saved document goes. Without it the browser is handed a download. |
| `accept` | `string` | every Markdown and text extension | What the file picker offers. |
| `fileDrop` | `boolean` | `false` | Whether a Markdown file dropped on the editor opens as the document. |

The name is the file's own when one was opened, and the document's first heading otherwise. A file dropped on the editor is an image rather than a document unless `fileDrop` says otherwise — see [opening and saving](../guide/editor#opening-and-saving) for why, and for what turning it on changes.

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `onOpen` | `VoidCallback?` | — | What opening a document means. Without one there is no `open` button and no empty state offering to fill the editor. |

**No `onSave`, no `accept`, and no `save`.** A file picker is a plugin rather than a widget, and which one an application has already chosen is not a decision a Markdown editor should make on its behalf. `value` and `onChange` are the whole of the seam: read the file, hand over the string, take the string back.

`onOpen` is the button and not the picker. The editor draws the control and says when it is worth offering — on the toolbar, and in the pane of an editor holding nothing — and what a press of it opens is entirely yours.

:::

#### Finding

::: fw flutter

`Mod`+`F` opens a find bar over the source, and [`MawyEditorToolbarItem.find`](#mawyeditortoolbaritem) is the button that does the same thing. `Enter` is the next match, `Shift`+`Enter` the one before, `Escape` closes it and gives the focus back to the document.

It is there because a platform's own find reaches a page of text and not the inside of a text field, and the source surface is one. The arithmetic is exported as well — `findMatches`, `matchFrom`, `replaceMatch`, `replaceAll` and `MawyMatch` — for an application that would rather drive it from its own interface.

:::

::: fw react

`Mod`+`F` opens the find bar over whichever surface is showing. See [finding](../guide/editor#finding).

:::

#### The preview, and the palette

::: fw react

`parse`, `html`, `fonts`, `directives`, `typography`, `defaultTypography`, `colorScheme`, `defaultColorScheme`, `onColorSchemeChange` mean exactly what they mean on [`MawyViewer`](#mawyviewer), and the first six are passed straight through to the preview. `directives` reaches the drawn document as well.

:::

::: fw flutter

`parse`, `directives`, `highlight`, `onLinkTap`, `typography`, `defaultTypography`, `colorScheme`, `onColorSchemeChange` and `tokens` mean exactly what they mean on [`MawyViewer`](#mawyviewer), and are passed straight through to the preview.

`tokens` reaches further than the preview: the editor's own toolbar, status bar and find bar are drawn from the palette it returns, so an editor and the document it is editing are never two palettes.

:::

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
| `linkTarget` | `'blank' \| 'self'` | `'blank'` | Where a link the document wrote opens. |
| `locale` | [`MawyLocale`](#mawylocale) | `'en'` | The language of the viewer's own interface. Nothing to do with the document. |
| `directives` | [`MawyDirectives`](#mawydirectives) | — | What draws the constructs this package does not know about. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](#mawyparseoptions) | `MawyParseOptions()` | How the Markdown is read. |
| `locale` | [`MawyLocale`](#mawylocale) | `MawyLocale.en` | The language of the viewer's own interface. Nothing to do with the document. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | What a tapped link does. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](#mawydirectivebuilder)`>?` | — | What draws the constructs this package does not know about. |

There is no `linkTarget` either. What opening a link means is `onLinkTap`'s whole subject here, and where it opens is part of what an application answers with.

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
| `tokens` | [`MawyTokensBuilder`](#mawytokens)`?` | the stylesheet's own | The colours to draw in, given the brightness the viewer settled on. |
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

#### Layout and scrolling

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `padding` | `EdgeInsetsGeometry?` | the React package's own numbers | The space around the document. |
| `scrollController` | `ScrollController?` | one of its own | The document's scroller, so an application can drive it or watch it. |
| `anchors` | `MawyViewerAnchors?` | — | Where each top-level block of the document ends up, filled in as it draws — for anything lining a second view up with this one. |

:::

::: fw react

Padding and scrolling are the page's rather than the component's — the viewer is an element in a document that already has both. The numbers it draws with are `--mawy-*` custom properties, which the stylesheet below lists.

:::

## Types

::: fw react

Exported from `mawy-react` and from `mawy-react/types`. The second entry point exists so an application can name one of these in its own props without importing a component to get at it.

:::

::: fw flutter

Exported from `package:mawy/mawy.dart`, which is the whole of this package's public surface — one import, and nothing else to reach for.

:::

::: fw react

### `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';
```

Which surface a document is shown on. These are views of one document rather than four editors — see [the editor](../guide/editor).

- `'wysiwyg'` — the rendered document, edited in place.
- `'plain'` — the Markdown source, edited as text.
- `'preview'` — the rendered document, read-only.
- `'split'` — the source on one side and the preview on the other, at once.

`split` is on this list rather than beside it because of what a reader does with the control: the four are one group of buttons, one at a time, and "both" is the fourth answer to the same question.

:::

::: fw flutter

### `MawyEditorMode`

```dart
enum MawyEditorMode { plain, split, preview }
```

Which surface a document is shown on. Views of one document rather than three editors — see [the editor](../guide/editor).

- `plain` — the Markdown source, coloured, edited as text.
- `split` — the source on one side and the drawn document on the other, at once. The default.
- `preview` — the drawn document alone.

There is no `wysiwyg`, and there is not going to be. See [`MawyEditor`](#mawyeditor) above for why.

:::

::: fw flutter

### `kMawyEditorModes`

```dart
const List<MawyEditorMode> kMawyEditorModes;
```

All three in the order the switch offers them, and the default for `modes`. Give it one and the switch disappears.

:::

### `MawyEditorToolbarItem`

::: fw react

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
  | 'open'
  | 'save'
  | 'colorScheme'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyEditorToolbarItem {
  mode,
  bold,
  italic,
  strikethrough,
  code,
  link,
  image,
  heading,
  quote,
  bulletList,
  orderedList,
  taskList,
  codeBlock,
  rule,
  find,
  colorScheme,
  separator,
}
```

:::

One control on the editor's toolbar. Everything except `mode`, `find`, `colorScheme` and `separator` is a formatting command, and every one of those has a keyboard shortcut — the buttons are a way of finding the commands rather than the way of running them. `find` has one too, `Mod`+`F`, and it works whether or not the button is drawn.

::: fw react

`open` and `save` are here as well. `Mod`+`S` saves whether the button is drawn or not; `open` has no shortcut, because the browser's own `Mod`+`O` is a reasonable thing to leave alone and opening a file is a rare and deliberate act rather than one done mid-flow.

:::

::: fw flutter

There is no `open` and no `save`: both are the application's here — see [opening and saving](../guide/editor#opening-and-saving).

:::

::: fw react

### `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar; an array is exactly those, in that order.

:::

::: fw flutter

### `kMawyEditorToolbar`

```dart
const List<MawyEditorToolbarItem> kMawyEditorToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::

### `MawyEditorStatusItem`

::: fw react

```ts
type MawyEditorStatusItem = 'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';
```

:::

::: fw flutter

```dart
enum MawyEditorStatusItem { position, selection, lines, words, characters, size }
```

:::

What the editor counts along its bottom edge. `characters` are code points, so an emoji is one. `words` adds every Han, hiragana and katakana character to the space-separated count, because those are written without spaces; Korean is spaced, so an eojeol is one word. `size` is UTF-8 bytes, which is what a file on disk will be.

::: fw react

### `MawyEditorStatusOption`

```ts
type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];
```

`true` is everything on the list above; `false` is no status bar at all; an array is exactly those counts, in that order.

:::

::: fw flutter

### `kMawyEditorStatus`

```dart
const List<MawyEditorStatusItem> kMawyEditorStatus;
```

What the status bar counts unless it is told otherwise. `const []` is no status bar at all.

:::

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

**English and Korean**, and `en` is the default. It is the language of the viewer's and the editor's own interface — toolbar labels, menu entries, the text a screen reader is given — and has nothing to do with the language a document is written in. Both packages ship the same words under the same names; a locale that exists in one and not the other is not a locale this library has.

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

::: fw react

### `MawyHtmlPolicy`

```ts
type MawyHtmlPolicy = 'escape' | 'sanitize' | 'raw';
```

What becomes of raw HTML written inside a document.

- `'escape'` — it is shown as the characters it was written with. The default, and the only one that is safe without qualification.
- `'sanitize'` — it is drawn, with everything outside an allowlist of elements, attributes and URL schemes removed first.
- `'raw'` — it is drawn as written, and the caller owns what happens next.

None of the three affects links. `[click](javascript:…)` is refused under every policy, because it is Markdown rather than HTML and switching the HTML policy was never a statement about it.

:::

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

::: fw react

### `MawyFont`

```ts
interface MawyFont {
  id: string;
  label?: string;
  stack?: string;
  href?: string;
}
```

A typeface the toolbar offers, and the two lists below are the ones worth passing. A stylesheet fetched at the moment a font is first drawn is a browser's trick, which is why this is a list of them rather than a name.

- **`id`** — what `typography.fontFamily` is set to in order to choose this font.
- **`label`** — what the toolbar shows. `sans`, `serif` and `mono` take theirs from the locale when it is left out; anything else falls back to its `id`.
- **`stack`** — the CSS `font-family` value. Defaults to `var(--mawy-font-{id})`.
- **`href`** — a stylesheet that has to arrive before the font can be drawn. Fetched once per page, the first time the font is drawn or its name is shown in the typeface menu.

:::

::: fw react

### `MAWY_SYSTEM_FONTS`

```ts
const MAWY_SYSTEM_FONTS: readonly MawyFont[];
```

The three roles, drawn with whatever the reader's machine already has. None of them has an `href`, so the default viewer fetches nothing at all.

:::

::: fw react

### `MAWY_WEB_FONTS`

```ts
const MAWY_WEB_FONTS: readonly MawyFont[];
```

Thirteen open-licensed families, ready to be offered — every one under the SIL Open Font License, which permits commercial use, embedding and redistribution. Inter, IBM Plex Sans, Atkinson Hyperlegible, Source Serif 4, Literata, Lora, EB Garamond, JetBrains Mono, and five for Korean: Pretendard, Noto Sans KR, Noto Serif KR, Nanum Myeongjo and Gowun Dodum.

**It is never used unless an application passes it in.** A component embedded in somebody else's page has no business opening a connection to a font CDN they did not choose, so this is an export rather than a default:

```tsx
<MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
```

:::

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

::: fw react

### `MawyDirectives`

```ts
type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;
```

The directives an application knows, by name. A name that is not on the list is drawn as the characters it was written with — the same answer raw HTML gets under the default `html` policy.

:::

::: fw react

### `MawyDirectiveProps`

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

### `MawyDirective`

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

::: fw flutter

### `MawyDirectiveBuilder`

```dart
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);
```

What draws one directive. A `MawyDirectiveKind.text` one is placed in the sentence as a `WidgetSpan`, so a builder for an inline directive should return something that sits on a line of text — a `Text.rich` of its own is usually it.

:::

::: fw react

### `MawyRange`

```ts
interface MawyRange {
  start: number;
  end: number;
}
```

Where a piece of a document was written, in the offsets of the Markdown the component was given — the same two numbers every element carries as `data-mawy-range`, handed over as numbers where a component gets them directly. Today that is [`MawyDirectiveProps`](#mawydirectiveprops) and nothing else.

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
  | 'find'
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
  find,
  copy,
  separator,
}
```

:::

One control on the viewer's toolbar. `separator` draws a hairline rather than a control.

`find` opens a bar over the document, and takes `Ctrl`+`F` (`Cmd`+`F`) while the viewer has the focus. Leave it out and the shortcut belongs to the browser again, which is the right answer for a viewer that fills the page — this is for one inside a pane of its own, which a browser's find scrolls past rather than into. What it searches is the text the document _draws_: `bold` finds the word inside `**bold**`, and `**` finds nothing at all. A match cannot straddle two runs, so `hello` is not found across `he**llo**`, and a fenced code block is not searched.

::: fw flutter

There is no `open`, for the same reason there is no file picker: opening a file means a plugin this package does not have.

:::

::: fw react

### `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar at all; an array is exactly those controls, in exactly that order.

There is no way in either package to add a control that is not on the list. A toolbar that takes arbitrary children is one the library can no longer make keyboard-operable.

:::

::: fw flutter

### `kMawyViewerToolbar`

```dart
const List<MawyViewerToolbarItem> kMawyViewerToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::

::: fw react

## Stylesheet

### `mawy-react/styles.css`

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
| Finding | `--mawy-find`, `--mawy-find-current` |
| Alerts | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| Shape and motion | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

The class names the document is drawn with are `.mawy-md-*` and are also part of the supported surface, so an application can restyle a table or a code block without the library exposing a render prop for it.

:::

::: fw flutter

## Palette

### `MawyTokens`

```dart
class MawyTokens {
  static const MawyTokens light;
  static const MawyTokens dark;
  static MawyTokens of(Brightness brightness);
  MawyTokens copyWith({Brightness? brightness, Color? background, /* … */});
}

typedef MawyTokensBuilder = MawyTokens Function(Brightness brightness);
```

Every colour a document and its interface are drawn in, as one object. The fields are the React package's `--mawy-*` custom properties under the names Dart would give them — `background`, `backgroundSunken`, `backgroundRaised`, `chrome`, `foreground`, `foregroundMuted`, `foregroundSubtle`, `border`, `borderStrong`, `accent`, `accentHover`, `accentForeground`, `accentSoft`, `find`, `findCurrent`, `codeBackground`, `codeForeground`, `markBackground`, `markForeground`, and one per alert kind — and the values are the stylesheet's values, copied rather than re-chosen, so a colour that is `#5b34ea` in a browser is `#5b34ea` in an app.

The viewer picks `light` or `dark` from its own `colorScheme` and does not read a global, which is what lets one document be dark inside a light screen.

An application wanting its own colours passes `tokens`, which is a `MawyTokensBuilder` rather than one palette: the viewer settles on its brightness after it has been handed everything else, so a document following the platform has to be able to follow it in both. `copyWith` is how one is written — start from `MawyTokens.of(brightness)` and name what differs, rather than writing thirty-one colours to change one.

```dart
MawyViewer(
  value: document,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
);
```

The export is also for an application drawing its own interface beside a document and wanting the same colours in it.

### `MawyRadius` and `MawyMotion`

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

The corner radii, which are three sizes rather than a scale, and the one duration and one curve everything that moves uses. They are the React package's `--mawy-radius-*`, `--mawy-duration` and `--mawy-easing`, value for value, the way [`MawyTokens`](#mawytokens) is its colours.

:::

::: fw flutter

## Parser

Exported as well as used, because a Dart application that wants the outline of a document, or its footnotes, or its headings' anchors, has no other way to get at them.

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

:::
