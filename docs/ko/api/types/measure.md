---
title: MawyMeasure
order: 15
---

# `MawyMeasure`

글줄이 얼마나 길게 흐를 수 있는지.

::: fw react

```ts
type MawyMeasure = 'narrow' | 'normal' | 'wide' | 'full';
```

:::

::: fw flutter

```dart
enum MawyMeasure { narrow, normal, wide, full }

extension MawyMeasureWidth on MawyMeasure {
  double? get width; // 560, 704, 880, null
}
```

:::

34rem, 44rem, 56rem, 또는 제한 없음입니다. Flutter에서는 논리 픽셀 560, 704, 880이고, 본문 16픽셀 기준으로 같은 세 너비입니다. 글줄을 너무 길게 만드는 것은 글자 크기를 키우는 일이라, 이 컨트롤이 툴바에서 글자 크기 옆에 있습니다. `full`은 이미 자기 단을 받아서 그 안에 단을 하나 더 둘 필요가 없는 뷰어를 위한 값입니다.
