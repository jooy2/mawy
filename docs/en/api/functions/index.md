---
title: Functions
order: 3
---

# Functions

What the package exports that is not a component or a type: the parser on its own, the anchors it gives a heading, the pictures a document points at, the highlighter, and the arithmetic behind the find bar.

| Page | What it is |
| --- | --- |
| [`parseMarkdown`](./parse-markdown) | Reads a string as Markdown, the same call the viewer makes. |
| [`slugify`](./slugify) | A heading's anchor, in the spelling GitHub uses. |
| [`imageUrls`](./image-urls) | Every address a document draws a picture from. |
| [`mawyHighlighter`](./mawy-highlighter) | The syntax highlighter this library ships. |
| [Finding text](./find) | Matching and replacing a run of text in a document. |

::: fw react

`parseMarkdown`, `slugify` and `imageUrls` live in `mawy-react/markdown`, and `mawyHighlighter` in `mawy-react/highlight`. Both are entry points of their own, so an application that never references one never ships it — and neither needs React or a DOM, so the parser runs in a build script or on a server as readily as on a page.

:::

::: fw flutter

Every one of these comes out of `package:mawy/mawy.dart`. A Dart build drops what nothing references, so an application that never names the highlighter never carries the grammars behind it.

:::
