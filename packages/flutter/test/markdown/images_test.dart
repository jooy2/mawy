import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/src/markdown/images.dart';
import 'package:mawy/src/markdown/parse.dart';

List<String> _urls(String source) => imageUrls(parseMarkdown(source));

/// Which pictures a document points at, which is what an application compares
/// with the files it stored to find the ones nothing needs any more.
///
/// A miss here is the expensive direction: an address left off the list is a
/// file the application deletes while a document still draws it. So most of
/// what follows is about the places a picture can be written that a walk over
/// paragraphs would not reach.
///
/// The twin of the React package's `test/internal/markdown/images.test.ts`,
/// over the same documents, less the one case about what an upload writes,
/// which this package has no upload for.
void main() {
  group('the pictures a document points at', () {
    test('lists each address once, in the order the document first gives it', () {
      expect(_urls('![a](/a.png) and ![b](/b.png)\n\n![a again](/a.png)'), <String>[
        '/a.png',
        '/b.png',
      ]);
    });

    test('reads a reference, a destination in angle brackets and a picture inside a link', () {
      expect(
        _urls('![r][pic] and ![s](</s p.png> "T") and [![l](/l.png)](/href)\n\n[pic]: /r.png'),
        <String>['/r.png', '/s p.png', '/l.png'],
      );
    });

    test('leaves out a picture with no address, and one written in code', () {
      expect(_urls('![empty]() and `![code](/code.png)`\n\n    ![block](/block.png)'), isEmpty);
    });

    test('reaches a table cell, a quotation, a list and a definition', () {
      expect(
        _urls(
          '| a |\n| - |\n| ![c](/cell.png) |\n\n> ![q](/quote.png)\n\n- ![l](/list.png)\n\nTerm\n: ![d](/definition.png)',
        ),
        <String>['/cell.png', '/quote.png', '/list.png', '/definition.png'],
      );
    });

    test("reaches a directive's label as well as what it holds", () {
      expect(_urls(':::note[![l](/label.png)]\n![i](/inside.png)\n:::'), <String>[
        '/label.png',
        '/inside.png',
      ]);
    });

    test('reaches a footnote something refers to, and not one nothing does', () {
      expect(_urls('Noted[^1].\n\n[^1]: ![f](/foot.png)\n\n[^2]: ![u](/unused.png)'), <String>[
        '/foot.png',
      ]);
    });

    test('reads the `src` of an `<img>` in raw HTML, in a block and in a sentence', () {
      expect(
        _urls(
          '<p><img src="/block.png" alt="x"><IMG SRC=\'/upper.png\'></p>\n\nInline <img src=/bare.png> and <image src="/image.png">.',
        ),
        <String>['/block.png', '/upper.png', '/bare.png', '/image.png'],
      );
    });

    test('keeps the first `src` on a tag and reads its references', () {
      expect(_urls('<img alt=x src="/q&amp;s.png" src="/second.png">'), <String>['/q&s.png']);
    });

    test('reads a picture inside an HTML comment, and not a tag that is not an image', () {
      expect(
        _urls(
          '<!-- <img src="/comment.png"> --> and <imgs src="/no.png"> and <img data-src="/no.png">',
        ),
        <String>['/comment.png'],
      );
    });
  });
}
