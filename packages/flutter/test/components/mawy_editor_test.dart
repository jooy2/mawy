import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/editor/find_bar.dart' show MawyFindBar;
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

/// A field in the find bar: 0 is what to look for and 1 is what to put there.
///
/// By position rather than by name, because "Find" names three things in the
/// tree once the bar is open — the button that opened it, the bar itself, and
/// the field — and a finder that matches all three is a finder that matches
/// none.
Finder findField(int at) =>
    find.descendant(of: find.byType(MawyFindBar), matching: find.byType(EditableText)).at(at);

/// Presses one of the buttons in the find bar rather than the toolbar's.
///
/// By widget rather than by name, because "Replace" is both a field and a
/// button in there — which is what it is called in the React package too.
Future<void> pressInBar(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(
      of: find.byType(MawyFindBar),
      matching: find.byWidgetPredicate(
        (Widget widget) => widget is MawyToolbarButton && widget.label == label,
      ),
    ),
  );
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

  group('the pointer', () {
    testWidgets('selects by dragging across the source', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two three', defaultMode: MawyEditorMode.plain)),
      );

      final EditableTextState field = tester.state(find.byType(EditableText));
      final RenderEditable render = field.renderEditable;

      // Two carets, by where the characters actually are rather than by a
      // guess at the metrics: the fourth character to the eighth is ` two`.
      final Offset from = render.localToGlobal(
        render.getLocalRectForCaret(const TextPosition(offset: 3)).center,
      );
      final Offset to = render.localToGlobal(
        render.getLocalRectForCaret(const TextPosition(offset: 7)).center,
      );

      final TestGesture drag = await tester.startGesture(from, kind: PointerDeviceKind.mouse);

      await tester.pump();
      await drag.moveTo(to);
      await tester.pumpAndSettle();
      await drag.up();
      await tester.pumpAndSettle();

      // A bare `EditableText` puts the caret down on the press and leaves it
      // there whatever the pointer does next, which is the whole of what this
      // is checking: something has to be selected.
      final TextSelection selection = field.widget.controller.selection;

      expect(selection.isCollapsed, isFalse);
      expect('one two three'.substring(selection.start, selection.end), ' two');
    });

    testWidgets('takes the word under a double tap', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two three', defaultMode: MawyEditorMode.plain)),
      );

      final EditableTextState field = tester.state(find.byType(EditableText));
      final RenderEditable render = field.renderEditable;
      final Offset at = render.localToGlobal(
        render.getLocalRectForCaret(const TextPosition(offset: 5)).center,
      );

      await tester.tapAt(at);
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tapAt(at);
      await tester.pumpAndSettle();

      final TextSelection selection = field.widget.controller.selection;

      expect('one two three'.substring(selection.start, selection.end), 'two');
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

  group('finding', () {
    testWidgets('opens from the toolbar, counts what it found, and steps through', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two one two one', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');

      expect(find.bySemanticsLabel('Match case'), findsOneWidget);

      await tester.enterText(findField(0), 'one');
      await tester.pumpAndSettle();

      // Three of them, and the caret is at the top, so the first is current.
      expect(find.text('1 of 3'), findsOneWidget);

      await press(tester, 'Next match');

      expect(find.text('2 of 3'), findsOneWidget);

      await press(tester, 'Next match');

      expect(find.text('3 of 3'), findsOneWidget);

      // Wrapping, because a search that stops at the end of the file is one you
      // have to scroll to the top to finish.
      await press(tester, 'Next match');

      expect(find.text('1 of 3'), findsOneWidget);

      await press(tester, 'Previous match');

      expect(find.text('3 of 3'), findsOneWidget);
    });

    testWidgets('says when there is nothing to find', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');
      await tester.enterText(findField(0), 'three');
      await tester.pumpAndSettle();

      expect(find.text('No matches'), findsOneWidget);
    });

    testWidgets('replaces the one it is on, and then all of them', (WidgetTester tester) async {
      String? latest;

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two one',
            mode: MawyEditorMode.plain,
            onChange: (String value) => latest = value,
          ),
        ),
      );

      await press(tester, 'Find');
      await tester.enterText(findField(0), 'one');
      await tester.enterText(findField(1), 'three');
      await tester.pumpAndSettle();

      await pressInBar(tester, 'Replace');

      expect(latest, 'three two one');

      await pressInBar(tester, 'Replace all');

      // `three` is now a match for nothing — what is searched is the document
      // as it is, and only the remaining `one` goes.
      expect(latest, 'three two three');
    });

    testWidgets('is not offered where there is no source to search', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, mode: MawyEditorMode.preview)),
      );

      expect(find.bySemanticsLabel('Find'), findsNothing);
    });

    testWidgets('closes on Escape', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');

      expect(find.bySemanticsLabel('Match case'), findsOneWidget);

      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('Match case'), findsNothing);
    });
  });

  group('the palette', () {
    testWidgets("reaches the preview as well as the editor's own chrome", (
      WidgetTester tester,
    ) async {
      const Color mine = Color(0xFFB8005C);

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: '[link](https://example.com)',
            colorScheme: MawyColorScheme.light,
            tokens: (Brightness brightness) => MawyTokens.of(brightness).copyWith(accent: mine),
          ),
        ),
      );

      // The preview is a viewer, and it is handed the same palette rather than
      // going back to the stylesheet's on its own.
      expect(styleOf(tester, 'link')?.color, mine);
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
