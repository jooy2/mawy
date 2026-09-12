---
title: Frame
order: 22
---

# Frame

Whether the surface has a frame around it, and which end its toolbar is at.

## `MawyFrame`

::: fw react

```ts
type MawyFrame = 'box' | 'floating';
```

:::

::: fw flutter

```dart
enum MawyFrame { box, floating }
```

:::

- `box` — the default. A surface with a background of its own and the toolbar barred across one end of it, so a reader can see where the viewer starts and the page stops. This is what a document being looked at _inside_ a larger page wants.
- `floating` — nothing wraps the document. No background, and the toolbar becomes a rounded bar over the text, the way a phone puts its controls over what they act on. This is for a document that _is_ the page: an article, a post, a README, where a box around the prose is a box around the whole screen and says nothing.

The room around the prose follows the frame, because a page that draws its own gutters does not want a second set inside them. <Fw react="--mawy-doc-padding" flutter="padding" code /> says how much, either way.

## `MawyToolbarPlacement`

::: fw react

```ts
type MawyToolbarPlacement = 'top' | 'bottom';
```

:::

::: fw flutter

```dart
enum MawyToolbarPlacement { top, bottom }
```

:::

Which end of the surface the toolbar is at. Under `box` it is a bar with its line on the other side; under `floating` it is which edge the rounded bar hovers over — `bottom` is where a thumb is on a phone, and `top` is where a pointer expects a toolbar.

The find bar goes with it. A find bar at one end with its toolbar at the other is a bar belonging to nothing.

::: fw react

Both are drawn in the order they are read, so the DOM says what the screen says and a keyboard walks it in that order.

:::

The editor's status line is not a toolbar and does not move; it is the bottom edge of the editor either way.

See [the frame](../../guide/viewer#the-frame).
