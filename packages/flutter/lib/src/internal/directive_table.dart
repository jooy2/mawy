/// Whether two directive tables say the same thing.
///
/// `directives` is written into the widget where the widget is written, which
/// makes it a new map on every build — and a new map naming the same builders
/// is not a new answer. Both widgets that draw a document keep the table they
/// were given and replace it only when this says it changed, so that a rebuild
/// for some other reason does not throw the drawing away.
library;

import 'package:mawy/src/types.dart';

/// Whether [a] and [b] name the same builders for the same names.
bool sameDirectiveTable(
  Map<String, MawyDirectiveBuilder>? a,
  Map<String, MawyDirectiveBuilder>? b,
) {
  if (identical(a, b)) {
    return true;
  }

  if (a == null || b == null || a.length != b.length) {
    return false;
  }

  for (final MapEntry<String, MawyDirectiveBuilder> each in a.entries) {
    if (b[each.key] != each.value) {
      return false;
    }
  }

  return true;
}
