/// The links in a drawn document, and the two things that keep them working.
///
/// Both widgets that draw a document — `MawyViewer` and `MawyDocument` — hand
/// the renderer a recognizer per link and have to answer the same two
/// questions about it. Who owns the recognizer, since one made in a build is
/// one allocated again every time the pointer moves over a code block, and one
/// kept forever is a leak. And how a tap reaches the link at all where a
/// selection is being made over the top of it.
///
/// Neither is a viewer's question or a document's, so both are here, and a
/// second copy of either is a second answer to drift from this one.
library;

import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Gives a [State] the recognizers a drawn document's links need, and the
/// press-and-release reading that follows one where the arena will not.
mixin MawyLinking<T extends StatefulWidget> on State<T> {
  /// The tap recognizers the links in the document are using, by where each
  /// link starts. See `MawyRenderContext.recognizerFor`.
  final Map<Object, TapGestureRecognizer> _recognizers = <Object, TapGestureRecognizer>{};

  /// Which of them this build asked for, so the rest can be let go afterwards.
  final Set<Object> _wanted = <Object>{};

  /// Whether a sweep is already booked for the end of this frame.
  bool _sweeping = false;

  /// Where a press started, and whether the link under it has been followed.
  ///
  /// A link inside the document is a span with a tap recognizer on it, and on a
  /// desktop that recognizer loses: the selection around it watches the mouse
  /// for a drag and takes the gesture before a tap can be declared. So the
  /// press is read here as well, by a `Listener`, which is not in the gesture
  /// arena and cannot lose it. The recognizer stays because it is what makes a
  /// link a tappable thing to a screen reader, and what answers on a touch
  /// screen — whichever of the two gets there first follows the link, and the
  /// other stands down.
  Offset? _pressed;
  bool _followed = false;

  /// The recognizer for the link starting at [key], made once and kept.
  ///
  /// A new one per link per build was a recognizer allocated for every link on
  /// the page every time the pointer moved over a code block, and the old ones
  /// were disposed at the top of the build that replaced them — while the
  /// spans holding them were still on the tree. What listens for the tap
  /// changes between builds and the recognizer does not, so only [onTap] is
  /// written again.
  TapGestureRecognizer recognizerFor(Object key, VoidCallback onTap) {
    final TapGestureRecognizer held = _recognizers.putIfAbsent(key, TapGestureRecognizer.new);

    held.onTap = onTap;
    _wanted.add(key);

    return held;
  }

  /// Starts the tally that [sweepRecognizers] reads, before a document is drawn.
  void countRecognizers() {
    _wanted.clear();
  }

  /// Books the letting-go for after the frame.
  ///
  /// Twice not here. The document body is rendered further down the same
  /// build, so what that build wants is not known yet — and the spans holding
  /// what it does not want are on the tree until the build has replaced them,
  /// which is the same reason a viewer drops its anchors a frame late.
  void sweepRecognizers() {
    if (_sweeping) {
      return;
    }

    _sweeping = true;

    WidgetsBinding.instance.addPostFrameCallback((Duration _) {
      _sweeping = false;

      if (_recognizers.length == _wanted.length) {
        return;
      }

      final List<TapGestureRecognizer> stale = <TapGestureRecognizer>[
        for (final MapEntry<Object, TapGestureRecognizer> each in _recognizers.entries)
          if (!_wanted.contains(each.key)) each.value,
      ];

      _recognizers.removeWhere((Object key, TapGestureRecognizer _) => !_wanted.contains(key));

      for (final TapGestureRecognizer recognizer in stale) {
        recognizer.dispose();
      }
    });
  }

  /// Lets go of every recognizer. For `dispose`.
  void disposeRecognizers() {
    for (final GestureRecognizer recognizer in _recognizers.values) {
      recognizer.dispose();
    }

    _recognizers.clear();
  }

  /// A press going down, which is where following a link starts.
  void pressedLink(PointerDownEvent event) {
    _pressed = event.position;
    _followed = false;
  }

  /// A press that went down and came up on the same link follows it.
  ///
  /// In a microtask, because the gesture arena is swept as soon as this event
  /// has finished being dispatched: a frame later is too late to feel like a
  /// tap, and now is too early to know whether the recognizer won.
  void releasedLink(PointerUpEvent event) {
    final Offset? from = _pressed;

    _pressed = null;

    if (from == null || (event.position - from).distance > 4) {
      _followed = false;

      return;
    }

    scheduleMicrotask(() {
      if (!_followed && mounted) {
        linkAt(event.position)?.onTap?.call();
      }

      _followed = false;
    });
  }

  /// Said by whatever the document's links are handed, so one is never
  /// followed twice.
  void followedLink() {
    _followed = true;
  }

  /// The link a place on the screen belongs to, if it belongs to one.
  ///
  /// A paragraph puts the span under the pointer into the hit-test path itself
  /// — that is how a tap ever reaches a span's recognizer — so this is the same
  /// answer the arena would have used, read from the same place and without
  /// having to win anything to get it.
  TapGestureRecognizer? linkAt(Offset global) {
    final RenderObject? document = context.findRenderObject();

    if (document is! RenderBox || !document.attached) {
      return null;
    }

    final BoxHitTestResult hit = BoxHitTestResult();

    document.hitTest(hit, position: document.globalToLocal(global));

    for (final HitTestEntry<HitTestTarget> entry in hit.path) {
      final HitTestTarget target = entry.target;

      if (target is TextSpan && target.recognizer is TapGestureRecognizer) {
        return target.recognizer! as TapGestureRecognizer;
      }
    }

    return null;
  }
}
