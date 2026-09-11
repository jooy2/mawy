---
title: Images
order: 19
---

# Images

What a picture in a document becomes, and where a picture put into the editor goes. See [images](../../guide/editor#images).

::: fw react

## `MawyImageProps`

```ts
interface MawyImageProps {
  /** Where the picture is. Already checked against the scheme allowlist. */
  src: string;
  /** What the picture is, for a reader who is not seeing it. */
  alt: string;
  /** The `title`, if one was written. */
  title: string | null;
}
```

What the viewer's `image` component is handed. Without one an `<img>` is written and the browser fetches it; with one the application draws the picture instead, which is the only way to put a header on the request, send it through a loader of its own, answer it out of a cache, or refuse it.

`alt` is empty where the author wrote `![](…)`, which in Markdown means decoration.

Which pictures an application is willing to fetch is not a viewer's decision to make. A document from somewhere else has somebody else's URLs in it, and fetching them all without asking tells whoever wrote them which documents are being read.

## `MawyImageUpload`

```ts
type MawyImageUpload = (file: File) => MawyImageSource | null | Promise<MawyImageSource | null>;
```

Where a picture dropped or pasted into the editor goes, and what URL to write for it. Storing a file somewhere is not a decision a text editor should make on its own, so with no `onUploadImage` a dropped file does nothing. An image already on the web, pasted as part of a page, still arrives as the URL it already had.

```tsx
<MawyEditor onUploadImage={async (file) => (await save(file)).url} />
```

Throwing, or coming back with nothing, is how an upload says it failed: the editor says so and writes nothing.

## `MawyImageSource`

```ts
type MawyImageSource =
  | string
  | {
      url: string;
      alt?: string;
      title?: string;
    };
```

A URL, or a URL with the words that go around it in the Markdown.

:::

::: fw flutter

## `MawyImage`

```dart
class MawyImage {
  const MawyImage({required this.url, required this.alt, this.title});

  /// Where the picture is. Already checked against the scheme allowlist.
  final String url;
  /// What the picture is, for a reader who is not seeing it.
  final String alt;
  /// The `title`, if one was written.
  final String? title;
}
```

A picture the document asked for, and what a builder is handed. `alt` is empty where the author wrote `![](…)`, which in Markdown means decoration.

## `MawyImageBuilder`

```dart
typedef MawyImageBuilder = Widget Function(BuildContext context, MawyImage image);
```

What draws a picture. Unset, the viewer draws it itself: over the network, or out of the bytes of a `data:` URL. Given one, the application draws it instead, which is the only way to put headers on the request, send it through a client of its own, answer it out of a cache, or refuse it.

```dart
MawyViewer(
  value: document,
  imageBuilder: (BuildContext context, MawyImage image) =>
      Image.network(image.url, headers: session.headers, semanticLabel: image.alt),
);
```

Which pictures an application is willing to fetch is not a viewer's decision to make, the same way where a link opens is not. A private document drawn in a public page is the case this exists for: the URLs in it are somebody else's, and a viewer that fetched them all without asking would be a viewer that told somebody else which documents are being read.

There is no upload here. The editor writes the Markdown an application hands it a URL for, and choosing a file is a plugin's job rather than a widget's.

:::
