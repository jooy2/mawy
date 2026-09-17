---
title: MawyParseOptions
order: 7
---

# `MawyParseOptions`

How the Markdown itself is read.

::: fw react

```ts
interface MawyParseOptions {
  gfm?: boolean; // default: true
  breaks?: boolean; // default: false
  definitionLists?: boolean; // default: true
  headingIds?: boolean; // default: true
  frontmatter?: boolean; // default: true
}
```

:::

::: fw flutter

```dart
class MawyParseOptions {
  const MawyParseOptions({
    this.gfm = true,
    this.breaks = false,
    this.definitionLists = true,
    this.headingIds = true,
    this.frontmatter = true,
  });
}
```

:::

- **`gfm`** — GitHub Flavored Markdown: tables, task lists, `~~strikethrough~~`, alerts, footnotes and bare URLs becoming links.
- **`breaks`** — whether a single newline inside a paragraph is a line break. Off by default, because that is what Markdown says. On, it matches the way chat clients and issue trackers behave, which is what a reader who has never written Markdown expects.
- **`definitionLists`** — whether a line opening with `: ` under a line of text is a term and what it means. On, and one of the two things Mawy reads that GitHub does not: the syntax is PHP Markdown Extra's, and it is the one everybody who writes these uses. Turn it off for a document that has to mean exactly what it would mean there.
- **`headingIds`** — whether a trailing `{#id}` on a heading is the name that heading is drawn under, rather than characters in the heading. On, and the other of the two. Turn it off for a document that has to mean exactly what it would mean there, where the braces are words. See [Heading anchors](../../guide/viewer#heading-anchors).
- **`frontmatter`** — whether a run fenced by `---` at the very top of the document is read as the metadata it is, and kept out of what the document says. On. The notation carries a title, a date and whatever else beside a document rather than in it, and a reader is shown none of it; drawn as Markdown it is a rule with a heading underlined by another. Turn it off for a document whose `---` at the top is a rule and means to be one. See [Frontmatter](../../guide/viewer#frontmatter).

The five options are the same in both packages, with the same defaults and the same effect. There is one parser, and [a check in CI](https://github.com/jooy2/mawy/blob/main/packages/flutter/tool/parity.dart) diffs the two trees over every Markdown file in the repository.
