---
title: MawyEditorToolbarItem
order: 2
---

# `MawyEditorToolbarItem`

One control on the editor's toolbar.

::: fw react

```ts
type MawyEditorToolbarItem =
  | 'mode'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'image'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'rule'
  | 'find'
  | 'open'
  | 'save'
  | 'colorScheme'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyEditorToolbarItem {
  mode,
  bold,
  italic,
  strikethrough,
  code,
  link,
  image,
  heading,
  quote,
  bulletList,
  orderedList,
  taskList,
  codeBlock,
  rule,
  find,
  colorScheme,
  separator,
}
```

:::

Everything except `mode`, `find`, `colorScheme` and `separator` is a formatting command, and every one of those also has a keyboard shortcut. `find` has one too, `Mod`+`F`, and it works whether or not the button is drawn. `separator` draws a hairline rather than a control.

::: fw react

`open` and `save` are here as well. `Mod`+`S` saves whether the button is drawn or not; `open` has no shortcut, because the browser's own `Mod`+`O` is a reasonable thing to leave alone and opening a file is a rare and deliberate act rather than one done mid-flow.

## `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar; an array is exactly those, in that order.

:::

::: fw flutter

There is no `open` and no `save`. The application handles both here; see [opening and saving](../../guide/editor#opening-and-saving).

## `kMawyEditorToolbar`

```dart
const List<MawyEditorToolbarItem> kMawyEditorToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::
