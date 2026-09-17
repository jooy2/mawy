---
title: MawyParseOptions
order: 7
---

# `MawyParseOptions`

마크다운 자체를 어떻게 읽을지.

::: fw react

```ts
interface MawyParseOptions {
  gfm?: boolean; // 기본값: true
  breaks?: boolean; // 기본값: false
  definitionLists?: boolean; // 기본값: true
  headingIds?: boolean; // 기본값: true
}
```

:::

::: fw flutter

```dart
class MawyParseOptions {
  const MawyParseOptions({
    this.gfm = true,
    this.breaks = false,
    this.definitionLists = true,
    this.headingIds = true,
  });
}
```

:::

- **`gfm`** — GitHub Flavored Markdown입니다. 표, 체크박스 목록, `~~취소선~~`, 알림 블록, 각주, 그리고 맨 URL이 링크가 되는 것.
- **`breaks`** — 문단 안의 줄바꿈 하나를 줄 바꿈으로 볼지. 마크다운의 규정대로 기본은 꺼져 있습니다. 켜면 채팅 클라이언트나 이슈 트래커와 같아지는데, 마크다운을 써 본 적 없는 독자가 기대하는 동작이 그쪽입니다.
- **`definitionLists`** — 글줄 아래 `: `로 시작하는 줄을 용어와 뜻으로 볼지. 켜져 있고, Mawy가 읽되 GitHub은 읽지 않는 둘 가운데 하나입니다. 문법은 PHP Markdown Extra의 것이고, 이것을 쓰는 사람들이 모두 쓰는 문법입니다. GitHub에서와 똑같은 뜻이어야 하는 문서라면 끄세요.
- **`headingIds`** — 제목 끝의 `{#id}`를 제목이 달 이름으로 볼지, 제목의 글자로 볼지. 켜져 있고, 나머지 하나가 이것입니다. GitHub에서와 똑같은 뜻이어야 하는 문서라면 끄세요. 그쪽에서는 중괄호가 낱말입니다. [제목의 앵커](../../guide/viewer#제목의-앵커)를 보세요.

네 옵션은 두 패키지에서 같고, 기본값도 효과도 같습니다. 파서는 하나이고, [CI의 검사](https://github.com/jooy2/mawy/blob/main/packages/flutter/tool/parity.dart)가 저장소의 모든 마크다운 파일에 대해 두 트리를 비교합니다.
