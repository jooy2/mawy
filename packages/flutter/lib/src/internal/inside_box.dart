/// Whether what is being built is already inside something that draws a box.
///
/// A code block draws its own edge, its own rounded corners and the name of the
/// language over it, which is right where it stands on its own and wrong inside
/// a [MawyCodeGroup]: two borders one inside the other is a box in a box, the
/// inner corners leave four slivers of the screen showing through, and the tab
/// over the block already says which language it is.
///
/// A widget cannot reach into one that was handed to it, and the blocks a
/// directive's builder receives are built before it sees them — but they are
/// *built*, not laid out, so what is above them when they build is theirs to
/// read. This is that: a marker a container puts over its children, and
/// nothing else.
///
/// The React package says the same thing with a selector, which is why there is
/// no counterpart file over there.
library;

import 'package:flutter/widgets.dart';

/// The marker. See the library's own comment.
class MawyInsideBox extends InheritedWidget {
  /// Marks [child] as being drawn inside a box of somebody else's.
  const MawyInsideBox({required super.child, super.key});

  /// Whether anything above [context] said it draws the box.
  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<MawyInsideBox>() != null;

  @override
  bool updateShouldNotify(MawyInsideBox oldWidget) => false;
}
