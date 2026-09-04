/// Where each block of a drawn document sits in the box that scrolls it.
///
/// A viewer knows two things nothing outside it can work out: which characters
/// of the source each block came from, and where that block ended up on the
/// page. Anything lining a second view up with a drawn document needs both, as
/// numbers — the editor's `split` is the case this exists for, and it is the
/// half of `src/internal/scroll.ts` that a browser answers by reading a
/// bounding box off an element.
///
/// Hand one to [MawyViewer] and ask it for [places]. The answers come out of
/// the viewer's own record of how tall each block was laid out — see
/// `offsets.dart` — rather than out of a layout read per block, so asking is
/// arithmetic and a viewer that redraws because a pointer moved over a code
/// block measures nothing.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/viewer/offsets.dart';

/// The blocks of one viewer's document, and where they are.
class MawyViewerAnchors {
  /// Creates an empty set.
  MawyViewerAnchors();

  final Map<int, GlobalKey> _keys = <int, GlobalKey>{};

  MawyBlockOffsets? _offsets;
  List<int> _starts = const <int>[];

  /// The key on the block starting at [start]. Called by the viewer as it
  /// draws, and not something an application has a reason to call.
  ///
  /// [places] is answered from the viewer's own measurements rather than
  /// through these, so what a key is still good for is reaching the block's
  /// element — which is a thing to do with a block on the screen, and `null`
  /// for one that is not.
  GlobalKey keyFor(int start) =>
      _keys.putIfAbsent(start, () => GlobalKey(debugLabel: 'MawyViewerAnchors $start'));

  /// Where the viewer keeps its measurements, and which character each block
  /// starts at. Called by the viewer as it reads a document, and not something
  /// an application has a reason to call.
  void follow(MawyBlockOffsets offsets, List<int> starts) {
    _offsets = offsets;
    _starts = starts;
  }

  /// Forgets the document that just went. Called by the viewer when it reparses.
  void reset() {
    _keys.clear();
    _offsets = null;
    _starts = const <int>[];
  }

  /// Every block, as the character it starts at and the scroll offset that
  /// would put it at the top of what can be seen.
  ///
  /// In document order, and every block answers rather than only the ones on
  /// the screen. A block the viewer has laid out is exact; one it has not is
  /// worked out from what the others measured, which is a place to aim at and
  /// becomes exact the moment it is drawn.
  List<(int, double)> places() {
    final MawyBlockOffsets? offsets = _offsets;

    if (offsets == null) {
      return const <(int, double)>[];
    }

    final List<(int, double)> found = <(int, double)>[];

    for (int index = 0; index < _starts.length; index += 1) {
      final double? at = offsets.offsetOf(index);

      if (at != null) {
        found.add((_starts[index], at));
      }
    }

    return found;
  }
}
