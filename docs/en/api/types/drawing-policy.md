---
title: Link and image policy
order: 10.5
---

# Link and image policy

How a link and a picture the document wrote are drawn, for a page that does not want them followed or fetched.

A page carrying documents its readers wrote is the case this exists for, and what it wants is a question about that page. Drawn as text, a link keeps its sentence and loses its destination. Drawn as its source, it shows the destination and follows nothing. Hidden, it leaves the sentence altogether.

::: fw react

```tsx
<MawyViewer value={comment.body} links="text" images="hide" />
```

:::

::: fw flutter

```dart
MawyViewer(value: comment.body, links: MawyLinkPolicy.text, images: MawyImagePolicy.hide)
```

:::

## `MawyLinkPolicy`

::: fw react

```ts
type MawyLinkPolicy = 'show' | 'text' | 'source' | 'hide';
```

:::

::: fw flutter

```dart
enum MawyLinkPolicy { show, text, source, hide }
```

:::

- `show` — the default. A link, which a reader can follow.
- `text` — its words, set the way the words around them are, with nothing to follow. Formatting inside the link stays, and a picture inside it is drawn as `MawyImagePolicy` says.
- `source` — the characters it was written with, `[words](address)`, set the way a directive nobody claimed is. The address is on the page and nothing follows it.
- `hide` — nothing, words and all.

Only the links the document wrote. A footnote's number and the way back from a note are this library's own, and are drawn whatever this says. A heading's anchor does not move either, because it is made from the words the author wrote whether or not they are drawn.

The viewer's find bar searches what is drawn, so the words of a hidden link are not found, and a link drawn as its source is found by its address.

::: fw react

A link in raw HTML gets the same answers under `html="sanitize"`: an `<a>` with an `href` becomes its words, its markup as the browser read it, or nothing. An `<a>` with only a `name` is a place to go to rather than a link, and is left alone. Under `raw` nothing is changed, which is what `raw` means.

On the editor's drawn surface, the link the caret is in is written out as its source whatever this says, because that is where a caret can edit it. A hidden link is on the surface only once the caret reaches it.

:::

::: fw flutter

In `MawyEditor` it reaches the preview. The source pane is the document's own characters, and nothing in it changes.

:::

## `MawyImagePolicy`

::: fw react

```ts
type MawyImagePolicy = 'show' | 'text' | 'source' | 'hide';
```

:::

::: fw flutter

```dart
enum MawyImagePolicy { show, text, source, hide }
```

:::

- `show` — the default. The picture, fetched.
- `text` — its description, the alt text, as words where the picture would have been. A picture with no description draws nothing.
- `source` — the characters it was written with, `![description](address)`.
- `hide` — nothing.

Every value but `show` fetches nothing, and <Fw react="image" flutter="imageBuilder" code /> is never asked.

::: fw react

A picture in raw HTML gets the same answers under `html="sanitize"`, on a server as well for the one kind of `<img>` that is drawn there without a DOM. Under `raw` nothing is changed.

:::
