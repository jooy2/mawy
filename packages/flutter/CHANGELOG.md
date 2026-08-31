# Changelog

> This package's history. Each language Mawy ships for keeps its own changelog beside its own manifest, because they version independently.

## 0.1.0 — 2026-08-31

The first release. Everything in it is new, so each entry says what a thing is rather than what it became.

### Added

- **`MawyViewer`** — a Markdown document, drawn and not editable. The document becomes widgets rather than a string of anything, so there is no markup on the path from Markdown to the screen: nothing to escape, and nowhere for an injection to arrive. Every widget is built on `package:flutter/widgets.dart` alone, so a document sits inside a Material app, a Cupertino app or a bare `WidgetsApp` without dragging a second design system in behind it.
- **The Markdown parser, which is the React package's parser.** Not a port in spirit — `ast.dart`, `source.dart`, `block.dart`, `inline.dart` and `parse.dart` are `ast.ts`, `source.ts`, `block.ts`, `inline.ts` and `parse.ts`, function for function and rule for rule. CommonMark, with emphasis resolved by the specification's own delimiter-stack rules; GitHub's additions — tables with per-column alignment, task lists, `~~strikethrough~~`, bare URLs and e-mail addresses, footnotes, and the five alert kinds; and definition lists, which GitHub does not read.
- **A check that the two parsers agree.** `tool/parity.dart` and the React package's `scripts/parity.mjs` print the same trees in the same shape, over every awkward case anybody has written down plus every Markdown file in the repository, and the two are diffed. Two implementations of CommonMark drift the moment nobody is comparing them, and a document that means one thing in a browser and another in an app is the bug this library exists to not have.
- **Every node knows where it came from.** A parsed node carries the range of the source it was read out of — through however many containers it was nested in, past the `>` a quotation puts on each line, the indent of a list item and the pipes around a table cell. Offsets are counted in the document as it was handed over rather than as the parser tidied it, so a file with Windows line endings, a byte order mark or a tab where an indent should be answers in its own characters.
- **A toolbar for how the document is set**, not for what it says: typeface, text size, line height, letter spacing, column width, light or dark, an outline of the headings, and the source to the clipboard. The glyphs are Lucide's, which is what the React package draws too — the two are the same toolbar rather than two toolbars that resemble each other. `toolbar` takes the controls to draw and the order to draw them in, or `const []` for none.
- **The palette is the React package's `styles.css`, value for value.** A colour that is `#5b34ea` in a browser is `#5b34ea` in an app. `MawyTokens.light` and `MawyTokens.dark` are the two, and `colorScheme` chooses between them or follows the platform.
- **An outline panel**, built from the same slugs the parser gives the headings, which scrolls the document to whichever one is chosen.
- **Korean and English chrome**, through `locale`.

### Security

- **Every URL a document names is checked against a scheme allowlist**, in the same list the React package uses. A `[click](javascript:…)` is drawn as the words the author wrote rather than as a link that does nothing. `data:` is allowed for images, and only for media types anything draws.
- **Nothing is opened.** A link does nothing at all until an application says what opening one means, through `onLinkTap`. Opening a URL means handing it to the platform, and which URLs an application is willing to hand over is not a viewer's decision.
- **Raw HTML is shown as the characters it was written with**, and there is no option to make it otherwise. Flutter has no HTML to draw it as, so there is nothing else it could be — which is why this package has no `html` policy to choose between.

### Dependencies

- [`lucide_icons_flutter`](https://pub.dev/packages/lucide_icons_flutter) (MIT), for the toolbar's icons. It is the same icon set `lucide-react` draws, which is what makes the two toolbars the same toolbar. It brings nothing else with it.
