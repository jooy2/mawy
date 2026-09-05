---
title: Getting started
order: 1
---

# Getting started

Mawy ships as one package per framework, and the two are one library. They share the parser, the reading of a document, and the palette down to the colour values. Pick yours in the sidebar. The switch sits above the menu, and it changes what every page on this site says.

|  |  |  |
| --- | --- | --- |
| **React** | [`mawy-react`](https://www.npmjs.com/package/mawy-react) on npm | The viewer and the editor |
| **Flutter** | [`mawy`](https://pub.dev/packages/mawy) on pub.dev | The viewer and the editor |

::: tip Versioning at `1.0.0`

Both packages are published at `1.0.0`. This site draws both packages from the same source you install, so everything on this page runs. From here the exported API is under semantic versioning, so a name that goes away or changes shape waits for a major version. The [changelog](../changelog) records each release.

:::

## Requirements

::: fw react

- **React 18 or 19**, as a peer dependency, along with `react-dom`.
- **Node.js 20.19 or later** to build with.
- A browser with `contenteditable`, `Selection` and `beforeinput`. Every current browser has them.

:::

::: fw flutter

- **Flutter 3.32 or later**, and the Dart SDK that comes with it.
- Nothing else. The package imports neither Material nor Cupertino, so it sits inside a `MaterialApp`, a `CupertinoApp` or a bare `WidgetsApp` without pulling in a second design system.

:::

## Install

::: fw react

```bash
npm install mawy-react
```

`react` and `react-dom` are peer dependencies. If your project already has them, those are the copies Mawy uses.

The one runtime dependency is [`lucide-react`](https://lucide.dev), which provides the toolbar's icons. It is ISC-licensed, installs nothing else, and is tree-shaken down to the dozen glyphs actually drawn.

:::

::: fw flutter

```bash
flutter pub add mawy
```

The one dependency is [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter), which provides the toolbar's icons. It is the same set `lucide-react` draws, so both toolbars show the same icons. It is MIT-licensed and installs nothing else. It is also the one large item here: about 3 MB of variable font in a build, which is ordinary in an app bundle and worth checking on the web.

:::

### Bundle size

::: fw react

| What you import         | Gzipped |
| ----------------------- | ------- |
| `MawyViewer`            | 26.8 kB |
| `MawyEditor`            | 44.8 kB |
| `mawy-react/markdown`   | 10.5 kB |
| `mawy-react/highlight`  | 2.8 kB  |
| `mawy-react/styles.css` | 6.0 kB  |

React is not counted, because your application already has it. `lucide-react` is counted, because it installs with the package. **A page that only reads documents does not ship the editor.** The toolbar, the undo history, the paste pipeline and every `contenteditable` surface fall out of the bundle, which saves 17 kB.

`mawy-react/markdown` is the parser on its own, for an application that wants a document's outline or its footnotes without drawing anything. `mawy-react/server` ships **nothing at all** to a browser: it draws the document on a server and sends HTML, so it has no size to record here.

The numbers are measured from a real bundle of the published files. They are recorded in `packages/react/size-budget.json`, and CI fails a change that goes over one.

:::

::: fw flutter

An app bundle is not measured the way a page is. The one number to check here is the icon font's 3 MB, as above. The rest of this section applies to the React package only.

:::

## Wiring up

::: fw react

Add one line to your application's CSS entry point:

```css
@import 'mawy-react/styles.css';
```

The stylesheet is finished CSS: no build-side setup, no plugin, no configuration. Everything the library draws goes through `--mawy-*` custom properties, so you theme it by redeclaring a token instead of competing on selector specificity. Tokens cascade, so one declaration on a wrapping element reaches every Mawy surface inside it.

:::

::: fw flutter

Nothing to wire. The palette travels with the widget instead of through a global, so one document can be dark inside a light screen:

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

That gives you a finished reader: the rendered document, and a toolbar for the text size, the line height, the theme and the column width. None of it changes the document itself.

<MawyDemo name="viewer/basic" flutter="viewer/basic" :height="520" />

## Choosing the toolbar controls

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

You get the Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar whose every command is also a keyboard shortcut, and a status bar that counts lines, words and characters. [The editor](./editor) has the rest.

:::

::: fw flutter

You get the Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar, and a status bar that counts lines, words and characters:

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

This package has three surfaces: `plain`, `split` and `preview`. The React package's fourth surface, `wysiwyg`, is missing here. It edits the document where it is drawn and rests entirely on `contenteditable`, which Flutter has no equivalent of, so the drawn surface here stays a viewer. [The editor](./editor) has the reasoning.

:::

## Or no document at all

::: fw react

`value` is optional. With nothing to show, the viewer becomes a file picker: drop a `.md` file on it, or choose one.

```tsx
<MawyViewer onValueChange={(markdown, file) => save(file?.name, markdown)} />
```

:::

::: fw flutter

`value` is required. Opening a file needs a file-picker plugin, which this package does not include and an application usually already has. Your application reads the file, and Mawy draws it.

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

The types are also available from `mawy-react/types`, so an application can name one in its own props without importing a component.

:::

::: fw flutter

|  |  |
| --- | --- |
| `MawyViewer` | The read-only viewer. [Guide](./viewer) |
| `MawyEditor` | The editor: source, preview, and a switch. [Guide](./editor) |
| `parseMarkdown` | The parser, and the whole `Md*` tree it produces |
| `MawyTokens` | The palette, as `MawyTokens.light` and `MawyTokens.dark`, with `copyWith` for one of your own |
| `mawyHighlighter` | The syntax highlighter, which a build keeps only if you reference it |
| Types | `MawyColorScheme`, `MawyLocale`, `MawyTypography`, `MawyFontFamily`, `MawyMeasure`, `MawyParseOptions`, `MawyViewerToolbarItem`, `MawyTokensBuilder`, `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind`, `MawyMatch` |

`package:mawy/mawy.dart` is the only import you need.

:::

## Next

- [**The playground**](./playground) — both components with nothing switched off, to type into.
- [**The viewer**](./viewer) — rendering a document without editing it.
- [**The editor**](./editor) — the source, the preview and switching between them, plus the drawn document edited in place in React.
- [**API**](../api/) — every component and every option.
