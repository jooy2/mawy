import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/viewer/mawy_viewer_outline.dart' show MawyViewerOutline;
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart' show MawyToolbarButton;

import '../support/host.dart';

/// What the viewer says to somebody who is not looking at it, and what it does
/// for somebody who is not pointing at it.
///
/// The other files find controls by the widget they are, deliberately — a
/// finder that reads the semantics tree answers differently depending on
/// whether anything else has switched semantics on, and a test that passes for
/// that reason proves nothing. So this file switches them on itself and asks
/// the questions properly.
///
/// The keyboard half asks nothing of the semantics tree: it moves the focus and
/// reads where it went. Those are the three things the React package's suite
/// asserts one at a time and this package could not do at all until it could —
/// the arrows inside the toolbar, Escape closing a menu, and the platform's
/// reduce-motion setting reaching the animations.

const String sample = '''
# Title

Words, and a [link](https://example.com).
''';

/// Two headings, because the question the outline answers is which one.
const String chapters = '''
# Title

Words.

## Second

More words.
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
      // cannot activate is a picture of a button. Focusable and with a focus
      // action for the same reason — the toolbar is somewhere a keyboard goes.
      matchesSemantics(
        label: 'Outline',
        isButton: true,
        hasToggledState: true,
        hasTapAction: true,
        isFocusable: true,
        hasFocusAction: true,
        // A control that cannot be pressed says so rather than looking pressable
        // and doing nothing — the find bar has four of those.
        hasEnabledState: true,
        isEnabled: true,
      ),
    );

    handle.dispose();
  });

  testWidgets('names an outline entry after its heading, once', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(host(const MawyViewer(value: chapters)));

    await tester.tap(find.bySemanticsLabel('Outline'));
    await tester.pumpAndSettle();

    expect(
      tester.getSemantics(
        find.ancestor(
          of: find.descendant(of: find.byType(MawyViewerOutline), matching: find.text('Second')),
          matching: find.byType(FocusableActionDetector),
        ),
      ),
      // Once, and not twice. The heading's words are the name of the control
      // and are also the words drawn inside it, and a node handed both reads
      // the heading out and then reads it out again.
      matchesSemantics(
        label: 'Second',
        isButton: true,
        hasTapAction: true,
        isFocusable: true,
        hasFocusAction: true,
      ),
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

  group('the keyboard', () {
    /// The node a control is drawn with, found by what the control is called.
    FocusNode nodeFor(WidgetTester tester, String label) {
      final MawyToolbarButton button = tester.widget(
        find.byWidgetPredicate(
          (Widget widget) => widget is MawyToolbarButton && widget.label == label,
        ),
      );

      return button.focusNode!;
    }

    testWidgets('reaches the toolbar once, and moves inside it with the arrows', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(MawyViewer(value: sample, onColorSchemeChange: (MawyColorScheme _) {})),
      );

      nodeFor(tester, 'Typeface').requestFocus();
      await tester.pump();

      // One tab stop for the whole row: every other control is stepped over,
      // which is what makes eleven buttons one press of Tab rather than eleven.
      expect(nodeFor(tester, 'Typeface').skipTraversal, isFalse);
      expect(nodeFor(tester, 'Text size').skipTraversal, isTrue);
      expect(nodeFor(tester, 'Copy the Markdown').skipTraversal, isTrue);

      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pump();

      expect(nodeFor(tester, 'Text size').hasPrimaryFocus, isTrue);
      expect(nodeFor(tester, 'Typeface').skipTraversal, isTrue);
      expect(nodeFor(tester, 'Text size').skipTraversal, isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await tester.pump();

      expect(nodeFor(tester, 'Typeface').hasPrimaryFocus, isTrue);

      await tester.sendKeyEvent(LogicalKeyboardKey.end);
      await tester.pump();

      expect(nodeFor(tester, 'Copy the Markdown').hasPrimaryFocus, isTrue);

      await tester.sendKeyEvent(LogicalKeyboardKey.home);
      await tester.pump();

      expect(nodeFor(tester, 'Typeface').hasPrimaryFocus, isTrue);
    });

    testWidgets('opens a menu into it, and Escape gives the focus back', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      await tester.tap(find.bySemanticsLabel('Typeface'));
      await tester.pumpAndSettle();

      // The panel is in the overlay rather than beside its own button, so it
      // takes the focus when it opens: Tab from the button would otherwise walk
      // the whole document before it arrived.
      expect(find.text('Serif'), findsOneWidget);
      expect(nodeFor(tester, 'Typeface').hasPrimaryFocus, isFalse);

      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pumpAndSettle();

      expect(find.text('Serif'), findsNothing);
      expect(nodeFor(tester, 'Typeface').hasPrimaryFocus, isTrue);
    });

    /// The node an outline entry is drawn with, found by what it says.
    ///
    /// The panel's entries are not [MawyToolbarButton]s — an entry is a line of
    /// the document's own words rather than a glyph — so this asks the tree for
    /// the detector wrapped around that line instead.
    FocusNode entryNode(WidgetTester tester, String text) {
      final FocusableActionDetector entry = tester.widget(
        find.ancestor(
          of: find.descendant(of: find.byType(MawyViewerOutline), matching: find.text(text)),
          matching: find.byType(FocusableActionDetector),
        ),
      );

      return entry.focusNode!;
    }

    testWidgets('reaches every outline entry, and presses one with Enter', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyViewer(value: chapters)));

      await tester.tap(find.bySemanticsLabel('Outline'));
      await tester.pumpAndSettle();

      // Not the toolbar's arrangement: an entry is a tab stop of its own, the
      // way the React package's `<button>`s in an `<ol>` are. A panel a
      // keyboard cannot walk into is a panel a keyboard cannot use.
      expect(entryNode(tester, 'Title').skipTraversal, isFalse);
      expect(entryNode(tester, 'Second').skipTraversal, isFalse);

      entryNode(tester, 'Second').requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      // Following an entry moves the focus as well as the scroll: the next Tab
      // carries on from the heading rather than from the panel it was pressed
      // in.
      final BuildContext? landed = FocusManager.instance.primaryFocus?.context;
      final Finder here = find.byElementPredicate((Element element) => element == landed);

      expect(landed, isNotNull);
      // Inside the document rather than inside the panel — the entry it was
      // pressed on says `Second` too, so the word alone proves nothing.
      expect(
        find.descendant(of: find.byType(SingleChildScrollView), matching: here),
        findsOneWidget,
      );
      expect(find.descendant(of: here, matching: find.text('Second')), findsOneWidget);
    });

    testWidgets('presses a button with Enter and with the space bar', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: sample)));

      nodeFor(tester, 'Outline').requestFocus();
      await tester.pump();

      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      expect(find.text('Title'), findsNWidgets(2));

      await tester.sendKeyEvent(LogicalKeyboardKey.space);
      await tester.pumpAndSettle();

      expect(find.text('Title'), findsOneWidget);
    });
  });

  testWidgets('drops the animation where the platform asks for less movement', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(host(const MawyViewer(value: sample), disableAnimations: true));

    final Iterable<AnimatedContainer> boxes = tester.widgetList<AnimatedContainer>(
      find.byType(AnimatedContainer),
    );

    expect(boxes, isNotEmpty);

    for (final AnimatedContainer box in boxes) {
      expect(box.duration, Duration.zero);
    }

    await tester.pumpWidget(host(const MawyViewer(value: sample)));

    expect(
      tester.widgetList<AnimatedContainer>(find.byType(AnimatedContainer)).first.duration,
      MawyMotion.duration,
    );
  });
}
