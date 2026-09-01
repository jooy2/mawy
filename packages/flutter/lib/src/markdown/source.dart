/// Where the text a node was parsed from sits in the document.
///
/// The parser reads Markdown by taking it apart. A quotation hands its inside
/// to the block scanner with every `>` removed; a list item hands over its
/// content with the marker and the indent gone; a paragraph is a run of lines
/// joined back together before a single character inside it is read. Each of
/// those steps makes a *new* string, and an offset into a new string is no
/// longer an offset into the document.
///
/// Which is a problem the moment anything wants to go the other way — an
/// outline that scrolls to a heading, a tap that lands on a link. So the two
/// shapes below carry the document offset along with the text. [Line] is one
/// line after its container has taken its prefix off. [Sourced] is text
/// assembled out of several pieces, which is what a paragraph, a heading and a
/// table cell all are by the time the inline parser sees them.
library;

import 'package:mawy/src/markdown/ast.dart';

/* -------------------------------------------------------------------------
 * Lines
 * ---------------------------------------------------------------------- */

/// One line of the document, after whatever contains it took its prefix off.
class Line {
  /// Creates a line of [text] whose first character sits at [start].
  const Line(this.text, this.start, {this.lazy = false});

  /// The line, without its newline.
  final String text;

  /// Where `text[0]` sits in the document.
  final int start;

  /// Whether the container this line is inside took it without its prefix.
  ///
  /// The lazy continuation: a line under `> foo` that forgot its own `>` is
  /// still part of the quotation, because the paragraph up there is still open.
  /// It is *only* that, though — a lazily taken line is the paragraph's next
  /// line and cannot be anything else, which is the whole reason this is
  /// written down rather than inferred from the text.
  final bool lazy;
}

/// Where a line's last character ends.
int lineEnd(Line line) => line.start + line.text.length;

/// The same line with [count] characters taken off the front.
Line advance(Line line, int count) => Line(line.text.substring(count), line.start + count);

/* -------------------------------------------------------------------------
 * Assembled text
 * ---------------------------------------------------------------------- */

/// A run of assembled text that came from one unbroken run of the document.
class Span {
  /// Creates a span.
  Span(this.at, this.from, this.length);

  /// Where the run starts in the assembled text.
  final int at;

  /// Where it starts in the document.
  final int from;

  /// How long it is.
  int length;
}

/// Text built out of pieces of a document, which remembers where each came
/// from.
///
/// Every piece is a run the two strings agree on character for character, so a
/// position inside one is a position inside the other. Anything that rewrites
/// what it copies — a table cell turning `\|` into a pipe — ends the run and
/// starts the next one at the character it actually kept.
class Sourced {
  /// Empty text, anchored where it would start.
  ///
  /// The anchor is a span of no length, and it is there so that text which
  /// stays empty — a table cell with nothing in it — still knows where in the
  /// document it was not written.
  Sourced([int from = 0]) : spans = <Span>[Span(0, from, 0)];

  /// The assembled text.
  String text = '';

  /// Where each piece of it came from.
  final List<Span> spans;
}

/// Text known to be one unbroken run of the document, added to the end.
///
/// Runs that turn out to continue each other are joined, so the common case —
/// a paragraph whose lines are simply the document's lines — ends up as one
/// span rather than one per line.
void append(Sourced into, String text, int from) {
  if (text.isEmpty) {
    return;
  }

  final Span last = into.spans.last;

  if (last.from + last.length == from) {
    last.length += text.length;
  } else {
    into.spans.add(Span(into.text.length, from, text.length));
  }

  into.text += text;
}

/// One unbroken run of the document, on its own.
Sourced fromText(String text, int from) {
  final Sourced out = Sourced(from);

  append(out, text, from);

  return out;
}

/// A run of lines, joined back into the one text their newlines separate.
Sourced fromLines(List<Line> lines) {
  final Sourced out = Sourced(lines.isEmpty ? 0 : lines.first.start);

  for (int index = 0; index < lines.length; index += 1) {
    if (index > 0) {
      append(out, '\n', lineEnd(lines[index - 1]));
    }

    append(out, lines[index].text, lines[index].start);
  }

  return out;
}

/// The last span starting at or before [index], or `null` before the first.
Span? _spanAt(Sourced source, int index) {
  final List<Span> spans = source.spans;
  int low = 0;
  int high = spans.length - 1;
  Span? found;

  while (low <= high) {
    final int middle = (low + high) >> 1;

    if (spans[middle].at <= index) {
      found = spans[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/// Where the character at [index] sits in the document.
int startOffset(Sourced source, int index) {
  final Span? span = _spanAt(source, index);

  if (span == null) {
    return source.spans.isEmpty ? 0 : source.spans.first.from;
  }

  final int inside = index - span.at;

  return span.from + (inside < span.length ? inside : span.length);
}

/// Where the character *before* [index] ends.
///
/// The two ends of a range are asked for differently on purpose. A position
/// between two spans belongs to the run that ended there when it closes a node
/// and to the run that starts there when it opens one, and taking the same
/// answer for both would give a node the gap between them.
int endOffset(Sourced source, int index) {
  if (index <= 0) {
    return startOffset(source, 0);
  }

  final Span? span = _spanAt(source, index - 1);

  return span == null ? startOffset(source, index) : span.from + (index - span.at);
}

/// The document a slice of assembled text came from, as a range.
MdRange rangeOf(Sourced source, int start, int end) {
  final int from = startOffset(source, start);

  return end <= start ? MdRange(from, from) : MdRange(from, endOffset(source, end));
}

/// The part between two positions, still knowing where it came from.
Sourced slice(Sourced source, int start, int end) {
  final Sourced out = Sourced()..text = source.text.substring(start, end);

  out.spans.clear();

  for (final Span span in source.spans) {
    final int from = span.at > start ? span.at : start;
    final int to = span.at + span.length < end ? span.at + span.length : end;

    if (to > from) {
      out.spans.add(Span(from - start, span.from + (from - span.at), to - from));
    }
  }

  if (out.spans.isEmpty) {
    out.spans.add(Span(0, startOffset(source, start), 0));
  }

  return out;
}

/// The same text with the whitespace at each end taken off.
Sourced trim(Sourced source) {
  final int start = source.text.length - source.text.trimLeft().length;
  final int end = source.text.trimRight().length;

  if (start == 0 && end == source.text.length) {
    return source;
  }

  return slice(source, start, end > start ? end : start);
}
