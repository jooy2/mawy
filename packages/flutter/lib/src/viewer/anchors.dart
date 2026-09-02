/// Where each block of a drawn document sits in the box that scrolls it.
///
/// A viewer knows two things nothing outside it can work out: which characters
/// of the source each block came from, and where that block ended up on the
/// page. Anything lining a second view up with a drawn document needs both, as
/// numbers — the editor's `split` is the case this exists for, and it is the
/// half of `src/internal/scroll.ts` that a browser answers by reading a
/// bounding box off an element.
///
/// Hand one to [MawyViewer] and it keeps a key on every top-level block; ask it
/// for [places] and it measures them. Nothing is measured until it is asked
/// for, because measuring is a layout read per block and a viewer redraws when
/// a pointer moves over a code block.
library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// The blocks of one viewer's document, and where they are.
class MawyViewerAnchors {
  /// Creates an empty set.
  MawyViewerAnchors();

  final Map<int, GlobalKey> _keys = <int, GlobalKey>{};
  final List<int> _order = <int>[];

  /// The key for the block starting at [start]. Called by the viewer as it
  /// draws, and not something an application has a reason to call.
  GlobalKey keyFor(int start) {
    final GlobalKey? held = _keys[start];

    if (held != null) {
      return held;
    }

    final GlobalKey made = GlobalKey(debugLabel: 'MawyViewerAnchors $start');

    _keys[start] = made;
    _order.add(start);

    return made;
  }

  /// Forgets the document that just went. Called by the viewer when it reparses.
  void reset() {
    _keys.clear();
    _order.clear();
  }

  /// Every block, as the character it starts at and the scroll offset that
  /// would put it at the top of what can be seen.
  ///
  /// In document order, and blocks that are not on the screen this frame are
  /// left out rather than guessed at.
  List<(int, double)> places() {
    final List<(int, double)> found = <(int, double)>[];

    for (final int start in _order) {
      final RenderObject? box = _keys[start]?.currentContext?.findRenderObject();

      if (box == null || !box.attached || box is! RenderBox || !box.hasSize) {
        continue;
      }

      final RenderAbstractViewport? viewport = RenderAbstractViewport.maybeOf(box);

      if (viewport == null) {
        continue;
      }

      found.add((start, viewport.getOffsetToReveal(box, 0).offset));
    }

    return found;
  }
}
