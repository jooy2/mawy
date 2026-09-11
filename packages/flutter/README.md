<img src="https://mawy.cdget.com/512x512.png" alt="Mawy" width="128" height="128" />

# Mawy for Flutter

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jooy2/mawy/blob/main/LICENSE) [![pub package](https://img.shields.io/pub/v/mawy.svg)](https://pub.dev/packages/mawy)

### [**mawy.cdget.com**](https://mawy.cdget.com)

Guides and the full API. This README is the quick start.

---

**Write a Markdown document, and read it, in the same place.**

Mawy is a Markdown editor and a Markdown viewer standing on one parser and one renderer. It reads CommonMark and GitHub's additions itself, then turns the result into widgets rather than a string of HTML — a document arrives as a tree your app can style, not as markup it has to trust. An author writes the source with a live preview beside it. A reader gets that document as it was written, with the typeface, the text size, the line height, the column width and the palette under their own hand.

![The Mawy editor in split view: the Markdown source on the left, the document it draws on the right](https://raw.githubusercontent.com/jooy2/mawy/main/.github/media/editor-split.png)

- **The parser is written here, and it is the React package's parser.** The same files, the same functions and the same rules, in Dart. `tool/parity.dart` runs both over every Markdown file in the repository and diffs the trees, so a document that means one thing in a browser is checked to mean the same thing in an app.
- **Nothing is injected.** There is no HTML on the path from Markdown to the screen, so there is nothing to escape and nowhere for an injection to arrive.
- **Every URL is checked**, against the same allowlist the React package uses. A `[click](javascript:…)` is drawn as the words the author wrote rather than as a link that does nothing. No link is opened at all until the application defines what opening means, through `onLinkTap`.
- **No Material, no Cupertino.** Every widget is built on `package:flutter/widgets.dart`, so a document sits inside a Material app, a Cupertino app or a bare `WidgetsApp` without pulling in a second design system.
- **The reader controls the typography.** The toolbar sets the typeface, the size, the line height, the letter spacing and how wide the column runs, and reports what the reader chose so an application can remember it.

The exported names are under semantic versioning: one that goes away or changes shape waits for a major version.

## Install

```bash
flutter pub add mawy
```

Flutter 3.32 or later and the Dart SDK that comes with it. The one dependency is [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter), for the toolbar's icons.

`package:mawy/mawy.dart` is the only import you need.

## Showing a document

```dart
import 'package:mawy/mawy.dart';

MawyViewer(
  value: document,
  colorScheme: MawyColorScheme.system,
  onLinkTap: (String url, String? title) => launchUrlString(url),
)
```

That gives you a finished reader: the rendered document, and a toolbar for the typeface, text size, line height, letter spacing, column width, light or dark theme, and an outline of the headings. None of it changes the document.

| Argument                                                  | What it is                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `value`                                                   | The document, as Markdown                                                             |
| `parse`                                                   | `MawyParseOptions(gfm:, breaks:, definitionLists:)`                                   |
| `colorScheme`                                             | `light`, `dark`, or `system`, with `onColorSchemeChange` to let the toolbar change it |
| `typography` / `defaultTypography` / `onTypographyChange` | How the document is set, owned by you or by the viewer                                |
| `toolbar`                                                 | The controls to draw, in order. `const []` for none                                   |
| `locale`                                                  | `MawyLocale.en` or `MawyLocale.ko`, for the viewer's own interface                    |
| `onLinkTap`                                               | What a tapped link does. Nothing at all without it                                    |
| `directives`                                              | What draws the constructs this package does not know about, by name                   |

## Writing a document

```dart
MawyEditor(defaultValue: '# Hello', onChange: save);
```

You get the Markdown source with its syntax coloured, a live preview beside it, a formatting toolbar, and a status bar that counts lines, words and characters.

This package has three surfaces: `plain`, `split` and `preview`. The React package's fourth surface, `wysiwyg`, edits the document where it is drawn and rests entirely on `contenteditable`, which Flutter has no equivalent of, so the drawn surface here stays a viewer. Everything else is the same functions under the same names, diffed against the React package's by `tool/parity.dart`.

## Supported syntax

CommonMark, plus GitHub's additions: tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs, footnotes, and the five alert kinds. Definition lists are also read, which GitHub does not do. Link reference definitions resolve wherever in the file they are written.

This is the React package's parser, function for function, and it passes 640 of the CommonMark specification's 652 examples. That suite runs against the TypeScript parser and does not need running twice. `tool/parity.dart` diffs the two parsers' trees over every awkward case and every Markdown file in the repository, so a tree that is right in TypeScript is the tree this one produces.

Code blocks are coloured by whatever `highlight` is given, and by nothing at all by default. `mawyHighlighter` is the React package's highlighter in Dart, diffed against it token for token by `tool/parity.dart`. An application that never references it never carries the grammars behind it.

Raw HTML is shown as the characters it was written with, and there is no option to change that, because Flutter has no HTML to draw it as. It is the one place this package and the React one differ about a document, and the difference is in what the screen can do rather than in what the document says.

## Directives

A document can carry a construct this package has never heard of:

```md
:::callout[Careful]{kind=warning}
Blocks, parsed as blocks.
:::
```

The parser reads the shape and stops there. `directives` says what each name becomes, and a builder is handed the name, the attributes and the pieces already drawn, so it composes widgets rather than markup. An unregistered name is shown as the characters it was written with. `::name{…}` on a line of its own and `:name[…]` inside a sentence are the other two shapes.

## The gallery

`example/` is the viewer running, with a few documents to point it at:

```bash
cd packages/flutter/example
flutter run
```

## A note on size

The icon font is the one large item this package adds. `lucide_icons_flutter` ships its variable faces whole, and Flutter's icon tree-shaking removes very little from a variable font, so it adds about 3 MB to a build. That is ordinary in an app bundle, and it provides the same icons the React package draws. On the web it is 3 MB the reader downloads, and `--no-tree-shake-icons` does not help there; a web build that needs the size back should use a smaller icon source instead.

## Related

- [The documentation](https://mawy.cdget.com) — one site for both packages, with every component, type and function on a page of its own.
- [`mawy-react`](https://www.npmjs.com/package/mawy-react) — the same library for React, with the drawn document edited in place as well.

## License

[MIT](LICENSE) © [CDGet](https://cdget.com)
