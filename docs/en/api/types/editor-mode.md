---
title: Editor modes
order: 1
---

# Editor modes

Which surface a document is shown on. They all show the same document. See [the editor](../../guide/editor).

::: fw react

## `MawyMode`

```ts
type MawyMode = 'wysiwyg' | 'plain' | 'preview' | 'split';
```

- `'wysiwyg'` — the rendered document, edited in place.
- `'plain'` — the Markdown source, edited as text.
- `'preview'` — the rendered document, read-only.
- `'split'` — the source on one side and the preview on the other, at once.

`split` is on this list rather than beside it because of what a reader does with the control: the four are one group of buttons, one at a time, and "both" is the fourth answer to the same question.

:::

::: fw flutter

## `MawyEditorMode`

```dart
enum MawyEditorMode { plain, split, preview }
```

- `plain` — the Markdown source, coloured, edited as text.
- `split` — the source on one side and the drawn document on the other, at once. The default.
- `preview` — the drawn document alone.

There is no `wysiwyg`, and there is not going to be. See [`MawyEditor`](../components/mawy-editor#surfaces) for why.

## `kMawyEditorModes`

```dart
const List<MawyEditorMode> kMawyEditorModes;
```

All three in the order the switch offers them, and the default for `modes`. Give it one and the switch disappears.

:::
