/// What the editor counts and shows along its bottom edge.
///
/// Pure functions of a string and two offsets, like `commands.dart` beside it
/// and for the same reason: they are the React package's
/// `MawyEditorStatus.tsx`, and `tool/parity.dart` diffs the two rather than
/// trusting that a count written twice counts the same thing.
library;

/// Han, hiragana and katakana, which are written without spaces between words.
///
/// Hangul is deliberately not here. Korean *is* spaced, so an eojeol is a word
/// and splitting on whitespace is right; counting each syllable would report a
/// short paragraph as a few hundred words.
final RegExp _dense = RegExp(
  r'[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]',
  unicode: true,
);
final RegExp _spaces = RegExp(r'\s+');

/// A word count that is not simply wrong outside English.
///
/// Whitespace alone counts a page of Chinese as one word. Counting characters
/// alone counts an English sentence as forty. So the two are added: every dense
/// character is a word, and what is left over is split on spaces.
int countWords(String text) {
  final int dense = _dense.allMatches(text).length;
  final String rest = text.replaceAll(_dense, ' ').trim();

  return dense + (rest.isEmpty ? 0 : rest.split(_spaces).length);
}

/// Code points rather than UTF-16 units: an emoji is one character to everyone
/// except a `length`.
int countCharacters(String text) => text.runes.length;

/// Bytes on disk, which is not the number of characters the moment anything is
/// not ASCII.
int countBytes(String text) {
  int bytes = 0;

  for (final int rune in text.runes) {
    if (rune <= 0x7f) {
      bytes += 1;
    } else if (rune <= 0x7ff) {
      bytes += 2;
    } else if (rune <= 0xffff) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }

  return bytes;
}

/// How many lines the document has.
int countLines(String text) => text.split('\n').length;

/// Where the caret is, counting from one.
class MawyCaretAt {
  /// Creates a position.
  const MawyCaretAt(this.line, this.column, this.selected);

  /// Which line, counting from one.
  final int line;

  /// Which column, likewise.
  final int column;

  /// How many characters are selected, in code points.
  final int selected;
}

/// Where the caret is in [value], and how much is selected.
MawyCaretAt caretAt(String value, int start, int end) {
  final List<String> before = value.substring(0, start).split('\n');

  return MawyCaretAt(
    before.length,
    before.last.length + 1,
    countCharacters(value.substring(start, end)),
  );
}
