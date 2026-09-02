import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/editor/find_bar.dart' show MawyFindBar;
import 'package:mawy/src/editor/source_field.dart' show MawySourceField, MawySourceGutter;
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

  group('the bar between the panes', () {
    /// How wide the source pane is drawn, which is what a share means.
    double sourceWidth(WidgetTester tester) => tester.getSize(find.byType(MawySourceField)).width;

    testWidgets('is only there when there are two panes to be between', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.plain)),
      );

      expect(find.bySemanticsLabel('Resize the panes'), findsNothing);

      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.split)),
      );

      expect(find.bySemanticsLabel('Resize the panes'), findsOneWidget);
    });

    testWidgets('moves with a drag, and a double tap puts it back', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.split)),
      );

      final double half = sourceWidth(tester);
      final Finder bar = find.bySemanticsLabel('Resize the panes');

      await tester.drag(bar, const Offset(120, 0));
      await tester.pumpAndSettle();

      expect(sourceWidth(tester), greaterThan(half));

      await tester.tap(bar);
      await tester.pump(kDoubleTapMinTime);
      await tester.tap(bar);
      await tester.pumpAndSettle();

      expect(sourceWidth(tester), half);
    });

    testWidgets('moves with the arrows and goes no further than its ends', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: document, defaultMode: MawyEditorMode.split)),
      );

      final double half = sourceWidth(tester);

      await tester.tap(find.bySemanticsLabel('Resize the panes'));
      await tester.pumpAndSettle();

      for (int press = 0; press < 40; press += 1) {
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      }

      await tester.pumpAndSettle();

      final double wide = sourceWidth(tester);

      expect(wide, greaterThan(half));

      // A pane that can be pushed to nothing is a pane nobody can get back.
      expect(tester.getSize(find.byType(MawyViewer)).width, greaterThan(0));

      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pumpAndSettle();

      expect(sourceWidth(tester), lessThan(half));
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

    testWidgets('marks every match, and the one it is on apart from the rest', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two one two one', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');
      await tester.enterText(findField(0), 'one');
      await tester.pumpAndSettle();

      final List<Color> marked = _marks(tester);

      expect(marked.length, 3);
      expect(marked.where((Color colour) => colour == MawyTokens.light.findCurrent).length, 1);
      expect(marked.where((Color colour) => colour == MawyTokens.light.find).length, 2);

      await press(tester, 'Next match');

      // The stronger colour moved on with the count rather than staying put.
      final List<Color> after = _marks(tester);

      expect(after[1], MawyTokens.light.findCurrent);
      expect(after[0], MawyTokens.light.find);
    });

    testWidgets('steps on Enter without handing the document the focus', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one two one two one', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');
      await tester.enterText(findField(0), 'one');
      await tester.pumpAndSettle();

      expect(find.text('1 of 3'), findsOneWidget);

      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      expect(find.text('2 of 3'), findsOneWidget);

      // The whole point: the query is still being typed, so the next keystroke
      // has to reach the find field and not the document.
      expect(tester.widget<EditableText>(findField(0)).focusNode.hasFocus, isTrue);
      expect(tester.widget<EditableText>(_sourceField).focusNode.hasFocus, isFalse);
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

  group('the gutter', () {
    testWidgets('numbers the lines, and gives a wrapped line one number', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: '# One\n\n${'A long line that will have to wrap. ' * 8}\n\nThree',
            defaultMode: MawyEditorMode.plain,
          ),
          size: const Size(420, 400),
        ),
      );
      await tester.pumpAndSettle();

      final RenderBox gutter = tester.renderObject(find.byType(MawySourceGutter)) as RenderBox;

      // A wrapped line is two rows on the screen and one number down the side,
      // so five lines of source are five numbers however wide the pane is.
      expect(gutter.size.width, greaterThan(0));
      // One digit wide: five lines, and the widest number is `5`.
      expect(gutter.size.width, lessThan(20));
    });

    testWidgets('draws no gutter when it was told not to', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyEditor(
            defaultValue: 'One\nTwo',
            defaultMode: MawyEditorMode.plain,
            lineNumbers: false,
          ),
        ),
      );

      expect(find.byType(MawySourceGutter), findsNothing);
    });
  });

  group('an empty document', () {
    testWidgets('offers to open one where the application knows how', (WidgetTester tester) async {
      bool asked = false;

      await tester.pumpWidget(
        host(MawyEditor(defaultMode: MawyEditorMode.split, onOpen: () => asked = true)),
      );

      expect(find.text('Open a Markdown file'), findsOneWidget);

      await tester.tap(find.text('Choose a file'));
      await tester.pump();

      expect(asked, isTrue);
      expect(toolbarButton('Open a file'), findsOneWidget);
    });

    testWidgets('says nothing where it does not', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyEditor(defaultMode: MawyEditorMode.split)));

      // A control that cannot do what it says is worse than no control, and an
      // editor whose application has no answer has nothing to offer here.
      expect(find.text('Open a Markdown file'), findsNothing);
      expect(toolbarButton('Open a file'), findsNothing);
    });
  });

  group('the two panes of split', () {
    /// A code block is the shape that catches a preview scrolled by the
    /// fraction of the way through the file: sixty lines of source that are
    /// sixty lines of page, with prose on either side that is neither.
    final String long = <String>[
      '# Title',
      '',
      '```text',
      for (int at = 0; at < 60; at += 1) 'code line $at',
      '```',
      '',
      for (int at = 1; at <= 14; at += 1) ...<String>['## Section $at', '', 'Some words.', ''],
    ].join('\n');

    testWidgets('the preview follows the source to the block', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyEditor(defaultValue: long, defaultMode: MawyEditorMode.split),
          size: const Size(900, 400),
        ),
      );
      await tester.pumpAndSettle();

      final EditableTextState field = tester.state(find.byType(EditableText));
      final ScrollController source = tester
          .widget<EditableText>(find.byType(EditableText))
          .scrollController!;
      final double top = tester.getTopLeft(find.byType(MawyViewer)).dy;

      // Two of them, because the top could be a fraction that happened to be
      // right; two cannot, since a fraction is one straight line and this
      // document is not.
      final List<double> landed = <double>[];

      for (final String heading in <String>['## Section 2', '## Section 9']) {
        // A `RenderEditable` scrolls itself, so a caret rect comes back where
        // it is drawn rather than where it is in the text.
        final double at =
            field.renderEditable
                .getLocalRectForCaret(TextPosition(offset: long.indexOf(heading)))
                .top +
            source.offset;

        source.jumpTo(at.clamp(0, source.position.maxScrollExtent));
        await tester.pump();
        await tester.pump();

        landed.add(tester.getTopLeft(find.text(heading.substring(3))).dy - top);
      }

      // Near the top of the preview, and the same distance from it both times.
      // A fraction of the way through the file is one straight line and this
      // document is not, so it cannot land twice in the same place.
      for (final double delta in landed) {
        expect(delta, inInclusiveRange(0, 120));
      }

      expect((landed.first - landed.last).abs(), lessThan(8));
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

    testWidgets('opens the next menu on the first press, not the second', (
      WidgetTester tester,
    ) async {
      // No overlay above it, which is the tree the gallery is — and so the one
      // where the editor brings an overlay of its own.
      await tester.pumpWidget(
        Directionality(
          textDirection: TextDirection.ltr,
          child: MediaQuery(
            data: const MediaQueryData(size: Size(800, 600)),
            child: MawyEditor(defaultValue: 'Words.', onColorSchemeChange: (MawyColorScheme _) {}),
          ),
        ),
      );

      await tester.tap(toolbarButton('Heading'));
      await tester.pump();

      expect(find.text('Body text'), findsOneWidget);

      await tester.tap(toolbarButton('Theme'));
      await tester.pump();

      expect(find.text('Body text'), findsNothing);
      expect(find.text('Match the system'), findsOneWidget);
    });

    testWidgets('is chosen from a menu rather than cycled through', (WidgetTester tester) async {
      MawyColorScheme? chosen;

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'Words.',
            colorScheme: MawyColorScheme.light,
            onColorSchemeChange: (MawyColorScheme next) => chosen = next,
          ),
        ),
      );

      await tester.tap(toolbarButton('Theme'));
      await tester.pump();

      // All three at once, the way the viewer's toolbar and the React package's
      // offer them. A button that cycles is a button pressed twice to reach the
      // value on the other side of the one you did not want.
      expect(find.text('Light'), findsOneWidget);
      expect(find.text('Dark'), findsOneWidget);
      expect(find.text('Match the system'), findsOneWidget);

      await tester.tap(find.text('Match the system'));
      await tester.pump();

      expect(chosen, MawyColorScheme.system);
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

/// The source's own field, as opposed to the two in the find bar.
final Finder _sourceField = find.descendant(
  of: find.byType(MawySourceField),
  matching: find.byType(EditableText),
);

/// The background colour behind every run the find bar marked, in order.
///
/// Read off the render object rather than the controller, so what is asserted
/// is what the field was actually given to paint.
List<Color> _marks(WidgetTester tester) {
  final List<Color> found = <Color>[];

  tester.state<EditableTextState>(_sourceField).renderEditable.text?.visitChildren((
    InlineSpan span,
  ) {
    final Color? colour = span.style?.backgroundColor;

    if (colour != null) {
      found.add(colour);
    }

    return true;
  });

  return found;
}
