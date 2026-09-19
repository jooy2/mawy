import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

/// The typographer, and the linkifier widened past the addresses GFM reads.
///
/// Both are off by default and both rewrite prose, so the first thing worth
/// asserting is that neither does anything unless it was asked to.
///
/// The rest is thin on purpose, the way `parse_test.dart` is: `tool/parity.dart`
/// reads the whole corpus a second time with both options on and diffs the
/// trees against the React parser's, which says far more than any list here
/// could. These are the cases worth being able to read without running two
/// languages.

/// What a document says, with the markup flattened and a link's target shown.
String said(MdNode node) {
  if (node is MdText) {
    return node.value;
  }

  if (node is MdInlineCode) {
    return '`${node.value}`';
  }

  if (node is MdImage) {
    return '![${node.alt}]';
  }

  if (node is MdLink) {
    return '<${node.url}|${node.children.map(said).join()}>';
  }

  if (node is MdBreak) {
    return '\n';
  }

  if (node is MdEmphasis) {
    return node.children.map(said).join();
  }

  if (node is MdStrong) {
    return node.children.map(said).join();
  }

  if (node is MdDelete) {
    return node.children.map(said).join();
  }

  if (node is MdParagraph) {
    return node.children.map(said).join();
  }

  if (node is MdHeading) {
    return node.children.map(said).join();
  }

  return '';
}

String read(String source, [MawyParseOptions options = const MawyParseOptions()]) =>
    parseMarkdown(source, options).root.children.map(said).join(' | ');

String typeset(String source) => read(source, const MawyParseOptions(typographer: true));

String wide(String source) => read(source, const MawyParseOptions(autolinkSchemes: true));

void main() {
  group('the typographer', () {
    test('is off unless it is asked for', () {
      expect(read('"a" -- b (c)...'), '"a" -- b (c)...');
    });

    test('draws the marks a keyboard has no key for', () {
      expect(typeset('(c) (tm) (r) (p)'), '© ™ ® (p)');
      expect(typeset('a+-b'), 'a±b');
      expect(typeset('a...b'), 'a…b');
      expect(typeset('?...'), '?..');
    });

    test('collapses a run of four or more of one mark, and no fewer', () {
      expect(typeset('???'), '???');
      expect(typeset('?????'), '???');
      expect(typeset('?!?!?!?!'), '?!?!?!?!');
    });

    test('takes three hyphens before two, so `---` is one em dash', () {
      expect(typeset('a---b'), 'a—b');
      expect(typeset('a--b'), 'a–b');
      expect(typeset('a- -b'), 'a- -b');
    });

    test('turns a quotation round by what sits either side of it', () {
      expect(typeset('"hello"'), '“hello”');
      expect(typeset('"nested \'inner\' outer"'), '“nested ‘inner’ outer”');
      expect(typeset("it's"), 'it’s');
      expect(typeset("dogs' bones"), 'dogs’ bones');
    });

    test('leaves a mark nothing closes exactly as it was typed', () {
      expect(typeset('"unclosed'), '"unclosed');
      expect(typeset('5" 6"'), '5" 6"');
      expect(typeset("'tis"), "'tis");
    });

    test('pairs a mark across the markup between it and its other half', () {
      expect(typeset('**a** "b"'), 'a “b”');
      expect(typeset('`code` "x"'), '`code` “x”');
    });

    test('rewrites what a reader reads and nothing a machine reads', () {
      expect(typeset('`a--b`'), '`a--b`');
      expect(typeset('![a--b](/i.png)'), '![a--b]');
      expect(typeset('[a--b](/u--v)'), '</u--v|a–b>');
    });

    test('never draws a dash into an address', () {
      expect(typeset('see http://a.co/a--b here'), 'see <http://a.co/a--b|http://a.co/a--b> here');
      expect(typeset('<http://a.co/a--b>'), '<http://a.co/a--b|http://a.co/a--b>');
      // An address the policy would follow, whether or not this document links it.
      expect(typeset('ftp://x.io/a--b'), 'ftp://x.io/a--b');
    });

    test('leaves a character the document escaped exactly as it was escaped', () {
      expect(typeset(r'\"a\"'), '"a"');
      expect(typeset(r'a\-\-b'), 'a--b');
      expect(typeset(r"it\'s"), "it's");
      expect(typeset(r'\(c\)'), '(c)');
    });

    test('is nothing to a character reference, which is not an escape', () {
      expect(typeset('Caf&eacute; -- best'), 'Café – best');
    });

    test('draws a quotation with the marks the document asked for', () {
      String marks(MawyQuotes quotes) => read(
        '"a \'b\' c" and dogs\' bones',
        MawyParseOptions(typographer: true, typographerQuotes: quotes),
      );

      expect(
        marks(const MawyQuotes(doubleOpen: '„', doubleClose: '“')),
        '„a ‘b’ c“ and dogs’ bones',
      );
      expect(
        marks(
          const MawyQuotes(doubleOpen: '«', doubleClose: '»', singleOpen: '‹', singleClose: '›'),
        ),
        '«a ‹b› c» and dogs’ bones',
      );
      // Anything left out keeps the English mark, and the apostrophe is not one
      // of the four: it stays an apostrophe whatever the quotations are drawn as.
      expect(marks(const MawyQuotes()), '“a ‘b’ c” and dogs’ bones');
    });

    test('leaves a colon that goes nowhere to the prose it is', () {
      expect(typeset('re:invent... was fun'), 're:invent… was fun');
      expect(typeset('TODO:fix... this'), 'TODO:fix… this');
    });
  });

  group('the widened linkifier', () {
    test('is off unless it is asked for', () {
      expect(read('ftp://x.io/f and //a.co/x'), 'ftp://x.io/f and //a.co/x');
    });

    test('reads every scheme the link policy trusts', () {
      expect(wide('ftp://x.io/f'), '<ftp://x.io/f|ftp://x.io/f>');
      expect(wide('matrix:r/x'), '<matrix:r/x|matrix:r/x>');
      expect(wide('mailto:a@b.com'), '<mailto:a@b.com|mailto:a@b.com>');
    });

    test('reads an address that left its scheme to the page', () {
      expect(wide('//a.co/x'), '<//a.co/x|//a.co/x>');
      expect(wide('//server/share'), '//server/share');
      expect(wide('// a comment'), '// a comment');
    });

    test('refuses every scheme the link policy refuses', () {
      expect(wide('javascript:alert(1)'), 'javascript:alert(1)');
      expect(wide('data:text/html,x'), 'data:text/html,x');
    });

    test('leaves a colon that is not a scheme alone', () {
      expect(wide('TODO:fix this'), 'TODO:fix this');
      expect(wide('ratio 3:2 here'), 'ratio 3:2 here');
      expect(wide(r'C:\Users\x'), r'C:\Users\x');
      expect(wide('ftp:'), 'ftp:');
    });

    test('still reads everything GFM reads, port and all', () {
      expect(
        wide('www.example.com:8080/x'),
        '<http://www.example.com:8080/x|www.example.com:8080/x>',
      );
      expect(wide('a@b.com'), '<mailto:a@b.com|a@b.com>');
    });
  });
}
