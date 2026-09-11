---
title: MawyLinkTarget
order: 10
---

# `MawyLinkTarget`

Where a link the document wrote opens.

::: fw flutter

This one is the React package's. What opening a link means is `onLinkTap`'s whole subject here, and where it opens is part of what an application answers with — see [`MawyViewer`](../components/mawy-viewer#reading-and-drawing).

:::

::: fw react

```ts
type MawyLinkTarget = 'blank' | 'self';
```

- `'blank'` — in a new tab, with `rel="noopener noreferrer"` on it. The default, because a viewer is usually a piece of a page rather than the page: a reader who follows a link out of a document and comes back should find the document where they left it, and in an editor there is unsaved work behind that link.
- `'self'` — in the tab the document is in, which is what an application showing a document _as_ its page wants.

Only the links the document wrote. A footnote's reference and the arrow back from it point at the same page and are unaffected.

:::
