---
title: MawyEditorStatusItem
order: 3
---

# `MawyEditorStatusItem`

What the editor counts along its bottom edge.

::: fw react

```ts
type MawyEditorStatusItem = 'position' | 'selection' | 'lines' | 'words' | 'characters' | 'size';
```

:::

::: fw flutter

```dart
enum MawyEditorStatusItem { position, selection, lines, words, characters, size }
```

:::

`characters` are code points, so an emoji is one. `words` adds every Han, hiragana and katakana character to the space-separated count, because those are written without spaces; Korean is spaced, so an eojeol is one word. `size` is UTF-8 bytes, which is what a file on disk will be.

::: fw react

## `MawyEditorStatusOption`

```ts
type MawyEditorStatusOption = boolean | readonly MawyEditorStatusItem[];
```

`true` is everything on the list above; `false` is no status bar at all; an array is exactly those counts, in that order.

:::

::: fw flutter

## `kMawyEditorStatus`

```dart
const List<MawyEditorStatusItem> kMawyEditorStatus;
```

What the status bar counts unless it is told otherwise. `const []` is no status bar at all.

:::
