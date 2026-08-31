import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

/// The parser, read back as a tree.
///
/// These assert the shape rather than the drawing on purpose: the renderer is a
/// chain of type tests over these nodes and has no opinions of its own, so a
/// document that comes out of here right is a document that draws right.
///
/// What is *not* here is a second copy of the React package's parser tests.
/// `tool/parity.dart` compares the two parsers over every Markdown file in the
/// repository and every awkward case anybody has written down, byte for byte —
/// which is a stronger statement than any list of assertions, and the only one
/// that keeps saying so as both parsers change. These are the handful of things
/// worth being able to read without running two languages.

List<MdBlock> blocks(String source) => parseMarkdown(source).root.children;
MdBlock first(String source) => blocks(source).first;

/// The text a node was read out of.
String at(String source, MdNode node) => source.substring(node.range.start, node.range.end);

void main() {
  group('block structure', () {
    test('reads the shapes a document is made of', () {
      expect(first('# Hello'), isA<MdHeading>());
      expect(first('Title\n====='), isA<MdHeading>());
      expect(first('Just words.'), isA<MdParagraph>());
      expect(first('```ts\nx\n```'), isA<MdCode>());
      expect(first('    indented'), isA<MdCode>());
      expect(first('> quoted'), isA<MdBlockquote>());
      expect(first('- one'), isA<MdList>());
      expect(first('---'), isA<MdThematicBreak>());
      expect(first('<div>x</div>'), isA<MdHtmlBlock>());
      expect(first('| a | b |\n| - | - |\n| 1 | 2 |'), isA<MdTable>());
      expect(first('Term\n: What it means.'), isA<MdDefinitionList>());
    });

    test('does not read a hash with no space after it as a heading', () {
      expect(first('#nope'), isA<MdParagraph>());
    });

    test('separates a thematic break from a list', () {
      expect(first('- - -'), isA<MdThematicBreak>());
      expect(first('- one'), isA<MdList>());
    });

    test('reads GitHub`s five alerts as what they are', () {
      final MdBlockquote alert = first('> [!WARNING]\n> Careful.') as MdBlockquote;

      expect(alert.alert, MdAlertKind.warning);
      expect((first('> Ordinary.') as MdBlockquote).alert, isNull);
    });

    test('leaves GitHub out when it is asked to', () {
      const MawyParseOptions plain = MawyParseOptions(gfm: false);

      expect(
        parseMarkdown('| a | b |\n| - | - |\n| 1 | 2 |', plain).root.children.first,
        isA<MdParagraph>(),
      );
    });
  });

  group('where a node came from', () {
    test('points a block at the lines it was written on', () {
      const String source = '# Title\n\nA paragraph\nover two lines.\n\n---\n';
      final List<MdBlock> parsed = blocks(source);

      expect(at(source, parsed[0]), '# Title');
      expect(at(source, parsed[1]), 'A paragraph\nover two lines.');
      expect(at(source, parsed[2]), '---');
    });

    test('reaches inside a paragraph', () {
      const String source = 'a **bold** and `code` and [text](/u).';
      final List<MdInline> inline = (first(source) as MdParagraph).children;

      expect(at(source, inline[1]), '**bold**');
      expect(at(source, inline[3]), '`code`');
      expect(at(source, inline[5]), '[text](/u)');
    });

    test('answers in the characters of the document it was handed', () {
      // A byte order mark is not a character in the document, and `\r\n` is one
      // line ending rather than two — but the offsets are the point of the
      // exercise, so both are read back through the tidying that removed them.
      const String source = '\u{feff}# Title\r\n\r\nWords.';

      expect(at(source, blocks(source)[0]), '# Title');
      expect(at(source, blocks(source)[1]), 'Words.');
    });
  });

  group('safety', () {
    test('refuses a destination it will not follow, and keeps the words', () {
      final MdParagraph paragraph = first('[click](javascript:alert(1))') as MdParagraph;

      expect(paragraph.children.every((MdInline node) => node is! MdLink), isTrue);
      expect((paragraph.children.first as MdText).value, contains('click'));
    });

    test('allows a data URL for an image, and only for one a viewer draws', () {
      final MdParagraph good = first('![a](data:image/png;base64,AAA)') as MdParagraph;
      final MdParagraph bad = first('![a](data:text/html,x)') as MdParagraph;

      expect(good.children.first, isA<MdImage>());
      expect(bad.children.every((MdInline node) => node is! MdImage), isTrue);
    });
  });

  group('the outline', () {
    test('names every heading, and keeps the names apart', () {
      final MdDocument document = parseMarkdown('# A & B\n\n## A & B\n\n### 한국어');

      expect(document.outline.map((MdOutlineEntry entry) => entry.slug).toList(), <String>[
        'a--b',
        'a--b-1',
        '한국어',
      ]);
    });
  });

  group('footnotes', () {
    const String source =
        'One.[^a] Two.[^b] One again.[^a]\n\n[^b]: The second.\n\n[^a]: The first.';

    test('numbers them by the order they were first pointed at', () {
      expect(
        parseMarkdown(
          source,
        ).footnotes.map((MdFootnoteDefinition each) => <Object>[each.label, each.number]).toList(),
        <List<Object>>[
          <Object>['a', 1],
          <Object>['b', 2],
        ],
      );
    });

    test('takes the definitions out of the flow entirely', () {
      expect(parseMarkdown(source).root.children.length, 1);
    });

    test('leaves a mention with nothing to point at as the text it is', () {
      final MdDocument document = parseMarkdown('See [^nope] here.');

      expect(document.footnotes, isEmpty);
      expect(
        ((document.root.children.first as MdParagraph).children.first as MdText).value,
        'See [^nope] here.',
      );
    });
  });
}
