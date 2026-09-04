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

  group('directives', () {
    test('reads the three shapes, and what each one holds', () {
      final MdContainerDirective container =
          first(':::note[Careful]{kind=warning}\n# In\n\nBody.\n:::') as MdContainerDirective;

      expect(container.name, 'note');
      expect(container.attributes, <String, String>{'kind': 'warning'});
      expect((container.label.single as MdText).value, 'Careful');
      expect(container.children.map((MdBlock block) => block.runtimeType).toList(), <Type>[
        MdHeading,
        MdParagraph,
      ]);

      final MdLeafDirective leaf = first('::video{src=/a.mp4}') as MdLeafDirective;

      expect(leaf.name, 'video');
      expect(leaf.attributes, <String, String>{'src': '/a.mp4'});

      final MdParagraph sentence = first('Press :kbd[Ctrl] to go.') as MdParagraph;
      final MdTextDirective text = sentence.children.whereType<MdTextDirective>().single;

      expect(text.name, 'kbd');
      expect((text.children.single as MdText).value, 'Ctrl');
    });

    test('reads every shape of attribute, in the order they were written', () {
      final MdLeafDirective leaf =
          first('::a{#one .two .three key=bare quoted="a b" flag}') as MdLeafDirective;

      expect(leaf.attributes.keys.toList(), <String>['id', 'class', 'key', 'quoted', 'flag']);
      expect(leaf.attributes, <String, String>{
        'id': 'one',
        'class': 'two three',
        'key': 'bare',
        'quoted': 'a b',
        'flag': '',
      });
    });

    test('leaves what was never a directive alone', () {
      // A space after the colons is what every document that already writes
      // containers that way means, and a colon in a sentence is a colon.
      expect(first('::: tip\nBody.\n:::'), isA<MdParagraph>());
      expect(first('::video{src=/a.mp4} and more'), isA<MdParagraph>());
      expect(first('::a{'), isA<MdParagraph>());

      final MdParagraph sentence = first('Note: something. See http://a:b too.') as MdParagraph;

      expect(sentence.children.whereType<MdTextDirective>(), isEmpty);
    });

    test('closes a container on colons of its own length or more', () {
      final MdContainerDirective outer =
          first('::::a\n:::b\nIn.\n:::\n::::') as MdContainerDirective;

      expect(outer.name, 'a');
      expect((outer.children.single as MdContainerDirective).name, 'b');
    });

    test('points every part of one back at the characters it came from', () {
      const String source = ':::note[Careful]{kind=warning}\nBody.\n:::';
      final MdContainerDirective block = first(source) as MdContainerDirective;

      expect(at(source, block), source);
      expect(at(source, block.label.first), 'Careful');
    });

    test('finds a heading inside one, because the outline is about the document', () {
      expect(
        parseMarkdown(':::a\n# In\n:::').outline.map((MdOutlineEntry e) => e.text).toList(),
        <String>['In'],
      );
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

  /// Link reference definitions, which are taken off the front of a paragraph.
  ///
  /// The scan starts where the last one ended rather than being handed a copy
  /// of what is left, so a paragraph of two hundred definitions is one pass
  /// over it instead of two hundred. What that has to keep is where it starts
  /// from, which is the whole of what these check.
  /// A document larger, longer or deeper than one somebody wrote by hand.
  ///
  /// The depth is the one that matters here. Every container reads its own
  /// inside, so nesting is a stack of calls — and `> ` written a few thousand
  /// times was a four-kilobyte document that took the page down with it, at a
  /// depth that was not the same one the React package gave up at.
  group('a document nobody wrote by hand', () {
    test('stops opening containers rather than running out of stack', () {
      final MdDocument deep = parseMarkdown('${'> ' * 5000}deep');
      MdBlock at = deep.root.children.first;
      int depth = 0;

      while (at is MdBlockquote) {
        depth += 1;
        at = at.children.first;
      }

      expect(depth, 100);
      expect(at, isA<MdParagraph>());
      expect(deep.root.children.length, 1);
    });

    test('still nests everything a person would actually write', () {
      MdBlock at = parseMarkdown('${'> ' * 99}deep').root.children.first;
      int depth = 0;

      while (at is MdBlockquote) {
        depth += 1;
        at = at.children.first;
      }

      expect(depth, 99);
    });

    test('reads a long one, and the last block still says where it came from', () {
      final String source = List<String>.generate(
        5000,
        (int index) => 'Paragraph $index with **bold** and [a link](/b).',
      ).join('\n\n');
      final MdDocument document = parseMarkdown(source);

      expect(document.root.children.length, 5000);
      expect(
        source.substring(document.root.children[4999].range.start),
        'Paragraph 4999 with **bold** and [a link](/b).',
      );
    });
  });

  group('link reference definitions', () {
    test('takes every one at the front of a paragraph and leaves the rest of it', () {
      final MdDocument document = parseMarkdown('[a]: /one\n[b]: /two\nSee [a] and [b].');
      final MdParagraph paragraph = document.root.children.first as MdParagraph;
      final List<MdLink> links = paragraph.children.whereType<MdLink>().toList();

      expect(links.map((MdLink each) => each.url).toList(), <String>['/one', '/two']);
    });

    test('starts the next paragraph over after one it stopped part-way through', () {
      // A label of nothing but whitespace is not a label, so the paragraph it
      // is in keeps the line — and the paragraph after it is read from its own
      // beginning rather than from wherever that one gave up.
      final MdDocument document = parseMarkdown(
        '[ ]: /nowhere\n\n[a]: /one\n[b]: /two\n\nSee [a] and [b].',
      );

      expect(document.root.children.length, 2);
      expect(
        (document.root.children[1] as MdParagraph).children
            .whereType<MdLink>()
            .map((MdLink each) => each.url)
            .toList(),
        <String>['/one', '/two'],
      );
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

    /// Two labels can slug to the same word, and a name given out twice is a
    /// link that lands on whichever came first. The note's own number is what a
    /// second one is called after, and the one case that was not enough is a
    /// document that wrote that name out itself.
    test('gives every footnote a name of its own', () {
      List<String> slugs(String source) =>
          parseMarkdown(source).footnotes.map((MdFootnoteDefinition each) => each.slug).toList();

      expect(slugs('A[^ab] B[^a!b] C[^a?b]\n\n[^ab]: 1\n\n[^a!b]: 2\n\n[^a?b]: 3'), <String>[
        'ab',
        'ab-2',
        'ab-3',
      ]);

      expect(slugs('A[^b-2] B[^b] C[^b!]\n\n[^b-2]: 1\n\n[^b]: 2\n\n[^b!]: 3'), <String>[
        'b-2',
        'b',
        'b-3',
      ]);

      expect(slugs('A[^!] B[^?]\n\n[^!]: 1\n\n[^?]: 2'), <String>['footnote', 'footnote-2']);
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
