---
title: MawyViewer
order: 1
---

# `MawyViewer`

A Markdown document, rendered and not editable. See [the viewer](../../guide/viewer) for what it does and why.

::: fw react

```tsx
import { MawyViewer } from 'mawy-react';

<MawyViewer value={document} />;
```

Every prop of `<div>` is accepted and forwarded, apart from `children` and `onChange`. A `ref` reaches the outermost element.

:::

::: fw flutter

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

Built on `package:flutter/widgets.dart` alone, with no Material and no Cupertino, so it sits inside a `MaterialApp`, a `CupertinoApp` or a bare `WidgetsApp` without pulling in a second design system.

:::

## The document

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `value` | `string` | — | The document, as Markdown. Passing it makes the document the application's: it will not change on its own. |
| `defaultValue` | `string` | `''` | The document to start with, when the viewer is to keep it itself. |
| `onValueChange` | `(value: string, file: File \| null) => void` | — | A new document, and the file it came from. Called whether or not `value` is being passed. |
| `empty` | `ReactNode` | the file picker | What to draw instead when there is no document. |

With neither `value` nor `defaultValue`, the viewer becomes the file picker. That is part of the component's design, not a fallback.

:::

::: fw flutter

| Argument | Type     | Default  | What it does               |
| -------- | -------- | -------- | -------------------------- |
| `value`  | `String` | required | The document, as Markdown. |

`value` is required here where the React package makes it optional, because that is where a file picker would have gone. Picking a file needs a plugin, which this package does not include and an application usually already has, so the application opens the file and Mawy draws it.

:::

## Reading and drawing

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `{ gfm: true, breaks: false, definitionLists: true }` | How the Markdown is read. |
| `html` | [`MawyHtmlPolicy`](../types/html-policy) | `'escape'` | What becomes of raw HTML written inside the document. |
| `linkTarget` | [`MawyLinkTarget`](../types/link-target) | `'blank'` | Where a link the document wrote opens. |
| `locale` | [`MawyLocale`](../types/locale) | `'en'` | The language of the viewer's own interface. Nothing to do with the document. |
| `highlight` | [`MawyHighlight`](../types/highlighter) | — | What colours a fenced code block. Nothing by default. |
| `directives` | [`MawyDirectives`](../types/directives) | — | What draws the constructs this package does not know about. |
| `image` | `ComponentType<`[`MawyImageProps`](../types/image)`>` | an `<img>` | What draws a picture the document points at. |
| `resolveUrl` | [`MawyUrlResolver`](../types/url-resolver) | — | Where a relative URL in the document points. |
| `anchorPrefix` | `string` | — | Put in front of every anchor this viewer gives a heading or a footnote, so two viewers on one page stop colliding. |

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `parse` | [`MawyParseOptions`](../types/parse-options) | `MawyParseOptions()` | How the Markdown is read. |
| `locale` | [`MawyLocale`](../types/locale) | `MawyLocale.en` | The language of the viewer's own interface. Nothing to do with the document. |
| `onLinkTap` | `void Function(String url, String? title)?` | — | What a tapped link does. |
| `highlight` | [`MawyHighlighter?`](../types/highlighter) | — | What colours a fenced code block. Nothing by default. |
| `directives` | `Map<String, `[`MawyDirectiveBuilder`](../types/directives)`>?` | — | What draws the constructs this package does not know about. |
| `imageBuilder` | [`MawyImageBuilder?`](../types/image) | the viewer draws it | What draws a picture the document points at. |
| `resolveUrl` | [`MawyUrlResolver?`](../types/url-resolver) | — | Where a relative URL in the document points. |

There is no `linkTarget` either. What opening a link means is `onLinkTap`'s whole subject here, and where it opens is part of what an application answers with.

There is no `html` argument, and there will not be one: raw HTML written inside a document is shown as the characters it was written with, because there is no HTML here to draw it as.

`onLinkTap` is unset by default, and a link does nothing until it is given. Opening a URL means handing it to the platform, and which URLs an application is willing to hand over is not a viewer's decision. The scheme allowlist has already run by the time it is called, so a `javascript:` URL never reaches it. The rest is the application's to decide.

:::

## Appearance

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme) | — | The palette, when the application owns it. |
| `defaultColorScheme` | `MawyColorScheme` | `'system'` | The palette to start with. |
| `onColorSchemeChange` | `(scheme: MawyColorScheme) => void` | — | Called whenever it changes, controlled or not. |
| `typography` | `Partial<`[`MawyTypography`](../types/typography)`>` | — | How the document is set, when the application owns it. |
| `defaultTypography` | `Partial<MawyTypography>` | see below | What it is set as to begin with. |
| `onTypographyChange` | `(typography: MawyTypography) => void` | — | Called whenever it changes, controlled or not. |
| `toolbar` | [`MawyViewerToolbarOption`](../types/viewer-toolbar-item) | `true` | Which controls the toolbar has, and in what order. |
| `fonts` | `readonly `[`MawyFont`](../types/font)`[]` | `MAWY_SYSTEM_FONTS` | The typefaces the toolbar offers, in the order it lists them. |

Anything left out of `typography` or `defaultTypography` keeps its default, so `{ fontSize: 18 }` is a whole answer. The defaults are `sans`, 16px, a line height of 1.7, no extra letter spacing and the `normal` measure.

:::

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `colorScheme` | [`MawyColorScheme`](../types/color-scheme) | `MawyColorScheme.system` | The palette. `system` follows the platform. |
| `onColorSchemeChange` | `ValueChanged<MawyColorScheme>?` | — | Called when the reader changes it from the toolbar. |
| `tokens` | [`MawyTokensBuilder?`](../theming) | the stylesheet's own | The colours to draw in, given the brightness the viewer settled on. |
| `typography` | [`MawyTypography?`](../types/typography) | — | How the document is set, when the application owns it. |
| `defaultTypography` | `MawyTypography` | `MawyTypography()` | How it is set to begin with, when the viewer keeps it itself. |
| `onTypographyChange` | `ValueChanged<MawyTypography>?` | — | Called whether or not `typography` is being passed. |
| `toolbar` | `List<`[`MawyViewerToolbarItem`](../types/viewer-toolbar-item)`>` | `kMawyViewerToolbar` | The controls to draw and the order to draw them in. `const []` for none. |

The colour scheme is one argument rather than the controlled pair the typography uses. Hand the viewer a `light` or a `dark` and it stays there; leave it at `system` and it follows the platform. `onColorSchemeChange` reports what the reader picked from the toolbar, so an application that wants to remember the choice passes the remembered value back in.

`MawyTypography` is a class with a default for every field rather than a bag of optional ones, so `MawyTypography(fontSize: 18)` is a whole answer and `copyWith` changes one thing about an existing one. The defaults are `sans`, 16 logical pixels, a line height of 1.7, no extra letter spacing and the `normal` measure.

There is no `fonts` argument. The package ships no typefaces and names none, so a face an application has bundled is named through [`MawyTypography.fontFamilyName`](../types/typography) rather than offered from a list.

:::

## Opening files

::: fw react

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `fileDrop` | `boolean` | `true`, unless `value` is passed | Whether a file dropped on the viewer opens in it. |
| `accept` | `string` | every Markdown and text extension | What the file picker offers. |

A file larger than five megabytes is refused rather than read.

:::

::: fw flutter

Nothing here: this package does not open files, and `value` above says why.

:::

## Layout and scrolling

::: fw flutter

| Argument | Type | Default | What it does |
| --- | --- | --- | --- |
| `padding` | `EdgeInsetsGeometry?` | the React package's own numbers | The space around the document. |
| `scrollController` | `ScrollController?` | one of its own | The document's scroller, so an application can drive it or watch it. |
| `anchors` | [`MawyViewerAnchors?`](../types/viewer-anchors) | — | Where each top-level block of the document ends up, filled in as it draws — for anything lining a second view up with this one. |

:::

::: fw react

Padding and scrolling belong to the page rather than the component, because the viewer is an element in a document that already has both. The numbers it draws with are `--mawy-*` custom properties, which [theming](../theming) lists.

:::
