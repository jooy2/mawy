import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

import '../support/host.dart';
import '../support/spans.dart';

/// The highlighter, and the code block it colours.
///
/// What it *says* about a piece of code is not asserted here beyond a case or
/// two, and deliberately: `tool/parity.dart` diffs every token of it against
/// the React package's over a corpus of every language either of them claims,
/// which is a far stronger statement than any list of expectations written out
/// by hand. What is here is the part parity cannot see — that a viewer asked
/// for colour draws it, that a viewer not asked for it does not, and that a
/// highlighter which lies about the code is not believed.

/// A highlighter that drops a character, which is the one thing one may not do.
class _Liar extends MawyHighlighter {
  const _Liar();

  @override
  bool supports(String language) => true;

  @override
  List<MawyCodeToken> highlight(String code, String language) => <MawyCodeToken>[
    MawyCodeToken(code.substring(1), MawyCodeTokenKind.keyword),
  ];
}

const String document = '''
```ts
const a = 1;
```
''';

void main() {
  group('the highlighter', () {
    test('knows the names a fence is likely to use, and no others', () {
      expect(mawyHighlighter.supports('ts'), isTrue);
      expect(mawyHighlighter.supports('TypeScript'), isTrue);
      expect(mawyHighlighter.supports('brainfuck'), isFalse);
      expect(kMawyHighlightLanguages, contains('yaml'));
    });

    test('hands back the code it was given, exactly', () {
      const String code = "const a = 'x'; // and a comment\nfn(1, 2);";
      final List<MawyCodeToken> tokens = mawyHighlighter.highlight(code, 'ts');

      expect(tokens.map((MawyCodeToken token) => token.text).join(), code);
      expect(tokens.map((MawyCodeToken token) => token.kind), contains(MawyCodeTokenKind.keyword));
    });

    test('says nothing about a language it does not know', () {
      final List<MawyCodeToken> tokens = mawyHighlighter.highlight('a b c', 'brainfuck');

      expect(tokens.length, 1);
      expect(tokens.single.kind, isNull);
    });
  });

  group('a code block', () {
    testWidgets('is drawn plain until an application asks for colour', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: document)));

      expect(documentText(tester), contains('const a = 1;'));
      expect(styleOf(tester, 'const'), isNull);
    });

    testWidgets('is coloured when one does', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: document, highlight: mawyHighlighter)));

      expect(documentText(tester), contains('const a = 1;'));
      expect(styleOf(tester, 'const')?.color, MawyTokens.light.highlightKeyword);
      expect(styleOf(tester, '1')?.color, MawyTokens.light.highlightNumber);
    });

    testWidgets('is coloured in the palette it is drawn in', (WidgetTester tester) async {
      await tester.pumpWidget(
        host(
          const MawyViewer(
            value: document,
            colorScheme: MawyColorScheme.dark,
            highlight: mawyHighlighter,
          ),
        ),
      );

      expect(styleOf(tester, 'const')?.color, MawyTokens.dark.highlightKeyword);
    });

    testWidgets('is drawn plain when the tokens are not the code', (WidgetTester tester) async {
      await tester.pumpWidget(host(const MawyViewer(value: document, highlight: _Liar())));

      // The whole line, rather than the line with its first character eaten.
      expect(documentText(tester), contains('const a = 1;'));
      expect(styleOf(tester, 'const'), isNull);
    });
  });
}
