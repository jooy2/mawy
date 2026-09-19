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
  frontmatter?: boolean; // 기본값: true
  typographer?: boolean; // 기본값: false
  autolinkSchemes?: boolean; // 기본값: false
  typographerQuotes?: MawyQuotes; // 기본값: 영어의 따옴표
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
    this.frontmatter = true,
    this.typographer = false,
    this.autolinkSchemes = false,
    this.typographerQuotes = const MawyQuotes(),
  });
}
```

:::

- **`gfm`** — GitHub Flavored Markdown입니다. 표, 체크박스 목록, `~~취소선~~`, 알림 블록, 각주, 그리고 맨 URL이 링크가 되는 것.
- **`breaks`** — 문단 안의 줄바꿈 하나를 줄 바꿈으로 볼지. 마크다운의 규정대로 기본은 꺼져 있습니다. 켜면 채팅 클라이언트나 이슈 트래커와 같아지는데, 마크다운을 써 본 적 없는 독자가 기대하는 동작이 그쪽입니다.
- **`definitionLists`** — 글줄 아래 `: `로 시작하는 줄을 용어와 뜻으로 볼지. 켜져 있고, Mawy가 읽되 GitHub은 읽지 않는 둘 가운데 하나입니다. 문법은 PHP Markdown Extra의 것이고, 이것을 쓰는 사람들이 모두 쓰는 문법입니다. GitHub에서와 똑같은 뜻이어야 하는 문서라면 끄세요.
- **`headingIds`** — 제목 끝의 `{#id}`를 제목이 달 이름으로 볼지, 제목의 글자로 볼지. 켜져 있고, 나머지 하나가 이것입니다. GitHub에서와 똑같은 뜻이어야 하는 문서라면 끄세요. 그쪽에서는 중괄호가 낱말입니다. [제목의 앵커](../../guide/viewer#제목의-앵커)를 보세요.
- **`frontmatter`** — 문서 맨 위의 `---` 울타리로 둘러싼 부분을 보이는 그대로 메타데이터로 읽고, 문서가 말하는 것에서 빼 둘지. 켜져 있습니다. 이 표기는 제목이나 날짜 같은 것을 문서 안이 아니라 문서 옆에 실어 나르고, 독자에게는 아무것도 보이지 않아야 합니다. 마크다운으로 그리면 구분선 하나와 그 아래 밑줄 그은 제목이 됩니다. 맨 위의 `---`가 정말 구분선인 문서라면 끄세요. [프런트매터](../../guide/viewer#프런트매터)를 보세요.
- **`typographer`** — 따옴표를 방향에 맞게 돌리고, `--`와 `...`와 `(c)`를 그것이 대신하던 기호로 그릴지. 저자가 친 글자를 고쳐 쓰는 일이라 꺼져 있습니다. `(c)`라고 쓰려던 문서는 다른 모든 곳에서 `(c)`라고 읽힙니다. [활자](../../guide/viewer#활자)를 보세요.
- **`autolinkSchemes`** — 링크 정책이 믿는 스킴을 단 맨 주소를 링크로 볼지. `ftp://`, `matrix:`, `//host/path` 같은 것으로, GFM이 이미 읽는 `http`, `https`, `www.`, 메일 주소에 더해집니다. GFM은 웹 주소에서 멈추고, 여기서는 링크인데 GitHub에서는 낱말인 글은 두 가지 뜻을 가진 문서라서 꺼져 있습니다. [맨 주소](../../guide/viewer#맨-주소)를 보세요.
- **`typographerQuotes`** — 따옴표를 그릴 네 기호입니다. 영어와 다르게 인용을 적는 언어의 문서를 위한 것입니다. 기호를 그리는 쪽이 `typographer`라서, 그것 없이는 아무 일도 하지 않습니다. [`MawyQuotes`](./quotes)를 보세요.

여덟 옵션은 두 패키지에서 같고, 기본값도 효과도 같습니다. 파서는 하나이고, [CI의 검사](https://github.com/jooy2/mawy/blob/main/packages/flutter/tool/parity.dart)가 저장소의 모든 마크다운 파일에 대해 두 트리를 비교합니다.
