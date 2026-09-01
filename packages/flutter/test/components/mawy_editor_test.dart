import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart' show MawyToolbarButton;

import '../support/host.dart';
import '../support/spans.dart';

/// The editor, as somebody writing meets it.
///
/// What a command *does* to a document is not asserted here beyond a case or
/// two, and deliberately: `tool/parity.dart` diffs every command over every
/// case in `tool/edits.json` against the React package's, which is a far
/// stronger statement than any list written out by hand. What is here is the
/// part parity cannot see — that the button runs the command, that the surfaces
/// show what they say they show, and that the counts along the bottom are the
/// document's.

const String document = '''
# Title

Some **words** here.

- one
- two
''';

/// Presses the toolbar button announced under [label].
Future<void> press(WidgetTester tester, String label) async {
  await tester.tap(find.bySemanticsLabel(label));
  await tester.pumpAndSettle();
}

void main() {
  group('the surfaces', () {
    testWidgets('shows the source and the preview side by side', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyEditor(defaultValue: document)));

      // The source, as the characters it is, and the document, as a heading.
      expect(find.byType(EditableText), findsOneWidget);
      expect(documentText(tester), contains('Title'));
    });

    testWidgets('shows the source alone on plain', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.plain)),
      );

      expect(find.byType(EditableText), findsOneWidget);
      expect(find.byType(MawyViewer), findsNothing);
    });

    testWidgets('shows the document alone on preview', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.preview)),
      );

      expect(find.byType(EditableText), findsNothing);
      expect(find.byType(MawyViewer), findsOneWidget);
    });

    testWidgets('switches when the toolbar says so', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyEditor(defaultValue: document)));

      await press(tester, 'Preview');

      expect(find.byType(EditableText), findsNothing);
    });
  });

  group('the toolbar', () {
    testWidgets('runs a command on the selection', (WidgetTester tester) async {
      String? written;

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two three',
            defaultMode: MawyEditorMode.plain,
            onChange: (String value) => written = value,
          ),
        ),
      );

      final EditableTextState field = tester.state(find.byType(EditableText));

      field.widget.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);
      await tester.pump();

      await press(tester, 'Bold');

      expect(written, 'one **two** three');
    });

    testWidgets('draws a command as pressed when it is already on', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: '- one\n- two', defaultMode: MawyEditorMode.plain)),
      );

      final EditableTextState field = tester.state(find.byType(EditableText));

      field.widget.controller.selection = const TextSelection(baseOffset: 0, extentOffset: 11);
      await tester.pump();

      final MawyToolbarButton list = tester.widget(
        find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == 'Bulleted list',
        ),
      );

      expect(list.pressed, isTrue);
    });

    testWidgets('speaks the locale it was given', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, locale: MawyLocale.ko)),
      );

      expect(find.bySemanticsLabel('굵게'), findsOneWidget);
    });
  });

  group('the status bar', () {
    testWidgets('counts the document', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two\nthree', status: kMawyEditorStatus)),
      );

      final String text = documentText(tester);

      expect(text, contains('2 lines'));
      expect(text, contains('3 words'));
      expect(text, contains('13 characters'));
    });

    testWidgets('is not drawn when nothing was asked for', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one', status: <MawyEditorStatusItem>[])),
      );

      expect(documentText(tester), isNot(contains('lines')));
    });
  });

  group('the document', () {
    testWidgets('follows the value it is given', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyEditor(value: 'first')));
      expect(find.byType(EditableText), findsOneWidget);

      await tester.pumpWidget(host(const MawyEditor(value: 'second')));
      await tester.pumpAndSettle();

      final EditableTextState field = tester.state(find.byType(EditableText));

      expect(field.widget.controller.text, 'second');
    });

    testWidgets('refuses a command when it is read only', (WidgetTester tester) async {
      String? written;

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one',
            defaultMode: MawyEditorMode.plain,
            readOnly: true,
            onChange: (String value) => written = value,
          ),
        ),
      );

      await press(tester, 'Bold');

      expect(written, isNull);
    });
  });
}
