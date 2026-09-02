import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

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

      expect(find.text('Back to the defaults'), findsNothing);
      expect(toolbarButton('Text size +'), findsOneWidget);
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

      await tester.tap(find.textContaining('go'));
      await tester.pump();

      expect(opened, 'https://example.com');
    });
  });
}
