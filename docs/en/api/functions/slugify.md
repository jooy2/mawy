---
title: slugify
order: 2
---

# `slugify`

A heading's anchor, in the spelling GitHub uses.

::: fw react

```ts
function slugify(text: string): string;
```

Exported from `mawy-react/markdown`, beside [`parseMarkdown`](./parse-markdown).

:::

::: fw flutter

```dart
String slugify(String text);
```

:::

Matching GitHub matters more than any particular scheme would: the anchors in a README are written by hand against it, so a document linking to `#getting-started` is linking to whatever GitHub would have called that heading.

Every entry of a parsed document's `outline` already carries the slug this gives, made unique within that document. Call it yourself to work out where a link written by hand will land.

This is what a heading is called when it did not say. One written as `## Overview {#what-to-try}` is called `what-to-try` and never comes through here; see [Heading anchors](../../guide/viewer#heading-anchors).
