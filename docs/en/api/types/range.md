---
title: MawyRange
order: 20
---

# `MawyRange`

Where a piece of a document was written, in the offsets of the Markdown the component was given.

::: fw flutter

This one is the React package's. The same two numbers are here as `MdRange`, which every node of a parsed document carries — see [`MdDocument`](./md-document).

:::

::: fw react

```ts
interface MawyRange {
  start: number;
  end: number;
}
```

They are the same two numbers every element carries as `data-mawy-range`, handed to a component as numbers. Today only [`MawyDirectiveProps`](./directives) receives them.

:::
