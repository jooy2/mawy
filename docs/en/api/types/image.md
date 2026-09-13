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
  /** Whether this is the first picture in the document. */
  first: boolean;
}
```

What the viewer's `image` component is handed. Without one an `<img>` is written and the browser fetches it; with one the application draws the picture instead, which is the only way to put a header on the request, send it through a loader of its own, answer it out of a cache, or refuse it.

`alt` is empty where the author wrote `![](…)`, which in Markdown means decoration.

### The first picture

A page is measured on how long its largest piece of content takes to arrive, and on a page whose document opens with a picture that picture is usually the piece. Everything Mawy draws itself is text, so the one thing this library can say about that measurement is which picture came first.

The renderer's own `<img>` acts on it: the first picture is written `loading="eager"` with `fetchpriority="high"` and every other one `loading="lazy"`. An `image` component is told the same thing and decides for itself, which is how a picture becomes a framework's own image component with its priority set:

```tsx
import Image from 'next/image';

<MawyDocument
  value={document}
  image={({ src, alt, title, first }) => (
    <Image
      src={src}
      alt={alt}
      title={title ?? undefined}
      width={1200}
      height={630}
      priority={first}
    />
  )}
/>;
```

First in the document rather than first on the screen, and the two are the same thing only when the document starts at the top of the page. A document reached halfway down a long page, or one of many drawn in a list, is a case where this says yes and the answer that would have helped is no: the cost is one fetch made sooner than it needed to be, and an application that knows better draws its own pictures.

Which pictures an application is willing to fetch is not a viewer's decision to make. A document from somewhere else has somebody else's URLs in it, and fetching them all without asking tells whoever wrote them which documents are being read.

## `MawyImageUpload`

```ts
type MawyImageUpload = (
  file: File
) => MawyImageSource | MawyImageRefusal | null | Promise<MawyImageSource | MawyImageRefusal | null>;
```

Where a picture dropped or pasted into the editor goes, and what URL to write for it. Storing a file somewhere is not a decision a text editor should make on its own, so with no `onUploadImage` a dropped file does nothing. An image already on the web, pasted as part of a page, still arrives as the URL it already had. A picture pasted at a `data:` address is its own bytes rather than an address, and goes through `onUploadImage` like a file when there is one.

```tsx
<MawyEditor onUploadImage={async (file) => (await save(file)).url} />
```

Coming back with `{ reason }` is how an upload says it failed and why; see `MawyImageRefusal`. Throwing, or coming back with nothing, is a failure with no reason: the editor says the image could not be added and writes nothing.

## `MawyImageRefusal`

```ts
interface MawyImageRefusal {
  reason: string | null;
}
```

What an upload answers with to say it failed and why. The note under the document says `reason`, which should be in the interface's language. `null` says the application has already told the reader, and the editor says nothing about that file. Several files at once are one note: the reasons given, each once, in the order the files came, followed by how many of the batch failed with no reason given.

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
