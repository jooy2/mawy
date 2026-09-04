import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/internal/find_bar.dart' show MawyFindBar;
import 'package:mawy/src/viewer/mawy_viewer_outline.dart';
import 'package:mawy/src/viewer/offsets.dart' show MawyMeasured;

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

  /// What the viewer holds about the document it is drawing, and gives up when
  /// that document goes.
  ///
  /// Reading the Markdown used to happen inside `build`, lazily, which put the
  /// throwing away in there too — and one of the things thrown away is the
  /// application's own `anchors` object. A build is not the place to change
  /// something that outlives the frame.
  group('a document replaced by another', () {
    testWidgets('reports the blocks of the document it is drawing, and no others', (
      WidgetTester tester,
    ) async {
      final MawyViewerAnchors anchors = MawyViewerAnchors();

      await tester.pumpWidget(
        host(MawyViewer(value: 'One.\n\nTwo.\n\nThree.\n\nFour.', anchors: anchors)),
      );
      await tester.pumpAndSettle();

      expect(anchors.places().length, 4);

      await tester.pumpWidget(host(MawyViewer(value: 'Only one.', anchors: anchors)));
      await tester.pumpAndSettle();

      final List<(int, double)> places = anchors.places();

      expect(places.length, 1);
      // The character the block starts at, in the document being drawn now.
      expect(places.first.$1, 0);
    });

    testWidgets('draws the new document rather than the one it was reading', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: '# First')));
      await tester.pumpWidget(host(const MawyViewer(value: '# Second')));
      await tester.pump();

      final String text = documentText(tester);

      expect(text, contains('Second'));
      expect(text, isNot(contains('First')));
    });
  });

  /// A viewer rebuilds for a great many reasons that are not the document — the
  /// pointer over a code block, the copy button saying it copied, the reader
  /// passing a heading with the outline open — and each of those used to build
  /// every block and every span again.
  ///
  /// Counted through a directive, because that is the one place in a drawn
  /// document where an application's own code runs and can say it ran. Nothing
  /// about the widget tree shows it: Flutter reuses what it built either way.
  group('drawing the document again', () {
    testWidgets('happens when the document changed, and not when something else did', (
      WidgetTester tester,
    ) async {
      int drawn = 0;
      late StateSetter again;
      String value = ':::counted\n:::\n\nWords.';

      Widget counted(BuildContext _, MawyDirective _) {
        drawn += 1;

        return const Text('counted');
      }

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyViewer(
                value: value,
                toolbar: const <MawyViewerToolbarItem>[MawyViewerToolbarItem.copy],
                // Written where the widget is written, which is how an
                // application writes it: a new map on every build, naming the
                // same builder.
                directives: <String, MawyDirectiveBuilder>{'counted': counted},
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      final int before = drawn;

      expect(before, greaterThan(0));

      // A rebuild of everything around the viewer, with the same document.
      again(() {});
      await tester.pump();

      expect(drawn, before);

      again(() => value = ':::counted\n:::\n\nWords and more.');
      await tester.pumpAndSettle();

      expect(drawn, greaterThan(before));
      expect(documentText(tester), contains('Words and more.'));
    });

    testWidgets('keeps the links working across a rebuild it skipped', (WidgetTester tester) async {
      // The recognisers are let go of by a sweep over what the last build asked
      // for, and a build that reuses the drawing asks for none of them.
      String? opened;
      late StateSetter again;

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyViewer(
                value: '[go](https://example.com)',
                onLinkTap: (String url, String? _) => opened = url,
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      again(() {});
      await tester.pumpAndSettle();

      await tapWords(tester, find.textContaining('go'));
      await tester.pump();

      expect(opened, 'https://example.com');
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

    /// The clipboard is a platform service and it can refuse — no permission on
    /// the web, no channel on a platform without one. A button that says
    /// nothing and throws behind itself is a button that appears to have
    /// worked.
    testWidgets('says it could not when the platform will not take it', (
      WidgetTester tester,
    ) async {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (
        MethodCall call,
      ) async {
        if (call.method == 'Clipboard.setData') {
          throw PlatformException(code: 'refused');
        }

        return null;
      });
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );

      await tester.pumpWidget(
        host(
          const MawyViewer(
            value: '# Title\n\nWords.',
            toolbar: <MawyViewerToolbarItem>[MawyViewerToolbarItem.copy],
          ),
        ),
      );

      await tester.tap(find.byIcon(LucideIcons.copy));
      await tester.pump();

      expect(find.byIcon(LucideIcons.x), findsOneWidget);
      expect(find.byIcon(LucideIcons.check), findsNothing);

      // And it goes back to offering, the way a copy that worked does.
      await tester.pump(const Duration(milliseconds: 1600));
      expect(find.byIcon(LucideIcons.copy), findsOneWidget);
    });

    testWidgets('a code block says the same thing when its own copy is refused', (
      WidgetTester tester,
    ) async {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (
        MethodCall call,
      ) async {
        if (call.method == 'Clipboard.setData') {
          throw PlatformException(code: 'refused');
        }

        return null;
      });
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );

      await tester.pumpWidget(
        host(
          const MawyViewer(value: '```ts\nconst a = 1;\n```', toolbar: <MawyViewerToolbarItem>[]),
        ),
      );

      await tester.tap(find.byIcon(LucideIcons.copy));
      await tester.pump();

      expect(find.byIcon(LucideIcons.x), findsOneWidget);
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
      final ScrollController scroller = documentScroller(tester);
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

    /// A hand on a trackpad is not a wheel. On the desktop the two are
    /// different events and only the wheel arrives here; on the web they are
    /// the same event, and the size of the movement is what tells them apart.
    testWidgets('a hand on a trackpad arrives as it is made', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          MawyViewer(value: List<String>.filled(12, sample).join('\n')),
          size: const Size(600, 400),
        ),
      );

      final ScrollController scroller = documentScroller(tester);
      final TestPointer pointer = TestPointer(1, PointerDeviceKind.mouse);

      pointer.hover(tester.getCenter(find.byType(MawyViewer)));

      // Six small movements, the way two fingers send them.
      for (int at = 0; at < 6; at += 1) {
        await tester.sendEventToBinding(pointer.scroll(const Offset(0, 6)));
        await tester.pump();
      }

      // All of it, on the frame it was made — the gesture is already the path
      // the eye needs, and easing each step of it is a run of little starts
      // that never catch up with the fingers.
      expect(scroller.offset, moreOrLessEquals(36, epsilon: 0.5));
    });
  });

  /// Where every block of the document is, which is what the outline's mark,
  /// scrolling to a heading, scrolling to a match and `MawyViewerAnchors` all
  /// read. See `src/viewer/offsets.dart`.
  group('where the blocks are', () {
    /// Twenty headings with a paragraph under each, so a block's offset is
    /// something a test can name rather than something it has to hunt for.
    final String document = <String>[
      for (int at = 0; at < 20; at += 1) '## Section $at\n\nA paragraph under section $at.\n',
    ].join('\n');

    testWidgets('records every block, in order, at increasing offsets', (
      WidgetTester tester,
    ) async {
      final MawyViewerAnchors anchors = MawyViewerAnchors();

      await tester.pumpWidget(
        host(
          MawyViewer(value: document, anchors: anchors),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();

      final List<(int, double)> places = anchors.places();

      // Forty blocks, and not the handful of them the screen happens to hold:
      // a block's place is what it was laid out at rather than what a render
      // tree can be asked about this frame.
      expect(places, hasLength(40));

      for (int at = 1; at < places.length; at += 1) {
        expect(places[at].$1, greaterThan(places[at - 1].$1));
        expect(places[at].$2, greaterThan(places[at - 1].$2));
      }
    });

    testWidgets('puts a block where it said the block was', (WidgetTester tester) async {
      final MawyViewerAnchors anchors = MawyViewerAnchors();

      await tester.pumpWidget(
        host(
          MawyViewer(value: document, anchors: anchors),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();

      final ScrollController scroller = documentScroller(tester);
      // The block for `## Section 12`, by the character it starts at.
      final int start = document.indexOf('## Section 12');
      final double at = anchors.places().firstWhere(((int, double) place) => place.$1 == start).$2;

      scroller.jumpTo(at);
      await tester.pumpAndSettle();

      // Scrolled to the number the anchor gave, the block is at the top of the
      // view — which is the promise the number makes. The block rather than the
      // words inside it: a heading carries space above its text, and that space
      // is part of the block.
      final int block = anchors.places().indexWhere(((int, double) place) => place.$1 == start);
      final double top =
          tester.getTopLeft(measuredBlock(block)).dy -
          tester.getTopLeft(find.byType(CustomScrollView)).dy;

      expect(top.abs(), lessThan(1));
    });

    testWidgets('follows an outline entry to a heading well below the view', (
      WidgetTester tester,
    ) async {
      final MawyViewerAnchors anchors = MawyViewerAnchors();

      await tester.pumpWidget(
        host(
          MawyViewer(value: document, anchors: anchors),
          size: const Size(600, 400),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(toolbarButton('Contents'));
      await tester.pumpAndSettle();

      await tester.tap(
        find.descendant(of: find.byType(MawyViewerOutline), matching: find.text('Section 16')),
      );
      await tester.pumpAndSettle();

      final int start = document.indexOf('## Section 16');
      final int block = anchors.places().indexWhere(((int, double) place) => place.$1 == start);
      final double top =
          tester.getTopLeft(measuredBlock(block)).dy -
          tester.getTopLeft(find.byType(CustomScrollView)).dy;

      final ScrollController scroller = documentScroller(tester);

      // A fiftieth of the view above it, which is the alignment the viewer asks
      // for so a heading does not sit against the top edge. The view is what
      // the toolbar left of the window rather than the window.
      expect(top, moreOrLessEquals(scroller.position.viewportDimension * 0.02, epsilon: 2));
    });
  });

  /// The document is a lazy list: what it builds is what is near the view, and
  /// what it holds beyond that is the cache extent. See `src/viewer/offsets.dart`
  /// for how anything still knows where the rest of it is.
  group('a document longer than the screen', () {
    // Six hundred blocks, well past [kMawyViewerLazyFrom].
    final String document = <String>[
      for (int at = 0; at < 300; at += 1) '## Section $at\n\nA paragraph under section $at.\n',
    ].join('\n');

    /// The same shape, under the threshold rather than well past it.
    final String shorter = <String>[
      for (int at = 0; at < 150; at += 1) 'Paragraph $at of the document.',
    ].join('\n\n');

    testWidgets('builds a fraction of it rather than all of it', (WidgetTester tester) async {
      await tester.pumpWidget(host(MawyViewer(value: document), size: const Size(600, 400)));
      await tester.pumpAndSettle();

      // Four hundred blocks in the document. What the tree holds is what the
      // view and its cache reach, and it does not grow with the document.
      expect(find.byType(MawyMeasured, skipOffstage: false).evaluate().length, lessThan(120));
      expect(documentText(tester), contains('Section 0'));
      expect(documentText(tester), isNot(contains('Section 299')));
    });

    testWidgets('builds what the reader scrolls to, and lets go of what they left', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(MawyViewer(value: document), size: const Size(600, 400)));
      await tester.pumpAndSettle();

      final ScrollController scroller = documentScroller(tester);

      scroller.jumpTo(scroller.position.maxScrollExtent);
      await tester.pumpAndSettle();

      expect(documentText(tester), contains('Section 299'));
      expect(documentText(tester), isNot(contains('Section 0')));
    });

    testWidgets('builds all of a document under the threshold, however tall it is', (
      WidgetTester tester,
    ) async {
      // Which is what keeps a selection whole, since a selection can only take
      // text that has been built. See [kMawyViewerLazyFrom].
      await tester.pumpWidget(host(MawyViewer(value: shorter), size: const Size(600, 400)));
      await tester.pumpAndSettle();

      expect(documentText(tester), contains('Paragraph 0 '));
      expect(documentText(tester), contains('Paragraph 149 '));
    });

    testWidgets('is selected and copied whole while it is under the threshold', (
      WidgetTester tester,
    ) async {
      final List<String> copied = <String>[];

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

      await tester.pumpWidget(host(MawyViewer(value: shorter), size: const Size(600, 400)));
      await tester.pumpAndSettle();

      final SelectableRegionState region =
          tester.state(find.byType(SelectableRegion)) as SelectableRegionState;

      // The focus goes where a drag would have put it, since the keys below are
      // answered by the shortcuts around the document rather than by the region.
      tester.widget<SelectableRegion>(find.byType(SelectableRegion)).focusNode?.requestFocus();
      await tester.pump();

      region.selectAll();
      await tester.pumpAndSettle();

      // The keys rather than the region's own method, because the keys are the
      // path a reader takes and the one this package writes out itself.
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyC);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pumpAndSettle();

      // The last paragraph is nowhere near the screen and is taken anyway,
      // which is the whole point of the threshold.
      expect(copied.single, contains('Paragraph 0 '));
      expect(copied.single, contains('Paragraph 149 '));
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

    /// The one at the top of the view, found by halving the list rather than
    /// counted to from the first — walking it meant asking the render tree
    /// where every heading above the view was, on every scroll notification.
    testWidgets('follows the reader down the document', (WidgetTester tester) async {
      final String long = <String>[
        for (int at = 1; at <= 20; at += 1) ...<String>['## Chapter $at', '', 'Words. ' * 20, ''],
      ].join('\n');

      await tester.pumpWidget(host(MawyViewer(value: long), size: const Size(700, 400)));

      await tester.tap(toolbarButton('Contents'));
      await tester.pumpAndSettle();

      final Finder panel = find.byType(MawyViewerOutline);
      String? marked() {
        for (final Element element
            in find.descendant(of: panel, matching: find.byType(Text)).evaluate()) {
          final Text text = element.widget as Text;

          if (text.style?.color == MawyTokens.light.accent) {
            return text.data;
          }
        }

        return null;
      }

      expect(marked(), 'Chapter 1');

      final ScrollController scroller = documentScroller(tester);

      scroller.jumpTo(scroller.position.maxScrollExtent);
      await tester.pumpAndSettle();

      // Whichever heading the top of the view has reached — the last one is
      // still below it, because the document ends a screen after it starts.
      final int? at = int.tryParse(marked()?.split(' ').last ?? '');

      expect(at, isNotNull);
      expect(at, greaterThan(10));

      scroller.jumpTo(0);
      await tester.pumpAndSettle();

      expect(marked(), 'Chapter 1');
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

  /// A `data:` image, which the URL policy allows on purpose — a document that
  /// carries its own illustrations is most of the point of a Markdown file
  /// being one file.
  group('images', () {
    /// One transparent pixel, as a document would carry it.
    const String pixel =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA'
        'DUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    testWidgets('draws one the document carries itself', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: '![a cat]($pixel)')));
      await tester.pumpAndSettle();

      final Image drawn = tester.widget(find.byType(Image));

      // From memory rather than over the network: `Image.network` cannot open a
      // `data:` URL anywhere but the web, where it happens to become an `<img>`
      // tag — so the picture arrived on one platform and not the others.
      //
      // And through a resize, which is the decoded bitmap being bounded by how
      // wide the picture can actually be drawn rather than by how many pixels
      // the file happens to hold.
      expect(drawn.image, isA<ResizeImage>());
      expect((drawn.image as ResizeImage).imageProvider, isA<MemoryImage>());
      expect((drawn.image as ResizeImage).width, greaterThan(0));
      expect(drawn.semanticLabel, 'a cat');
      // The alt text is what is drawn *instead* of a picture that would not
      // load, so seeing it here would mean this one did not.
      expect(find.text('a cat'), findsNothing);
    });

    testWidgets('hands the picture over where the application says how to draw one', (
      WidgetTester tester,
    ) async {
      final List<MawyImage> asked = <MawyImage>[];

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: '![a cat](https://nowhere.example/c.png "Mine")',
            imageBuilder: (BuildContext context, MawyImage image) {
              asked.add(image);

              return Text('drew ${image.alt}');
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(asked.length, 1);
      expect(asked.single.url, 'https://nowhere.example/c.png');
      expect(asked.single.alt, 'a cat');
      expect(asked.single.title, 'Mine');
      expect(find.text('drew a cat'), findsOneWidget);
      // And nothing was fetched behind its back.
      expect(find.byType(Image), findsNothing);
    });

    testWidgets('never hands over a URL the scheme allowlist refused', (WidgetTester tester) async {
      final List<MawyImage> asked = <MawyImage>[];

      await tester.pumpWidget(
        host(
          MawyViewer(
            value: '![a cat](javascript:alert(1))',
            imageBuilder: (BuildContext context, MawyImage image) {
              asked.add(image);

              return const SizedBox.shrink();
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(asked, isEmpty);
      expect(documentText(tester), contains('a cat'));
    });

    testWidgets('says what it was told to about one that will not load', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyViewer(value: '![a cat](https://nowhere.example/c.png)')),
      );
      await tester.pumpAndSettle();

      // A network image in a test is a request that fails, which is the same
      // path a broken URL takes in a real application.
      expect(find.text('a cat'), findsOneWidget);
    });

    testWidgets('reads a data URL that is not a picture as one that will not load', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(const MawyViewer(value: '![a cat](data:image/png;base64,!!!!)')),
      );
      await tester.pumpAndSettle();

      expect(find.text('a cat'), findsOneWidget);
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

      // The words rather than the middle of the block holding them: a block is
      // as wide as the column it is in, so the middle of a short one is the
      // space beside the words. See [tapWords].
      final Rect box = tester.getRect(find.textContaining('go'));
      final Offset at = Offset(box.left + 4, box.center.dy);
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

    /// A recognizer is a resource, so a new one per link per build is one
    /// allocated for every link on the page whenever the pointer moves over a
    /// code block — and the old ones were disposed at the top of the build
    /// replacing them, while the spans holding them were still on the tree.
    ///
    /// Rebuilt from inside rather than by pumping again, because `host` gives
    /// every pump a fresh overlay and a fresh viewer with it. What is being
    /// asked about here is one viewer building twice.
    testWidgets('keeps the recognizer it gave a link, and still follows it', (
      WidgetTester tester,
    ) async {
      String? opened;
      late StateSetter again;
      double size = 16;

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyViewer(
                value: '[go](https://example.com)',
                onLinkTap: (String url, String? _) => opened = url,
                typography: MawyTypography(fontSize: size),
              );
            },
          ),
        ),
      );

      final GestureRecognizer? first = recognizerOf(tester, 'go');

      expect(first, isNotNull);

      again(() => size = 17);
      await tester.pump();
      again(() => size = 16);
      await tester.pump();

      expect(recognizerOf(tester, 'go'), same(first));

      await tapWords(tester, find.textContaining('go'));
      await tester.pump();

      expect(opened, 'https://example.com');
    });

    testWidgets('lets go of the one for a link the document no longer has', (
      WidgetTester tester,
    ) async {
      String? opened;
      late StateSetter again;
      String value = '[one](https://one.example) and [two](https://two.example)';

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyViewer(value: value, onLinkTap: (String url, String? _) => opened = url);
            },
          ),
        ),
      );

      final GestureRecognizer? kept = recognizerOf(tester, 'one');

      expect(kept, isNotNull);
      expect(recognizerOf(tester, 'two'), isNotNull);

      again(() => value = '[one](https://one.example) only');
      await tester.pumpAndSettle();

      // The one that is left is the one it had, and it still works — which is
      // the half that breaks if the wrong one is let go of.
      expect(recognizerOf(tester, 'one'), same(kept));

      (kept! as TapGestureRecognizer).onTap!();

      expect(opened, 'https://one.example');
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
      await tapWords(tester, find.textContaining('go'));
      await tester.pump();

      expect(opened, 'https://example.com');
    });
  });
}

/// The block at [index], which is only on the tree while it is near the view.
Finder measuredBlock(int index) =>
    find.byWidgetPredicate((Widget widget) => widget is MawyMeasured && widget.index == index);

/// The scroller the document itself is in.
///
/// By its type rather than by position: a code block scrolls sideways in a box
/// of its own, and the document's is the one that carries slivers.
ScrollController documentScroller(WidgetTester tester) =>
    tester.widget<CustomScrollView>(find.byType(CustomScrollView)).controller!;

/// Taps the words a run of text is drawn with, rather than the middle of the
/// box holding them.
///
/// A block of the document is as wide as the column it is in, the way a
/// paragraph on a page is, so the middle of a short one is the space beside the
/// words rather than the words. With a mouse, because a mouse is what a reader
/// on a desktop has and because the selection the document sits in watches one.
Future<void> tapWords(WidgetTester tester, Finder words) async {
  final Rect box = tester.getRect(words);

  await tester.tapAt(Offset(box.left + 4, box.center.dy), kind: PointerDeviceKind.mouse);
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
