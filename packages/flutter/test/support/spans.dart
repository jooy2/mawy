/// Reading what a widget actually drew.
///
/// A rich-text widget holds a tree of spans rather than a string, so a test
/// that wants to know whether `**bold**` came out bold has to walk it. These
/// are the two questions worth asking: what does the document say, and what
/// style is a given run of it in.
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart';

/// Everything the tree says, in the order it says it.
String documentText(WidgetTester tester) {
  final StringBuffer out = StringBuffer();

  for (final Element element in find.byType(Text).evaluate()) {
    final Text text = element.widget as Text;

    out.write(text.data ?? text.textSpan?.toPlainText() ?? '');
    out.write('\n');
  }

  return out.toString();
}

/// The style the first run saying exactly [saying] is drawn in.
///
/// `null` when nothing says it, which a test should assert rather than ignore.
TextStyle? styleOf(WidgetTester tester, String saying) {
  TextStyle? found;

  void walk(InlineSpan span, TextStyle? inherited) {
    if (found != null) {
      return;
    }

    if (span is TextSpan) {
      final TextStyle? style = inherited == null
          ? span.style
          : (span.style == null ? inherited : inherited.merge(span.style));

      if (span.text == saying) {
        found = style;

        return;
      }

      for (final InlineSpan child in span.children ?? const <InlineSpan>[]) {
        walk(child, style);
      }
    }
  }

  for (final Element element in find.byType(Text).evaluate()) {
    final Text text = element.widget as Text;
    final InlineSpan? span = text.textSpan;

    if (span != null) {
      walk(span, text.style);
    }
  }

  return found;
}

/// The toolbar button called [label].
///
/// By the widget rather than by its semantics label: a finder that reads the
/// semantics tree answers differently depending on whether anything else in
/// the test has switched semantics on, and a test that passes for that reason
/// is a test that proves nothing. The accessibility is checked on its own, in
/// its own file, where it is the subject.
Finder toolbarButton(String label) =>
    find.byWidgetPredicate((Widget widget) => widget is MawyToolbarButton && widget.label == label);
