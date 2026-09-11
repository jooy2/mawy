---
title: MdDocument
order: 8
---

# `MdDocument`

파싱한 문서입니다. 트리와 개요, 그리고 그 아래 각주까지. [`parseMarkdown`](../functions/parse-markdown)이 돌려주는 것입니다.

::: fw react

```ts
interface MdDocument {
  root: MdRoot; // 블록들
  outline: MdOutlineEntry[]; // 모든 제목을 순서대로, 각각 고유한 슬러그와 함께
  footnotes: MdFootnoteDefinition[]; // 무언가 가리킨 각주만, 그 순서대로
}
```

:::

::: fw flutter

```dart
class MdDocument {
  final MdRoot root; // 블록들
  final List<MdOutlineEntry> outline; // 모든 제목을 순서대로, 각각 고유한 슬러그와 함께
  final List<MdFootnoteDefinition> footnotes; // 무언가 가리킨 각주만, 그 순서대로
}
```

:::

각주는 `root`에 들어 있지 않습니다. 각주는 저자가 편한 자리에 쓰고 독자는 맨 아래에서 읽는 것이라, 문서를 그리는 쪽이 본문 뒤에 그립니다.

## 노드

노드 타입도 함께 내보냅니다. `MdHeading`, `MdParagraph`, `MdCode`, `MdList`, `MdTable`, `MdLink`, `MdImage`를 비롯한 나머지가 모두 자기가 쓰인 자리를 `MdRange`로 지니고 있습니다. 파서에 건넨 원문 안의 위치입니다.

::: fw react

Flutter 패키지의 노드 클래스와 같은 이름으로 대응하고, 그래서 두 파서를 견줄 수 있습니다. `tool/parity.dart`가 비교하는 것이 이 트리입니다.

:::

::: fw flutter

React 패키지의 노드 타입과 같은 이름으로 대응하고, 그래서 두 파서를 견줄 수 있습니다. `tool/parity.dart`가 비교하는 것이 이 트리입니다.

:::
