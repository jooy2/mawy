---
title: MawyUrlResolver
order: 11
---

# `MawyUrlResolver`

Where a relative URL points.

::: fw react

```ts
type MawyUrlKind = 'link' | 'image';
type MawyUrlResolver = (url: string, kind: MawyUrlKind) => string;
```

:::

::: fw flutter

```dart
enum MawyUrlKind { link, image }

typedef MawyUrlResolver = String Function(String url, MawyUrlKind kind);
```

:::

A URL written in a document is relative to the _document_, and whatever draws it is somewhere else. `![](./diagram.png)` in a file read off a disk, out of a repository or from behind an API has no address anybody can follow: a browser resolves it against the address of the page, which is the application's page and not the document's. Only the application knows where the document came from, so only the application can say what that address means.

::: fw react

```tsx
<MawyViewer value={document} resolveUrl={(url) => new URL(url, base).href} />
```

It reaches a link's `href`, a picture's source, and the same two inside raw HTML under [`html="sanitize"`](./html-policy).

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  resolveUrl: (String url, MawyUrlKind kind) => Uri.parse(base).resolve(url).toString(),
)
```

It reaches a link's destination and a picture's source.

:::

Called for every relative URL the document writes and for no other. Three kinds of address are left alone, because each already says where it is: one with a scheme, one starting with `#`, which is a place in this document, and one starting with `//`, which is missing only its scheme.

**What it answers is used as written.** The scheme allowlist has already run on what the _document_ said by the time it is called, and what comes back is not checked again — an application answering with an address only it can serve is the case this exists for, and a second check would make it impossible. The document is untrusted here and the application is not, which is the line every other hook in this library draws.
