import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/internal/find_bar.dart' show MawyFindBar;
import 'package:mawy/src/viewer/mawy_viewer_outline.dart';

import '../support/host.dart';
import '../support/spans.dart';

/// The viewer, as a reader meets it.
///
/// The parser has its own file and is tested as a tree there, so what is left
/// for this one is everything that only exists once the parser and the widgets
/// are put together: the document on screen, the settings reaching it, and the
/// toolbar changing what a reader sees.

const String sample = '''
# Title

A paragraph with **strong** text, *emphasis*, `code` and a [link](https://example.com).

## Second

- one
- two

> [!NOTE]
> An alert.

| a | b |
| - | - |
| x | y |

```ts
const a = 1;
```

Noted.[^n]

[^n]: The note.
''';

void main() {
  group('the document', () {
    testWidgets('draws what the Markdown says', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      final String text = documentText(tester);

      expect(text, contains('Title'));
      expect(text, contains('A paragraph with strong text'));
      expect(text, contains('const a = 1;'));
      // The alert's own label, which the document does not contain and the
      // renderer adds because `> [!NOTE]` is what it is.
      expect(text, contains('Note'));
    });

    testWidgets('draws a heading larger than the body, and strong as strong', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      final TextStyle? title = styleOf(tester, 'Title');
      final TextStyle? strong = styleOf(tester, 'strong');
      final TextStyle? plain = styleOf(tester, 'A paragraph with ');

      expect(title?.fontSize, 16 * 1.9);
      expect(title?.fontWeight, FontWeight.w600);
      expect(strong?.fontWeight, FontWeight.w600);
      expect(plain?.fontWeight, isNot(FontWeight.w600));
      expect(styleOf(tester, 'emphasis')?.fontStyle, FontStyle.italic);
    });

    testWidgets('draws a link in the accent colour, and a code span in the code one', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyViewer(value: sample, colorScheme: MawyColorScheme.light)),
      );

      expect(styleOf(tester, 'link')?.color, MawyTokens.light.accent);
      expect(styleOf(tester, 'link')?.decoration, TextDecoration.underline);
      expect(styleOf(tester, 'code')?.color, MawyTokens.light.codeForeground);
    });

    testWidgets('shows a footnote as a number, and the note under the document', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      final String text = documentText(tester);

      // The mention is `1` rather than `[^n]` — and it is the only `1` in the
      // document, which is why the table above says `x` and `y`.
      expect(styleOf(tester, '1')?.color, MawyTokens.light.accent);
      expect(text, contains('The note.'));
      expect(text, contains('FOOTNOTES'));
    });

    testWidgets('shows raw HTML as the characters it was written with', (
      WidgetTester tester,
    ) async {
      // Flutter has no HTML to draw it as, so there is nothing else it could be
      // — which is why this package has no `html` policy to choose between.
      await tester.pumpWidget(host(const MawyViewer(value: '<div>hi</div>')));

      expect(documentText(tester), contains('<div>hi</div>'));
    });

    testWidgets('draws the words of a refused link, without the link', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: '[click](javascript:alert(1))')));

      expect(documentText(tester), contains('click'));
      expect(styleOf(tester, 'click')?.color, isNot(MawyTokens.light.accent));
    });
  });

  group('the palette', () {
    testWidgets('follows the platform, and the prop over it', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample), brightness: Brightness.dark));

      expect(styleOf(tester, 'Title')?.color, MawyTokens.dark.foreground);

      await tester.pumpWidget(
        host(
          const MawyViewer(value: sample, colorScheme: MawyColorScheme.light),
          brightness: Brightness.dark,
        ),
      );

      expect(styleOf(tester, 'Title')?.color, MawyTokens.light.foreground);
    });

    testWidgets('is the application\'s where it hands the viewer one', (WidgetTester tester) async {
      const Color mine = Color(0xFFB8005C);

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: sample,
            colorScheme: MawyColorScheme.light,
            tokens: (Brightness brightness) => MawyTokens.of(brightness).copyWith(accent: mine),
          ),
        ),
      );

      expect(styleOf(tester, 'link')?.color, mine);

      // Everything it did not name is still the stylesheet's.
      expect(styleOf(tester, 'Title')?.color, MawyTokens.light.foreground);
    });

    testWidgets('asks for the palette again when the brightness changes', (
      WidgetTester tester,
    ) async {
      final List<Brightness> asked = <Brightness>[];

      MawyTokens mine(Brightness brightness) {
        asked.add(brightness);

        return MawyTokens.of(brightness).copyWith(foreground: const Color(0xFF00FF00));
      }

      await tester.pumpWidget(host(MawyViewer(value: sample, tokens: mine)));

      expect(asked, contains(Brightness.light));
      expect(styleOf(tester, 'Title')?.color, const Color(0xFF00FF00));

      asked.clear();

      await tester.pumpWidget(
        host(
          MawyViewer(value: sample, tokens: mine),
          brightness: Brightness.dark,
        ),
      );

      // A document that follows the platform follows it in both palettes: the
      // builder is a function of the brightness for exactly this.
      expect(asked, contains(Brightness.dark));
    });

    test('copies with one colour changed, and compares on every one of them', () {
      final MawyTokens mine = MawyTokens.light.copyWith(accent: const Color(0xFFB8005C));

      expect(mine.accent, const Color(0xFFB8005C));
      expect(mine.background, MawyTokens.light.background);
      expect(mine.caution, MawyTokens.light.caution);
      expect(mine, isNot(MawyTokens.light));

      // A palette compared on a handful of fields calls two different palettes
      // the same one, which is only harmless while nobody can build one.
      expect(MawyTokens.light.copyWith(caution: const Color(0xFF00FF00)), isNot(MawyTokens.light));
      expect(MawyTokens.light.copyWith(), MawyTokens.light);
      expect(MawyTokens.light.copyWith().hashCode, MawyTokens.light.hashCode);
    });
  });

  group('typography', () {
    testWidgets('sets the document from the settings it was given', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyViewer(
            value: sample,
            typography: MawyTypography(fontSize: 20, lineHeight: 2, letterSpacing: 0.01),
          ),
        ),
      );

      final TextStyle? paragraph = styleOf(tester, 'A paragraph with ');

      expect(paragraph?.fontSize, 20);
      expect(paragraph?.height, 2);
      expect(paragraph?.letterSpacing, closeTo(0.2, 0.0001));
      // A heading is a multiple of the body, so it moves with it.
      expect(styleOf(tester, 'Title')?.fontSize, 20 * 1.9);
    });

    testWidgets('reports what the reader chose, and keeps it when nobody owns it', (
      WidgetTester tester,
    ) async {
      MawyTypography? reported;

      await tester.pumpWidget(
        host(
          MawyViewer(value: sample, onTypographyChange: (MawyTypography next) => reported = next),
        ),
      );

      // The text-size menu, then the button that makes it bigger.
      await tester.tap(toolbarButton('Text size'));
      await tester.pump();
      await tester.tap(toolbarButton('Text size +'));
      await tester.pump();

      expect(reported?.fontSize, 17);
      expect(styleOf(tester, 'A paragraph with ')?.fontSize, 17);
    });
  });

  group('selecting', () {
    testWidgets('a reader can drag across the document and copy what they took', (
      WidgetTester tester,
    ) async {
      final List<String> copied = <String>[];

      // Drawing a document as widgets is what makes the safe default free, and
      // the cost of it is that nothing in one can be selected unless it is put
      // inside a region that says so. A page of prose nobody can copy a
      // sentence out of is a page not doing the reading half of its job.
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (
        MethodCall call,
      ) async {
        if (call.method == 'Clipboard.setData') {
          copied.add((call.arguments as Map<Object?, Object?>)['text']! as String);
        }

        return null;
      });
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );

      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      final Offset from = tester.getTopLeft(find.text('Second')) + const Offset(2, 8);
      // A mouse, because that is the gesture this is about: a drag from a
      // finger is a scroll until a long press says otherwise, and a reader
      // dragging across a paragraph to copy it has a pointer in their hand.
      final TestGesture gesture = await tester.startGesture(from, kind: PointerDeviceKind.mouse);

      addTearDown(gesture.removePointer);
      await tester.pump();
      await gesture.moveTo(from + const Offset(48, 0));
      await tester.pump();
      await gesture.up();
      await tester.pump();

      // The keys are written out here for the reason `mawyActivate` writes out
      // Enter and the space bar: a browser copies a selection without being
      // asked and here only a `WidgetsApp` does, which this package does not
      // require.
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyC);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pump();

      // How many characters forty-eight pixels is depends on the test font, so
      // what is asserted is that the drag took the start of that heading rather
      // than exactly how much of it.
      expect(copied.single, isNotEmpty);
      expect('Second', startsWith(copied.single));
    });

    testWidgets('says it copied for the same moment however often it is pressed', (
      WidgetTester tester,
    ) async {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (MethodCall call) async => null,
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );

      await tester.pumpWidget(
        host(
          const MawyViewer(
            // Not `sample`: a fenced block draws a copy button of its own, and
            // the one this is about is the toolbar's.
            value: '# Title\n\nWords.',
            toolbar: <MawyViewerToolbarItem>[MawyViewerToolbarItem.copy],
          ),
        ),
      );

      await tester.tap(find.byIcon(LucideIcons.copy));
      await tester.pump();
      expect(find.byIcon(LucideIcons.check), findsOneWidget);

      // Most of the way through the first press's moment, and then a second
      // press. A run of time that could not be called off would put the label
      // back here, part-way through the press that had just been made.
      await tester.pump(const Duration(milliseconds: 1400));
      await tester.tap(find.byIcon(LucideIcons.check));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.byIcon(LucideIcons.check), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 1600));
      expect(find.byIcon(LucideIcons.copy), findsOneWidget);
    });
  });

  group('scrolling', () {
    testWidgets('a wheel notch arrives over a few frames rather than in one', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(
          MawyViewer(value: List<String>.filled(12, sample).join('\n')),
          size: const Size(600, 400),
        ),
      );

      // The first is the document's own; a code block scrolls sideways in one
      // of its own further down.
      final ScrollController scroller = tester
          .widget<SingleChildScrollView>(find.byType(SingleChildScrollView).first)
          .controller!;
      final TestPointer pointer = TestPointer(1, PointerDeviceKind.mouse);

      pointer.hover(tester.getCenter(find.byType(MawyViewer)));
      await tester.sendEventToBinding(pointer.scroll(const Offset(0, 120)));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 60));

      // Part of the way there, which is the whole of it: Flutter's own answer to
      // a notch is the offset in the right place on the next frame and nothing
      // in between, and it is the nothing in between that reads as hard.
      expect(scroller.offset, greaterThan(0));
      expect(scroller.offset, lessThan(120));

      await tester.pumpAndSettle();

      expect(scroller.offset, moreOrLessEquals(120, epsilon: 0.5));
    });
  });

  /// Finding, in a document rather than in its source.
  ///
  /// What is searched is what the page draws — `strong` inside a `**strong**`
  /// is found by looking for the word, not by looking for the asterisks —
  /// which is the whole difference between this bar and the editor's.
  group('finding', () {
    Finder field() =>
        find.descendant(of: find.byType(MawyFindBar), matching: find.byType(EditableText));

    Future<void> open(WidgetTester tester) async {
      await tester.tap(toolbarButton('Find'));
      await tester.pumpAndSettle();
    }

    testWidgets('marks every match, and the one it is on apart from the rest', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: 'one two one two one')));

      await open(tester);
      await tester.enterText(field(), 'one');
      await tester.pumpAndSettle();

      expect(find.text('1 of 3'), findsOneWidget);

      final List<Color> marked = _marks(tester);

      expect(marked.length, 3);
      expect(marked.where((Color colour) => colour == MawyTokens.light.findCurrent).length, 1);
      expect(marked.first, MawyTokens.light.findCurrent);
    });

    testWidgets('finds a word the markup had split the source of', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: 'A **strong** word.')));

      await open(tester);
      await tester.enterText(field(), 'strong');
      await tester.pumpAndSettle();

      expect(find.text('1 of 1'), findsOneWidget);
      expect(_marks(tester).length, 1);
    });

    testWidgets('does not find the markup itself', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: 'A **strong** word.')));

      await open(tester);
      await tester.enterText(field(), '**');
      await tester.pumpAndSettle();

      expect(find.text('No matches'), findsOneWidget);
      expect(_marks(tester), isEmpty);
    });

    testWidgets('steps on Enter, keeping the keyboard in the field', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: 'one two one two one')));

      await open(tester);
      await tester.enterText(field(), 'one');
      await tester.pumpAndSettle();

      expect(find.text('1 of 3'), findsOneWidget);

      // The field's own action rather than a raw key, which is what a platform
      // sends: on the web the browser keeps `Enter` and Flutter is told this.
      await tester.testTextInput.receiveAction(TextInputAction.unspecified);
      await tester.pumpAndSettle();

      expect(find.text('2 of 3'), findsOneWidget);
      expect(tester.widget<EditableText>(field()).focusNode.hasFocus, isTrue);

      // The stronger colour moved on with the count.
      expect(_marks(tester)[1], MawyTokens.light.findCurrent);
    });

    testWidgets('offers nothing to replace with', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      await open(tester);

      // One field: a viewer has nothing to put anything in place of.
      expect(field(), findsOneWidget);
      expect(toolbarButton('Replace'), findsNothing);
    });

    testWidgets('is not offered where the toolbar left it out', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyViewer(
            // Not `sample`: a fenced block draws a copy button of its own, and
            // the one this is about is the toolbar's.
            value: '# Title\n\nWords.',
            toolbar: <MawyViewerToolbarItem>[MawyViewerToolbarItem.copy],
          ),
        ),
      );

      expect(toolbarButton('Find'), findsNothing);
      expect(find.byType(MawyFindBar), findsNothing);
    });
  });

  group('the toolbar', () {
    testWidgets('draws only the controls it was given', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyViewer(
            value: sample,
            toolbar: <MawyViewerToolbarItem>[MawyViewerToolbarItem.outline],
          ),
        ),
      );

      expect(toolbarButton('Contents'), findsOneWidget);
      expect(toolbarButton('Text size'), findsNothing);
    });

    testWidgets('leaves the theme control out when nothing can change it', (
      WidgetTester tester,
    ) async {
      // A control that cannot change anything is a control that should not be
      // drawn: the scheme belongs to whoever passed it.
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      expect(toolbarButton('Theme'), findsNothing);

      await tester.pumpWidget(
        host(MawyViewer(value: sample, onColorSchemeChange: (MawyColorScheme _) {})),
      );

      expect(toolbarButton('Theme'), findsOneWidget);
    });

    testWidgets('names a button under the pointer, and stops when it leaves', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      final TestGesture pointer = await tester.createGesture(kind: PointerDeviceKind.mouse);

      await pointer.addPointer(location: Offset.zero);
      addTearDown(pointer.removePointer);
      await tester.pump();
      await pointer.moveTo(tester.getCenter(toolbarButton('Contents')));
      await tester.pumpAndSettle();

      // The name a screen reader is already given, drawn for an eye that has
      // only the glyph.
      expect(find.text('Contents'), findsOneWidget);

      await pointer.moveTo(const Offset(400, 700));
      await tester.pumpAndSettle();

      expect(find.text('Contents'), findsNothing);
    });

    testWidgets('opens a menu with no overlay anywhere above it', (WidgetTester tester) async {
      // `host()` provides one, the way a `Navigator` does. This is the tree an
      // application that wanted neither Material nor Cupertino writes — a
      // `WidgetsApp` with nothing but a `builder`, which is what this package's
      // own gallery is — and every menu button did nothing at all in it.
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: MediaQuery(
            data: MediaQueryData(size: Size(900, 1400)),
            child: MawyViewer(value: sample),
          ),
        ),
      );

      await tester.tap(toolbarButton('Text size'));
      await tester.pump();

      expect(toolbarButton('Text size +'), findsOneWidget);
      expect(find.text('Back to the defaults'), findsOneWidget);
    });

    testWidgets('shuts a menu when a pointer goes down somewhere else', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      await tester.tap(toolbarButton('Text size'));
      await tester.pump();

      expect(find.text('Back to the defaults'), findsOneWidget);

      await tester.tapAt(const Offset(300, 400));
      await tester.pump();

      expect(find.text('Back to the defaults'), findsNothing);
    });

    testWidgets('opens the next menu on the first press, not the second', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(MawyViewer(value: sample, onColorSchemeChange: (MawyColorScheme _) {})),
      );

      await tester.tap(toolbarButton('Text size'));
      await tester.pump();

      expect(find.text('Back to the defaults'), findsOneWidget);

      await tester.tap(toolbarButton('Theme'));
      await tester.pump();

      // The one that was open is shut and the one that was pressed is open, on
      // one press. A tap-catcher that entered the gesture arena took the press
      // for itself and stopped at the shutting.
      expect(find.text('Back to the defaults'), findsNothing);
      expect(find.text('Match the system'), findsOneWidget);
    });

    testWidgets('opens the outline, and lists the headings', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      expect(find.text('Second'), findsOneWidget);

      await tester.tap(toolbarButton('Contents'));
      await tester.pump();

      // Twice now: once in the document, once in the panel.
      expect(find.text('Second'), findsNWidgets(2));
      expect(find.text('Title'), findsNWidgets(2));
    });

    testWidgets('marks the heading the reader is at, and the one they pressed', (
      WidgetTester tester,
    ) async {
      final String long = <String>[
        for (int at = 1; at <= 8; at += 1) ...<String>['## Chapter $at', '', 'Words. ' * 20, ''],
      ].join('\n');

      await tester.pumpWidget(host(MawyViewer(value: long), size: const Size(700, 400)));

      await tester.tap(toolbarButton('Contents'));
      await tester.pumpAndSettle();

      final Finder panel = find.byType(MawyViewerOutline);
      Finder entry(String text) => find.descendant(of: panel, matching: find.text(text));
      bool marked(String text) =>
          tester.widget<Text>(entry(text)).style?.color == MawyTokens.light.accent;

      // At the top of a document, the first heading.
      expect(marked('Chapter 1'), isTrue);

      await tester.tap(entry('Chapter 5'));
      await tester.pumpAndSettle();

      expect(marked('Chapter 5'), isTrue);
      expect(marked('Chapter 1'), isFalse);
    });

    testWidgets('says so about a document with no headings', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: 'Just words.')));

      await tester.tap(toolbarButton('Contents'));
      await tester.pump();

      expect(find.text('This document has no headings.'), findsOneWidget);
    });

    testWidgets('speaks whichever language it was asked for', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample, locale: MawyLocale.ko)));

      expect(toolbarButton('목차'), findsOneWidget);
      expect(documentText(tester), contains('참고'));
    });
  });

  group('directives', () {
    testWidgets('hands one to the builder registered for the name', (WidgetTester tester) async {
      MawyDirective? seen;

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: ':::callout[Careful]{kind=warning}\nBody **text**.\n:::',
            toolbar: const <MawyViewerToolbarItem>[],
            directives: <String, MawyDirectiveBuilder>{
              'callout': (BuildContext context, MawyDirective directive) {
                seen = directive;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[Text.rich(directive.label!), ...directive.children!],
                );
              },
            },
          ),
        ),
      );

      expect(seen!.name, 'callout');
      expect(seen!.kind, MawyDirectiveKind.container);
      expect(seen!.attributes, <String, String>{'kind': 'warning'});
      expect(seen!.source, ':::callout[Careful]{kind=warning}\nBody **text**.\n:::');
      expect(find.textContaining('Careful'), findsOneWidget);
      expect(find.textContaining('Body text.'), findsOneWidget);
    });

    testWidgets('draws one inside a sentence, in the sentence', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyViewer(
            value: 'Press :kbd[Ctrl] to go.',
            toolbar: const <MawyViewerToolbarItem>[],
            directives: <String, MawyDirectiveBuilder>{
              'kbd': (BuildContext context, MawyDirective directive) =>
                  Text.rich(directive.label!, key: const Key('kbd')),
            },
          ),
        ),
      );

      expect(find.byKey(const Key('kbd')), findsOneWidget);
    });

    testWidgets('shows a name nobody claimed as the characters it was written with', (
      WidgetTester tester,
    ) async {
      // Nothing is lost and nothing is invented, which is the same answer raw
      // HTML gets and for the same reason.
      await tester.pumpWidget(
        host(const MawyViewer(value: '::video{src=/a.mp4}', toolbar: <MawyViewerToolbarItem>[])),
      );

      expect(find.text('::video{src=/a.mp4}'), findsOneWidget);
    });
  });

  group('links', () {
    testWidgets('is followed by a mouse press the selection took for a drag', (
      WidgetTester tester,
    ) async {
      String? opened;

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: '[go](https://example.com)',
            onLinkTap: (String url, String? _) => opened = url,
          ),
        ),
      );

      final Offset at = tester.getCenter(find.textContaining('go'));
      final TestGesture gesture = await tester.startGesture(at, kind: PointerDeviceKind.mouse);

      addTearDown(gesture.removePointer);
      await tester.pump(const Duration(milliseconds: 30));

      // Two pixels, which is nothing to a hand and a drag to a mouse: past the
      // precise slop, the selection around the document declares a drag and
      // takes the gesture, and the span's own recognizer never gets to say a
      // tap happened. That is every click on a link on a desktop.
      await gesture.moveTo(at + const Offset(2, 0));
      await tester.pump(const Duration(milliseconds: 30));
      await gesture.up();
      await tester.pump();
      await tester.pump();

      expect(opened, 'https://example.com');
    });

    testWidgets('does nothing with one until an application says what to do', (
      WidgetTester tester,
    ) async {
      // Opening a URL means handing it to the platform, and which URLs an
      // application is willing to hand over is not a viewer's decision.
      String? opened;

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: '[go](https://example.com)',
            onLinkTap: (String url, String? _) => opened = url,
          ),
        ),
      );

      // With a mouse, because a mouse is what a reader on a desktop has and
      // because the selection this document sits in watches one: a region that
      // takes the tap for itself is a link nobody can follow.
      await tester.tap(find.textContaining('go'), kind: PointerDeviceKind.mouse);
      await tester.pump();

      expect(opened, 'https://example.com');
    });
  });
}

/// The background colour behind every run the find bar marked, in reading order.
List<Color> _marks(WidgetTester tester) {
  final List<Color> found = <Color>[];

  for (final Element element in find.byType(Text).evaluate()) {
    (element.widget as Text).textSpan?.visitChildren((InlineSpan span) {
      final Color? colour = span.style?.backgroundColor;

      if (colour != null) {
        found.add(colour);
      }

      return true;
    });
  }

  return found;
}
