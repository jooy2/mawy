/// Whether a control that has the focus should be drawn as having it.
///
/// Flutter draws a focus highlight whenever a control holds the focus and the
/// platform's highlight mode is `traditional` — which on a desktop it always
/// is. So a mouse click that moves the focus draws a ring, and a panel that
/// puts the focus back on the button it came from draws one on a button nobody
/// has touched. A browser stopped doing that years ago: `:focus-visible` is
/// "the focus arrived here from a keyboard", and the React package's rings are
/// that. Two packages that are one library should not disagree about when a
/// control looks focused.
///
/// So the last thing that moved the focus is remembered — a key or a pointer —
/// and read at the moment a control is told it has the focus. Sampled rather
/// than watched, because the answer only matters when the focus arrives.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';

/// Was the last thing the reader did a keystroke?
abstract final class MawyFocusVisible {
  static bool _keyboard = false;
  static bool _listening = false;

  /// Whether a focus ring belongs on whatever has just taken the focus.
  static bool get wanted {
    _listen();

    return _keyboard;
  }

  static void _listen() {
    if (_listening) {
      return;
    }

    _listening = true;
    // Every pointer that goes down anywhere, before any gesture is recognised
    // and so before anything it leads to has moved the focus.
    GestureBinding.instance.pointerRouter.addGlobalRoute((PointerEvent event) {
      if (event is PointerDownEvent) {
        _keyboard = false;
      }
    });
    HardwareKeyboard.instance.addHandler((KeyEvent event) {
      if (event is KeyDownEvent) {
        _keyboard = true;
      }

      // Heard rather than taken: this is not a shortcut.
      return false;
    });
  }
}
