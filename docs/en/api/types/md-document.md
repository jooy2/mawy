---
title: MdDocument
order: 8
---

# `MdDocument`

A parsed document: the tree, its outline, and the footnotes under it. What [`parseMarkdown`](../functions/parse-markdown) gives back.

::: fw react

```ts
interface MdDocument {
  root: MdRoot; // the blocks
  outline: MdOutlineEntry[]; // every heading, in order, each with a unique slug
  footnotes: MdFootnoteDefinition[]; // the ones something pointed at, in that order
  frontmatter: MdRange | null; // where the metadata at the top was written
}
```

:::

::: fw flutter

```dart
class MdDocument {
  final MdRoot root; // the blocks
  final List<MdOutlineEntry> outline; // every heading, in order, each with a unique slug
  final List<MdFootnoteDefinition> footnotes; // the ones something pointed at, in that order
  final MdRange? frontmatter; // where the metadata at the top was written
}
```

:::

The footnotes are not in `root`, because a footnote is written wherever it suits the author and read at the bottom, so whatever draws a document draws these after it.

Neither is the frontmatter, because it is not something the document says. The range is there so an application can read the title or the date it carries out of the source it already has.

## The nodes

Every node type is exported with it: `MdHeading`, `MdParagraph`, `MdCode`, `MdList`, `MdTable`, `MdLink`, `MdImage` and the rest, each carrying the `MdRange` it was written at — the offsets into the source the parser was given.

::: fw react

They match the Flutter package's node classes under the same names, which is what makes the two parsers comparable. `tool/parity.dart` diffs these trees.

:::

::: fw flutter

They are the React package's node types under the same names, which is what makes the two parsers comparable. `tool/parity.dart` diffs these trees.

:::
