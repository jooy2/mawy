---
title: MawyFontFamily
order: 13
---

# `MawyFontFamily`

문서를 어느 서체로 조판할지.

::: fw react

```ts
type MawyFontFamily = 'sans' | 'serif' | 'mono' | (string & {});
```

뷰어가 건네받은 글꼴 중 하나의 `id`입니다. `sans`, `serif`, `mono`는 뷰어가 스스로 제공하는 셋이고, 글꼴 이름이 아니라 역할입니다. 내려받는 것은 없고, 각각의 뒤에 있는 스택은 애플리케이션이 다시 선언할 수 있는 `--mawy-font-*` 커스텀 속성입니다. 그 밖의 문자열은 [`fonts`](./font)로 넘긴 글꼴의 `id`입니다.

:::

::: fw flutter

```dart
enum MawyFontFamily { sans, serif, mono }
```

세 역할뿐입니다. 글꼴 이름이 아니라 역할이고, 각각 그 역할에 해당하는 플랫폼의 서체로 갑니다. 특정 서체를 원하는 애플리케이션은 그것을 번들하고 [`MawyTypography.fontFamilyName`](./typography)으로 이름을 댑니다. 네 번째 값은 없습니다. 값을 더할 글꼴 목록 자체가 없기 때문입니다.

:::
