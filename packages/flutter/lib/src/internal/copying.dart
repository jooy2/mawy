/// Copying to the clipboard, and saying so for a moment afterwards.
///
/// The "afterwards" is the whole reason this exists. A copy button that does
/// its job silently is a button a reader presses twice, because nothing on the
/// screen changed — so what is held here is what the label reads from, and it
/// falls back to [MawyCopyState.idle] on its own.
///
/// The clipboard is a platform service and it can refuse: no permission on the
/// web, no channel on a platform that has none. So a failure is a state rather
/// than an exception, the way it is in `src/internal/clipboard.ts` — the button
/// says it could not, which is at least true, and beats an error nobody sees
/// behind a button that appears to have done nothing.
library;

import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// What a copy button has just done.
enum MawyCopyState {
  /// Nothing lately.
  idle,

  /// It went on the clipboard.
  copied,

  /// The platform would not take it.
  failed,
}

/// Gives a [State] a copy button's worth of state and a timer to put it back.
mixin MawyCopying<T extends StatefulWidget> on State<T> {
  /// How long the button says what it did for.
  static const Duration held = Duration(milliseconds: 1600);

  MawyCopyState _copyState = MawyCopyState.idle;

  /// A timer rather than a delayed future, so that a second press can call the
  /// first one off. Left running, it put the label back partway through the
  /// second press and the button read as having done nothing.
  Timer? _settle;

  /// What the button should be saying.
  MawyCopyState get copyState => _copyState;

  /// Puts [text] on the clipboard and says what happened.
  Future<void> copy(String text) async {
    MawyCopyState next;

    try {
      await Clipboard.setData(ClipboardData(text: text));
      next = MawyCopyState.copied;
    } on Object {
      next = MawyCopyState.failed;
    }

    if (!mounted) {
      return;
    }

    _settle?.cancel();
    setState(() => _copyState = next);
    _settle = Timer(held, () {
      if (mounted) {
        setState(() => _copyState = MawyCopyState.idle);
      }
    });
  }

  @override
  void dispose() {
    _settle?.cancel();
    super.dispose();
  }
}
