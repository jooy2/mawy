/// Finding a run of text in the document, and putting another one in its place.
///
/// Pure functions over strings, the way `commands.dart` is and for the same
/// reason: what "replace all" does to overlapping matches is a question about
/// arithmetic, and a test that has to mount an editor to ask it is a test
/// nobody writes the awkward half of. It is `src/internal/search.ts` in Dart,
/// function for function, and `tool/parity.dart` diffs the two.
///
/// Plain text unless a regular expression is asked for. An editor whose find
/// box quietly compiled `(` into a syntax error would be one a writer could not
/// trust with a document, and a Markdown document is full of `*`, `[`, `.` and
/// `+`; so the box is plain text, and a pattern is something switched on. A
/// pattern that is not one finds nothing, and the bar says so. Dart's regular
/// expressions are JavaScript's, so the React package reads the same patterns
/// the same way.
library;

/// Where one match sits in the document.
class MawyMatch {
  /// Creates a match.
  const MawyMatch(this.start, this.end);

  /// Where it begins.
  final int start;

  /// Where it ends.
  final int end;

  @override
  bool operator ==(Object other) => other is MawyMatch && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);
}

/// A document as a replacement left it, and where the caret went.
class MawyReplaced {
  /// Creates a result.
  const MawyReplaced(this.value, this.caret);

  /// The document.
  final String value;

  /// Where the caret is in it.
  final int caret;
}

/// A document as "replace all" left it, and how many it replaced.
class MawyReplacedAll {
  /// Creates a result.
  const MawyReplacedAll(this.value, this.count);

  /// The document.
  final String value;

  /// How many matches went.
  final int count;
}

/// A copy in lower case that is exactly as long as what went in, character for
/// character.
///
/// `toLowerCase` over a whole string is neither of those things. It is not
/// length-preserving everywhere — `İ` becomes two characters on the other side
/// of this library — and every offset this file reports is an offset into the
/// original, so one character that grew puts every match after it in the wrong
/// place and a replacement then takes out the wrong letters. It is also not
/// decided character by character: a `Σ` at the end of a word can become `ς`
/// where one in the middle becomes `σ`, which would mean a query matching the
/// same word only where it sits the same way round.
///
/// So the answer is the one a character at a time gives, with anything that
/// would change length left as it was written. What that costs is that `İ`
/// matches only itself, which is a match not found rather than a match reported
/// in the wrong place.
///
/// Two characters in the whole of Unicode need that treatment, and a text with
/// neither of them in it — which is very nearly every text — is folded in the
/// one call the platform has rather than a character at a time.
/// The characters that have to be looked at one at a time.
///
/// `Σ` reads its own position in the word. `İ` is the one character the two
/// platforms lower-case differently: in JavaScript it becomes `i` and a
/// combining dot, two characters where there was one, and Dart drops the dot
/// instead. Anything else is folded in the one call the platform has.
final RegExp _awkward = RegExp('[\u0130\u03a3]');

/// `İ`, which is left as it was written.
///
/// Dart would fold it to `i`, and doing so would mean a search for `istanbul`
/// finding `İstanbul` here and not in the React package, where the answer is
/// two characters long and cannot be used without moving every offset after
/// it. Naming it is what keeps the two packages one library. Folding it
/// properly is a Unicode case folding table, which would also fold `ς` to `σ`
/// and is written down in `TODO.md` as something not shipped.
const int _dottedI = 0x0130;

String _fold(String text) {
  final String lower = text.toLowerCase();

  if (lower.length == text.length && !_awkward.hasMatch(text)) {
    return lower;
  }

  final StringBuffer out = StringBuffer();

  for (final int rune in text.runes) {
    final String character = String.fromCharCode(rune);
    final String folded = character.toLowerCase();

    out.write(folded.length == character.length && rune != _dottedI ? folded : character);
  }

  return out.toString();
}

/// Every match, in the order they appear.
///
/// Matches never overlap: the search carries on from the end of the one it just
/// found, so `aa` in `aaaa` is two rather than three. Which is what makes
/// replacing all of them one pass rather than a fixed point.
List<MawyMatch> findMatches(String value, String query, bool matchCase, {bool regex = false}) {
  if (query.isEmpty) {
    return <MawyMatch>[];
  }

  if (regex) {
    return _patternMatches(
      value,
      query,
      matchCase,
    ).map((RegExpMatch found) => MawyMatch(found.start, found.end)).toList();
  }

  final String haystack = matchCase ? value : _fold(value);
  final String needle = matchCase ? query : _fold(query);
  final List<MawyMatch> out = <MawyMatch>[];
  int at = 0;

  while (true) {
    final int found = haystack.indexOf(needle, at);

    if (found == -1) {
      return out;
    }

    out.add(MawyMatch(found, found + needle.length));
    at = found + needle.length;
  }
}

/// A query read as a regular expression, or `null` where it is not one.
///
/// Over the whole document with `^` and `$` at the ends of its lines, which is
/// what somebody looking for a line that starts with something means. Without
/// the Unicode switch, which turns a lone `{` or an escaped `-` into an error,
/// and a find box is somewhere a pattern is typed a character at a time.
RegExp? patternOf(String query, bool matchCase) {
  try {
    return RegExp(query, multiLine: true, caseSensitive: matchCase);
  } on FormatException {
    return null;
  }
}

/// Whether a query asked to be read as a pattern is not one.
bool invalidPattern(String query, {required bool regex}) =>
    regex && query.isNotEmpty && patternOf(query, true) == null;

/// Every match of a pattern, and what it captured.
///
/// A match of nothing at all is passed over: `a*` matches nothing between every
/// two letters, and a match that cannot be drawn or replaced is a count that
/// means nothing. The search goes on from the next character.
List<RegExpMatch> _patternMatches(String value, String query, bool matchCase) {
  final RegExp? pattern = patternOf(query, matchCase);

  if (pattern == null) {
    return <RegExpMatch>[];
  }

  return pattern.allMatches(value).where((RegExpMatch found) => found.end > found.start).toList();
}

/// A replacement with what a match captured written into it: `$&` is the whole
/// match, `$1` to `$99` a numbered group, `$<name>` a named one and `$$` a
/// dollar sign. A number past the groups there are is the characters it is, and
/// so is any other `$`.
String _expand(String template, RegExpMatch found) {
  final int groups = found.groupCount;
  final List<String> names = found.groupNames.toList();
  final StringBuffer out = StringBuffer();
  final RegExp twoDigits = RegExp(r'^\d\d$');
  final RegExp oneDigit = RegExp(r'^\d$');

  for (int at = 0; at < template.length; at += 1) {
    final String character = template[at];

    if (character != r'$' || at + 1 >= template.length) {
      out.write(character);
      continue;
    }

    final String next = template[at + 1];

    if (next == r'$') {
      out.write(r'$');
      at += 1;
      continue;
    }

    if (next == '&') {
      out.write(found[0]);
      at += 1;
      continue;
    }

    if (next == '<' && names.isNotEmpty) {
      final int close = template.indexOf('>', at + 2);

      if (close != -1) {
        final String name = template.substring(at + 2, close);

        out.write(names.contains(name) ? found.namedGroup(name) ?? '' : '');
        at = close;
        continue;
      }
    }

    final String pair = template.substring(
      at + 1,
      at + 3 > template.length ? template.length : at + 3,
    );

    if (twoDigits.hasMatch(pair) && int.parse(pair) >= 1 && int.parse(pair) <= groups) {
      out.write(found.group(int.parse(pair)) ?? '');
      at += 2;
      continue;
    }

    if (oneDigit.hasMatch(next) && int.parse(next) >= 1 && int.parse(next) <= groups) {
      out.write(found.group(int.parse(next)) ?? '');
      at += 1;
      continue;
    }

    out.write(character);
  }

  return out.toString();
}

/// What one match of a pattern is replaced with, with what it captured written
/// in. The pattern is read again at the match, since a match is only where it
/// is and not what it captured. See [_expand].
String replacementFor(
  String value,
  MawyMatch match,
  String query,
  String replacement,
  bool matchCase,
) {
  final RegExp? pattern = patternOf(query, matchCase);
  final RegExpMatch? found = pattern?.matchAsPrefix(value, match.start) as RegExpMatch?;

  return found == null ? replacement : _expand(replacement, found);
}

/// Which match to go to from where the caret is.
///
/// Forwards means the first match that starts at or after the caret, so
/// pressing next with the caret at the top of the document finds the first one
/// rather than the second. Backwards means the last that starts before it. Both
/// wrap, because a search that stops at the end of the file is a search you
/// have to scroll to the top to finish.
///
/// `-1` when there is nothing to go to at all.
int matchFrom(List<MawyMatch> matches, int caret, {required bool forwards}) {
  if (matches.isEmpty) {
    return -1;
  }

  if (forwards) {
    final int at = matches.indexWhere((MawyMatch match) => match.start >= caret);

    return at == -1 ? 0 : at;
  }

  for (int at = matches.length - 1; at >= 0; at -= 1) {
    if (matches[at].start < caret) {
      return at;
    }
  }

  return matches.length - 1;
}

/// One match, replaced.
MawyReplaced replaceMatch(String value, MawyMatch match, String replacement) {
  return MawyReplaced(
    value.substring(0, match.start) + replacement + value.substring(match.end),
    match.start + replacement.length,
  );
}

/// Every match, replaced in one pass.
///
/// One pass rather than a loop over [replaceMatch], and not for speed:
/// replacing `a` with `aa` a match at a time would find the replacement and
/// replace that too, for ever. What is searched is the document as it was.
MawyReplacedAll replaceAll(
  String value,
  String query,
  String replacement,
  bool matchCase, {
  bool regex = false,
}) {
  final List<RegExpMatch> found = regex
      ? _patternMatches(value, query, matchCase)
      : const <RegExpMatch>[];
  final List<MawyMatch> matches = regex
      ? found.map((RegExpMatch each) => MawyMatch(each.start, each.end)).toList()
      : findMatches(value, query, matchCase);

  if (matches.isEmpty) {
    return MawyReplacedAll(value, 0);
  }

  final StringBuffer out = StringBuffer();
  int at = 0;

  for (int index = 0; index < matches.length; index += 1) {
    final MawyMatch match = matches[index];

    out
      ..write(value.substring(at, match.start))
      ..write(regex ? _expand(replacement, found[index]) : replacement);
    at = match.end;
  }

  out.write(value.substring(at));

  return MawyReplacedAll(out.toString(), matches.length);
}
