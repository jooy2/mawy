---
title: Types
order: 2
---

# Types

Every type the package exports, one page each.

::: fw react

Exported from `mawy-react` and from `mawy-react/types`. The second entry point exists so an application can name one of these in its own props without importing a component to get at it.

:::

::: fw flutter

Exported from `package:mawy/mawy.dart`, which is this package's entire public surface. One import covers all of it.

:::

## The editor and the viewer

| Page | What it covers |
| --- | --- |
| [Editor modes](./editor-mode) | Which surface a document is shown on. |
| [`MawyEditorToolbarItem`](./editor-toolbar-item) | One control on the editor's toolbar, and how to pick them. |
| [`MawyEditorStatusItem`](./editor-status-item) | What the editor counts along its bottom edge. |
| [`MawyViewerToolbarItem`](./viewer-toolbar-item) | One control on the viewer's toolbar, and how to pick them. |
| [Frame](./frame) | Whether the surface has a frame around it, and which end its toolbar is at. |
| [`MawyColorScheme`](./color-scheme) | Which palette to draw in. |
| [`MawyLocale`](./locale) | The language of the interface, which is not the language of the document. |

## Reading a document

| Page | What it covers |
| --- | --- |
| [`MawyParseOptions`](./parse-options) | How the Markdown itself is read. |
| [`MawyQuotes`](./quotes) | The four marks a quotation is drawn with, where the typographer is on. |
| [`MdDocument`](./md-document) | A parsed document, and every node under it. |
| [`MawyUrlResolver`](./url-resolver) | Where a relative URL in the document points. |
| [Link and image policy](./drawing-policy) | How a link and a picture are drawn, for a page that does not want them followed or fetched. |
| [`MawyDirectiveKind`](./directive-kind) | Which of the three shapes a directive was written in. |
| [Directives](./directives) | What draws the constructs this package does not know about. |
| [`MawyHighlighter`](./highlighter) | What colours a code block, in tokens rather than markup. |
| [Images](./image) | What a picture becomes, and where one put into the editor goes. |

::: fw react

| Page | What it covers |
| --- | --- |
| [`MawyHtmlPolicy`](./html-policy) | What becomes of raw HTML written inside a document. |
| [`MawyLinkTarget`](./link-target) | Where a link the document wrote opens. |
| [`MawyLinkRel`](./link-target#mawylinkrel) | What such a link declares about where it goes. |
| [`MawyRange`](./range) | Where a piece of a document was written, as two offsets. |

:::

## Setting the document

| Page                              | What it covers                       |
| --------------------------------- | ------------------------------------ |
| [`MawyTypography`](./typography)  | How the document is set.             |
| [`MawyFontFamily`](./font-family) | Which typeface it is set in.         |
| [`MawyMeasure`](./measure)        | How wide the text is allowed to run. |

::: fw react

| Page                 | What it covers                                                  |
| -------------------- | --------------------------------------------------------------- |
| [`MawyFont`](./font) | A typeface the toolbar offers, and the two lists worth passing. |

:::

::: fw flutter

## Laying it out

| Page                                    | What it covers                                |
| --------------------------------------- | --------------------------------------------- |
| [`MawyViewerAnchors`](./viewer-anchors) | Where each block of a drawn document ends up. |

:::
