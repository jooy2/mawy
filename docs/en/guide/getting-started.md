---
title: Getting started
order: 1
---

# Getting started

Mawy ships as one package per framework, and they are one library rather than two: the same parser, the same reading of a document, the same palette down to the hex. Pick yours in the sidebar — the switch is above the menu, and it changes what every page on this site says.

|  |  |  |
| --- | --- | --- |
| **React** | [`mawy-react`](https://www.npmjs.com/package/mawy-react) on npm | The viewer **and** the editor |
| **Flutter** | [`mawy`](https://pub.dev/packages/mawy) on pub.dev | The viewer |

::: warning Early, and versioned as such

`0.1.0` is the first release of both. Everything on this page is real and runs — this site draws both packages from the same source you install — but a `0.x` may change its API between minor versions. Pin the version if that matters, and follow the [changelog](../changelog).

:::

## Requirements

::: fw react

- **React 18 or 19**, as a peer dependency, along with `react-dom`.
- **Node.js 20.19 or later** to build with.
- A browser with `contenteditable`, `Selection` and `beforeinput` — every current one.

:::

::: fw flutter

- **Flutter 3.32 or later**, and the Dart SDK that comes with it.
- Nothing else. The package imports neither Material nor Cupertino, so it sits inside a `MaterialApp`, a `CupertinoApp` or a bare `WidgetsApp` without dragging a second design system in behind it.

:::

## Install

::: fw react

```bash
npm install mawy-react
```

`react` and `react-dom` are peer dependencies. If your project already has one of them, that is the copy Mawy uses.

The one runtime dependency is [`lucide-react`](https://lucide.dev), which is where the toolbar's icons come from. It is ISC-licensed, brings nothing else with it, and is tree-shaken down to the dozen glyphs actually drawn.

:::

::: fw flutter

```bash
flutter pub add mawy
```

The one dependency is [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter), which is where the toolbar's icons come from — the same set `lucide-react` draws, which is what makes the two toolbars the same toolbar. It is MIT-licensed and brings nothing else with it. It is also the one thing here that is not small: about 3 MB of variable font in a build, which is ordinary in an app bundle and worth knowing about on the web.

:::

### How big it is

::: fw react

| What you import         | gzipped |
| ----------------------- | ------- |
| `MawyViewer`            | 23.0 kB |
| `MawyEditor`            | 38.9 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 5.5 kB  |

React is not counted, because your application already has it; `lucide-react` is, because it arrives with this. **A page that only reads documents does not ship the editor** — the toolbar, the undo history, the paste pipeline and every `contenteditable` surface fall out of the bundle, and the fifteen kilobytes between the first two rows are what that is worth.

The numbers are a real bundle of the published files rather than an estimate, they are recorded in `packages/react/size-budget.json`, and CI fails a change that goes over one. So they are what you get rather than what we hope.

:::

::: fw flutter

An app bundle is not measured the way a page is, and the one number worth knowing here is the icon font's — about 3 MB, as above. This section is the React package's.

:::

## Wiring up

::: fw react

Add one line to your application's CSS entry point:

```css
@import 'mawy-react/styles.css';
```

The stylesheet is finished CSS — no build-side setup, no plugin, no configuration. Everything the library draws goes through `--mawy-*` custom properties, so theming is a matter of redeclaring a token rather than out-specifying a rule. Tokens cascade, which means one declaration on a wrapping element reaches every Mawy surface inside it.

:::

::: fw flutter

Nothing to wire. The palette travels with the widget rather than through a global, which is what lets one document be dark inside a light screen:

```dart
import 'package:mawy/mawy.dart';
```

:::

## Showing a document

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

export function Page({ document }: { document: string }) {
  return <MawyViewer value={document} />;
}
```

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

:::

That is a finished reader: the document rendered, and a toolbar for the things a reader wants to change about it — the text size, the line height, the theme, the width of the column. None of it touches the document.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

## Choosing what the toolbar has

::: fw react

```tsx
<MawyViewer value={document} toolbar={['fontSize', 'colorScheme']} />
```

`true` is all of it, `false` is none of it, and an array is exactly those controls in exactly that order.

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  toolbar: const <MawyViewerToolbarItem>[
    MawyViewerToolbarItem.fontSize,
    MawyViewerToolbarItem.colorScheme,
  ],
);
```

`kMawyViewerToolbar` is all of it and `const []` is none of it; a list is exactly those controls in exactly that order.

:::

[The viewer](./viewer#the-toolbar) lists them.

## Writing a document

::: fw react

```tsx
import { MawyEditor } from 'mawy-react';

export function Page() {
  return <MawyEditor defaultValue="# Hello" onChange={save} />;
}
```

The Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar whose every command is also a keyboard shortcut, and a status bar that counts. [The editor](./editor) has the rest.

:::

::: fw flutter

The Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar and a status bar that counts:

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

Three surfaces rather than the React package's four — `plain`, `split` and `preview`. The one that is missing is `wysiwyg`, which edits the document where it is drawn and rests entirely on `contenteditable`; Flutter has nothing of the kind, and the drawn surface here stays a viewer. [The editor](./editor) has the reasoning.

:::

## Or no document at all

::: fw react

`value` is optional, and leaving it out is not an empty state — it is the other half of the component. With nothing to show, the viewer **is** a file picker: drop a `.md` file on it, or choose one.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

:::

::: fw flutter

`value` is required. Opening a file means a file picker, which means a plugin — a dependency this package does not have and an application usually already does. So reading the file is yours and drawing it is Mawy's.

:::

## What the package holds today

::: fw react

|  |  |
| --- | --- |
| `MawyViewer` | The read-only viewer. [Guide](./viewer), [API](../api/#mawyviewer) |
| `MawyEditor` | The editor. [Guide](./editor) |
| `mawy-react/highlight` | The syntax highlighter, in an entry point of its own |
| `mawy-react/styles.css` | The stylesheet, above |
| Types | `MawyMode`, `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyHtmlPolicy`, `MawyHighlight`, `MawyImageUpload`, and the toolbar and status item types |

The types are also available from `mawy-react/types`, so an application can name one in its own props without importing a component to get at it.

:::

::: fw flutter

|  |  |
| --- | --- |
| `MawyViewer` | The read-only viewer. [Guide](./viewer) |
| `MawyEditor` | The editor: source, preview, and a switch. [Guide](./editor) |
| `parseMarkdown` | The parser, and the whole `Md*` tree it produces |
| `MawyTokens` | The palette, as `MawyTokens.light` and `MawyTokens.dark` — and `copyWith` for one of your own |
| `mawyHighlighter` | The syntax highlighter, which a build keeps only if you name it |
| Types | `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyViewerToolbarItem`, `MawyTokensBuilder`, `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind`, `MawyMatch` |

One import gets all of it: `package:mawy/mawy.dart`.

:::

## Next

- [**The viewer**](./viewer) — rendering a document without editing it.
- [**The editor**](./editor) — the WYSIWYG and plain surfaces, and switching between them. React only, for now.
- [**API**](../api/) — every component and every option.
