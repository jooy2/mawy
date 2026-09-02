/// The documents the gallery has to show.
///
/// The first one is the documentation site's own sample, word for word, so the
/// React preview and the Flutter preview on the same page are showing the same
/// document — which is the only way to see whether the two agree.
library;

import 'package:mawy/mawy.dart' show MawyLocale;

/// One document, and what to call it.
class Sample {
  /// Creates a named document.
  const Sample(this.id, this.label, this.value, {this.korean, this.editor = false});

  /// What the documentation site asks for it by.
  final String id;

  /// What the gallery's switch shows.
  final String label;

  /// The Markdown.
  final String value;

  /// The same document in Korean, where there is a reason to have written one.
  ///
  /// Only the playground has one. Every other sample here is a specimen — what
  /// a table or a footnote looks like does not depend on who is reading it —
  /// and the playground is a list of things to try, which in a language the
  /// reader did not pick is a list nobody follows.
  final String? korean;

  /// Whether this one is opened in the editor rather than in the viewer.
  final bool editor;

  /// The document to show, in whichever language the page asked for.
  String valueFor(MawyLocale locale) => locale == MawyLocale.ko ? (korean ?? value) : value;
}

const String _everything = '''
# Reading a document

Mawy draws Markdown as widgets rather than as a string of HTML, which is what makes the safe default free: there is no markup on the way to the screen, so there is nothing to escape. Try the toolbar — the type is yours, not the document's.

## What it reads

Emphasis and **strong**, ~~struck through~~, `inline code`, and a [link](https://mawy.cdget.com) that goes somewhere. A bare URL becomes one too: https://github.com/jooy2/mawy

> [!NOTE]
> GitHub's five alert kinds are read as what they are, rather than as a quotation that happens to start with a word in brackets.

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

Definitions are resolved wherever they are written — this one is [at the bottom][ref].

[ref]: https://mawy.cdget.com/guide/viewer

[^why]: A footnote is written wherever it suits the author and read at the bottom. This one is written in the middle of the file.
''';

const String _minimal = '''
# A quiet document

No toolbar, no outline, no controls at all — just the document, set the way the application asked for it.

A viewer with `toolbar: const []` is a widget that draws Markdown and nothing else, which is most of what an application wants most of the time.
''';

const String _prose = '''
# 한글도 그대로

마크다운은 언어를 가리지 않습니다. 이 문서는 한국어로 쓰였고, **굵게**와
*기울임*, `코드`, [링크](https://mawy.cdget.com)가 모두 그대로 동작합니다.

## 줄 간격과 자간

한글은 라틴 문자와 글자의 밀도가 다릅니다. 툴바의 줄 간격과 자간이 있는 이유가 그것이고, 그 선택은 문서가 아니라 읽는 사람의 것입니다.

> 인용도, 목록도, 표도 같은 규칙을 따릅니다.
''';

const String _directives = '''
# What Markdown has no word for

The parser reads a **shape** and stops there. What each shape means is the gallery's to say, and the three below are declared in its own file, in about thirty lines between them.

:::callout[The shape and the meaning are different jobs]{kind=note}
A container holds blocks, so everything in here is read as Markdown:

- `callout` is a container, and the parser knows that much
- what a callout *is* — a box with a coloured edge — is this file's
:::

A leaf is a line of its own. This one draws a bar, and the number in it came out of `{value=72}`:

::progress{value=72 label=Coverage}

A text directive sits inside a sentence: press :kbd[Ctrl] + :kbd[K] to search,
:kbd[Esc] to leave.

:::callout[And nothing claimed this one]{kind=warning}
No builder was handed the name `youtube`, so the line under this box is drawn as the characters it was written with rather than quietly dropped — the same answer raw HTML gets, and for the same reason.
:::

::youtube{id=dQw4w9WgXcQ}
''';

const String _editor = '''
# Writing, not just reading

The source is on one side and the document on the other, and they are two views of one string rather than two editors. Type in the source and the preview keeps up; press a button on the toolbar and the *source* is what changes.

- a list, where `Enter` carries the bullet down
- and `Enter` on the empty item that follows gives it up again

`Tab` indents by two spaces, which is what a nested item needs and not one more.

```dart
MawyEditor(defaultValue: document, onChange: save);
```

There is no `wysiwyg` here. That surface edits the document where it is drawn, which rests entirely on `contenteditable` — and Flutter has nothing of the kind.
''';

const String _playground = '''
# Everything, switched on

This is the editor from the package — not a picture of it, and not a cut-down copy. What you type changes the Markdown, and the Markdown is what the other surface is a view of.

## The switch at the left

Three answers to one question: `plain` is the source, `preview` is the reading, and `split` is both. There is no `wysiwyg` here, and the editor guide says why: that surface edits the document where it is drawn, which rests entirely on `contenteditable`, and an `EditableText` owns a string.

In `split` the bar between the panes is something to take hold of — drag it, or give it the focus and press the arrows.

## The rest of the toolbar

Narrow the window and it scrolls sideways rather than putting its end in a menu, which is the one place this package and the React one answer differently. A row that slides is what a finger already knows to do; a menu is what a pointer does.

- [x] `Mod` + **B**, *I*, K and E do what the buttons do
- [x] `Mod` + **F** opens the find bar over the source, with replace beside it
- [ ] Opening and saving, which are the application's here — a file picker is a plugin rather than a widget

## The awkward things, deliberately

| What | Why it is here |
| :--- | -------------: |
| A table | the pipes have to stay lined up while you type |
| A footnote[^1] | it is read at the bottom and written here |
| 한글 | 조합이 끝나기 전에는 아무것도 건드리지 않습니다 |

> [!TIP]
> Drag across the source to select, double tap for a word, triple tap for a line. Then press a toolbar button: every command acts on the selection.

:::callout[A directive the gallery declared]{kind=note}
`callout`, `progress` and `kbd` are the gallery's rather than the library's. The parser reads the shape; what the shape means is whoever embedded the editor.
:::

::progress{value=40 label=Written}

```dart
MawyEditor(defaultValue: document, onChange: save);
```

[^1]: Written wherever it suits the author and read at the bottom, which is the whole of what a footnote is.
''';

const String _playgroundKo = '''
# 전부 켜 둔 채로

이 페이지에 있는 것은 패키지에 들어 있는 그 에디터입니다. 사진도 아니고 줄여 놓은 사본도 아닙니다. 여기에 입력하는 것이 곧 마크다운이고, 옆의 화면은 그 마크다운을 보는 방법입니다.

## 왼쪽 끝의 전환

하나의 질문에 대한 세 가지 답입니다. `plain`은 원문, `preview`는 읽기, `split`은 둘 다입니다. `wysiwyg`는 여기에 없고, 그 이유는 에디터 문서에 적혀 있습니다. 그 화면은 그려진 문서를 그 자리에서 고치는 것이고 그것은 전적으로 `contenteditable` 위에 서 있는데, `EditableText`는 문자열 하나를 가질 뿐입니다.

`split`에서 가운데 막대는 잡고 움직이는 것입니다. 끌어도 되고, 포커스를 준 뒤 방향키를 눌러도 됩니다.

## 툴바의 나머지

창을 좁히면 툴바는 메뉴로 접히는 대신 옆으로 스크롤합니다. 이 패키지와 React 패키지가 다르게 답한 유일한 자리입니다. 손가락은 밀리는 줄을 이미 알고 있고, 메뉴는 포인터가 하는 일입니다.

- [x] `Mod` + **B**, *I*, K, E는 버튼과 같은 일을 합니다
- [x] `Mod` + **F**는 원문 위에 찾기 막대를 엽니다. 바꾸기도 그 옆에 있습니다
- [ ] 열기와 저장은 여기서는 애플리케이션의 몫입니다. 파일 선택기는 위젯이 아니라 플러그인이기 때문입니다

## 일부러 까다로운 것들

| 무엇 | 왜 넣었는지 |
| :--- | ----------: |
| 표 | 입력하는 동안 세로줄이 계속 맞아야 합니다 |
| 각주[^1] | 쓰는 자리와 읽는 자리가 다릅니다 |
| 한글 | 조합이 끝나기 전에는 아무것도 건드리지 않습니다 |

> [!TIP]
> 원문 위를 끌면 선택되고, 두 번 누르면 단어가, 세 번 누르면 줄이 잡힙니다. 그런 다음 툴바 버튼을 눌러 보세요. 모든 명령은 선택된 것에 작용합니다.

:::callout[갤러리가 직접 선언한 디렉티브]{kind=note}
`callout`, `progress`, `kbd`는 라이브러리의 것이 아니라 갤러리의 것입니다. 파서는 모양까지만 읽고, 그 모양이 무엇을 뜻하는지는 에디터를 가져다 쓴 쪽이 정합니다.
:::

::progress{value=40 label=작성}

```dart
MawyEditor(defaultValue: document, onChange: save);
```

[^1]: 쓰기 좋은 자리에 쓰고 읽기는 맨 아래에서 읽습니다. 각주가 하는 일은 그것뿐입니다.
''';

/// Everything the gallery can show.
const List<Sample> samples = <Sample>[
  Sample('viewer/basic', 'Everything', _everything),
  Sample('viewer/minimal', 'Minimal', _minimal),
  Sample('viewer/prose', '한국어', _prose),
  Sample('viewer/directives', 'Directives', _directives),
  Sample('editor/basic', 'Editor', _editor, editor: true),
  Sample('playground/editor', 'Playground', _playground, korean: _playgroundKo, editor: true),
];
