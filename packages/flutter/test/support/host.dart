/// The tree a Mawy widget is put under to be tested.
///
/// Deliberately no `MaterialApp` and no `WidgetsApp`: the package imports
/// neither Material nor Cupertino, so the tests must not either. A suite that
/// passes only inside a `MaterialApp` is not testing what a consumer of this
/// package gets.
///
/// A browser test can read a class name off an element; a widget test reads the
/// render tree. So `expect(element).toHaveClass('mawy-md-heading')` becomes a
/// question about the [TextStyle] the widget actually built, and
/// `--mawy-accent` becomes the [Color] it was painted in. The *questions* stay
/// the same questions, which is the point: the two packages are one library,
/// and a rule that holds in one has to hold in the other.
library;

import 'package:flutter/widgets.dart';

/// Wraps [child] in the minimum a Mawy widget needs: a direction to run in, a
/// brightness to read, and somewhere for a menu to go.
Widget host(
  Widget child, {
  Brightness brightness = Brightness.light,
  Size size = const Size(900, 1400),
  TextDirection textDirection = TextDirection.ltr,
}) {
  return Directionality(
    textDirection: textDirection,
    child: MediaQuery(
      data: MediaQueryData(platformBrightness: brightness, size: size),
      // Anything that lifts itself out of the tree — the toolbar's menus — needs
      // somewhere to go, and in a real app that is the navigator's overlay.
      // Keyed, so that pumping a different tree through `host()` really does
      // replace the one under test: an overlay's entries are built once, and a
      // rebuild of the same `Overlay` would keep the widget from the last pump.
      child: Overlay(
        key: UniqueKey(),
        initialEntries: <OverlayEntry>[
          OverlayEntry(
            builder: (BuildContext context) =>
                SizedBox(width: size.width, height: size.height, child: child),
          ),
        ],
      ),
    ),
  );
}
