/// Markdown as marks on the source, for the editor to colour.
///
/// This is not the parser, and it deliberately is not. The parser answers "what
/// does this document mean", throws the syntax away on the way, and cannot say
/// where in the text anything was — which is the one thing colouring an editor
/// needs. It also has to be *wrong* in a way the parser must not be: a line
/// being typed is half-written most of the time, and a highlighter that waits
/// for `**bold` to be closed before it admits anything is happening is a
/// highlighter that flickers.
///
/// So: a line at a time, with just enough state to know it is inside a fence,
/// and approximate inline patterns over the rest. What it produces is offsets,
/// which the editor turns into spans.
///
/// It is the React package's `src/internal/markdown/highlight.ts`, rule for
/// rule, and `tool/parity.dart` diffs the two like everything else here.
library;

/// What a run of the source is.
enum MdTokenKind {
  /// The text of an ATX heading.
  heading,

  /// The `>` a quotation opens with.
  quote,

  /// A `#`, a bullet, a number.
  marker,

  /// The `[x]` of a task list item.
  task,

  /// A thematic break, whole.
  rule,

  /// A fence line, whole.
  fence,

  /// A code span, or a line inside a fence.
  code,

  /// `*emphasis*`.
  emphasis,

  /// `**strong**`.
  strong,

  /// `~~struck through~~`.
  strike,

  /// The `[label]` half of a link.
  link,

  /// The `(destination)` half of it.
  url,

  /// A run of raw HTML.
  html,

  /// A backslash and what it escapes.
  escape,

  /// A pipe, or a delimiter row.
  table,

  /// A `[label]:` at the start of a line.
  reference,
}

/// A run of one line, and what it is.
class MdToken {
  /// Creates a run.
  const MdToken(this.start, this.end, this.kind);

  /// Where it starts, in the line rather than in the document.
  final int start;

  /// Where it ends, likewise.
  final int end;

  /// What it is.
  final MdTokenKind kind;
}

/// One line of the source, with the syntax in it located.
class MdHighlightedLine {
  /// Creates a line.
  const MdHighlightedLine(this.text, this.tokens);

  /// The characters.
  final String text;

  /// In order, never overlapping.
  final List<MdToken> tokens;
}

/// The lines worth locating the syntax in, as a half-open range of line indexes.
///
/// Everything outside it still comes back, and comes back with its text — a
/// caller windowing this is windowing what it *colours*, not what it holds.
/// What is saved is the scan of each line and the tokens it would have
/// produced, which for a document with five thousand lines and forty of them on
/// the screen is nearly all of the work.
class MdHighlightWindow {
  /// Creates a range.
  const MdHighlightWindow(this.from, this.to);

  /// The first line to read.
  final int from;

  /// One past the last. Exclusive.
  final int to;

  @override
  bool operator ==(Object other) =>
      other is MdHighlightWindow && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(from, to);
}

/// The tokens of a line nobody asked to colour. Shared, so it costs nothing.
const List<MdToken> _none = <MdToken>[];

final RegExp _fenceLine = RegExp(r'^ {0,3}(`{3,}|~{3,})(.*)$');
final RegExp _atx = RegExp(r'^( {0,3}#{1,6})(\s.*)?$');
final RegExp _rule = RegExp(r'^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$');
final RegExp _quote = RegExp(r'^ {0,3}>[ \t]?');

/// A bullet, a number, or the colon a definition's meaning opens with.
final RegExp _bullet = RegExp(r'^([ \t]*)([-*+]|:|\d{1,9}[.)])([ \t]+)');
final RegExp _task = RegExp(r'^\[([ xX])\](?=[ \t]|$)');
final RegExp _delimiterRow = RegExp(
  r'^ {0,3}\|?(?:[ \t]*:?-+:?[ \t]*\|)*[ \t]*:?-+:?[ \t]*\|?[ \t]*$',
);
final RegExp _definition = RegExp(r'^ {0,3}(\[[^\]\n]+\]:)');

class _Inline {
  const _Inline(this.kind, this.pattern, [this.second]);

  final MdTokenKind kind;
  final RegExp pattern;

  /// Where a match has two halves worth colouring apart.
  final MdTokenKind? second;
}

/// The inline patterns, in the order they are allowed to claim text.
///
/// Order is precedence: a `*` inside a code span belongs to the code span, so
/// code is tried first and everything after it skips what is already spoken
/// for. None of them can match nothing, which is what lets this walk the
/// matches rather than the positions.
final List<_Inline> _inline = <_Inline>[
  _Inline(MdTokenKind.code, RegExp(r'(`+)[^`]*\1')),
  _Inline(MdTokenKind.escape, RegExp(r'''\\[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]''')),
  // The label and the destination are coloured differently: one is the
  // sentence the reader sees, the other is machinery.
  _Inline(MdTokenKind.link, RegExp(r'(!?\[[^\]\n]*\])(\([^)\n]*\)|\[[^\]\n]*\])'), MdTokenKind.url),
  _Inline(MdTokenKind.html, RegExp(r'<[^<>\s][^<>]*>')),
  _Inline(MdTokenKind.strong, RegExp(r'(\*\*|__)(?![\s*_])(?:(?!\1)[\s\S])+?\1')),
  _Inline(MdTokenKind.strike, RegExp(r'~~(?![\s~])(?:(?!~~)[\s\S])+?~~')),
  _Inline(MdTokenKind.emphasis, RegExp(r'([*_])(?![\s*_])(?:(?!\1)[\s\S])+?\1')),
];

/// Whether any part of `[start, end)` has already been claimed.
bool _free(List<MdToken> tokens, int start, int end) =>
    !tokens.any((MdToken token) => start < token.end && token.start < end);

/// Reads the inline patterns over [text], which starts at [offset] in the line.
void _scanInline(String text, int offset, List<MdToken> tokens) {
  for (final _Inline rule in _inline) {
    for (final RegExpMatch match in rule.pattern.allMatches(text)) {
      final int start = offset + match.start;
      final int end = offset + match.end;

      if (!_free(tokens, start, end)) {
        continue;
      }

      final String? first = match.groupCount >= 1 ? match.group(1) : null;
      final String? next = match.groupCount >= 2 ? match.group(2) : null;

      if (rule.second != null && first != null && next != null) {
        tokens.add(MdToken(start, start + first.length, rule.kind));
        tokens.add(MdToken(start + first.length, end, rule.second!));
      } else {
        tokens.add(MdToken(start, end, rule.kind));
      }
    }
  }
}

/// Every line of the source, with the syntax in it located.
///
/// The state that survives a line is one thing — whether a fenced block is
/// open — which is what makes this cheap enough to run on every keystroke.
///
/// With a [within], only the lines inside it are read for syntax; the rest come
/// back with their text and no tokens. The one thing a skipped line still has
/// to do is say whether it opened or closed a fence, because the line after it
/// cannot be read without knowing — so a fence is the only thing looked for
/// outside the window, and it is one anchored pattern rather than the dozen a
/// line is otherwise put through.
List<MdHighlightedLine> highlightMarkdown(
  String source, {
  bool gfm = true,
  MdHighlightWindow? within,
}) {
  final List<MdHighlightedLine> out = <MdHighlightedLine>[];
  final List<String> lines = source.split('\n');
  String? fence;

  for (int index = 0; index < lines.length; index += 1) {
    final String text = lines[index];

    if (within != null && (index < within.from || index >= within.to)) {
      final RegExpMatch? edge = _fenceLine.firstMatch(text);

      if (fence != null) {
        final String? closing = edge?.group(1);

        if (closing != null && closing[0] == fence[0] && closing.length >= fence.length) {
          fence = null;
        }
      } else if (edge != null) {
        fence = edge.group(1);
      }

      out.add(MdHighlightedLine(text, _none));
      continue;
    }

    final List<MdToken> tokens = <MdToken>[];
    final RegExpMatch? opening = _fenceLine.firstMatch(text);

    if (fence != null) {
      final String? closing = opening?.group(1);

      if (closing != null && closing[0] == fence[0] && closing.length >= fence.length) {
        tokens.add(MdToken(0, text.length, MdTokenKind.fence));
        fence = null;
      } else {
        tokens.add(MdToken(0, text.length, MdTokenKind.code));
      }

      out.add(MdHighlightedLine(text, tokens));
      continue;
    }

    if (opening != null) {
      fence = opening.group(1);
      tokens.add(MdToken(0, text.length, MdTokenKind.fence));
      out.add(MdHighlightedLine(text, tokens));
      continue;
    }

    if (_rule.hasMatch(text)) {
      out.add(MdHighlightedLine(text, <MdToken>[MdToken(0, text.length, MdTokenKind.rule)]));
      continue;
    }

    final RegExpMatch? heading = _atx.firstMatch(text);

    if (heading != null) {
      final String hashes = heading.group(1)!;

      tokens.add(MdToken(0, hashes.length, MdTokenKind.marker));

      if (heading.group(2) != null) {
        tokens.add(MdToken(hashes.length, text.length, MdTokenKind.heading));
      }

      out.add(MdHighlightedLine(text, tokens));
      continue;
    }

    final RegExpMatch? definition = _definition.firstMatch(text);

    if (definition != null) {
      tokens.add(MdToken(0, definition.group(0)!.length, MdTokenKind.reference));
      _scanInline(text, 0, tokens);
      tokens.sort((MdToken a, MdToken b) => a.start - b.start);
      out.add(MdHighlightedLine(text, tokens));
      continue;
    }

    // Everything below can sit inside a quotation, so the marker comes off
    // first and the rest is read at the offset it really starts at.
    int at = 0;
    final RegExpMatch? quote = _quote.firstMatch(text);

    if (quote != null) {
      tokens.add(MdToken(0, quote.group(0)!.length, MdTokenKind.quote));
      at = quote.group(0)!.length;
    }

    final String rest = text.substring(at);
    final RegExpMatch? bullet = _bullet.firstMatch(rest);

    if (bullet != null) {
      final int markerStart = at + bullet.group(1)!.length;

      tokens.add(MdToken(markerStart, markerStart + bullet.group(2)!.length, MdTokenKind.marker));
      at += bullet.group(0)!.length;

      final RegExpMatch? task = gfm ? _task.firstMatch(text.substring(at)) : null;

      if (task != null) {
        tokens.add(MdToken(at, at + task.group(0)!.length, MdTokenKind.task));
        at += task.group(0)!.length;
      }
    } else if (gfm && _delimiterRow.hasMatch(rest) && rest.contains('-')) {
      tokens.add(MdToken(at, text.length, MdTokenKind.table));
      out.add(MdHighlightedLine(text, tokens));
      continue;
    }

    _scanInline(text.substring(at), at, tokens);

    if (gfm) {
      // The pipes, and only the pipes: the cells are ordinary inline content
      // and have already been read as such.
      for (int index = at; index < text.length; index += 1) {
        if (text[index] == '|' &&
            (index == 0 || text[index - 1] != r'\') &&
            _free(tokens, index, index + 1)) {
          tokens.add(MdToken(index, index + 1, MdTokenKind.table));
        }
      }
    }

    tokens.sort((MdToken a, MdToken b) => a.start - b.start);
    out.add(MdHighlightedLine(text, tokens));
  }

  return out;
}
