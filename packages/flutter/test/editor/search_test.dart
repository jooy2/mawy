import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

/// Finding and replacing, as arithmetic on a string.
///
/// The twin of the React package's `test/internal/search.test.ts`, and it
/// exists because `tool/parity.dart` does not reach here: that compares the two
/// *parsers*, so everything else this library ships twice — the commands, the
/// status line, this — is two implementations with only their doc comments
/// promising they agree. They did not, once: `İ` folded to `i` on this side and
/// stayed as it was on the other.
///
/// The awkward halves are the ones nobody writes a test for once it has to be
/// done through a mounted editor: what "replace all" does when the replacement
/// contains the thing being replaced, and where "next" goes from a caret
/// sitting in the middle of a match.

List<List<int>> found(String value, String query, {bool matchCase = false}) => findMatches(
  value,
  query,
  matchCase,
).map((MawyMatch match) => <int>[match.start, match.end]).toList();

void main() {
  group('finding', () {
    test('finds every one, in the order they appear', () {
      expect(found('a b a b a', 'a'), <List<int>>[
        <int>[0, 1],
        <int>[4, 5],
        <int>[8, 9],
      ]);
    });

    test('ignores case unless it is asked not to', () {
      expect(found('One one ONE', 'one').length, 3);
      expect(found('One one ONE', 'one', matchCase: true), <List<int>>[
        <int>[4, 7],
      ]);
    });

    test('never overlaps, so `aa` in `aaaa` is two rather than three', () {
      expect(found('aaaa', 'aa'), <List<int>>[
        <int>[0, 2],
        <int>[2, 4],
      ]);
    });

    test('finds nothing at all for an empty query', () {
      expect(found('anything', ''), isEmpty);
    });

    test('takes the query as the characters it is, never as a pattern', () {
      // A Markdown document is full of these, and a find box that compiled them
      // would be one a writer cannot trust.
      expect(found('a.b and axb', 'a.b'), <List<int>>[
        <int>[0, 3],
      ]);
      expect(found('one (two)', '(two)'), <List<int>>[
        <int>[4, 9],
      ]);
      expect(found('**bold**', '**'), <List<int>>[
        <int>[0, 2],
        <int>[6, 8],
      ]);
    });
  });

  group('going to the next one', () {
    final List<MawyMatch> matches = findMatches('a b a b a', 'a', false);

    test('finds the one at the caret going forwards, and the one before it going back', () {
      expect(matchFrom(matches, 0, forwards: true), 0);
      expect(matchFrom(matches, 1, forwards: true), 1);
      expect(matchFrom(matches, 8, forwards: false), 1);
    });

    test('wraps at both ends, so a search never has to be scrolled back to finish', () {
      expect(matchFrom(matches, 9, forwards: true), 0);
      expect(matchFrom(matches, 0, forwards: false), 2);
    });

    test('says there is nowhere to go when there is nothing to go to', () {
      expect(matchFrom(<MawyMatch>[], 0, forwards: true), -1);
    });
  });

  group('replacing', () {
    test('puts one in, and says where the caret ends up', () {
      final MawyReplaced replaced = replaceMatch('one two', const MawyMatch(4, 7), 'three');

      expect(replaced.value, 'one three');
      expect(replaced.caret, 9);
    });

    test('replaces all of them against the document as it was', () {
      // A match at a time would find its own replacement and replace that too,
      // for ever.
      final MawyReplacedAll replaced = replaceAll('a a a', 'a', 'aa', false);

      expect(replaced.value, 'aa aa aa');
      expect(replaced.count, 3);
    });

    test('leaves the document alone when there is nothing to replace', () {
      final MawyReplacedAll replaced = replaceAll('one', 'two', 'three', false);

      expect(replaced.value, 'one');
      expect(replaced.count, 0);
    });

    test('replaces with nothing, which is how a thing is deleted everywhere', () {
      final MawyReplacedAll replaced = replaceAll('a-b-c', '-', '', false);

      expect(replaced.value, 'abc');
      expect(replaced.count, 2);
    });
  });

  /// The two places where lower case is not one character for one, and the two
  /// places the two packages could quietly stop agreeing.
  group('folding', () {
    test('folds a letter the same way wherever in the word it sits', () {
      // A `Σ` at the end of a word lower-cases to `ς` and one anywhere else to
      // `σ` when the whole string is folded at once, which would make a query
      // find the same word in the middle of a sentence and not at the end.
      expect(found('ΟΔΟΣ ΤΙΣ', 'οδοσ'), <List<int>>[
        <int>[0, 4],
      ]);
      expect(found('οδος τις', 'ΟΔΟΣ'), isEmpty);

      final MawyReplacedAll replaced = replaceAll('ΟΔΟΣ ΤΙΣ', 'τισ', 'x', false);

      expect(replaced.value, 'ΟΔΟΣ x');
      expect(replaced.count, 1);
    });

    test('keeps the offsets where a letter would grow in lower case', () {
      // `İ` is `i` and a combining dot in JavaScript, so folding it there would
      // move every offset after it. It is left as written on both sides, which
      // is why a search for `istanbul` finds nothing here either.
      const String value = 'İstanbul and one';

      expect(findMatches(value, 'one', false), <MawyMatch>[const MawyMatch(13, 16)]);
      expect(value.substring(13, 16), 'one');
      expect(found('İstanbul', 'istanbul'), isEmpty);
      expect(found('İstanbul', 'İstanbul'), <List<int>>[
        <int>[0, 8],
      ]);

      final MawyReplacedAll replaced = replaceAll(value, 'one', 'two', false);

      expect(replaced.value, 'İstanbul and two');
      expect(replaced.count, 1);
    });
  });
}
