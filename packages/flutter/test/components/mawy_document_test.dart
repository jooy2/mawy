import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/internal/find_bar.dart' show MawyFindBar;
import 'package:mawy/src/viewer/mawy_viewer_outline.dart';
import 'package:mawy/src/viewer/mawy_viewer_toolbar.dart' show MawyViewerToolbar;

import '../support/host.dart';
import '../support/spans.dart';

/// The document widget, which is the drawing without the surface.
///
/// What the renderer makes of a given piece of Markdown is settled in
/// `test/markdown`, and what a reader can do with a surface around it is
/// settled in `mawy_viewer_test.dart`. What is left for this file is the
/// difference between the two: a document that takes the height it needs
/// rather than the height it is given, keeps no chrome, and still follows a
/// link under a selection.

const String sample = '''
# Title

A paragraph with **strong** text and a [link](https://example.com).

- one
- two

```ts
const a = 1;
```

Noted.[^n]

[^n]: The note.
''';

void main() {
  group('a document in a place that scrolls for it', () {
    testWidgets('sits in a list without being given a height', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          ListView(
            children: const <Widget>[
              Text('before'),
              MawyDocument(value: sample, padding: EdgeInsets.zero),
              Text('after'),
            ],
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(documentText(tester), contains('Title'));
    });

    testWidgets('sits in a column of its own height', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          Column(
            children: const <Widget>[MawyDocument(value: '# Short', padding: EdgeInsets.zero)],
          ),
        ),
      );

      expect(tester.takeException(), isNull);

      // As tall as the words and no taller: a document that grew to the height
      // it was offered would be the whole of the host box.
      expect(tester.getSize(find.byType(MawyDocument)).height, lessThan(200));
    });

    testWidgets('scrolls nothing down, where a code block still slides sideways', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyDocument(value: sample, padding: EdgeInsets.zero)));

      final Iterable<Scrollable> inside = tester.widgetList<Scrollable>(
        find.descendant(of: find.byType(MawyDocument), matching: find.byType(Scrollable)),
      );

      // A code block wider than the column slides, which is the stylesheet's
      // `overflow-x: auto` and is about that block rather than the document.
      // What is not here is anything that scrolls down: that is the list's.
      expect(
        inside.map((Scrollable each) => axisDirectionToAxis(each.axisDirection)),
        everyElement(Axis.horizontal),
      );
    });

    testWidgets('draws what the viewer draws', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyDocument(value: sample, padding: EdgeInsets.zero)));

      final String drawn = documentText(tester);

      await tester.pumpWidget(
        host(const MawyViewer(value: sample, toolbar: <MawyViewerToolbarItem>[])),
      );

      expect(documentText(tester), drawn);
    });
  });

  group('what it leaves out', () {
    testWidgets('draws no toolbar, no find bar and no outline', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyDocument(value: sample)));

      expect(find.byType(MawyViewerToolbar), findsNothing);
      expect(find.byType(MawyFindBar), findsNothing);
      expect(find.byType(MawyViewerOutline), findsNothing);
    });

    testWidgets('selects nothing on its own, and everything inside a region', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyDocument(value: sample)));

      expect(find.byType(SelectableRegion), findsNothing);

      await tester.pumpWidget(host(_selectable(const MawyDocument(value: sample))));

      expect(find.byType(SelectableRegion), findsOneWidget);
      expect(documentText(tester), contains('Title'));
    });
  });

  group('the settings it is given', () {
    testWidgets('sets the document in the type it was passed', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyDocument(
            value: 'A paragraph.',
            typography: MawyTypography(fontSize: 22, lineHeight: 2),
          ),
        ),
      );

      final TextStyle? style = styleOf(tester, 'A paragraph.');

      expect(style?.fontSize, 22);
      expect(style?.height, 2);
    });

    testWidgets('follows the platform palette, and the prop over it', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(const MawyDocument(value: 'A paragraph.'), brightness: Brightness.dark),
      );

      expect(styleOf(tester, 'A paragraph.')?.color, MawyTokens.dark.foreground);

      await tester.pumpWidget(
        host(
          const MawyDocument(value: 'A paragraph.', colorScheme: MawyColorScheme.light),
          brightness: Brightness.dark,
        ),
      );

      expect(styleOf(tester, 'A paragraph.')?.color, MawyTokens.light.foreground);
    });

    testWidgets('leaves the room around the prose to whoever passed it', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyDocument(value: '# Title')));

      final double padded = tester.getTopLeft(find.text('Title')).dy;

      await tester.pumpWidget(host(const MawyDocument(value: '# Title', padding: EdgeInsets.zero)));

      expect(tester.getTopLeft(find.text('Title')).dy, lessThan(padded));
    });

    testWidgets('draws a link the way the policy says', (WidgetTester tester) async {
      String? opened;

      await tester.pumpWidget(
        host(
          MawyDocument(
            value: '[go](https://example.com)',
            links: MawyLinkPolicy.text,
            onLinkTap: (String url, String? _) => opened = url,
          ),
        ),
      );

      expect(documentText(tester), contains('go'));
      expect(recognizerOf(tester, 'go'), isNull);

      await _tapWords(tester, find.textContaining('go'));
      await tester.pump();

      expect(opened, isNull);
    });
  });

  group('the links in it', () {
    testWidgets('follows one that is tapped', (WidgetTester tester) async {
      String? opened;

      await tester.pumpWidget(
        host(
          MawyDocument(
            value: '[go](https://example.com)',
            onLinkTap: (String url, String? _) => opened = url,
          ),
        ),
      );

      await _tapWords(tester, find.textContaining('go'));
      await tester.pump();

      expect(opened, 'https://example.com');
    });

    testWidgets('follows one under a selection, which takes the gesture', (
      WidgetTester tester,
    ) async {
      String? opened;

      await tester.pumpWidget(
        host(
          _selectable(
            MawyDocument(
              value: '[go](https://example.com)',
              onLinkTap: (String url, String? _) => opened = url,
            ),
          ),
        ),
      );

      // Two pixels, which is nothing to a hand and a drag to a mouse: past the
      // precise slop the selection declares a drag and takes the gesture, and
      // the span's own recognizer never gets to say a tap happened. That is
      // every click on a link on a desktop.
      final Rect box = tester.getRect(find.textContaining('go'));
      final Offset at = Offset(box.left + 4, box.center.dy);
      final TestGesture gesture = await tester.startGesture(at, kind: PointerDeviceKind.mouse);

      addTearDown(gesture.removePointer);
      await tester.pump(const Duration(milliseconds: 30));
      await gesture.moveTo(at + const Offset(2, 0));
      await tester.pump(const Duration(milliseconds: 30));
      await gesture.up();
      await tester.pump();

      expect(opened, 'https://example.com');
    });

    testWidgets('keeps the recognizer it made across a rebuild', (WidgetTester tester) async {
      late StateSetter again;

      await tester.pumpWidget(
        host(
          StatefulBuilder(
            builder: (BuildContext context, StateSetter setState) {
              again = setState;

              return MawyDocument(
                value: '[go](https://example.com)',
                onLinkTap: (String url, String? _) {},
              );
            },
          ),
        ),
      );

      final GestureRecognizer? first = recognizerOf(tester, 'go');

      again(() {});
      await tester.pump();

      expect(recognizerOf(tester, 'go'), same(first));
    });
  });

  group('the notes under it', () {
    testWidgets('takes the reader down to the note, moving whatever scrolls', (
      WidgetTester tester,
    ) async {
      final ScrollController scroller = ScrollController();

      addTearDown(scroller.dispose);

      await tester.pumpWidget(
        host(
          ListView(
            controller: scroller,
            children: <Widget>[
              const SizedBox(height: 1200),
              MawyDocument(value: sample, padding: EdgeInsets.zero),
            ],
          ),
        ),
      );

      scroller.jumpTo(600);
      await tester.pump();

      (recognizerOf(tester, '1') as TapGestureRecognizer?)?.onTap?.call();
      await tester.pumpAndSettle();

      expect(scroller.offset, greaterThan(600));
    });

    testWidgets('goes nowhere, and throws nothing, where nothing scrolls', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(const MawyDocument(value: sample)));

      (recognizerOf(tester, '1') as TapGestureRecognizer?)?.onTap?.call();
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}

/// A selection over [child], the way this package makes one: `SelectableRegion`
/// rather than Material's `SelectionArea`, since nothing here imports Material.
Widget _selectable(Widget child) {
  final FocusNode focus = FocusNode();

  addTearDown(focus.dispose);

  return SelectableRegion(
    focusNode: focus,
    selectionControls: emptyTextSelectionControls,
    child: child,
  );
}

/// Taps the words rather than the middle of the block holding them: a block is
/// as wide as the column it is in, so the middle of a short one is the space
/// beside the words.
Future<void> _tapWords(WidgetTester tester, Finder words) async {
  final Rect box = tester.getRect(words);

  await tester.tapAt(Offset(box.left + 4, box.center.dy), kind: PointerDeviceKind.mouse);
}
