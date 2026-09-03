<div align="center">

# Mawy for Flutter

**A Markdown editor and viewer that draw the document rather than a string of HTML.**

[![pub package](https://img.shields.io/pub/v/mawy.svg)](https://pub.dev/packages/mawy)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

</div>

> [!IMPORTANT] **`1.0.0`.** The parser, the viewer and the editor are written
> and tested. `wysiwyg` is the one surface this package does not have, and [the
> guide says why](https://mawy.cdget.com/guide/editor). The exported API is
> under semantic versioning from here: a name that goes away or changes shape
> waits for a major version.

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

## The editor

The Markdown source with its syntax coloured, a live preview beside it, a
formatting toolbar and a status bar that counts:

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

Three surfaces rather than the React package's four — `plain`, `split` and
`preview`. `wysiwyg` there edits the document where it is drawn and rests
entirely on `contenteditable`, which Flutter has nothing of; the drawn surface
here stays a viewer. Everything else is the same functions under the same names,
diffed against the React package's by `tool/parity.dart`.

## What it reads

CommonMark, plus GitHub's additions: tables with per-column alignment, task
lists, `~~strikethrough~~`, bare URLs, footnotes, and the five alert kinds — and
definition lists, which GitHub does not read. Link reference definitions resolve
wherever in the file they are written.

This is the React package's parser, function for function, and it answers 640 of
the CommonMark specification's 652 examples. That suite is run over there rather
than here, and it does not need running twice: `tool/parity.dart` diffs the two
parsers' trees over every awkward case and every Markdown file in the
repository, so a tree that is right in TypeScript is the tree this one
produces.

Code blocks are coloured by whatever `highlight` is given, and by nothing at all
by default. `mawyHighlighter` is this package's own — the React package's
highlighter in Dart, diffed against it token for token by `tool/parity.dart` —
and an application that never names it never carries the grammars behind it.

Raw HTML is shown as the characters it was written with, and there is no option
to make it otherwise: Flutter has no HTML to draw it as. That is the one place
this package and the React one differ about a document, and it is a difference
in what a screen can do rather than in what the document says.

A document can also carry a construct this package has never heard of:

```md
:::callout[Careful]{kind=warning}
Blocks, parsed as blocks.
:::
```

The parser reads the shape and stops there. `directives` says what each name
becomes, and a builder is handed the name, the attributes and the pieces already
drawn, so it composes widgets rather than markup. A name nobody claimed is shown
as the characters it was written with. `::name{…}` on a line of its own and
`:name[…]` inside a sentence are the other two shapes.

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
| `locale`                                                  | `MawyLocale.en` or `MawyLocale.ko`, for the viewer's own interface                    |
| `onLinkTap`                                               | What a tapped link does. Nothing at all without it                                    |
| `directives`                                              | What draws the constructs this package does not know about, by name                   |

## The gallery

`example/` is the viewer running, with a few documents to point it at:

```bash
cd packages/flutter/example
flutter run
```

## A note on size

The icon font is the one thing this package adds that is not small:
`lucide_icons_flutter` ships its variable faces whole, and Flutter's icon
tree-shaking barely dents a variable font — about 3 MB in a build. In an app
bundle that is ordinary and it buys the same icons the React package draws. On
the web it is 3 MB somebody downloads, so a web build that cares should say so
with `--no-tree-shake-icons` off the list of things to try and a different icon
source on it.

## Related

- [`mawy-react`](https://www.npmjs.com/package/mawy-react) — the same library for
  React, with the editor as well as the viewer.
- [The documentation](https://mawy.cdget.com) — one site, both packages.
