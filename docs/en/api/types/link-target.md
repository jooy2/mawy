---
title: Links
order: 10
---

# Links

Where a link the document wrote opens, and what it declares about where it goes.

::: fw flutter

These are the React package's. What opening a link means is `onLinkTap`'s whole subject here, and where it opens is part of what an application answers with — see [`MawyViewer`](../components/mawy-viewer#reading-and-drawing). There is no `rel` to write, because there is no anchor.

:::

::: fw react

## `MawyLinkTarget`

```ts
type MawyLinkTarget = 'blank' | 'self';
```

- `'blank'` — in a new tab, with `rel="noopener noreferrer"` on it. The default, because a viewer is usually a piece of a page rather than the page: a reader who follows a link out of a document and comes back should find the document where they left it, and in an editor there is unsaved work behind that link.
- `'self'` — in the tab the document is in, which is what an application showing a document _as_ its page wants.

Only the links the document wrote. A footnote's reference and the arrow back from it point at the same page and are unaffected.

## `MawyLinkRel`

```ts
type MawyLinkRel = string | ((href: string) => string | null | undefined);
```

What such a link declares about where it goes: a string for every link, or a function asked about each one.

A page carrying documents its readers wrote is the case this exists for. `nofollow` is a page saying it does not vouch for where a link goes and `ugc` is it saying who wrote the link, which together are what a search engine expects of such a page. Neither hides the link and neither stops a reader following it.

```tsx
<MawyViewer value={post.body} linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')} />
```

**Added to what the link already declares, rather than replacing it.** A link opening in a new tab keeps its `noopener noreferrer` whatever this answers: `noopener` is what makes that tab safe and `noreferrer` is what keeps the document's own address out of it, and an application asking for one more precaution did not ask to lose two. A token already there is not written twice, so `linkRel="noopener nofollow"` comes out as `rel="noopener noreferrer nofollow"`.

The function is given the address as it will appear in the `href`, after [`resolveUrl`](./url-resolver) has had its say, so the answer is about the link the reader will actually follow. Answering nothing, `null` or `undefined` leaves the link as it was.

Only the links the document wrote, the same as `linkTarget`. A footnote's reference and the arrow back from it point at this same page and are never asked about.

:::
