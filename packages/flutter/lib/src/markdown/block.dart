/// The block parser: what the document is made of before anything is read.
///
/// Markdown's structure is decided a line at a time and its containers nest, so
/// this is a scanner with recursion rather than a grammar: each pass finds where
/// one block ends, strips whatever prefix its container puts on every line —
/// a `>`, an indent — and parses the inside the same way.
///
/// Which is why a line here is a [Line] rather than a [String]. Stripping a
/// prefix makes a shorter line, and a shorter line has different offsets;
/// carrying the offset along means a block nested four containers deep still
/// knows which characters of the document it was read out of.
///
/// Inline content is *not* parsed here. A link may be written as `[a][ref]` and
/// resolved by a definition that appears at the bottom of the file, so nothing
/// inside a paragraph can be read until every line of the document has been
/// seen. Blocks come out with their text held aside in [BlockContext.pending],
/// and `parse.dart` reads it once the definitions are all in.
///
/// This is the React package's `internal/markdown/block.ts`, line for line
/// wherever Dart lets it be. The two are one parser shipped twice.
library;

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/inline.dart' show normalizeLabel;
import 'package:mawy/src/markdown/source.dart';

/// Somewhere a run of inline nodes has to go once there is one.
class PendingInline {
  /// Creates a pending run of inline content.
  PendingInline(this.raw, this.target);

  /// The text, still knowing where each piece of it came from.
  final Sourced raw;

  /// Where the parsed nodes are put.
  final List<MdInline> target;
}

/// What the block scanner is told about the document it is reading.
class BlockContext {
  /// Creates a context for one parse.
  BlockContext({
    required this.gfm,
    required this.definitionLists,
    required this.definitions,
    required this.footnotes,
    required this.pending,
  });

  /// GitHub's additions: tables, task lists, alerts.
  final bool gfm;

  /// Whether `Term` over `: what it means` is a definition list.
  final bool definitionLists;

  /// The link reference definitions collected so far.
  final Map<String, MdDefinition> definitions;

  /// Footnotes, lifted out of the flow wherever they were written.
  final Map<String, MdFootnoteDefinition> footnotes;

  /// Runs of text still to be read as inline content.
  final List<PendingInline> pending;
}

/* -------------------------------------------------------------------------
 * Line shapes
 * ---------------------------------------------------------------------- */

final RegExp _blank = RegExp(r'^[ \t]*$');
final RegExp _atx = RegExp(r'^ {0,3}(#{1,6})(?:[ \t]+(.*))?$');
final RegExp _fence = RegExp(r'^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$');
final RegExp _thematic = RegExp(r'^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$');
final RegExp _quote = RegExp(r'^ {0,3}>');
final RegExp _quotePrefix = RegExp(r'^ {0,3}> ?');
final RegExp _setext = RegExp(r'^ {0,3}(=+|-+)[ \t]*$');
final RegExp _bullet = RegExp(r'^( {0,3})([-+*])([ \t]+|$)');
final RegExp _ordered = RegExp(r'^( {0,3})(\d{1,9})([.)])([ \t]+|$)');
final RegExp _alert = RegExp(
  r'^\[!(note|tip|important|warning|caution)\][ \t]*$',
  caseSensitive: false,
);
final RegExp _footnote = RegExp(r'^ {0,3}\[\^([^\]\n]+)\]:[ \t]*');
final RegExp _closingHashes = RegExp(r'(?:^|[ \t])#+[ \t]*$');
final RegExp _task = RegExp(r'^\[([ xX])\](?=[ \t]|$)[ \t]*');
final RegExp _whitespace = RegExp(r'\s+');

/// What opens a definition's meaning.
///
/// The space after the colon is not decoration. `:warning:` at the start of a
/// line under a sentence is an emoji shortcode in half the documents on the
/// internet, and without the space every one of them would become a definition
/// list with the sentence above as its term.
final RegExp _describes = RegExp(r'^ {0,3}:[ \t]+');

/// How far a block that opened on one line has to be indented to carry on.
const int _continuation = 4;

/// How far in a line's first non-space character sits, counting a tab as four.
int indentOf(String line) {
  int width = 0;

  for (int at = 0; at < line.length; at += 1) {
    final String character = line[at];

    if (character == ' ') {
      width += 1;
    } else if (character == '\t') {
      width += 4 - (width % 4);
    } else {
      break;
    }
  }

  return width;
}

/// How many characters it takes to walk [width] columns of indentation.
int _indentTaken(String line, int width) {
  int taken = 0;
  int at = 0;

  while (at < line.length && taken < width) {
    if (line[at] == ' ') {
      taken += 1;
    } else if (line[at] == '\t') {
      taken += 4 - (taken % 4);
    } else {
      break;
    }

    at += 1;
  }

  return at;
}

/// Leading indentation removed, up to [width] columns of it.
Line _unindent(Line line, int width) => advance(line, _indentTaken(line.text, width));

/// How much whitespace a line opens with, in characters.
int _leading(String text) => text.length - text.trimLeft().length;

class _Marker {
  _Marker({
    required this.ordered,
    required this.delimiter,
    required this.number,
    required this.indent,
    required this.contentIndent,
    required this.empty,
  });

  final bool ordered;

  /// `-`, `+`, `*` for a bullet; `.` or `)` for a number.
  final String delimiter;
  final int number;
  final int indent;

  /// Where the item's content starts, in columns from the left of the line.
  final int contentIndent;

  /// The line was the marker and nothing else.
  final bool empty;
}

_Marker? _markerAt(String line) {
  final RegExpMatch? bullet = _bullet.firstMatch(line);
  final RegExpMatch? ordered = bullet == null ? _ordered.firstMatch(line) : null;

  if (bullet == null && ordered == null) {
    return null;
  }

  final int indent = (bullet ?? ordered)!.group(1)!.length;
  final String token = bullet != null ? bullet.group(2)! : ordered!.group(2)!;
  final String delimiter = bullet != null ? bullet.group(2)! : ordered!.group(3)!;
  final int width = indent + token.length + (bullet != null ? 0 : 1);
  final String rest = line.substring(width < line.length ? width : line.length);
  final bool empty = _blank.hasMatch(rest);
  final int padding = indentOf(rest);
  // One space is the marker's own separator. Two to four are the author lining
  // the content up. Five or more is an indented code block inside the item, and
  // only the first of them belongs to the marker.
  final int spaces = empty || padding == 0 || padding > 4 ? 1 : padding;

  return _Marker(
    ordered: ordered != null,
    delimiter: delimiter,
    number: ordered != null ? int.parse(ordered.group(2)!) : 1,
    indent: indent,
    contentIndent: width + spaces,
    empty: empty,
  );
}

class _Atx {
  const _Atx(this.depth, this.text, this.at);

  final int depth;
  final String text;
  final int at;
}

/// `# Heading ###` — the depth, what is left once the hashes come off, and how
/// far into the line that text begins.
_Atx? _atxAt(String line) {
  final RegExpMatch? match = _atx.firstMatch(line);

  if (match == null) {
    return null;
  }

  final String body = match.group(2) ?? '';
  final String closed = body.replaceAll(_closingHashes, '');

  return _Atx(match.group(1)!.length, closed.trim(), line.length - body.length + _leading(closed));
}

/* -------------------------------------------------------------------------
 * HTML blocks
 * ---------------------------------------------------------------------- */

final RegExp _rawText = RegExp(
  r'^ {0,3}<(script|pre|style|textarea)(?:[\s>]|$)',
  caseSensitive: false,
);
final Set<String> _blockTags = <String>{
  ...('address article aside base basefont blockquote body caption center col colgroup dd details '
          'dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 '
          'h6 head header hr html iframe legend li link main menu menuitem nav noframes ol optgroup '
          'option p param search section summary table tbody td tfoot th thead title tr track ul')
      .split(' '),
};
final RegExp _anyTag = RegExp(
  r'''^ {0,3}(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*/?>|</[A-Za-z][A-Za-z\d-]*\s*>)[ \t]*$''',
);
final RegExp _htmlComment = RegExp(r'^ {0,3}<!--');
final RegExp _htmlInstruction = RegExp(r'^ {0,3}<\?');
final RegExp _htmlCdata = RegExp(r'^ {0,3}<!\[CDATA\[');
final RegExp _htmlDeclaration = RegExp(r'^ {0,3}<![A-Za-z]');
final RegExp _htmlTagName = RegExp(r'^ {0,3}</?([A-Za-z][A-Za-z\d-]*)');

class _HtmlStart {
  const _HtmlStart(this.closer);

  /// What ends the block, or `null` for "the next blank line".
  final RegExp? closer;
}

/// Whether a line opens an HTML block, and what would close it.
///
/// [interrupting] is the one bit of nuance: a lone `<span>` on a line after a
/// paragraph is part of that paragraph, not the start of an HTML block. Only
/// the six named shapes may cut a paragraph in half.
_HtmlStart? _htmlStartAt(String line, bool interrupting) {
  if (_rawText.hasMatch(line)) {
    return _HtmlStart(RegExp(r'</(?:script|pre|style|textarea)>', caseSensitive: false));
  }

  if (_htmlComment.hasMatch(line)) {
    return _HtmlStart(RegExp('-->'));
  }

  if (_htmlInstruction.hasMatch(line)) {
    return _HtmlStart(RegExp(r'\?>'));
  }

  if (_htmlCdata.hasMatch(line)) {
    return _HtmlStart(RegExp(r']]>'));
  }

  if (_htmlDeclaration.hasMatch(line)) {
    return _HtmlStart(RegExp('>'));
  }

  final RegExpMatch? tag = _htmlTagName.firstMatch(line);

  if (tag != null && _blockTags.contains(tag.group(1)!.toLowerCase())) {
    return const _HtmlStart(null);
  }

  if (!interrupting && _anyTag.hasMatch(line)) {
    return const _HtmlStart(null);
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

final RegExp _delimiterRow = RegExp(
  r'^ {0,3}\|?(?:[ \t]*:?-+:?[ \t]*\|)*[ \t]*:?-+:?[ \t]*\|?[ \t]*$',
);
final RegExp _trailingPipe = RegExp(r'(?:^|[^\\])\|$');

/// A row split on its unescaped pipes, with the outer pair dropped.
///
/// Each cell comes back knowing where it was written, and an escaped pipe is
/// the only thing that complicates it: `\|` is one character in the cell and
/// two in the document, so the run of text ends there and the next one starts
/// at the pipe the cell actually kept.
List<Sourced> _splitRow(Line line) {
  final int leading = _leading(line.text);
  final List<Sourced> cells = <Sourced>[];
  String text = line.text.trim();
  int base = line.start + leading;
  int at = 0;

  if (text.startsWith('|')) {
    text = text.substring(1);
    base += 1;
  }

  if (_trailingPipe.hasMatch(text)) {
    text = text.substring(0, text.length - 1);
  }

  Sourced cell = Sourced(base);

  while (at < text.length) {
    final String character = text[at];

    if (character == r'\' && at + 1 < text.length && text[at + 1] == '|') {
      append(cell, '|', base + at + 1);
      at += 2;
      continue;
    }

    if (character == '|') {
      cells.add(trim(cell));
      at += 1;
      cell = Sourced(base + at);
      continue;
    }

    append(cell, character, base + at);
    at += 1;
  }

  cells.add(trim(cell));

  return cells;
}

List<MdAlign?> _alignmentsOf(Line line) {
  return _splitRow(line).map((Sourced cell) {
    final bool left = cell.text.startsWith(':');
    final bool right = cell.text.endsWith(':');

    if (left && right) {
      return MdAlign.center;
    }

    return left ? MdAlign.left : (right ? MdAlign.right : null);
  }).toList();
}

/* -------------------------------------------------------------------------
 * Link reference definitions
 * ---------------------------------------------------------------------- */

final RegExp _definition = RegExp(
  r'''^ {0,3}\[((?:[^\]\\\n]|\\.)+)\]:[ \t]*\n?[ \t]*(<[^<>\n]*>|[^\s<][^\s]*)(?:[ \t\n]+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^)\\]|\\.)*\)))?[ \t]*(?:\n|$)''',
);

/// Definitions taken off the front of a paragraph, and whatever is left of it.
///
/// They are only definitions at the *start* of a paragraph — `[a]: /b` on the
/// third line of a sentence is that sentence's third line — which is why this
/// runs against the paragraph rather than against the document.
Sourced _takeDefinitions(Sourced paragraph, Map<String, MdDefinition> into) {
  int taken = 0;

  for (
    RegExpMatch? match = _definition.firstMatch(paragraph.text.substring(taken));
    match != null;
    match = _definition.firstMatch(paragraph.text.substring(taken))
  ) {
    final String label = normalizeLabel(match.group(1)!);
    final String raw = match.group(2)!;
    final String url = raw.startsWith('<') ? raw.substring(1, raw.length - 1) : raw;
    final String? quoted = match.group(3);
    final String? title = quoted?.substring(1, quoted.length - 1);

    // First definition wins, which is what every other implementation does.
    if (label.isNotEmpty && !into.containsKey(label)) {
      into[label] = MdDefinition(url, title);
    }

    taken += match.group(0)!.length;
  }

  return taken == 0 ? paragraph : slice(paragraph, taken, paragraph.text.length);
}

/* -------------------------------------------------------------------------
 * Blocks that open on one line and carry on indented
 * ---------------------------------------------------------------------- */

class _Indented {
  const _Indented(this.body, this.at);

  final List<Line> body;
  final int at;
}

/// The lines belonging to something that opened on this one.
///
/// A footnote's second paragraph and a definition's second block are both this
/// shape: indented far enough to be inside, blank lines kept because they
/// separate the blocks in there, and a line that is neither taken anyway if the
/// paragraph above it is still open — which is the lazy continuation every
/// container in Markdown allows and every reader relies on without knowing.
_Indented _takeIndented(List<Line> lines, int from, int width, bool opened) {
  final List<Line> body = <Line>[];
  int at = from;
  bool blankInside = false;
  bool running = opened;

  while (at < lines.length) {
    final Line next = lines[at];

    if (_blank.hasMatch(next.text)) {
      body.add(Line('', next.start));
      blankInside = true;
      running = false;
      at += 1;
      continue;
    }

    if (indentOf(next.text) >= width) {
      body.add(_unindent(next, width));
      blankInside = false;
      running = true;
      at += 1;
      continue;
    }

    if (!running || blankInside || _interrupts(next.text) || _describes.hasMatch(next.text)) {
      break;
    }

    body.add(advance(next, _leading(next.text)));
    at += 1;
  }

  while (body.isNotEmpty && _blank.hasMatch(body.last.text)) {
    body.removeLast();
    at -= 1;
  }

  return _Indented(body, at);
}

/// Whether a definition list starts here.
///
/// A term looks exactly like a paragraph until the line under it opens with a
/// colon, so the only way to know is to read ahead — over as many terms as were
/// written, and over the one blank line that is allowed between the last of
/// them and the first meaning.
bool _describesAhead(List<Line> lines, int from) {
  int at = from;
  int terms = 0;

  while (at < lines.length && terms < 8) {
    final String text = lines[at].text;

    if (_describes.hasMatch(text)) {
      return terms > 0;
    }

    if (_blank.hasMatch(text)) {
      // One blank line, and only after a term: two is the end of the paragraph.
      return terms > 0 && at + 1 < lines.length && _describes.hasMatch(lines[at + 1].text);
    }

    if (terms > 0 && _interrupts(text)) {
      return false;
    }

    terms += 1;
    at += 1;
  }

  return false;
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

/// Whether a line may cut a paragraph short.
bool _interrupts(String line) {
  if (_thematic.hasMatch(line) ||
      _atxAt(line) != null ||
      _fence.hasMatch(line) ||
      _quote.hasMatch(line)) {
    return true;
  }

  if (_htmlStartAt(line, true) != null) {
    return true;
  }

  final _Marker? marker = _markerAt(line);

  // A list may cut a paragraph short, but only one that starts something: an
  // empty bullet, or an ordered list starting anywhere but 1, is far more often
  // a line of prose than a list the author meant to begin here.
  return marker != null && !marker.empty && (!marker.ordered || marker.number == 1);
}

/// Reads [lines] into blocks, recursing into whatever contains what.
List<MdBlock> parseBlocks(List<Line> lines, BlockContext context) {
  final List<MdBlock> blocks = <MdBlock>[];
  int at = 0;

  /// From the start of one line to the end of another.
  MdRange across(int first, int last) => MdRange(lines[first].start, lineEnd(lines[last]));

  /// A run of text read later, once the definitions are all known.
  List<MdInline> later(Sourced raw) {
    final List<MdInline> children = <MdInline>[];

    context.pending.add(PendingInline(raw, children));

    return children;
  }

  while (at < lines.length) {
    final Line line = lines[at];

    if (_blank.hasMatch(line.text)) {
      at += 1;
      continue;
    }

    /* Thematic break — before lists, because `- - -` is a rule and not three
     * empty bullets. */
    if (_thematic.hasMatch(line.text)) {
      blocks.add(MdThematicBreak(across(at, at)));
      at += 1;
      continue;
    }

    final _Atx? atx = _atxAt(line.text);

    if (atx != null) {
      blocks.add(
        MdHeading(
          across(at, at),
          depth: atx.depth,
          children: later(fromText(atx.text, line.start + atx.at)),
        ),
      );
      at += 1;
      continue;
    }

    final RegExpMatch? fence = _fence.firstMatch(line.text);

    if (fence != null) {
      final String indent = fence.group(1)!;
      final String marker = fence.group(2)!;
      final String info = fence.group(3)!;
      final List<Line> body = <Line>[];
      final RegExp closing = RegExp(
        '^ {0,3}${RegExp.escape(marker[0])}{${marker.length},}[ \\t]*\$',
      );
      final int opened = at;
      int last = at;

      at += 1;

      while (at < lines.length) {
        last = at;

        if (closing.hasMatch(lines[at].text)) {
          at += 1;
          break;
        }

        body.add(_unindent(lines[at], indent.length));
        at += 1;
      }

      final List<String> words = info.trim().isEmpty
          ? const <String>[]
          : info.trim().split(_whitespace);
      final MdRange range = across(opened, last);
      // With nothing between the fences there is no line to point at, so the
      // content is the empty place just past the opening one.
      final int openedEnd = lineEnd(lines[opened]) + 1;
      final int from = body.isNotEmpty
          ? body.first.start
          : (openedEnd < range.end ? openedEnd : range.end);

      blocks.add(
        MdCode(
          range,
          content: MdRange(from, body.isNotEmpty ? lineEnd(body.last) : from),
          lines: body.map((Line each) => each.start).toList(),
          // A backtick in an info string is not a language, it is an unclosed
          // span that happens to sit on the fence line.
          lang: words.isNotEmpty && !words.first.contains('`') ? words.first : null,
          meta: words.length > 1 ? words.skip(1).join(' ') : null,
          value: body.map((Line each) => each.text).join('\n'),
        ),
      );
      continue;
    }

    if (_quote.hasMatch(line.text)) {
      final List<Line> inner = <Line>[];
      final int opened = at;

      while (at < lines.length) {
        final Line current = lines[at];

        if (_quote.hasMatch(current.text)) {
          final RegExpMatch? prefix = _quotePrefix.firstMatch(current.text);

          inner.add(advance(current, prefix == null ? 0 : prefix.group(0)!.length));
          at += 1;
          continue;
        }

        // A quotation runs on across a line that forgot its `>`, but only while
        // the paragraph inside it is still open.
        if (_blank.hasMatch(current.text) ||
            inner.isEmpty ||
            _blank.hasMatch(inner.last.text) ||
            _interrupts(current.text)) {
          break;
        }

        inner.add(current);
        at += 1;
      }

      MdAlertKind? alert;
      final RegExpMatch? first = inner.isEmpty ? null : _alert.firstMatch(inner.first.text);

      if (first != null) {
        alert = MdAlertKind.values.byName(first.group(1)!.toLowerCase());
        inner.removeAt(0);
      }

      blocks.add(
        MdBlockquote(across(opened, at - 1), alert: alert, children: parseBlocks(inner, context)),
      );
      continue;
    }

    final _Marker? marker = _markerAt(line.text);

    if (marker != null) {
      final List<MdListItem> items = <MdListItem>[];
      bool loose = false;
      bool separated = false;

      while (at < lines.length) {
        final _Marker? current = _markerAt(lines[at].text);

        if (current == null ||
            current.ordered != marker.ordered ||
            current.delimiter != marker.delimiter) {
          break;
        }

        if (separated) {
          loose = true;
        }

        final int opened = at;
        final int width = current.contentIndent < lines[at].text.length
            ? current.contentIndent
            : lines[at].text.length;
        final List<Line> body = <Line>[advance(lines[at], width)];

        at += 1;

        bool blankInside = false;

        while (at < lines.length) {
          final Line next = lines[at];

          if (_blank.hasMatch(next.text)) {
            body.add(Line('', next.start));
            blankInside = true;
            at += 1;
            continue;
          }

          if (indentOf(next.text) >= current.contentIndent) {
            body.add(_unindent(next, current.contentIndent));
            at += 1;
            continue;
          }

          // Anything less indented either starts the next item, starts a new
          // block, or is a lazy continuation of a paragraph still open here.
          if (_markerAt(next.text) != null || blankInside || _interrupts(next.text)) {
            break;
          }

          body.add(advance(next, _leading(next.text)));
          at += 1;
        }

        bool trailing = false;

        while (body.isNotEmpty && _blank.hasMatch(body.last.text)) {
          body.removeLast();
          trailing = true;
        }

        separated = trailing;

        bool? checked;
        final RegExpMatch? task = body.isEmpty ? null : _task.firstMatch(body.first.text);

        if (task != null && context.gfm) {
          checked = task.group(1) != ' ';
          body[0] = advance(body.first, task.group(0)!.length);
        }

        final List<MdBlock> children = parseBlocks(body, context);

        if (children.length > 1 && body.any((Line each) => _blank.hasMatch(each.text))) {
          loose = true;
        }

        items.add(
          MdListItem(
            MdRange(lines[opened].start, lineEnd(body.isNotEmpty ? body.last : lines[opened])),
            checked: checked,
            children: children,
          ),
        );
      }

      blocks.add(
        MdList(
          MdRange(items.first.range.start, items.last.range.end),
          ordered: marker.ordered,
          start: marker.ordered ? marker.number : 1,
          loose: loose,
          children: items,
        ),
      );
      continue;
    }

    final _HtmlStart? html = _htmlStartAt(line.text, false);

    if (html != null) {
      final List<String> body = <String>[];
      final int opened = at;
      int last = at;

      while (at < lines.length) {
        if (html.closer == null && _blank.hasMatch(lines[at].text)) {
          break;
        }

        body.add(lines[at].text);
        last = at;
        at += 1;

        if (html.closer != null && html.closer!.hasMatch(body.last)) {
          break;
        }
      }

      blocks.add(MdHtmlBlock(across(opened, last), body.join('\n')));
      continue;
    }

    if (indentOf(line.text) >= 4) {
      final List<Line> body = <Line>[];
      final int opened = at;

      while (at < lines.length &&
          (_blank.hasMatch(lines[at].text) || indentOf(lines[at].text) >= 4)) {
        body.add(_unindent(lines[at], 4));
        at += 1;
      }

      while (body.isNotEmpty && _blank.hasMatch(body.last.text)) {
        body.removeLast();
      }

      final int end = lineEnd(body.isNotEmpty ? body.last : lines[opened]);

      blocks.add(
        MdCode(
          MdRange(lines[opened].start, end),
          // An indented block is its own content, four spaces in.
          content: MdRange(body.isNotEmpty ? body.first.start : lines[opened].start, end),
          lines: body.map((Line each) => each.start).toList(),
          lang: null,
          meta: null,
          value: body.map((Line each) => each.text).join('\n'),
        ),
      );
      continue;
    }

    if (context.gfm &&
        line.text.contains('|') &&
        at + 1 < lines.length &&
        _delimiterRow.hasMatch(lines[at + 1].text) &&
        _splitRow(lines[at + 1]).length == _splitRow(line).length) {
      final List<MdAlign?> align = _alignmentsOf(lines[at + 1]);
      final List<MdTableRow> rows = <MdTableRow>[];
      final int opened = at;

      MdTableRow rowOf(Line source, bool header) {
        final List<Sourced> cells = _splitRow(source);
        final List<MdTableCell> children = <MdTableCell>[];

        for (int column = 0; column < align.length; column += 1) {
          final Sourced cell = column < cells.length ? cells[column] : Sourced(lineEnd(source));

          children.add(MdTableCell(rangeOf(cell, 0, cell.text.length), later(cell)));
        }

        return MdTableRow(
          MdRange(source.start, lineEnd(source)),
          header: header,
          children: children,
        );
      }

      rows.add(rowOf(line, true));
      at += 2;

      while (at < lines.length &&
          !_blank.hasMatch(lines[at].text) &&
          !_interrupts(lines[at].text)) {
        rows.add(rowOf(lines[at], false));
        at += 1;
      }

      blocks.add(MdTable(across(opened, at - 1), align: align, children: rows));
      continue;
    }

    /* A footnote, which is written here and read at the bottom. */
    final RegExpMatch? footnote = _footnote.firstMatch(line.text);

    if (footnote != null) {
      final int opened = at;
      final Line first = advance(line, footnote.group(0)!.length);
      final List<Line> body = first.text.trim().isNotEmpty ? <Line>[first] : <Line>[];

      at += 1;

      final _Indented rest = _takeIndented(lines, at, _continuation, body.isNotEmpty);

      body.addAll(rest.body);
      at = rest.at;

      final String label = normalizeLabel(footnote.group(1)!);

      // First definition wins, as it does for a link reference: two footnotes
      // with the same name are one footnote and a mistake.
      if (label.isNotEmpty && !context.footnotes.containsKey(label)) {
        context.footnotes[label] = MdFootnoteDefinition(
          MdRange(line.start, lineEnd(body.isNotEmpty ? body.last : line)),
          label: label,
          children: parseBlocks(body, context),
        );
      }

      // Nothing is pushed: a footnote is not where it was written.
      if (at == opened) {
        at += 1;
      }

      continue;
    }

    /* A term and what it means, if the line under this one opens with a colon. */
    if (context.definitionLists && !_describes.hasMatch(line.text) && _describesAhead(lines, at)) {
      final int opened = at;
      final List<MdNode> children = <MdNode>[];
      bool loose = false;
      Line last = line;

      while (at < lines.length) {
        final int round = at;
        final List<Line> terms = <Line>[];

        while (at < lines.length &&
            !_blank.hasMatch(lines[at].text) &&
            !_describes.hasMatch(lines[at].text)) {
          if (terms.isNotEmpty && _interrupts(lines[at].text)) {
            break;
          }

          terms.add(lines[at]);
          at += 1;
        }

        // A blank line between a term and its meaning is what makes the whole
        // list loose, exactly as it is in a bullet list.
        if (at < lines.length &&
            _blank.hasMatch(lines[at].text) &&
            at + 1 < lines.length &&
            _describes.hasMatch(lines[at + 1].text)) {
          loose = true;
          at += 1;
        }

        if (at >= lines.length || !_describes.hasMatch(lines[at].text)) {
          at = round;
          break;
        }

        for (final Line term in terms) {
          children.add(
            MdDefinitionTerm(
              MdRange(term.start, lineEnd(term)),
              later(fromText(term.text.trim(), term.start + _leading(term.text))),
            ),
          );
          last = term;
        }

        while (at < lines.length) {
          final RegExpMatch? describes = _describes.firstMatch(lines[at].text);

          if (describes == null) {
            break;
          }

          final Line from = lines[at];
          final Line head = advance(from, describes.group(0)!.length);
          final List<Line> body = head.text.trim().isNotEmpty ? <Line>[head] : <Line>[];

          at += 1;

          final _Indented rest = _takeIndented(lines, at, _continuation, body.isNotEmpty);

          body.addAll(rest.body);
          at = rest.at;
          last = body.isNotEmpty ? body.last : from;

          children.add(
            MdDefinitionDescription(MdRange(from.start, lineEnd(last)), parseBlocks(body, context)),
          );

          if (at < lines.length && _blank.hasMatch(lines[at].text)) {
            if (at + 1 < lines.length && _describes.hasMatch(lines[at + 1].text)) {
              loose = true;
              at += 1;
            } else {
              break;
            }
          }
        }

        // A blank line and then another term is the same list, spaced out —
        // and spaced out is what a loose list is, exactly as it is for bullets.
        if (at < lines.length &&
            _blank.hasMatch(lines[at].text) &&
            _describesAhead(lines, at + 1)) {
          loose = true;
          at += 1;
          continue;
        }

        if (!(at < lines.length &&
            !_blank.hasMatch(lines[at].text) &&
            _describesAhead(lines, at))) {
          break;
        }
      }

      if (children.isNotEmpty) {
        blocks.add(
          MdDefinitionList(
            MdRange(lines[opened].start, lineEnd(last)),
            loose: loose,
            children: children,
          ),
        );

        continue;
      }

      at = opened;
    }

    /* Everything else is a paragraph, up to the first line that is not. */
    final List<Line> paragraph = <Line>[line];

    at += 1;

    while (at < lines.length) {
      final Line next = lines[at];

      if (_blank.hasMatch(next.text)) {
        break;
      }

      final RegExpMatch? setext = _setext.firstMatch(next.text);

      if (setext != null) {
        final Line underline = lines[at];

        at += 1;

        final Sourced text = trim(_takeDefinitions(fromLines(paragraph), context.definitions));

        if (text.text.isNotEmpty) {
          blocks.add(
            MdHeading(
              // Both lines: the underline is as much the heading as the words
              // above it, and a range that stopped short would leave it out of
              // whatever the heading is replaced by.
              MdRange(rangeOf(text, 0, 0).start, lineEnd(underline)),
              depth: setext.group(1)![0] == '=' ? 1 : 2,
              children: later(text),
            ),
          );
        }

        paragraph.clear();
        break;
      }

      if (_interrupts(next.text)) {
        break;
      }

      paragraph.add(next);
      at += 1;
    }

    if (paragraph.isNotEmpty) {
      final Sourced text = trim(_takeDefinitions(fromLines(paragraph), context.definitions));

      if (text.text.isNotEmpty) {
        blocks.add(MdParagraph(rangeOf(text, 0, text.text.length), later(text)));
      }
    }
  }

  return blocks;
}
