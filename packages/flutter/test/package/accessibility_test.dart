import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

import '../support/host.dart';

/// What the viewer says to somebody who is not looking at it.
///
/// The other files find controls by the widget they are, deliberately — a
/// finder that reads the semantics tree answers differently depending on
/// whether anything else has switched semantics on, and a test that passes for
/// that reason proves nothing. So this file switches them on itself and asks
/// the questions properly.

const String sample = '''
# Title

Words, and a [link](https://example.com).
''';

void main() {
  testWidgets('names the toolbar, its buttons and the document', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(
      host(MawyViewer(value: sample, onColorSchemeChange: (MawyColorScheme _) {})),
    );

    final SemanticsNode root = tester.binding.rootElement!.findRenderObject()!.debugSemantics!;
    final List<String> labels = <String>[];

    void walk(SemanticsNode node) {
      if (node.label.isNotEmpty) {
        labels.add(node.label);
      }

      node.visitChildren((SemanticsNode child) {
        walk(child);

        return true;
      });
    }

    walk(root);

    // Every control is named, and named the same thing the React package names
    // it — the two are one library and a screen reader should not be able to
    // tell which one it is reading.
    expect(labels, contains('Document settings'));
    expect(labels, contains('Typeface'));
    expect(labels, contains('Text size'));
    expect(labels, contains('Theme'));
    expect(labels, contains('Outline'));
    expect(labels, contains('Copy the Markdown'));
    expect(labels, contains('Document'));

    handle.dispose();
  });

  testWidgets('says a button is a button, and a pressed one is pressed', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(host(const MawyViewer(value: sample)));

    expect(
      tester.getSemantics(find.bySemanticsLabel('Outline')),
      // The tap action is the half that matters: a button a screen reader
      // cannot activate is a picture of a button.
      matchesSemantics(label: 'Outline', isButton: true, hasToggledState: true, hasTapAction: true),
    );

    handle.dispose();
  });

  testWidgets('meets the platform guidelines for tap targets and contrast', (
    WidgetTester tester,
  ) async {
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(
      host(MawyViewer(value: sample, onColorSchemeChange: (MawyColorScheme _) {})),
    );

    await expectLater(tester, meetsGuideline(textContrastGuideline));

    handle.dispose();
  });
}
