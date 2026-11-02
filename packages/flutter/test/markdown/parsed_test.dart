import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy/src/markdown/parsed.dart';

/// The last few readings, kept.
///
/// What this promises: a kept tree is never one that a different text or a
/// different reading would have made.
void main() {
  group('the last readings of a document', () {
    test('gives the same tree back for the same text', () {
      expect(identical(documentOf('# Kept'), documentOf('# Kept')), isTrue);
    });

    test('does not give it back for a different text', () {
      expect(identical(documentOf('# One'), documentOf('# Two')), isFalse);
    });

    test('tells two readings of one text apart', () {
      const String text = 'a\nb';

      expect(
        identical(documentOf(text), documentOf(text, const MawyParseOptions(breaks: true))),
        isFalse,
      );
    });

    test('takes an option spelled out to be the one left out', () {
      expect(
        identical(documentOf('# Same'), documentOf('# Same', const MawyParseOptions(gfm: true))),
        isTrue,
      );
    });

    test('forgets what has not been asked for lately', () {
      final MdDocument oldest = documentOf('# Oldest');

      for (final String text in <String>['1', '2', '3', '4']) {
        documentOf(text);
      }

      expect(identical(documentOf('# Oldest'), oldest), isFalse);
    });

    test('keeps what is still being asked for', () {
      final MdDocument kept = documentOf('# Kept going');

      for (final String text in <String>['5', '6', '7', '8']) {
        documentOf(text);
        documentOf('# Kept going');
      }

      expect(identical(documentOf('# Kept going'), kept), isTrue);
    });
  });
}
