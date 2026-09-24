---
title: imageUrls
order: 3
---

# `imageUrls`

Every address a parsed document draws a picture from, for an application finding the stored files no document needs any more.

::: fw react

```ts
function imageUrls(document: MdDocument): string[];
```

```ts
import { imageUrls, parseMarkdown } from 'mawy-react/markdown';

const used = new Set(saved.flatMap((each) => imageUrls(parseMarkdown(each))));
const unused = stored.filter((url) => !used.has(url));
```

Exported from `mawy-react/markdown`, beside [`parseMarkdown`](./parse-markdown).

:::

::: fw flutter

```dart
List<String> imageUrls(MdDocument document);
```

```dart
import 'package:mawy/mawy.dart';

final Set<String> used = <String>{
  for (final String each in saved) ...imageUrls(parseMarkdown(each)),
};
final List<String> unused = stored.where((String url) => !used.contains(url)).toList();
```

:::

Each address is listed once, in the order the document first gives it. It is the address as written, with its escapes and character references read and before `resolveUrl`, which is the URL the application wrote into the document. Parse with the options the editor was given, since they decide what the document says.

**The editor calls nothing when a picture is taken out of a document**, and this is why. A picture leaving the document is not a file being given up: undo puts it back, a cut picture is pasted somewhere else, and the same address copied into a second document is the same file in two places. A callback at the moment of deletion would hand an application a file to delete while something could still bring it back. Which pictures a saved document points at is something that can be said for certain, and that is what this answers. Compare it with what the application stored, across every document it has saved, and wait a while before deleting what nothing points at. The editor's undo can still put a picture back after a save, and a picture uploaded into a document nobody has saved yet is in no saved document at all.

**It reads generously**, because a file kept that nothing needs costs its bytes and one deleted that something still points at is a picture missing from a page. So it reads:

- A picture inside a link, in a table cell, in a directive's label and in a footnote something refers to.
- The `src` of an `<img>` or an `<image>` in raw HTML, written in any case, whatever the `html` policy would draw and although the Flutter package draws no raw HTML at all. It reads one inside an HTML comment as well.

It leaves out a picture with no address, a picture written in code, a picture in a footnote nothing refers to, which is not drawn, and a `srcset`.

The two packages give the same list for the same document, and the parity check compares them over its corpus.
