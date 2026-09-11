import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/src/markdown/url.dart';

/// Which addresses a document writes that mean nothing on their own.
///
/// [MawyUrlResolver] is offered exactly these, so the line drawn here is the
/// whole of what an application is asked about. Getting it wrong in either
/// direction is a bug a reader sees: too narrow and a picture beside the
/// document stays broken, too wide and a link to a heading in the same document
/// is sent somewhere else entirely.
///
/// The twin of the React package's `test/internal/markdown/url.test.ts`, over
/// the same list, for the reason every pair of these exists: the two packages
/// have to answer the same question the same way.
void main() {
  group('telling a relative URL from one that says where it is', () {
    test('answers yes to a path, in the shapes a path is written in', () {
      for (final String url in <String>[
        'a.png',
        './a.png',
        '../up/a.png',
        '/docs/a.png',
        'guide.md#anchor',
        'guide.md?v=2',
        'folder/deep/one.md',
        'a file.png',
      ]) {
        expect(isRelativeUrl(url), isTrue, reason: url);
      }
    });

    test('answers no to anything that already says where it is', () {
      for (final String url in <String>[
        'https://example.com/a.png',
        'http://example.com',
        'mailto:someone@example.com',
        'data:image/png;base64,AAAA',
        'tel:+1234',
        // Missing only its scheme, which whatever is drawing supplies.
        // Somewhere else, not somewhere near the document.
        '//example.com/a.png',
      ]) {
        expect(isRelativeUrl(url), isFalse, reason: url);
      }
    });

    test('answers no to a place in this document, and to nothing at all', () {
      // A `#` is the one relative-looking address that already means
      // something. Resolving it would take every link to a heading out of the
      // document.
      for (final String url in <String>['#section', '#', '', '   ']) {
        expect(isRelativeUrl(url), isFalse, reason: '"$url"');
      }
    });

    test('is not fooled by a colon that comes after a path separator', () {
      // `README.md#a:b` has a colon in it and no scheme: the colon is inside
      // the fragment, which `_schemeOf` is written to notice.
      expect(isRelativeUrl('README.md#a:b'), isTrue);
      expect(isRelativeUrl('a/b:c.png'), isTrue);
    });
  });
}
