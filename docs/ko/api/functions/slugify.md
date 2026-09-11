---
title: slugify
order: 2
---

# `slugify`

제목의 앵커를 GitHub이 쓰는 방식으로 만듭니다.

::: fw react

```ts
function slugify(text: string): string;
```

[`parseMarkdown`](./parse-markdown)과 함께 `mawy-react/markdown`에서 내보냅니다.

:::

::: fw flutter

```dart
String slugify(String text);
```

:::

어떤 규칙을 고르느냐보다 GitHub과 맞추는 것이 중요합니다. README의 앵커는 그 규칙에 맞춰 손으로 쓰이므로, `#getting-started`로 링크하는 문서는 GitHub이 그 제목에 붙였을 이름으로 링크하고 있는 것입니다.

파싱한 문서의 `outline` 항목은 이미 여기서 나온 슬러그를 문서 안에서 고유하게 만들어 지니고 있습니다. 손으로 쓴 링크가 어디에 닿을지 알아보려면 직접 호출하면 됩니다.
