/// A mouse wheel that arrives over a few frames rather than all at once.
///
/// Flutter answers a wheel notch by moving the scroll offset to where the notch
/// says, in one frame. Every browser and every native application on the two
/// desktop platforms this package is read on animates that instead, which is
/// why a Flutter document feels harder under the same hand than the same
/// document does in a browser — nothing is wrong with the distance, it is that
/// the eye is given no path between here and there.
///
/// So the notch becomes a short animation to the same place. A second notch
/// while the first is still arriving adds to where it was going rather than
/// starting again from where it has got to, which is what keeps a run of them
/// feeling like one movement.
///
/// The interception is the awkward half. [Scrollable] registers for a scroll
/// signal with the [PointerSignalResolver], which hands the event to whoever
/// registered *first* — and a signal is dispatched down the hit-test path from
/// the innermost target outwards. So this has to sit **inside** the scroll view
/// rather than around it, wrapped around the content, which is why it takes a
/// controller rather than finding one.
///
/// A reader who asked the platform for less movement is given the jump, which
/// is the behaviour this replaces and the same answer the stylesheet's
/// `scroll-behavior` gives under `prefers-reduced-motion`.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

/// How long a notch takes to arrive. Short enough not to lag a hand that is
/// still turning the wheel, long enough to be a movement rather than a cut.
const Duration _kSettle = Duration(milliseconds: 140);

/// Wraps the content of a scroll view so its wheel is animated.
class MawyWheelScroll extends StatefulWidget {
  /// Creates the wrapper.
  const MawyWheelScroll({required this.controller, required this.child, super.key});

  /// The scroller this content belongs to.
  final ScrollController controller;

  /// The content.
  final Widget child;

  @override
  State<MawyWheelScroll> createState() => _MawyWheelScrollState();
}

class _MawyWheelScrollState extends State<MawyWheelScroll> {
  /// Where the wheel is taking it, while it is still on the way there.
  double? _going;

  void _onSignal(PointerSignalEvent event) {
    if (event is! PointerScrollEvent || !widget.controller.hasClients) {
      return;
    }

    GestureBinding.instance.pointerSignalResolver.register(event, _turn);
  }

  void _turn(PointerEvent event) {
    if (event is! PointerScrollEvent || !widget.controller.hasClients) {
      return;
    }

    final ScrollPosition position = widget.controller.position;
    final double from = _going ?? position.pixels;
    final double to = (from + event.scrollDelta.dy).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );

    if (to == position.pixels) {
      _going = null;

      return;
    }

    if (!mounted || MediaQuery.disableAnimationsOf(context)) {
      _going = null;
      position.jumpTo(to);

      return;
    }

    _going = to;
    widget.controller.animateTo(to, duration: _kSettle, curve: Curves.easeOutCubic).whenComplete(
      () {
        if (_going == to) {
          _going = null;
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      // Whatever it is over: the content may be narrower than what scrolls it,
      // and a wheel turned beside a column of prose is a wheel turned on it.
      behavior: HitTestBehavior.translucent,
      onPointerSignal: _onSignal,
      // A hand on the scrollbar or a finger on the page is somewhere else the
      // offset comes from, and where it was going stops being true.
      onPointerDown: (PointerDownEvent _) => _going = null,
      child: widget.child,
    );
  }
}
