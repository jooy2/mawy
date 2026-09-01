/// The documents the gallery has to show.
///
/// The first one is the documentation site's own sample, word for word, so the
/// React preview and the Flutter preview on the same page are showing the same
/// document — which is the only way to see whether the two agree.
library;

/// One document, and what to call it.
class Sample {
  /// Creates a named document.
  const Sample(this.id, this.label, this.value);

  /// What the documentation site asks for it by.
  final String id;

  /// What the gallery's switch shows.
  final String label;

  /// The Markdown.
  final String value;
}

const String _everything = '''
# Reading a document

Mawy draws Markdown as widgets rather than as a string of HTML, which is what
makes the safe default free: there is no markup on the way to the screen, so
there is nothing to escape. Try the toolbar — the type is yours, not the
document's.

## What it reads

Emphasis and **strong**, ~~struck through~~, `inline code`, and a
[link](https://mawy.cdget.com) that goes somewhere. A bare URL becomes one too:
https://github.com/jooy2/mawy

> [!NOTE]
> GitHub's five alert kinds are read as what they are, rather than as a
> quotation that happens to start with a word in brackets.

### A table

| Package | Registry | Status |
| :------ | :------: | -----: |
| `mawy-react` | npm | 0.1.0 |
| `mawy` | pub.dev | 0.1.0 |

### A list that keeps track

- [x] Block parser
- [x] Inline parser, delimiter stack and all
- [x] The viewer
- [ ] The editor

### And code

```dart
import 'package:mawy/mawy.dart';

MawyViewer(value: document);
```

### A term and what it means

Definition lists are the one thing here GitHub does not read.[^why]

Markdown
: A way of writing that reads as what it says.

Mawy
: A viewer for it.
: And, in React, an editor beside the viewer.

---

Definitions are resolved wherever they are written — this one is
[at the bottom][ref].

[ref]: https://mawy.cdget.com/guide/viewer

[^why]: A footnote is written wherever it suits the author and read at the
    bottom. This one is written in the middle of the file.
''';

const String _minimal = '''
# A quiet document

No toolbar, no outline, no controls at all — just the document, set the way the
application asked for it.

A viewer with `toolbar: const []` is a widget that draws Markdown and nothing
else, which is most of what an application wants most of the time.
''';

const String _prose = '''
# 한글도 그대로

마크다운은 언어를 가리지 않습니다. 이 문서는 한국어로 쓰였고, **굵게**와
*기울임*, `코드`, [링크](https://mawy.cdget.com)가 모두 그대로 동작합니다.

## 줄 간격과 자간

한글은 라틴 문자와 글자의 밀도가 다릅니다. 툴바의 줄 간격과 자간이 있는 이유가
그것이고, 그 선택은 문서가 아니라 읽는 사람의 것입니다.

> 인용도, 목록도, 표도 같은 규칙을 따릅니다.
''';

const String _directives = '''
# What Markdown has no word for

The parser reads a **shape** and stops there. What each shape means is the
gallery's to say, and the three below are declared in its own file, in about
thirty lines between them.

:::callout[The shape and the meaning are different jobs]{kind=note}
A container holds blocks, so everything in here is read as Markdown:

- `callout` is a container, and the parser knows that much
- what a callout *is* — a box with a coloured edge — is this file's
:::

A leaf is a line of its own. This one draws a bar, and the number in it came out
of `{value=72}`:

::progress{value=72 label=Coverage}

A text directive sits inside a sentence: press :kbd[Ctrl] + :kbd[K] to search,
:kbd[Esc] to leave.

:::callout[And nothing claimed this one]{kind=warning}
No builder was handed the name `youtube`, so the line under this box is drawn as
the characters it was written with rather than quietly dropped — the same answer
raw HTML gets, and for the same reason.
:::

::youtube{id=dQw4w9WgXcQ}
''';

/// Everything the gallery can show.
const List<Sample> samples = <Sample>[
  Sample('viewer/basic', 'Everything', _everything),
  Sample('viewer/minimal', 'Minimal', _minimal),
  Sample('viewer/prose', '한국어', _prose),
  Sample('viewer/directives', 'Directives', _directives),
];
