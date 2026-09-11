---
title: MawyDirectiveKind
order: 16
---

# `MawyDirectiveKind`

Which of the three shapes a directive was written in.

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

The number of colons is the difference and nothing else about it is: `:::container` holds blocks, `::leaf` is a line of its own, and `:text` sits inside a sentence. See [directives](../../guide/viewer#directives) for what they are for.
