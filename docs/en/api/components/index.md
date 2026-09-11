---
title: Components
order: 1
---

# Components

What this package draws a document with. Each page lists every prop, its type, its default and what it does.

::: fw react

| Page | What it is |
| --- | --- |
| [`MawyViewer`](./mawy-viewer) | A Markdown document, rendered and not editable. A toolbar for the typeface, the text size, the theme and the rest comes with it, and none of it changes the document. |
| [`MawyEditor`](./mawy-editor) | A Markdown editor with the viewer beside it: the coloured source, a live preview, a formatting toolbar and a status bar. |
| [`MawyDocument`](./mawy-document) | The same document drawn once on a server, with no JavaScript shipped for it. |

Both components accept and forward every prop of `<div>` apart from `children` and `onChange`, and a `ref` reaches the outermost element.

:::

::: fw flutter

| Page | What it is |
| --- | --- |
| [`MawyViewer`](./mawy-viewer) | A Markdown document, rendered and not editable. A toolbar for the typeface, the text size, the theme and the rest comes with it, and none of it changes the document. |
| [`MawyEditor`](./mawy-editor) | A Markdown editor with the viewer beside it: the coloured source, a live preview, a formatting toolbar and a status bar. |

Both are built on `package:flutter/widgets.dart` alone, with no Material and no Cupertino, so a document sits inside a `MaterialApp`, a `CupertinoApp` or a bare `WidgetsApp` without pulling in a second design system.

[`MawyDocument`](./mawy-document), which draws a document on a server, is the React package's and has no counterpart here.

:::
