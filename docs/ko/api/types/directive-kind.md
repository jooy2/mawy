---
title: MawyDirectiveKind
order: 16
---

# `MawyDirectiveKind`

디렉티브가 세 모양 중 어느 것으로 쓰였는지.

::: fw react

```ts
type MawyDirectiveKind = 'container' | 'leaf' | 'text';
```

:::

::: fw flutter

```dart
enum MawyDirectiveKind { container, leaf, text }
```

:::

콜론의 개수가 차이의 전부입니다. `:::container`는 블록을 담고, `::leaf`는 한 줄을 차지하며, `:text`는 문장 안에 놓입니다. 무엇에 쓰는지는 [디렉티브](../../guide/viewer#디렉티브)에 있습니다.
