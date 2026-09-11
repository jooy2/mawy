---
title: MawyViewerToolbarItem
order: 4
---

# `MawyViewerToolbarItem`

One control on the viewer's toolbar. See [the toolbar](../../guide/viewer#the-toolbar).

::: fw react

```ts
type MawyViewerToolbarItem =
  | 'fontFamily'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'measure'
  | 'colorScheme'
  | 'outline'
  | 'find'
  | 'copy'
  | 'open'
  | 'separator';
```

:::

::: fw flutter

```dart
enum MawyViewerToolbarItem {
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  measure,
  colorScheme,
  outline,
  find,
  copy,
  separator,
}
```

:::

`separator` draws a hairline rather than a control.

`find` opens a bar over the document, and takes `Ctrl`+`F` (`Cmd`+`F`) while the viewer has the focus. Leave it out and the shortcut belongs to the browser again, which is right for a viewer that fills the page. This bar is for a viewer inside a pane of its own, which a browser's find scrolls past rather than into. It searches the text the document _draws_: `bold` finds the word inside `**bold**`, and `**` finds nothing. A match cannot straddle two runs, so `hello` is not found across `he**llo**`, and a fenced code block is not searched.

::: fw flutter

There is no `open`, for the same reason there is no file picker: opening a file means a plugin this package does not have.

## `kMawyViewerToolbar`

```dart
const List<MawyViewerToolbarItem> kMawyViewerToolbar;
```

Every control in the order the toolbar draws them, and the default for `toolbar`. `const []` is no toolbar at all, and any other list is exactly those controls in exactly that order.

:::

::: fw react

## `MawyViewerToolbarOption`

```ts
type MawyViewerToolbarOption = boolean | readonly MawyViewerToolbarItem[];
```

`true` is every control in the order above; `false` is no toolbar at all; an array is exactly those controls, in exactly that order.

:::

There is no way in either package to add a control that is not on the list. A toolbar that takes arbitrary children is one the library can no longer make keyboard-operable.
