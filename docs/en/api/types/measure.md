---
title: MawyMeasure
order: 15
---

# `MawyMeasure`

How wide the text is allowed to run.

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

34rem, 44rem, 56rem, or no limit. In Flutter those are 560, 704 and 880 logical pixels, the same three widths at the same 16-pixel body size. Turning the text size up is what makes a line too long, which is why this control sits next to it on the toolbar. `full` is for a viewer that has been given a column of its own and does not need a second one inside it.
