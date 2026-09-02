/// Somewhere for a menu panel to be put.
///
/// Both toolbars raise their panels into an [Overlay], which is how a panel
/// escapes the row it is anchored to without every ancestor between the two
/// having to make room for it. Most applications have one already: anything
/// under a [Navigator] does, and that is `MaterialApp`, `CupertinoApp` and a
/// `WidgetsApp` with routes.
///
/// A `WidgetsApp` given nothing but a `builder` has none, and that is not an
/// exotic case — it is what an application that wanted neither Material nor
/// Cupertino writes, which is the application this package exists for. This
/// package's own gallery is one. Without an overlay above it, `Overlay.of`
/// asserts in debug and throws a null check in release, so every menu button in
/// both toolbars did nothing at all in a release build and the toolbar looked
/// broken rather than unsupported.
///
/// So a component brings one when it cannot find one. It is the component's own
/// bounds, which is the right size for a panel anchored to a control inside it.
library;

import 'package:flutter/widgets.dart';

/// [child], under an [Overlay] of its own where there is not one already.
Widget mawyOverlay(BuildContext context, Widget child) =>
    Overlay.maybeOf(context) == null ? Overlay.wrap(child: child) : child;
