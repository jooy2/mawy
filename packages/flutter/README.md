<div align="center">

# Mawy for Flutter

**A Markdown viewer that draws the document rather than a string of HTML.**

[![pub package](https://img.shields.io/pub/v/mawy.svg)](https://pub.dev/packages/mawy)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

</div>

> [!IMPORTANT] **`0.1.0`, and early.** The viewer is written and tested; the
> editor is the React package's for now. It is a `0.x`, which means the API can
> still change between minor versions — pin the version if that matters to you.

```bash
flutter pub add mawy
```

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: '# Hello\n\nSome **Markdown**.')
```

## Why this package

- **The parser is ours, and it is the React package's parser.** Not a port in
  spirit — the same files, the same functions, the same rules, in Dart.
  `tool/parity.dart` runs both over every Markdown file in the repository and
  diffs the trees, so a document that means one thing in a browser means the
  same thing in an app because it is checked rather than hoped for.
- **The document becomes widgets, not markup.** There is no HTML on the path
  from Markdown to the screen, which is what makes the safe default free: there
  is nothing to escape and nowhere for an injection to arrive.
- **Every URL is checked**, in the same allowlist the React package uses. A
  `[click](javascript:…)` is drawn as the words the author wrote rather than as
  a link that does nothing — and nothing is opened at all until you say what
  opening means, through `onLinkTap`.
- **No Material, no Cupertino.** Every widget is built on
  `package:flutter/widgets.dart`, so a document sits inside a Material app, a
  Cupertino app or a bare `WidgetsApp` without dragging a second design system
  in behind it.
- **The typography is the reader's.** The toolbar sets the typeface, the size,
  the line height, the letter spacing and how wide the column runs, and reports
  what they chose so an application can remember it.

## What it reads

CommonMark, plus GitHub's additions: tables with per-column alignment, task
lists, `~~strikethrough~~`, bare URLs, footnotes, and the five alert kinds — and
definition lists, which GitHub does not read. Link reference definitions resolve
wherever in the file they are written.

Raw HTML is shown as the characters it was written with, and there is no option
to make it otherwise: Flutter has no HTML to draw it as. That is the one place
this package and the React one differ about a document, and it is a difference
in what a screen can do rather than in what the document says.

## Using it

```dart
MawyViewer(
  value: document,
  colorScheme: MawyColorScheme.system,
  onLinkTap: (String url, String? title) => launchUrlString(url),
)
```

|                                                           |                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `value`                                                   | The document, as Markdown                                                             |
| `parse`                                                   | `MawyParseOptions(gfm:, breaks:, definitionLists:)`                                   |
| `colorScheme`                                             | `light`, `dark`, or `system` — and `onColorSchemeChange` to let the toolbar change it |
| `typography` / `defaultTypography` / `onTypographyChange` | How the document is set, owned by you or by the viewer                                |
| `toolbar`                                                 | The controls to draw, in order. `const []` for none                                   |
| `locale`                                                  | `MawyLocale.en` or `MawyLocale.ko`, for the viewer's own chrome                       |
| `onLinkTap`                                               | What a tapped link does. Nothing at all without it                                    |

## The gallery

`example/` is the viewer running, with a few documents to point it at:

```bash
cd packages/flutter/example
flutter run
```

## Related

- [`mawy-react`](https://www.npmjs.com/package/mawy-react) — the same library for
  React, with the editor as well as the viewer.
- [The documentation](https://mawy.cdget.com) — one site, both packages.
