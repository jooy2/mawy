/// One tab stop for a whole row of controls.
///
/// This is what makes a toolbar a toolbar rather than a row of buttons, and it
/// is not decoration: eleven buttons above a document is eleven presses of Tab
/// before a keyboard reaches the document. With this it is one press to enter,
/// one to leave, and the arrows move between the controls inside.
///
/// It is `src/internal/roving.ts` in Dart, and it lives here for the reason
/// that one lives there: there are two toolbars, and two copies of a focus
/// model drift into two different keyboards.
///
/// The web has `tabIndex` for this and Flutter has [FocusNode.skipTraversal],
/// which is the same idea said the other way round — every node but the active
/// one is stepped over. So the controls are all focusable all of the time, and
/// only one of them is on the way to the document.
library;

import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Where the focus is in a row of controls, and how it moves.
///
/// A toolbar makes one of these, hands each of its controls the node for that
/// control's place in the row, and wraps the row in a [MawyRovingRow]. Nothing
/// else has to be arranged: a control that takes the focus by any means becomes
/// the row's tab stop, because the node says so.
class MawyRoving {
  /// Creates a row's worth of focus.
  MawyRoving();

  final List<FocusNode> _nodes = <FocusNode>[];
  int _active = 0;
  bool _queued = false;

  /// The node for the control at [stop], made the first time it is asked for.
  ///
  /// Kept rather than remade, because a node is where the focus *is*: building
  /// a new one every time the toolbar rebuilds would drop the focus on every
  /// keystroke, and the toolbar rebuilds on every keystroke.
  FocusNode nodeFor(int stop) {
    while (_nodes.length <= stop) {
      final int at = _nodes.length;
      final FocusNode node = FocusNode(debugLabel: 'MawyRoving $at')..skipTraversal = at != _active;

      node.addListener(() {
        if (node.hasPrimaryFocus) {
          _moveTo(at);
        }
      });

      _nodes.add(node);
    }

    return _nodes[stop];
  }

  /// The arrows move between the controls; Home and End go to the ends.
  ///
  /// Right is the next one and left the previous one whichever way the text
  /// runs, which is what the React package does and therefore what this does.
  KeyEventResult onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }

    // Only the controls that are on the screen: a toolbar drawn without its
    // theme button still has a node for one, and an empty seat is not a place
    // the focus can go.
    final List<FocusNode> live = <FocusNode>[
      for (final FocusNode node in _nodes)
        if (node.context != null) node,
    ];
    final int at = live.indexWhere((FocusNode node) => node.hasPrimaryFocus);

    if (at == -1) {
      return KeyEventResult.ignored;
    }

    final int to = switch (event.logicalKey) {
      LogicalKeyboardKey.arrowRight => (at + 1) % live.length,
      LogicalKeyboardKey.arrowLeft => (at - 1 + live.length) % live.length,
      LogicalKeyboardKey.home => 0,
      LogicalKeyboardKey.end => live.length - 1,
      _ => -1,
    };

    if (to == -1) {
      return KeyEventResult.ignored;
    }

    live[to].requestFocus();

    return KeyEventResult.handled;
  }

  void _moveTo(int stop) {
    if (stop == _active) {
      return;
    }

    _active = stop;

    if (_queued) {
      return;
    }

    _queued = true;

    // Not here: this is called from a node telling everyone the focus moved,
    // and setting `skipTraversal` puts a node back into the very set the focus
    // manager is part-way through reading. A microtask later is after that and
    // still before anything is drawn.
    scheduleMicrotask(() {
      _queued = false;

      for (int at = 0; at < _nodes.length; at += 1) {
        _nodes[at].skipTraversal = at != _active;
      }
    });
  }

  /// Throws away every node the row made.
  void dispose() {
    for (final FocusNode node in _nodes) {
      node.dispose();
    }

    _nodes.clear();
  }
}

/// The row: something that hears the arrows without taking the focus itself.
///
/// A [Focus] that cannot be focused is still on the path a key event takes out
/// of whichever control has the focus, which is exactly what a toolbar wants —
/// it hears its own children's keys and is not a stop of its own.
class MawyRovingRow extends StatelessWidget {
  /// Wraps [child] in the row's key handling.
  const MawyRovingRow({required this.roving, required this.child, super.key});

  /// Where the focus is in this row.
  final MawyRoving roving;

  /// The row.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: roving.onKey,
      child: child,
    );
  }
}
