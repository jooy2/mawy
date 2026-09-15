import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/editor/source_field.dart' show MawySourceField, MawySourceGutter;
import 'package:mawy/src/internal/find_bar.dart' show MawyFindBar;
import 'package:mawy/src/internal/table_tools.dart' show MawyTableSizeGrid, MawyTableTools;
import 'package:mawy/src/internal/toolbar.dart' show MawyToolbarButton;

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
  /// The frame, and what stays put under it.
  ///
  /// The status line is the reason the editor's floating bar is not simply the
  /// viewer's: a bar hung from the bottom of the editor would cover the count
  /// of words, so it hangs from the panes instead.
  group('the frame', () {
    testWidgets('bars the toolbar across the editor by default', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyEditor(defaultValue: document)));

      expect(find.byType(MawyToolbarButton), findsWidgets);
      expect(
        find.ancestor(of: find.byType(MawyToolbarButton).first, matching: find.byType(Stack)),
        findsNothing,
      );
    });

    testWidgets('lifts it over the panes where it floats, and leaves the count under it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(
          const MawyEditor(
            defaultValue: document,
            frame: MawyFrame.floating,
            toolbarPlacement: MawyToolbarPlacement.bottom,
            status: <MawyEditorStatusItem>[MawyEditorStatusItem.words],
          ),
        ),
      );

      expect(
        find.ancestor(of: find.byType(MawyToolbarButton).first, matching: find.byType(Stack)),
        findsWidgets,
      );

      // The bar is over the document and the count is under the bar, so the
      // count's top edge is below the bar's.
      final double bar = tester.getRect(find.byType(MawyToolbarButton).first).bottom;
      // The status cell rather than the word "words" wherever it appears in
      // the document the editor happens to be holding.
      final double count = tester.getRect(find.textContaining(RegExp(r'^\d+ words$'))).top;

      expect(count, greaterThan(bar));
    });
  });

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
    testWidgets('keeps the name of a button against either edge inside the editor', (
      WidgetTester tester,
    ) async {
      // The surface switch is against the editor's own edge, and a name hung
      // from the middle of its first button was drawn half off the screen.
      await tester.pumpWidget(host(const MawyEditor(defaultValue: document)));

      final TestGesture pointer = await tester.createGesture(kind: PointerDeviceKind.mouse);

      await pointer.addPointer(location: const Offset(400, 700));
      addTearDown(pointer.removePointer);

      for (final String label in <String>['Source', 'Side by side']) {
        final Finder button = find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == label,
        );

        await pointer.moveTo(tester.getCenter(button));
        await tester.pumpAndSettle();

        final Rect tip = tester.getRect(
          find.ancestor(of: find.text(label), matching: find.byType(Container)).first,
        );

        expect(tip.left, greaterThanOrEqualTo(0), reason: label);

        await pointer.moveTo(const Offset(400, 700));
        await tester.pumpAndSettle();
      }
    });

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

    testWidgets('says the words an application hands it, placeholders and all', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: '> [!NOTE]\n> Words.',
            strings: MawyStrings.of(
              MawyLocale.en,
            ).copyWith(bold: 'Fett', statusPosition: 'Z. %L, S. %C (%L)', alertNote: 'Hinweis'),
          ),
        ),
      );

      expect(find.bySemanticsLabel('Fett'), findsOneWidget);
      // At the end of the second line, where a caret nobody has placed is.
      expect(find.text('Z. 2, S. 9 (2)'), findsOneWidget);
      // The preview is handed the same words.
      expect(documentText(tester), contains('Hinweis'));
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

    /// Each line is given only the matches that are on it, which means the
    /// matches are cut against the lines once rather than looked through again
    /// for every line. The arithmetic that does the cutting is what this
    /// checks: a match against the very start of a line and one against its
    /// very end are where an offset out by one shows up.
    testWidgets('marks each match on the line it is actually on', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'aa bb\ncc\nbb aa bb', mode: MawyEditorMode.plain)),
      );

      await press(tester, 'Find');
      await tester.enterText(findField(0), 'bb');
      await tester.pumpAndSettle();

      expect(_marked(tester), <String>['bb', 'bb', 'bb']);
      // Cut at the right places: the runs on either side of each mark are the
      // characters that were not part of it.
      expect(_pieces(tester), <String>['aa ', 'bb', '\n', 'cc', '\n', 'bb', ' aa ', 'bb']);
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

      // The field's own action rather than a raw key, which is what a platform
      // sends: on the web the browser keeps `Enter` and Flutter is told this.
      await tester.testTextInput.receiveAction(TextInputAction.unspecified);
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

  /// The pane beside the source, and what it does and does not redraw for.
  group('the preview', () {
    Widget? preview(WidgetTester tester) {
      final Finder found = find.byType(MawyViewer);

      return found.evaluate().isEmpty ? null : tester.widget(found);
    }

    testWidgets('is not redrawn for a caret that only moved', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyEditor(
            defaultValue: '# Title\n\nWords and more words.',
            defaultMode: MawyEditorMode.split,
          ),
          size: const Size(900, 500),
        ),
      );
      await tester.pumpAndSettle();

      final Widget? first = preview(tester);

      expect(first, isNotNull);

      // A caret moving is still a rebuild of the editor — the status bar counts
      // the selection and every toolbar button reads it — and the document
      // beside it has not changed.
      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 4);
      await tester.pump();

      expect(preview(tester), same(first));
    });

    testWidgets('is redrawn when the document or the setting under it changes', (
      WidgetTester tester,
    ) async {
      late StateSetter again;
      MawyTypography type = const MawyTypography();

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyEditor(
                defaultValue: '# Title\n\nWords.',
                defaultMode: MawyEditorMode.split,
                typography: type,
              );
            },
          ),
          size: const Size(900, 500),
        ),
      );
      await tester.pumpAndSettle();

      final Widget? first = preview(tester);
      final EditableText field = tester.widget(_sourceField);

      field.controller.value = const TextEditingValue(
        text: '# Title\n\nWords and more.',
        selection: TextSelection.collapsed(offset: 24),
      );
      await tester.pumpAndSettle();

      expect(preview(tester), isNot(same(first)));
      expect(documentText(tester), contains('Words and more.'));

      final Widget? second = preview(tester);

      again(() => type = const MawyTypography(fontSize: 21));
      await tester.pumpAndSettle();

      expect(preview(tester), isNot(same(second)));
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

    /// A long document, scrolled to each end.
    ///
    /// The numbers are painted from the field's own layout, and the first one
    /// with any of it on screen is found by halving rather than counted to from
    /// the top of the document — so both ends of that search are a place an
    /// index can go out of range, and a document of five thousand lines is
    /// where it would.
    testWidgets('numbers a long document at either end of it', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: List<String>.generate(5000, (int at) => 'Line $at').join('\n'),
            defaultMode: MawyEditorMode.plain,
          ),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();

      final RenderBox gutter = tester.renderObject(find.byType(MawySourceGutter)) as RenderBox;

      // Four digits, because the last line is `5000`.
      expect(gutter.size.width, greaterThan(0));

      await tester.drag(_sourceField, const Offset(0, -40000), warnIfMissed: false);
      await tester.pumpAndSettle();

      await tester.drag(_sourceField, const Offset(0, 80000), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(MawySourceGutter), findsOneWidget);
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

  group('a source longer than the screen', () {
    /// A document past the length at which only part of it is coloured, with
    /// something on every line for the highlighter to find.
    final String huge = <String>[
      '# A long document',
      '',
      ...List<String>.generate(
        900,
        (int at) => at % 5 == 0 ? '## Section $at' : 'Paragraph $at with **bold** in it.',
      ),
      '',
      'The last line, which nothing above it repeats.',
    ].join('\n');

    Future<void> open(WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyEditor(defaultValue: huge, defaultMode: MawyEditorMode.plain),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('hands the field every character of it', (WidgetTester tester) async {
      // The one thing the window may never cost. The field lays the whole
      // document out either way, so the caret, the selection, every offset and
      // the scroll extent are all what they were — and all of that stands on
      // the spans still saying exactly what the document says.
      await open(tester);

      expect(sourceSpan(tester).toPlainText(), huge);
    });

    testWidgets('colours far fewer runs than the document has lines', (WidgetTester tester) async {
      await open(tester);

      expect(spanCount(sourceSpan(tester)), lessThan(1000));
      expect(spanCount(sourceSpan(tester)), greaterThan(1));
    });

    testWidgets('colours the top of it, which is what can be seen', (WidgetTester tester) async {
      await open(tester);

      expect(styleOfIn(sourceSpan(tester), ' A long document')?.fontWeight, FontWeight.w700);
    });

    testWidgets('colours whatever the reader scrolled to', (WidgetTester tester) async {
      await open(tester);

      expect(styleOfIn(sourceSpan(tester), ' Section 500'), isNull);

      await tester.drag(_sourceField, const Offset(0, -14000), warnIfMissed: false);
      await tester.pumpAndSettle();

      final InlineSpan span = sourceSpan(tester);

      expect(span.toPlainText(), huge);
      expect(styleOfIn(span, ' Section 500')?.fontWeight, FontWeight.w700);
    });

    testWidgets('colours every line of a document short enough to', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: List<String>.generate(200, (int at) => '## Heading $at').join('\n'),
            defaultMode: MawyEditorMode.plain,
          ),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();

      // The last line of a two-hundred-line document is nowhere near the
      // screen, and is coloured anyway: under the threshold nothing is windowed.
      expect(styleOfIn(sourceSpan(tester), ' Heading 199')?.fontWeight, FontWeight.w700);
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

  group('the history', () {
    MawyToolbarButton button(WidgetTester tester, String label) => tester.widget(
      find.byWidgetPredicate(
        (Widget widget) => widget is MawyToolbarButton && widget.label == label,
      ),
    );

    testWidgets('steps back and forward from the toolbar, and says when it cannot', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: 'one two', mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      expect(button(tester, 'Undo').enabled, isFalse);
      expect(button(tester, 'Redo').enabled, isFalse);

      final EditableText field = tester.widget(_sourceField);

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);
      await tester.pump(const Duration(seconds: 1));
      await press(tester, 'Bold');
      // Flutter gathers a run of changes into one step for half a second.
      await tester.pump(const Duration(seconds: 1));

      expect(seen.last, 'one **two**');
      expect(button(tester, 'Undo').enabled, isTrue);

      await press(tester, 'Undo');

      expect(seen.last, 'one two');
      expect(button(tester, 'Redo').enabled, isTrue);

      await press(tester, 'Redo');

      expect(seen.last, 'one **two**');
    });

    testWidgets('has nothing to step through in the preview or a read-only document', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one', mode: MawyEditorMode.preview)),
      );

      expect(button(tester, 'Undo').enabled, isFalse);

      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'one', mode: MawyEditorMode.plain, readOnly: true)),
      );

      expect(button(tester, 'Undo').enabled, isFalse);
    });
  });

  group('from outside', () {
    testWidgets('inserts where the caret is, in place of the selection', (
      WidgetTester tester,
    ) async {
      final MawyEditorHandle handle = MawyEditorHandle();
      final List<String> seen = <String>[];

      // Before there is an editor to act on, nothing happens and nothing throws.
      handle.insert('early');
      handle.focus();

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two three',
            mode: MawyEditorMode.plain,
            handle: handle,
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);
      handle.insert('**2**');
      await tester.pump();

      expect(seen.last, 'one **2** three');
      expect(field.controller.selection, const TextSelection.collapsed(offset: 9));
      expect(field.focusNode.hasFocus, isTrue);
    });

    testWidgets('puts the focus back, and does nothing where there is no source to act on', (
      WidgetTester tester,
    ) async {
      final MawyEditorHandle handle = MawyEditorHandle();
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: 'one', mode: MawyEditorMode.plain, handle: handle)),
      );

      final EditableText field = tester.widget(_sourceField);

      expect(field.focusNode.hasFocus, isFalse);
      handle.focus();
      await tester.pump();
      expect(field.focusNode.hasFocus, isTrue);

      await tester.pumpWidget(
        host(
          MawyEditor(
            key: UniqueKey(),
            defaultValue: 'one',
            mode: MawyEditorMode.plain,
            readOnly: true,
            handle: handle,
            onChange: seen.add,
          ),
        ),
      );
      handle.insert('two');
      await tester.pump();

      await tester.pumpWidget(
        host(
          MawyEditor(
            key: UniqueKey(),
            defaultValue: 'one',
            mode: MawyEditorMode.preview,
            handle: handle,
            onChange: seen.add,
          ),
        ),
      );
      handle.insert('two');
      await tester.pump();

      expect(seen, isEmpty);

      await tester.pumpWidget(host(const SizedBox()));

      // The editor is gone, and the handle with it.
      handle.insert('two');
      expect(seen, isEmpty);
    });
  });

  group('tables', () {
    Future<void> keys(
      WidgetTester tester,
      LogicalKeyboardKey key, {
      bool shift = false,
      bool alt = false,
    }) async {
      final List<LogicalKeyboardKey> held = <LogicalKeyboardKey>[
        LogicalKeyboardKey.controlLeft,
        if (shift) LogicalKeyboardKey.shiftLeft,
        if (alt) LogicalKeyboardKey.altLeft,
      ];

      for (final LogicalKeyboardKey each in held) {
        await tester.sendKeyDownEvent(each);
      }

      await tester.sendKeyEvent(key);

      for (final LogicalKeyboardKey each in held.reversed) {
        await tester.sendKeyUpEvent(each);
      }

      await tester.pump();
    }

    testWidgets('inserts a table of the size the grid is pressed at', (WidgetTester tester) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: 'Intro.', mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 6);
      await press(tester, 'Table');

      // A grid of sizes and nothing else: there is no table to add a row to yet.
      expect(find.byType(MawyTableSizeGrid), findsOneWidget);
      expect(find.bySemanticsLabel('Add a row below'), findsNothing);

      await tester.tap(find.bySemanticsLabel('Insert a table 3 columns wide and 4 rows tall'));
      await tester.pumpAndSettle();

      expect(
        seen.last,
        'Intro.\n\n|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n|  |  |  |',
      );
      expect(find.byType(MawyTableSizeGrid), findsNothing);

      // Inside a table there is nowhere for another to go.
      await press(tester, 'Table');
      expect(tester.widget<MawyTableSizeGrid>(find.byType(MawyTableSizeGrid)).enabled, isFalse);
    });

    testWidgets('grows the size with the arrows and inserts it with Enter', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: '', mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      await press(tester, 'Table');
      // The grid has the focus as it opens, lit at two by two.
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      expect(seen.last, '|  |\n| --- |');
    });

    testWidgets('lets a screen reader press a size', (WidgetTester tester) async {
      final SemanticsHandle semantics = tester.ensureSemantics();
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: 'Intro.', mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 6);
      await press(tester, 'Table');
      tester.semantics.tap(find.semantics.byLabel('Insert a table 2 columns wide and 2 rows tall'));
      await tester.pumpAndSettle();

      expect(seen.last, 'Intro.\n\n|  |  |\n| --- | --- |\n|  |  |');
      semantics.dispose();
    });

    testWidgets('hangs the row and column controls beside the table the caret is in', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];
      const String source = 'Intro.\n\n| a | b |\n| - | - |\n| c | d |\n\nAfter.';

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: source, mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      final EditableText field = tester.widget(_sourceField);

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection.collapsed(offset: 2);
      await tester.pumpAndSettle();

      expect(find.byType(MawyTableTools), findsNothing);

      field.controller.selection = const TextSelection.collapsed(offset: 29);
      await tester.pumpAndSettle();

      expect(find.byType(MawyTableTools), findsOneWidget);

      // Over the line the table starts on, and not over the table.
      final Rect bar = tester.getRect(find.byType(MawyTableTools));
      final RenderEditable editable = tester.state<EditableTextState>(_sourceField).renderEditable;
      final double tableTop = editable
          .localToGlobal(editable.getLocalRectForCaret(const TextPosition(offset: 8)).topLeft)
          .dy;

      expect(bar.bottom, lessThanOrEqualTo(tableTop));

      await tester.tap(
        find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == 'Delete this row',
        ),
      );
      await tester.pumpAndSettle();

      expect(seen.last, 'Intro.\n\n| a | b |\n| - | - |\n\nAfter.');
      expect(field.focusNode.hasFocus, isTrue);
    });

    testWidgets('moves between the cells with Tab, and grows the table from the last', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: '| a | b |\n| - | - |',
            mode: MawyEditorMode.plain,
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection.collapsed(offset: 3);
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(field.controller.selection.baseOffset, 7);

      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(seen.last, '| a | b |\n| - | - |\n|  |  |');
      expect(field.controller.selection.baseOffset, 23);

      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      await tester.pump();
      expect(field.controller.selection.baseOffset, 7);
      expect(field.focusNode.hasPrimaryFocus, isTrue);
    });

    testWidgets('acts on as many rows as the selection covers, and says so', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];
      const String source = '| a | b |\n| - | - |\n| c | d |\n| e | f |';

      await tester.pumpWidget(
        host(MawyEditor(defaultValue: source, mode: MawyEditorMode.plain, onChange: seen.add)),
      );

      final EditableText field = tester.widget(_sourceField);

      field.focusNode.requestFocus();
      field.controller.selection = TextSelection(
        baseOffset: source.indexOf('c'),
        extentOffset: source.indexOf('f') + 1,
      );
      await tester.pumpAndSettle();

      Finder named(String label) => find.byWidgetPredicate(
        (Widget widget) => widget is MawyToolbarButton && widget.label == label,
      );

      expect(named('Delete these 2 rows'), findsOneWidget);
      expect(named('Clear the selected cells'), findsOneWidget);

      await tester.tap(named('Clear the selected cells'));
      await tester.pumpAndSettle();

      expect(seen.last, '| a | b |\n| - | - |\n|  |  |\n|  |  |');
    });

    testWidgets('offers no block to make in a table', (WidgetTester tester) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'Intro.\n\n| a | b |\n| - | - |',
            mode: MawyEditorMode.plain,
            onChange: seen.add,
          ),
        ),
      );

      MawyToolbarButton button(String label) => tester.widget(
        find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == label,
        ),
      );
      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 3);
      await tester.pumpAndSettle();

      expect(button('Bulleted list').enabled, isTrue);

      field.controller.selection = const TextSelection.collapsed(offset: 12);
      await tester.pumpAndSettle();

      expect(button('Bulleted list').enabled, isFalse);
      expect(button('Heading').enabled, isFalse);
      expect(button('Bold').enabled, isTrue);
    });

    testWidgets('is not offered where nothing can be edited', (WidgetTester tester) async {
      MawyToolbarButton table() => tester.widget(
        find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == 'Table',
        ),
      );

      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'Intro.', mode: MawyEditorMode.preview)),
      );
      expect(table().enabled, isFalse);

      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'Intro.', mode: MawyEditorMode.plain, readOnly: true)),
      );
      expect(table().enabled, isFalse);

      await tester.pumpWidget(
        host(const MawyEditor(defaultValue: 'Intro.', mode: MawyEditorMode.plain)),
      );
      expect(table().enabled, isTrue);
    });

    testWidgets('reshapes a table from the keyboard, and leaves the keys alone elsewhere', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: '- item\n\n| a | b |\n| --- | --- |\n| c | d |',
            mode: MawyEditorMode.plain,
            toolbar: const <MawyEditorToolbarItem>[],
            status: const <MawyEditorStatusItem>[],
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(find.byType(EditableText));

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection.collapsed(offset: 36);
      await tester.pump();

      await keys(tester, LogicalKeyboardKey.enter);
      expect(seen.last, '- item\n\n| a | b |\n| --- | --- |\n| c | d |\n|  |  |');

      // The caret is in the new row's first cell, so the column goes after it.
      await keys(tester, LogicalKeyboardKey.enter, alt: true);
      expect(seen.last, '- item\n\n| a |  | b |\n| --- | --- | --- |\n| c |  | d |\n|  |  |  |');

      await keys(tester, LogicalKeyboardKey.backspace, shift: true);
      expect(seen.last, '- item\n\n| a |  | b |\n| --- | --- | --- |\n| c |  | d |');

      final int count = seen.length;

      // In a list item rather than a table: not a row, and not a list marker
      // carried down either, which is plain `Enter`'s.
      field.controller.selection = const TextSelection.collapsed(offset: 6);
      await tester.pump();
      await keys(tester, LogicalKeyboardKey.enter);

      expect(seen.length, count);

      // `Alt` is not a shortcut's modifier on its own, and the React package's
      // source carries the marker down under it too.
      field.controller.selection = const TextSelection.collapsed(offset: 6);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.altLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.altLeft);
      await tester.pump();

      expect(seen.last, startsWith('- item\n- \n'));
    });
  });

  group('the keyboard', () {
    Future<void> chord(WidgetTester tester, LogicalKeyboardKey key, {bool shift = false}) async {
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);

      if (shift) {
        await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      }

      await tester.sendKeyEvent(key);

      if (shift) {
        await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      }

      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pump();
    }

    testWidgets('reaches the same commands the toolbar reaches', (WidgetTester tester) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two three',
            mode: MawyEditorMode.plain,
            toolbar: const <MawyEditorToolbarItem>[],
            status: const <MawyEditorStatusItem>[],
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(find.byType(EditableText));

      field.focusNode.requestFocus();
      await tester.pump();

      // A toolbar that is the only way to reach a command is a toolbar the
      // editor cannot be used without a pointer for. The table is the React
      // package's, under the same name.
      field.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);
      await chord(tester, LogicalKeyboardKey.keyB);
      expect(seen.last, 'one **two** three');

      field.controller.selection = const TextSelection(baseOffset: 6, extentOffset: 9);
      await chord(tester, LogicalKeyboardKey.keyI);
      expect(seen.last, 'one **_two_** three');

      await chord(tester, LogicalKeyboardKey.digit2);
      expect(seen.last, '## one **_two_** three');

      await chord(tester, LogicalKeyboardKey.digit0);
      expect(seen.last, 'one **_two_** three');

      field.controller.selection = const TextSelection(baseOffset: 0, extentOffset: 3);
      await chord(tester, LogicalKeyboardKey.keyX, shift: true);
      expect(seen.last, '~~one~~ **_two_** three');
    });

    testWidgets('reaches the blocks and the image under Shift', (WidgetTester tester) async {
      final List<(LogicalKeyboardKey, String)> cases = <(LogicalKeyboardKey, String)>[
        (LogicalKeyboardKey.period, '> Words.'),
        (LogicalKeyboardKey.digit8, '- Words.'),
        (LogicalKeyboardKey.digit7, '1. Words.'),
        (LogicalKeyboardKey.digit9, '- [ ] Words.'),
        (LogicalKeyboardKey.keyE, '```\nWords.\n```'),
        (LogicalKeyboardKey.keyK, '![Words.](url)'),
        (LogicalKeyboardKey.comma, 'Words.\n\n---\n'),
      ];

      for (final (LogicalKeyboardKey key, String after) in cases) {
        final List<String> seen = <String>[];

        await tester.pumpWidget(
          host(
            MawyEditor(
              key: UniqueKey(),
              defaultValue: 'Words.',
              mode: MawyEditorMode.plain,
              toolbar: const <MawyEditorToolbarItem>[],
              status: const <MawyEditorStatusItem>[],
              onChange: seen.add,
            ),
          ),
        );

        final EditableText field = tester.widget(find.byType(EditableText));

        field.focusNode.requestFocus();
        await tester.pump();
        // The divider goes after the words, and everything else takes them.
        field.controller.selection = TextSelection(
          baseOffset: key == LogicalKeyboardKey.comma ? 6 : 0,
          extentOffset: 6,
        );
        await chord(tester, key, shift: true);

        expect(seen.last, after, reason: key.debugName);
      }
    });

    testWidgets('steps back and forward with the keys every text field uses', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two',
            mode: MawyEditorMode.plain,
            toolbar: const <MawyEditorToolbarItem>[],
            status: const <MawyEditorStatusItem>[],
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(find.byType(EditableText));

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);
      await tester.pump(const Duration(seconds: 1));
      await chord(tester, LogicalKeyboardKey.keyB);
      await tester.pump(const Duration(seconds: 1));
      expect(seen.last, 'one **two**');

      // No `WidgetsApp` here, which is what binds these to a text field
      // everywhere else — and this package does not require one.
      await chord(tester, LogicalKeyboardKey.keyZ);
      expect(seen.last, 'one two');

      await chord(tester, LogicalKeyboardKey.keyZ, shift: true);
      expect(seen.last, 'one **two**');

      await chord(tester, LogicalKeyboardKey.keyZ);
      await chord(tester, LogicalKeyboardKey.keyY);
      expect(seen.last, 'one **two**');
    });

    testWidgets('offers the heading levels it is given, in the menu and on the keys', (
      WidgetTester tester,
    ) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'Words.',
            mode: MawyEditorMode.plain,
            headingLevels: const <int>[2, 3, 4],
            status: const <MawyEditorStatusItem>[],
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      field.focusNode.requestFocus();
      field.controller.selection = const TextSelection.collapsed(offset: 3);
      await tester.pump();

      await press(tester, 'Heading');

      expect(find.text('Heading 1'), findsNothing);
      expect(find.text('Heading 4'), findsOneWidget);
      expect(find.text('Body text'), findsOneWidget);

      await tester.tap(find.text('Heading 4'));
      await tester.pumpAndSettle();
      expect(seen.last, '#### Words.');

      // A menu gives the focus back to its button when it shuts.
      field.focusNode.requestFocus();
      await tester.pump();
      await chord(tester, LogicalKeyboardKey.digit2);
      expect(seen.last, '## Words.');

      final int count = seen.length;

      // Not offered, so not reachable from the keyboard either.
      await chord(tester, LogicalKeyboardKey.digit1);
      expect(seen.length, count);

      await chord(tester, LogicalKeyboardKey.digit0);
      expect(seen.last, 'Words.');
    });

    testWidgets('runs no command while the document is read only', (WidgetTester tester) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'one two three',
            mode: MawyEditorMode.plain,
            toolbar: const <MawyEditorToolbarItem>[],
            status: const <MawyEditorStatusItem>[],
            readOnly: true,
            onChange: seen.add,
          ),
        ),
      );

      final EditableText field = tester.widget(find.byType(EditableText));

      field.focusNode.requestFocus();
      await tester.pump();
      field.controller.selection = const TextSelection(baseOffset: 4, extentOffset: 7);

      await chord(tester, LogicalKeyboardKey.keyB);

      expect(field.controller.text, 'one two three');
      // Nothing at all, rather than the document it started with: a command
      // that ran nothing changed nothing, and there is nothing to report.
      expect(seen, isEmpty);
    });
  });

  /// What the application is told, and what the caret does when it is told
  /// something back.
  group('the value contract', () {
    testWidgets('says nothing about the document it was given', (WidgetTester tester) async {
      final List<String> seen = <String>[];

      await tester.pumpWidget(
        host(
          MawyEditor(defaultValue: 'one two three', mode: MawyEditorMode.plain, onChange: seen.add),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      // The controller says something whenever the caret moves as well as
      // whenever the text does, and a caret moving is not a change.
      field.controller.selection = const TextSelection.collapsed(offset: 4);
      await tester.pump();

      expect(seen, isEmpty);

      field.controller.value = const TextEditingValue(
        text: 'one two four',
        selection: TextSelection.collapsed(offset: 12),
      );
      await tester.pump();

      expect(seen, <String>['one two four']);
    });

    testWidgets('keeps the caret where it was when the value comes back changed', (
      WidgetTester tester,
    ) async {
      late StateSetter again;
      String value = 'one two three';

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyEditor(
                value: value,
                mode: MawyEditorMode.plain,
                onChange: (String next) => value = next,
              );
            },
          ),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 4);
      await tester.pump();

      // An application that hands back something a little different — trimmed,
      // normalised, arrived from somewhere else — used to move the caret to the
      // end of the document, which in a long file is the writer's place lost.
      again(() => value = 'one two three and more');
      await tester.pump();

      expect(field.controller.text, 'one two three and more');
      expect(field.controller.selection.baseOffset, 4);
    });

    testWidgets('clamps the caret into a document that got shorter', (WidgetTester tester) async {
      late StateSetter again;
      String value = 'one two three';

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyEditor(value: value, mode: MawyEditorMode.plain);
            },
          ),
        ),
      );

      final EditableText field = tester.widget(_sourceField);

      field.controller.selection = const TextSelection.collapsed(offset: 12);
      await tester.pump();

      again(() => value = 'one');
      await tester.pump();

      expect(field.controller.selection.baseOffset, 3);
    });

    /// The pair `mode`/`defaultMode` and `typography`/`defaultTypography` make.
    /// `colorScheme` used to have an `onColorSchemeChange` and no
    /// `defaultColorScheme`, so it read as a value the application owned and
    /// behaved as a starting value the toolbar then took over.
    testWidgets('leaves a palette the application is holding to the application', (
      WidgetTester tester,
    ) async {
      final List<MawyColorScheme> picked = <MawyColorScheme>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'One.',
            mode: MawyEditorMode.split,
            colorScheme: MawyColorScheme.light,
            onColorSchemeChange: picked.add,
            toolbar: const <MawyEditorToolbarItem>[MawyEditorToolbarItem.colorScheme],
            status: const <MawyEditorStatusItem>[],
          ),
        ),
      );
      await tester.pumpAndSettle();

      await press(tester, 'Theme');
      await tester.tap(find.text('Dark').last);
      await tester.pumpAndSettle();

      // Said, and not done: the application is holding this one and nothing
      // changes until it hands back a new value.
      expect(picked, <MawyColorScheme>[MawyColorScheme.dark]);
      expect(tester.widget<MawyViewer>(find.byType(MawyViewer)).colorScheme, MawyColorScheme.light);
    });

    testWidgets('keeps a palette nobody is holding, and still reports it', (
      WidgetTester tester,
    ) async {
      final List<MawyColorScheme> picked = <MawyColorScheme>[];

      await tester.pumpWidget(
        host(
          MawyEditor(
            defaultValue: 'One.',
            mode: MawyEditorMode.split,
            defaultColorScheme: MawyColorScheme.light,
            onColorSchemeChange: picked.add,
            toolbar: const <MawyEditorToolbarItem>[MawyEditorToolbarItem.colorScheme],
            status: const <MawyEditorStatusItem>[],
          ),
        ),
      );
      await tester.pumpAndSettle();

      await press(tester, 'Theme');
      await tester.tap(find.text('Dark').last);
      await tester.pumpAndSettle();

      expect(picked, <MawyColorScheme>[MawyColorScheme.dark]);
      expect(tester.widget<MawyViewer>(find.byType(MawyViewer)).colorScheme, MawyColorScheme.dark);
    });

    testWidgets('does not report a value the application set itself', (WidgetTester tester) async {
      final List<String> seen = <String>[];
      late StateSetter again;
      String value = 'one';

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyEditor(value: value, mode: MawyEditorMode.plain, onChange: seen.add);
            },
          ),
        ),
      );

      again(() => value = 'two');
      await tester.pump();

      // It came from the application, so telling the application about it is
      // the component talking to itself.
      expect(seen, isEmpty);
    });
  });
}

/// The source's own field, as opposed to the two in the find bar.
final Finder _sourceField = find.descendant(
  of: find.byType(MawySourceField),
  matching: find.byType(EditableText),
);

/// The spans the source field is actually drawing.
///
/// Read off the laid-out field rather than by calling the controller, so that
/// what is asserted is what the window the field settled on produced.
InlineSpan sourceSpan(WidgetTester tester) =>
    (tester.state(_sourceField) as EditableTextState).renderEditable.text!;

/// How many runs a span tree is cut into.
int spanCount(InlineSpan root) {
  int found = 0;

  void walk(InlineSpan span) {
    found += 1;

    if (span is TextSpan) {
      for (final InlineSpan child in span.children ?? const <InlineSpan>[]) {
        walk(child);
      }
    }
  }

  walk(root);

  return found;
}

/// The style of the run inside [root] saying exactly [saying].
///
/// `spans.dart` asks the same question of every `Text` on the page; a field is
/// not one of those, and its spans have to be walked where they are.
TextStyle? styleOfIn(InlineSpan root, String saying) {
  TextStyle? found;

  void walk(InlineSpan span, TextStyle? inherited) {
    if (found != null || span is! TextSpan) {
      return;
    }

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

  walk(root, null);

  return found;
}

/// The background colour behind every run the find bar marked, in order.
///
/// Read off the render object rather than the controller, so what is asserted
/// is what the field was actually given to paint.
/// The text of every run the find bar marked, in order.
List<String> _marked(WidgetTester tester) {
  final List<String> found = <String>[];

  tester.state<EditableTextState>(_sourceField).renderEditable.text?.visitChildren((
    InlineSpan span,
  ) {
    if (span.style?.backgroundColor != null && span is TextSpan && span.text != null) {
      found.add(span.text!);
    }

    return true;
  });

  return found;
}

/// Every run the field was given to draw, in order, with the empty ones left
/// out — which is what the line is cut into.
List<String> _pieces(WidgetTester tester) {
  final List<String> found = <String>[];

  tester.state<EditableTextState>(_sourceField).renderEditable.text?.visitChildren((
    InlineSpan span,
  ) {
    if (span is TextSpan && (span.text ?? '').isNotEmpty) {
      found.add(span.text!);
    }

    return true;
  });

  return found;
}

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
