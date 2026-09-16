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
  | 'undo'
  | 'redo'
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
  | 'table'
  | 'rule'
  | 'footnote'
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
  undo,
  redo,
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
  table,
  rule,
  footnote,
  find,
  open,
  colorScheme,
  separator,
}
```

:::

Everything except `mode`, `undo`, `redo`, `find`, `open`, `save`, `colorScheme` and `separator` is a formatting command, and every one of those also has a keyboard shortcut. `find` has one too, `Mod`+`F`, and it works whether or not the button is drawn. `separator` draws a hairline rather than a control.

`undo` and `redo` are the history, `Mod`+`Z` and `Mod`+`Shift`+`Z`, drawn disabled while there is nothing to take back or put back.

`footnote` writes a footnote's reference where the caret is and its note at the end of the document, and leaves the caret in the note. Both halves at once, because the parser draws a footnote only where there is a note to draw. The number is the first one nothing in the document has taken; see [formatting](../../guide/editor#formatting).

`table` is a grid that inserts an empty table of the size pressed. The rows and columns of a table are changed from a bar hung beside the table the caret is in, and each of those commands has a shortcut of its own; see [tables](../../guide/editor#tables).

::: fw react

`open` and `save` are here as well. `Mod`+`S` saves whether the button is drawn or not; `open` has no shortcut, because the browser's own `Mod`+`O` is a reasonable thing to leave alone and opening a file is a rare and deliberate act rather than one done mid-flow.

## `MawyEditorToolbarOption`

```ts
type MawyEditorToolbarOption = boolean | readonly MawyEditorToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar; an array is exactly those, in that order.

:::

::: fw flutter

`open` is drawn only where `onOpen` is given, because a file picker is a plugin and what a press of it opens is the application's. There is no `save`: the application has the document through `onChange` and decides where it goes. See [opening and saving](../../guide/editor#opening-and-saving).

## `kMawyEditorToolbar`

```dart
const List<MawyEditorToolbarItem> kMawyEditorToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::
