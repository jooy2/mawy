---
title: parseMarkdown
order: 1
---

# `parseMarkdown`

Reads a string as Markdown. This is the same call the viewer makes, with the same options, so a document parsed here and a document drawn there are the same tree.

::: fw react

```ts
function parseMarkdown(source: string, options?: MawyParseOptions): MdDocument;
```

```ts
import { parseMarkdown } from 'mawy-react/markdown';

const { outline, footnotes } = parseMarkdown(document);
```

`mawy-react/markdown` is its own entry point. An application that only wants to _read_ a document, for its outline, its footnotes or the anchor a heading was given, should not have to install a component to get at them, and there is no component here. With no React and no DOM, it runs in a build script or on a server as readily as on a page.

:::

::: fw flutter

```dart
MdDocument parseMarkdown(String source, [MawyParseOptions options = const MawyParseOptions()]);
```

```dart
import 'package:mawy/mawy.dart';

final MdDocument parsed = parseMarkdown(document);
```

Exported as well as used, because a Dart application that wants the outline of a document, or its footnotes, or its headings' anchors, has no other way to get at them.

:::

What comes back is an [`MdDocument`](../types/md-document). The options are [`MawyParseOptions`](../types/parse-options).
