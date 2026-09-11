---
title: MawyViewerAnchors
order: 21
---

# `MawyViewerAnchors`

Where each block of a drawn document sits in the box that scrolls it.

::: fw react

This one is the Flutter package's. A browser answers the same question by reading a bounding box off an element, and every block the viewer draws carries its `data-mawy-range` for exactly that — see [mapping the page back to the source](../../guide/viewer#mapping-the-page-back-to-the-source).

:::

::: fw flutter

```dart
class MawyViewerAnchors {
  MawyViewerAnchors();

  /// Every block, as the character it starts at and the scroll offset that
  /// would put it at the top of what can be seen.
  List<(int, double)> places();
}
```

A viewer knows two things nothing outside it can work out: which characters of the source each block came from, and where that block ended up on the page. Anything lining a second view up with a drawn document needs both, as numbers — the editor's `split` is the case this exists for.

Hand one to [`MawyViewer`](../components/mawy-viewer#layout-and-scrolling) and ask it for `places()`. The answers are in document order, and every block answers rather than only the ones on the screen: a block the viewer has laid out is exact, and one it has not is worked out from what the others measured, which is a place to aim at and becomes exact the moment it is drawn.

The answers come out of the viewer's own record of how tall each block was laid out rather than out of a layout read per block, so asking is arithmetic. A viewer that redraws because a pointer moved over a code block measures nothing.

:::
