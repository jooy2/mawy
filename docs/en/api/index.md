---
title: API
order: 2
---

# API

Every component, type and function the package exports, one page each: what it is, what it takes and what it gives back.

Everything here exists and runs in whichever package the switch above the menu is set to. Where only one of the two has a name, the page says so and points at what the other one does instead.

## Components

::: fw react

| Page | What it is |
| --- | --- |
| [`MawyViewer`](./components/mawy-viewer) | A Markdown document, rendered and not editable. |
| [`MawyEditor`](./components/mawy-editor) | A Markdown editor with the viewer beside it. |
| [`MawyDocument`](./components/mawy-document) | A document drawn on a server, with no JavaScript shipped for it. |

:::

::: fw flutter

| Page                                         | What it is                                      |
| -------------------------------------------- | ----------------------------------------------- |
| [`MawyViewer`](./components/mawy-viewer)     | A Markdown document, rendered and not editable. |
| [`MawyEditor`](./components/mawy-editor)     | A Markdown editor with the viewer beside it.    |
| [`MawyDocument`](./components/mawy-document) | The same document with no viewer around it.     |

:::

## Types

::: fw react

| Page | What it covers |
| --- | --- |
| [Editor modes](./types/editor-mode) | `MawyMode` |
| [`MawyEditorToolbarItem`](./types/editor-toolbar-item) | `MawyEditorToolbarItem`, `MawyEditorToolbarOption` |
| [`MawyEditorStatusItem`](./types/editor-status-item) | `MawyEditorStatusItem`, `MawyEditorStatusOption` |
| [`MawyViewerToolbarItem`](./types/viewer-toolbar-item) | `MawyViewerToolbarItem`, `MawyViewerToolbarOption` |
| [Frame](./types/frame) | `MawyFrame`, `MawyToolbarPlacement` |
| [`MawyColorScheme`](./types/color-scheme) | `MawyColorScheme` |
| [`MawyLocale`](./types/locale) | `MawyLocale` |
| [`MawyParseOptions`](./types/parse-options) | `MawyParseOptions` |
| [`MdDocument`](./types/md-document) | `MdDocument` and every node type under it |
| [`MawyHtmlPolicy`](./types/html-policy) | `MawyHtmlPolicy` |
| [Links](./types/link-target) | `MawyLinkTarget`, `MawyLinkRel` |
| [`MawyUrlResolver`](./types/url-resolver) | `MawyUrlResolver`, `MawyUrlKind` |
| [`MawyTypography`](./types/typography) | `MawyTypography` |
| [`MawyFontFamily`](./types/font-family) | `MawyFontFamily` |
| [`MawyFont`](./types/font) | `MawyFont`, `MAWY_SYSTEM_FONTS`, `MAWY_WEB_FONTS` |
| [`MawyMeasure`](./types/measure) | `MawyMeasure` |
| [`MawyDirectiveKind`](./types/directive-kind) | `MawyDirectiveKind` |
| [Directives](./types/directives) | `MawyDirectives`, `MawyDirectiveProps` |
| [`MawyHighlighter`](./types/highlighter) | `MawyHighlighter`, `MawyHighlight`, `MawyCodeToken`, `MawyCodeTokenKind` |
| [Images](./types/image) | `MawyImageProps`, `MawyImageUpload`, `MawyImageSource` |
| [`MawyRange`](./types/range) | `MawyRange` |

They are also exported from `mawy-react/types`, so an application can name one in its own props without importing a component to get at it.

:::

::: fw flutter

| Page | What it covers |
| --- | --- |
| [Editor modes](./types/editor-mode) | `MawyEditorMode`, `kMawyEditorModes` |
| [`MawyEditorToolbarItem`](./types/editor-toolbar-item) | `MawyEditorToolbarItem`, `kMawyEditorToolbar` |
| [`MawyEditorStatusItem`](./types/editor-status-item) | `MawyEditorStatusItem`, `kMawyEditorStatus` |
| [`MawyViewerToolbarItem`](./types/viewer-toolbar-item) | `MawyViewerToolbarItem`, `kMawyViewerToolbar` |
| [`MawyColorScheme`](./types/color-scheme) | `MawyColorScheme` |
| [`MawyLocale`](./types/locale) | `MawyLocale` |
| [`MawyParseOptions`](./types/parse-options) | `MawyParseOptions` |
| [`MdDocument`](./types/md-document) | `MdDocument` and every node class under it |
| [`MawyUrlResolver`](./types/url-resolver) | `MawyUrlResolver`, `MawyUrlKind` |
| [`MawyTypography`](./types/typography) | `MawyTypography` |
| [`MawyFontFamily`](./types/font-family) | `MawyFontFamily` |
| [`MawyMeasure`](./types/measure) | `MawyMeasure`, `MawyMeasureWidth` |
| [`MawyDirectiveKind`](./types/directive-kind) | `MawyDirectiveKind` |
| [Directives](./types/directives) | `MawyDirective`, `MawyDirectiveBuilder` |
| [`MawyHighlighter`](./types/highlighter) | `MawyHighlighter`, `MawyCodeToken`, `MawyCodeTokenKind` |
| [Images](./types/image) | `MawyImage`, `MawyImageBuilder` |
| [`MawyViewerAnchors`](./types/viewer-anchors) | `MawyViewerAnchors` |

`package:mawy/mawy.dart` is this package's entire public surface. One import covers all of it.

:::

## Functions

| Page | What it is |
| --- | --- |
| [`parseMarkdown`](./functions/parse-markdown) | Reads a string as Markdown, the way the viewer does. |
| [`slugify`](./functions/slugify) | A heading's anchor, in the spelling GitHub uses. |
| [`mawyHighlighter`](./functions/mawy-highlighter) | The syntax highlighter this library ships. |
| [Finding text](./functions/find) | The arithmetic behind the find bar. |

## Theming

[Theming](./theming) is every colour, radius and duration the library draws with, and the whole of what an application may change.

::: fw flutter

The editor also exports the arithmetic its formatting commands are made of — `MawyCommand`, `runCommand`, `commandActive`, `continueList`, `indent` and the `EditState` they work on. They are there for an application driving the editor from a toolbar of its own, and they are the same functions under the same names as the React package's internals.

:::
