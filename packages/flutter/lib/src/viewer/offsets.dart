/// Where each block of a drawn document sits in the box that scrolls it.
///
/// Four things the viewer offers are the same question asked four ways: which
/// heading is at the top of the view, where to scroll so a match is on the
/// screen, where to scroll so a heading is, and where every block is for
/// whatever is lining a second view up with this one. Each of those used to be
/// answered by finding the block's element through a [GlobalKey] and asking the
/// render tree — which works, and only works for a block that has been built.
///
/// So the answer is kept rather than asked for. Every block reports the height
/// it was laid out at, once, as it is laid out; the running total of those is
/// where each block begins. Reading it is arithmetic on a list rather than a
/// walk up a render tree, so the outline can measure on every scroll
/// notification without touching the document at all — and a block that has not
/// been laid out yet is the one case the render tree could not answer either,
/// which is what makes this the thing to build a lazy list on.
///
/// The offsets are the same numbers `RenderAbstractViewport.getOffsetToReveal`
/// returns: the scroll offset that would put the block at the top of what can
/// be seen, with whatever padding the scroll view was given already in them.
library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// The heights of a drawn document's blocks, and where each of them begins.
class MawyBlockOffsets {
  /// What each block was laid out at, or `null` for one that has not been.
  final List<double?> _heights = <double?>[];

  /// Where each block begins, with one more entry than there are blocks: the
  /// last is where the document ends. Rebuilt when a height changes.
  final List<double> _starts = <double>[];

  /// Whether [_starts] is behind [_heights].
  bool _stale = true;

  /// What is above the first block — the scroll view's own leading padding.
  double _lead = 0;

  /// How many blocks are known about.
  int get length => _heights.length;

  /// Forgets the document that just went, and makes room for [blocks] of a new
  /// one. Called when the viewer reparses.
  void reset(int blocks) {
    _heights
      ..clear()
      ..addAll(List<double?>.filled(blocks, null));
    _stale = true;
  }

  /// What sits above the first block. Set by the viewer from its own padding.
  set lead(double value) {
    if (value != _lead) {
      _lead = value;
      _stale = true;
    }
  }

  /// The height a block was laid out at. Called from layout, so it does no
  /// more than write the number down.
  void report(int index, double height) {
    if (index < 0 || index >= _heights.length || _heights[index] == height) {
      return;
    }

    _heights[index] = height;
    _stale = true;
  }

  /// Whether every block has been laid out at least once.
  ///
  /// The answers below are exact while this is true and estimates otherwise,
  /// and a caller that has to know which it got can ask.
  bool get complete => !_heights.contains(null);

  void _settle() {
    if (!_stale) {
      return;
    }

    _stale = false;

    // What a block nobody has laid out is worth, which is what the ones that
    // have been are worth on average. A document of blocks all roughly one size
    // is nearly exact; one that is a paragraph and then a picture is not, and
    // is corrected the moment the picture is laid out.
    double total = 0;
    int known = 0;

    for (final double? height in _heights) {
      if (height != null) {
        total += height;
        known += 1;
      }
    }

    final double guess = known == 0 ? 0 : total / known;

    _starts
      ..clear()
      ..add(_lead);

    double at = _lead;

    for (final double? height in _heights) {
      at += height ?? guess;
      _starts.add(at);
    }
  }

  /// The scroll offset that would put block [index] at the top of the view.
  ///
  /// `null` for an index the document does not have. A block nobody has laid
  /// out is answered from the average of the ones who have, which is a number
  /// to scroll towards rather than one to trust.
  double? offsetOf(int index) {
    if (index < 0 || index >= _heights.length) {
      return null;
    }

    _settle();

    return _starts[index];
  }

  /// How tall the document is, as far as anything knows.
  double get extent {
    _settle();

    return _starts.isEmpty ? _lead : _starts.last;
  }

  /// The last block that begins at or above [offset].
  ///
  /// Found by halving. `null` for a document with no blocks in it; the first
  /// block for an offset above all of them, since that is the one being read.
  int? blockAt(double offset) {
    if (_heights.isEmpty) {
      return null;
    }

    _settle();

    int low = 0;
    int high = _heights.length - 1;
    int found = 0;

    while (low <= high) {
      final int middle = (low + high) ~/ 2;

      if (_starts[middle] <= offset) {
        found = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return found;
  }
}

/// A block that writes down the height it was laid out at.
///
/// A proxy and nothing else: it lays its child out exactly as the box around it
/// would have, and the one thing it adds is the number. Doing it in layout
/// rather than in a callback after the frame is what makes it free — the height
/// is already known at that point, and reading it costs nothing that was not
/// already paid.
class MawyMeasured extends SingleChildRenderObjectWidget {
  /// Creates a measured block.
  const MawyMeasured({
    required this.offsets,
    required this.index,
    required Widget super.child,
    super.key,
  });

  /// Where the height is written down.
  final MawyBlockOffsets offsets;

  /// Which block this is.
  final int index;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderMeasured(offsets, index);

  /// The render object is this widget's own business, and giving it a public
  /// name would be inviting somebody to reach for it.
  @override
  // ignore: library_private_types_in_public_api
  void updateRenderObject(BuildContext context, _RenderMeasured renderObject) {
    renderObject
      ..offsets = offsets
      ..index = index;
  }
}

class _RenderMeasured extends RenderProxyBox {
  _RenderMeasured(this.offsets, this.index);

  MawyBlockOffsets offsets;
  int index;

  @override
  void performLayout() {
    super.performLayout();
    offsets.report(index, size.height);
  }
}
