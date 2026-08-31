/// The inline parser: everything inside a paragraph, a heading or a table cell.
///
/// Emphasis is the reason this file is not a handful of regular expressions.
/// `*foo**bar**baz*` and `**foo*bar*baz**` are different documents made of the
/// same characters, and which asterisk pairs with which is decided by what is
/// on either side of every run in the line — so a run cannot be resolved when
/// it is read. The delimiter stack below is CommonMark's own answer to that:
/// read the line once into a list of chunks, remembering which runs *could*
/// open and which *could* close, and only then walk the list pairing them off.
///
/// Links are on the same list for the same reason: `[a [b](c)](d)` needs the
/// inner `]` to consume the inner `[`, which is a fact about the whole line.
///
/// This is the React package's `internal/markdown/inline.ts`, in Dart.
library;

import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/markdown/directive.dart';
import 'package:mawy/src/markdown/entities.dart';
import 'package:mawy/src/markdown/source.dart';
import 'package:mawy/src/markdown/url.dart';

/// What the inline scanner is told about the document it is reading.
class InlineOptions {
  /// Creates the options for one run of inline parsing.
  const InlineOptions({
    required this.gfm,
    required this.breaks,
    required this.definitions,
    required this.footnotes,
  });

  /// GitHub's additions: `~~strikethrough~~` and bare URLs becoming links.
  final bool gfm;

  /// Whether a single newline inside a paragraph is a line break.
  final bool breaks;

  /// The document's link reference definitions, already collected.
  final Map<String, MdDefinition> definitions;

  /// The labels of the footnotes the document actually defines.
  ///
  /// A `[^a]` with nothing to point at is the four characters it was written
  /// with — the same answer an unresolved `[a][b]` gets.
  final Set<String> footnotes;
}

/* -------------------------------------------------------------------------
 * The chunk list
 * ---------------------------------------------------------------------- */

class _Delimiter {
  _Delimiter({
    required this.char,
    required this.length,
    required this.original,
    required this.canOpen,
    required this.canClose,
  });

  final String char;

  /// How many of the run are still unused. Reaches zero and the chunk goes.
  int length;

  /// How long the run was when it was read — the "rule of three" needs this.
  final int original;
  final bool canOpen;
  final bool canClose;
}

class _Opener {
  _Opener({required this.image, required this.active, required this.textStart});

  final bool image;

  /// A link may not contain another link. Closing one deactivates every opener
  /// to its left, so `[a [b](c)](d)` gives the inner link and leaves the outer
  /// brackets as text.
  bool active;

  /// Where the label's text starts in the source, for a reference lookup.
  final int textStart;
}

class _Chunk {
  _Chunk(this.node);

  MdInline node;
  _Delimiter? delimiter;
  _Opener? opener;
}

class _State {
  final List<_Chunk> chunks = <_Chunk>[];

  /// The chunks that are delimiter runs, in source order.
  final List<_Chunk> delimiters = <_Chunk>[];

  /// The `[` and `![` chunks that have not been closed, innermost last.
  final List<_Chunk> openers = <_Chunk>[];
}

_Chunk _textChunk(String value, MdRange range) => _Chunk(MdText(range, value));

void _drop(List<_Chunk> list, _Chunk item) {
  final int at = list.indexOf(item);

  if (at != -1) {
    list.removeAt(at);
  }
}

/* -------------------------------------------------------------------------
 * Character classes
 * ---------------------------------------------------------------------- */

final RegExp _punctuation = RegExp(r'[\p{P}\p{S}]', unicode: true);
final RegExp _whitespace = RegExp(r'\s');
final RegExp _escapable = RegExp(r'''[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]''');

/// Whether a delimiter run has content on its left, on its right, or both.
///
/// This is the whole of CommonMark's emphasis rule and it is easy to get subtly
/// wrong: a run is *left-flanking* when it is not followed by whitespace and
/// either is not followed by punctuation or is itself preceded by whitespace or
/// punctuation. Which is a long way of saying: the run is up against a word on
/// its right.
List<bool> _flanking(String source, int start, int end) {
  final String before = start > 0 ? source[start - 1] : ' ';
  final String after = end < source.length ? source[end] : ' ';

  final bool whitespaceBefore = _whitespace.hasMatch(before);
  final bool whitespaceAfter = _whitespace.hasMatch(after);
  final bool punctuationBefore = _punctuation.hasMatch(before);
  final bool punctuationAfter = _punctuation.hasMatch(after);

  final bool left =
      !whitespaceAfter && (!punctuationAfter || whitespaceBefore || punctuationBefore);
  final bool right =
      !whitespaceBefore && (!punctuationBefore || whitespaceAfter || punctuationAfter);

  return <bool>[left, right];
}

/* -------------------------------------------------------------------------
 * Emphasis
 * ---------------------------------------------------------------------- */

/// The "rule of three".
///
/// Without it, `*foo**bar**baz*` pairs the wrong asterisks and the sentence
/// comes out as two nested emphases instead of one containing a strong. The
/// rule is stated in the specification exactly as it is written here, and the
/// reason it looks arbitrary is that it is: it is the smallest patch that makes
/// the common intraword cases come out the way an author expects.
bool _blockedByRuleOfThree(_Delimiter opener, _Delimiter closer) {
  if (!closer.canOpen && !opener.canClose) {
    return false;
  }

  if ((opener.original + closer.original) % 3 != 0) {
    return false;
  }

  return opener.original % 3 != 0 || closer.original % 3 != 0;
}

/// Pair off every delimiter above [bottom] and fold what is between each pair
/// into an emphasis, a strong or a strikethrough.
///
/// Runs that never find a partner stay exactly as they were typed, which is why
/// the delimiter's characters live in a real text node the whole time rather
/// than being held to one side and put back on failure.
void _processEmphasis(_State state, int bottom) {
  final List<_Chunk> chunks = state.chunks;
  final List<_Chunk> delimiters = state.delimiters;
  final Map<String, int> openersBottom = <String, int>{};
  int closerIndex = bottom;

  while (closerIndex < delimiters.length) {
    final _Chunk closerChunk = delimiters[closerIndex];
    final _Delimiter closer = closerChunk.delimiter!;

    if (!closer.canClose) {
      closerIndex += 1;
      continue;
    }

    final String key = '${closer.char}:${closer.original % 3}:${closer.canOpen}';
    final int stored = openersBottom[key] ?? bottom;
    final int floor = stored > bottom ? stored : bottom;
    int found = -1;

    for (int at = closerIndex - 1; at >= floor; at -= 1) {
      final _Delimiter candidate = delimiters[at].delimiter!;

      if (candidate.canOpen &&
          candidate.char == closer.char &&
          !_blockedByRuleOfThree(candidate, closer)) {
        found = at;
        break;
      }
    }

    if (found == -1) {
      openersBottom[key] = closerIndex;

      // A run that can only close and matched nothing is finished with: it
      // stays on the page as text, but nothing later can pair with it.
      if (!closer.canOpen) {
        delimiters.removeAt(closerIndex);
      } else {
        closerIndex += 1;
      }

      continue;
    }

    final _Chunk openerChunk = delimiters[found];
    final _Delimiter opener = openerChunk.delimiter!;
    final int use = closer.char == '~' || (opener.length >= 2 && closer.length >= 2) ? 2 : 1;

    final int openerAt = chunks.indexOf(openerChunk);
    final int closerAt = chunks.indexOf(closerChunk);
    final List<MdInline> children = chunks
        .sublist(openerAt + 1, closerAt)
        .map((_Chunk chunk) => chunk.node)
        .toList();

    // The characters that pair off are the *last* of the opening run and the
    // first of the closing one, so the node starts where what is left of the
    // opener ends.
    final MdText openerNode = openerChunk.node as MdText;
    final MdText closerNode = closerChunk.node as MdText;
    final MdRange range = MdRange(openerNode.range.end - use, closerNode.range.start + use);

    final MdInline node = closer.char == '~'
        ? MdDelete(range, children)
        : (use == 2 ? MdStrong(range, children) : MdEmphasis(range, children));

    chunks.replaceRange(openerAt + 1, closerAt, <_Chunk>[_Chunk(node)]);
    delimiters.removeRange(found + 1, closerIndex);
    closerIndex = found + 1;

    opener.length -= use;
    closer.length -= use;
    openerNode.value = closer.char * opener.length;
    openerNode.range = MdRange(openerNode.range.start, range.start);
    closerNode.value = closer.char * closer.length;
    closerNode.range = MdRange(range.end, closerNode.range.end);

    if (closer.length == 0) {
      _drop(chunks, closerChunk);
      _drop(delimiters, closerChunk);
    }

    if (opener.length == 0) {
      _drop(chunks, openerChunk);
      _drop(delimiters, openerChunk);
      closerIndex -= 1;
    }
  }

  delimiters.removeRange(bottom, delimiters.length);
}

/* -------------------------------------------------------------------------
 * Link destinations and labels
 * ---------------------------------------------------------------------- */

class _Destination {
  const _Destination(this.url, this.title, this.end);

  final String url;
  final String? title;
  final int end;
}

String _at(String source, int index) => index >= 0 && index < source.length ? source[index] : '';

/// `(url "title")` — the parenthesised half of an inline link.
_Destination? _readInlineDestination(String source, int start) {
  int at = start + 1;

  void skipSpace() {
    while (at < source.length && _whitespace.hasMatch(source[at])) {
      at += 1;
    }
  }

  skipSpace();

  String url = '';

  if (_at(source, at) == '<') {
    at += 1;

    while (at < source.length && source[at] != '>') {
      if (source[at] == '\n') {
        return null;
      }

      if (source[at] == r'\' && _escapable.hasMatch(_at(source, at + 1))) {
        at += 1;
      }

      url += source[at];
      at += 1;
    }

    if (_at(source, at) != '>') {
      return null;
    }

    at += 1;
  } else {
    int depth = 0;

    while (at < source.length) {
      final String character = source[at];

      if (_whitespace.hasMatch(character)) {
        break;
      }

      if (character == r'\' && _escapable.hasMatch(_at(source, at + 1))) {
        url += source[at + 1];
        at += 2;
        continue;
      }

      if (character == '(') {
        depth += 1;
      } else if (character == ')') {
        if (depth == 0) {
          break;
        }

        depth -= 1;
      }

      url += character;
      at += 1;
    }
  }

  skipSpace();

  String? title;
  final String quote = _at(source, at);

  if (quote == '"' || quote == "'" || quote == '(') {
    final String closing = quote == '(' ? ')' : quote;

    at += 1;
    title = '';

    while (at < source.length && source[at] != closing) {
      if (source[at] == r'\' && _escapable.hasMatch(_at(source, at + 1))) {
        at += 1;
      }

      title = title! + source[at];
      at += 1;
    }

    if (_at(source, at) != closing) {
      return null;
    }

    at += 1;
    skipSpace();
  }

  if (_at(source, at) != ')') {
    return null;
  }

  return _Destination(url, title == null ? null : decodeEntities(title), at + 1);
}

final RegExp _runsOfSpace = RegExp(r'\s+');

/// A reference label, folded to the form definitions are stored under.
///
/// Case and runs of whitespace do not distinguish two labels, so `[Foo Bar]`
/// and `[foo   bar]` are the same reference. Folding here and at the definition
/// site means the map never has to be searched twice.
String normalizeLabel(String label) => label.trim().replaceAll(_runsOfSpace, ' ').toLowerCase();

class _Reference {
  const _Reference(this.label, this.end);

  final String label;
  final int end;
}

/// `[label]` immediately after a closed `]`, for a full reference link.
_Reference? _readReferenceLabel(String source, int start) {
  if (_at(source, start) != '[') {
    return null;
  }

  int at = start + 1;
  String label = '';

  while (at < source.length) {
    final String character = source[at];

    if (character == r'\' && _escapable.hasMatch(_at(source, at + 1))) {
      label += source.substring(at, at + 2);
      at += 2;
      continue;
    }

    if (character == '[') {
      return null;
    }

    if (character == ']') {
      return _Reference(label, at + 1);
    }

    label += character;
    at += 1;
  }

  return null;
}

/* -------------------------------------------------------------------------
 * Leaf scanners
 * ---------------------------------------------------------------------- */

class _CodeSpan {
  const _CodeSpan(this.value, this.end);

  final String value;
  final int end;
}

/// A run of backticks, and the matching run that closes it.
_CodeSpan? _readCodeSpan(String source, int start) {
  int fence = 0;

  while (_at(source, start + fence) == '`') {
    fence += 1;
  }

  int at = start + fence;

  while (at < source.length) {
    if (source[at] != '`') {
      at += 1;
      continue;
    }

    int run = 0;

    while (_at(source, at + run) == '`') {
      run += 1;
    }

    if (run == fence) {
      String value = source.substring(start + fence, at).replaceAll('\n', ' ');

      // One space is stripped from each end when there is one at both — that is
      // what lets a code span hold a literal backtick.
      if (value.length > 2 &&
          value.startsWith(' ') &&
          value.endsWith(' ') &&
          value.trim().isNotEmpty) {
        value = value.substring(1, value.length - 1);
      }

      return _CodeSpan(value, at + run);
    }

    at += run;
  }

  return null;
}

final RegExp _autolinkUri = RegExp(r'^<([A-Za-z][A-Za-z\d+.-]{1,31}:[^\s<>]*)>');
final RegExp _autolinkEmail = RegExp(
  r"^<([A-Za-z\d.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?)*)>",
);
final RegExp _inlineHtml = RegExp(
  r'''^(?:<[A-Za-z][A-Za-z\d-]*(?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*/?>|</[A-Za-z][A-Za-z\d-]*\s*>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)''',
);

/* -------------------------------------------------------------------------
 * Bare URLs
 * ---------------------------------------------------------------------- */

final RegExp _literal = RegExp(
  r'(?:https?://|www\.)[^\s<]+|[A-Za-z\d._%+-]+@[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?(?:\.[A-Za-z\d](?:[A-Za-z\d-]*[A-Za-z\d])?)+',
);
final RegExp _schemed = RegExp(r'^(?:https?://|www\.)', caseSensitive: false);
final RegExp _trailingEntity = RegExp(r'&[A-Za-z\d]+;$');

/// Only after whitespace or one of the few marks a URL is written next to.
bool _canStartLiteral(String? before) =>
    before == null || _whitespace.hasMatch(before) || '*_~([{'.contains(before);

/// Trailing punctuation that belongs to the sentence rather than to the URL.
///
/// "See https://example.com." ends in a full stop, and a link that swallowed it
/// would be a link to the wrong page. The closing parenthesis is the awkward
/// one — Wikipedia URLs end in one legitimately — so it is kept only while the
/// parentheses in the match balance.
String _trimLiteral(String match) {
  int end = match.length;

  while (end > 0) {
    final String character = match[end - 1];

    if ('!"\'*,.:;?_~'.contains(character)) {
      end -= 1;
      continue;
    }

    if (character == ')') {
      final String head = match.substring(0, end);
      final int opens = '('.allMatches(head).length;
      final int closes = ')'.allMatches(head).length;

      if (closes > opens) {
        end -= 1;
        continue;
      }
    }

    break;
  }

  // `&copy;` at the end of a URL is a character reference in the prose around
  // it far more often than it is part of the address.
  final String trimmed = match.substring(0, end);
  final RegExpMatch? entity = _trailingEntity.firstMatch(trimmed);

  return entity == null ? trimmed : trimmed.substring(0, entity.start);
}

/// A text node split around the bare URLs and e-mail addresses inside it.
///
/// The pieces get their offsets by counting from the node's own start, which is
/// exact whenever the node is the characters it was written with — and it is,
/// unless a character reference or a backslash escape was decoded on the way
/// in. Nothing is left to say where those went, so the count is held inside the
/// node's range instead: a piece may then be a character or two out, and is
/// still in order and still inside the node it came from.
List<MdInline> _linkifyText(MdText node) {
  final String value = node.value;
  int offset(int index) {
    final int at = node.range.start + index;

    return at < node.range.end ? at : node.range.end;
  }

  final List<MdInline> out = <MdInline>[];
  int last = 0;
  int search = 0;

  while (search <= value.length) {
    final RegExpMatch? match = _literal.firstMatch(value.substring(search));

    if (match == null) {
      break;
    }

    final int at = search + match.start;
    final String whole = match.group(0)!;

    search = at + whole.length;

    if (!_canStartLiteral(at == 0 ? null : value[at - 1])) {
      continue;
    }

    final String text = _trimLiteral(whole);

    if (text.isEmpty) {
      continue;
    }

    final bool email = !_schemed.hasMatch(text);
    final String? url = safeUrl(
      email ? 'mailto:$text' : (text.startsWith('www.') ? 'http://$text' : text),
    );

    if (url == null) {
      continue;
    }

    if (at > last) {
      out.add(MdText(MdRange(offset(last), offset(at)), value.substring(last, at)));
    }

    final MdRange range = MdRange(offset(at), offset(at + text.length));

    out.add(MdLink(range, url: url, title: null, children: <MdInline>[MdText(range, text)]));
    last = at + text.length;
    search = last;
  }

  if (last < value.length) {
    out.add(MdText(MdRange(offset(last), node.range.end), value.substring(last)));
  }

  return out.isNotEmpty ? out : <MdInline>[node];
}

/// The same, over a finished tree — but never inside a link, which has one.
List<MdInline> _linkify(List<MdInline> nodes) {
  final List<MdInline> out = <MdInline>[];

  for (final MdInline node in nodes) {
    if (node is MdText) {
      out.addAll(_linkifyText(node));
      continue;
    }

    if (node is MdEmphasis) {
      out.add(MdEmphasis(node.range, _linkify(node.children)));
      continue;
    }

    if (node is MdStrong) {
      out.add(MdStrong(node.range, _linkify(node.children)));
      continue;
    }

    if (node is MdDelete) {
      out.add(MdDelete(node.range, _linkify(node.children)));
      continue;
    }

    out.add(node);
  }

  return out;
}

/* -------------------------------------------------------------------------
 * Tidying
 * ---------------------------------------------------------------------- */

/// Adjacent text nodes joined, empty ones dropped.
List<MdInline> _merge(List<MdInline> nodes) {
  final List<MdInline> out = <MdInline>[];

  for (final MdInline node in nodes) {
    if (node is MdText) {
      if (node.value.isEmpty) {
        continue;
      }

      final MdInline? previous = out.isEmpty ? null : out.last;

      if (previous is MdText) {
        previous.value += node.value;
        previous.range = MdRange(previous.range.start, node.range.end);
        continue;
      }

      out.add(MdText(node.range, node.value));
      continue;
    }

    if (node is MdEmphasis) {
      out.add(MdEmphasis(node.range, _merge(node.children)));
      continue;
    }

    if (node is MdStrong) {
      out.add(MdStrong(node.range, _merge(node.children)));
      continue;
    }

    if (node is MdDelete) {
      out.add(MdDelete(node.range, _merge(node.children)));
      continue;
    }

    if (node is MdLink) {
      out.add(
        MdLink(node.range, url: node.url, title: node.title, children: _merge(node.children)),
      );
      continue;
    }

    out.add(node);
  }

  return out;
}

/// What a run of inline nodes says, with the formatting taken off.
String toPlainText(List<MdInline> nodes) {
  final StringBuffer out = StringBuffer();

  for (final MdInline node in nodes) {
    if (node is MdText) {
      out.write(node.value);
    } else if (node is MdInlineCode) {
      out.write(node.value);
    } else if (node is MdImage) {
      out.write(node.alt);
    } else if (node is MdBreak) {
      out.write(' ');
    } else if (node is MdFootnoteReference || node is MdInlineHtml) {
      // A footnote's number is not part of what the sentence says, and a
      // heading with one in it should slug and outline without it.
      continue;
    } else if (node is MdEmphasis) {
      out.write(toPlainText(node.children));
    } else if (node is MdStrong) {
      out.write(toPlainText(node.children));
    } else if (node is MdDelete) {
      out.write(toPlainText(node.children));
    } else if (node is MdLink) {
      out.write(toPlainText(node.children));
    } else if (node is MdTextDirective) {
      // What its label says is what the sentence says. The package does not
      // know what the directive is, and a heading is slugged from the words
      // either way.
      out.write(toPlainText(node.children));
    }
  }

  return out.toString();
}

/* -------------------------------------------------------------------------
 * The scanner
 * ---------------------------------------------------------------------- */

final RegExp _hardBreak = RegExp(r'[ \t]{2,}$');
final RegExp _trailingSpace = RegExp(r'[ \t]+$');

/// Reads [raw] into inline nodes.
List<MdInline> parseInline(Sourced raw, InlineOptions options) {
  final String source = raw.text;
  final _State state = _State();
  final List<_Chunk> chunks = state.chunks;
  final List<_Chunk> delimiters = state.delimiters;
  final List<_Chunk> openers = state.openers;

  /// Where a stretch of this text sits in the document.
  MdRange span(int from, int to) => rangeOf(raw, from, to);

  String pending = '';
  int pendingAt = 0;
  int at = 0;

  /// Characters that are going to be a text node, once something ends it.
  void hold(String text, int from) {
    if (pending.isEmpty) {
      pendingAt = from;
    }

    pending += text;
  }

  void flush() {
    if (pending.isNotEmpty) {
      chunks.add(_textChunk(decodeEntities(pending), span(pendingAt, pendingAt + pending.length)));
      pending = '';
    }
  }

  /// Where in [delimiters] the run that follows this chunk begins.
  int delimiterBottom(_Chunk chunk) {
    final int after = chunks.indexOf(chunk);

    for (int index = 0; index < delimiters.length; index += 1) {
      if (chunks.indexOf(delimiters[index]) > after) {
        return index;
      }
    }

    return delimiters.length;
  }

  while (at < source.length) {
    final String character = source[at];

    /* A backslash: an escape, or a hard break at the end of a line. */
    if (character == r'\') {
      final String next = _at(source, at + 1);

      if (next == '\n') {
        flush();
        chunks.add(_Chunk(MdBreak(span(at, at + 2))));
        at += 2;

        while (at < source.length && _whitespace.hasMatch(source[at]) && source[at] != '\n') {
          at += 1;
        }

        continue;
      }

      if (next.isNotEmpty && _escapable.hasMatch(next)) {
        flush();
        chunks.add(_textChunk(next, span(at, at + 2)));
        at += 2;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    if (character == '`') {
      final _CodeSpan? code = _readCodeSpan(source, at);

      if (code != null) {
        flush();
        chunks.add(_Chunk(MdInlineCode(span(at, code.end), code.value)));
        at = code.end;
        continue;
      }

      int run = 0;

      while (_at(source, at + run) == '`') {
        run += 1;
      }

      hold(source.substring(at, at + run), at);
      at += run;
      continue;
    }

    if (character == '<') {
      final String rest = source.substring(at);
      final RegExpMatch? uri = _autolinkUri.firstMatch(rest);

      if (uri != null) {
        final String? url = safeUrl(uri.group(1)!);
        final MdRange range = span(at, at + uri.group(0)!.length);
        final MdRange inside = span(at + 1, at + 1 + uri.group(1)!.length);

        flush();
        chunks.add(
          url != null
              ? _Chunk(
                  MdLink(
                    range,
                    url: url,
                    title: null,
                    children: <MdInline>[MdText(inside, uri.group(1)!)],
                  ),
                )
              : _textChunk(uri.group(1)!, range),
        );
        at += uri.group(0)!.length;
        continue;
      }

      final RegExpMatch? email = _autolinkEmail.firstMatch(rest);

      if (email != null) {
        flush();
        chunks.add(
          _Chunk(
            MdLink(
              span(at, at + email.group(0)!.length),
              url: 'mailto:${email.group(1)!}',
              title: null,
              children: <MdInline>[
                MdText(span(at + 1, at + 1 + email.group(1)!.length), email.group(1)!),
              ],
            ),
          ),
        );
        at += email.group(0)!.length;
        continue;
      }

      final RegExpMatch? html = _inlineHtml.firstMatch(rest);

      if (html != null) {
        flush();
        // Whether this reaches the page as markup or as four visible characters
        // is the renderer's decision, not the parser's — the tree says what the
        // document says.
        chunks.add(_Chunk(MdInlineHtml(span(at, at + html.group(0)!.length), html.group(0)!)));
        at += html.group(0)!.length;
        continue;
      }

      hold(character, at);
      at += 1;
      continue;
    }

    /* A directive: a construct this parser reads and does not understand. */
    if (character == ':' && _at(source, at - 1) != ':' && _at(source, at + 1) != ':') {
      final DirectiveHead? head = readDirectiveHead(source, at + 1);
      // A name on its own is not enough here. A colon is a colon in far more
      // sentences than it is a directive — `Note:` and `see:foo` among them —
      // so an inline one has to carry a `[label]` or `{attributes}` to be one.
      final bool named = head != null && head.end > at + 1 + head.name.length;

      if (head != null && named) {
        final DirectiveLabel? label = head.label;

        flush();
        chunks.add(
          _Chunk(
            MdTextDirective(
              span(at, head.end),
              name: head.name,
              attributes: head.attributes,
              children: label == null
                  ? <MdInline>[]
                  : parseInline(slice(raw, label.start, label.end), options),
            ),
          ),
        );
        at = head.end;
        continue;
      }
    }

    /* A footnote, which is a label that points at a block written elsewhere. */
    if (character == '[' && _at(source, at + 1) == '^') {
      final int close = source.indexOf(']', at + 2);
      final String label = close == -1 ? '' : normalizeLabel(source.substring(at + 2, close));

      if (label.isNotEmpty && options.footnotes.contains(label)) {
        flush();
        chunks.add(_Chunk(MdFootnoteReference(span(at, close + 1), label)));
        at = close + 1;
        continue;
      }
    }

    if (character == '[' || (character == '!' && _at(source, at + 1) == '[')) {
      final bool image = character == '!';
      final String text = image ? '![' : '[';

      flush();

      final _Chunk chunk = _textChunk(text, span(at, at + text.length));

      chunk.opener = _Opener(image: image, active: true, textStart: at + text.length);
      chunks.add(chunk);
      openers.add(chunk);
      at += text.length;
      continue;
    }

    if (character == ']') {
      flush();

      final _Chunk? openerChunk = openers.isEmpty ? null : openers.removeLast();

      if (openerChunk?.opener == null) {
        chunks.add(_textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      final _Opener opener = openerChunk!.opener!;

      if (!opener.active) {
        // Deactivated by a link that closed inside this one. Both brackets are
        // now text — the opening one stays exactly where it was written.
        chunks.add(_textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      final String labelText = source.substring(opener.textStart, at);
      _Destination? destination;
      int end = at + 1;

      if (_at(source, at + 1) == '(') {
        destination = _readInlineDestination(source, at + 1);

        if (destination != null) {
          end = destination.end;
        }
      }

      if (destination == null) {
        final _Reference? reference = _readReferenceLabel(source, at + 1);
        final String label = normalizeLabel(
          reference != null && reference.label.isNotEmpty ? reference.label : labelText,
        );
        final MdDefinition? found = label.isEmpty ? null : options.definitions[label];

        if (found != null && (reference != null || !RegExp(r'[\[\]]').hasMatch(labelText))) {
          destination = _Destination(
            found.url,
            found.title,
            reference != null ? reference.end : at + 1,
          );
          end = destination.end;
        }
      }

      if (destination == null) {
        // Not a link after all. The bracket that opened it is text, and so is
        // this one — but the opener is gone, so a later `]` cannot claim it.
        openerChunk.opener = null;
        chunks.add(_textChunk(']', span(at, at + 1)));
        at += 1;
        continue;
      }

      _processEmphasis(state, delimiterBottom(openerChunk));

      final int openerAt = chunks.indexOf(openerChunk);
      final List<MdInline> children = chunks
          .sublist(openerAt + 1)
          .map((_Chunk each) => each.node)
          .toList();
      final String? url = opener.image ? safeImageUrl(destination.url) : safeUrl(destination.url);
      final int taken = chunks.length - openerAt;
      final MdRange range = MdRange(openerChunk.node.range.start, endOffset(raw, end));

      if (opener.image && url != null) {
        chunks.replaceRange(openerAt, openerAt + taken, <_Chunk>[
          _Chunk(MdImage(range, url: url, title: destination.title, alt: toPlainText(children))),
        ]);
      } else if (opener.image) {
        // A destination we will not follow. An image has nothing to fall back
        // to but the words the author wrote in place of it.
        chunks.replaceRange(openerAt, openerAt + taken, <_Chunk>[
          _textChunk(toPlainText(children), range),
        ]);
      } else if (url != null) {
        chunks.replaceRange(openerAt, openerAt + taken, <_Chunk>[
          _Chunk(MdLink(range, url: url, title: destination.title, children: children)),
        ]);
      } else {
        // The same for a link: the label stays and reads as ordinary text, so a
        // reader sees the sentence rather than a control that does nothing.
        chunks.replaceRange(openerAt, openerAt + taken, children.map(_Chunk.new).toList());
      }

      if (!opener.image) {
        for (final _Chunk other in openers) {
          other.opener?.active = false;
        }
      }

      at = end;
      continue;
    }

    if (character == '*' || character == '_' || (options.gfm && character == '~')) {
      int run = 0;

      while (_at(source, at + run) == character) {
        run += 1;
      }

      // GitHub's strikethrough is exactly two tildes. One is a tilde, and three
      // is somebody drawing a line.
      if (character == '~' && run != 2) {
        hold(source.substring(at, at + run), at);
        at += run;
        continue;
      }

      final List<bool> sides = _flanking(source, at, at + run);
      final bool left = sides[0];
      final bool right = sides[1];
      final bool canOpen = character == '_'
          ? left && (!right || _punctuation.hasMatch(at > 0 ? source[at - 1] : ' '))
          : left;
      final bool canClose = character == '_'
          ? right &&
                (!left || _punctuation.hasMatch(at + run < source.length ? source[at + run] : ' '))
          : right;

      flush();

      final _Chunk chunk = _textChunk(source.substring(at, at + run), span(at, at + run));

      chunk.delimiter = _Delimiter(
        char: character,
        length: run,
        original: run,
        canOpen: canOpen,
        canClose: canClose,
      );
      chunks.add(chunk);
      delimiters.add(chunk);
      at += run;
      continue;
    }

    if (character == '\n') {
      final bool hard = _hardBreak.hasMatch(pending);

      pending = pending.replaceAll(_trailingSpace, '');

      // A hard break is the spaces as well as the newline: they are what makes
      // it one, and they are no part of the text node in front of it.
      final int from = hard && pending.isNotEmpty ? pendingAt + pending.length : at;

      flush();

      chunks.add(
        hard || options.breaks
            ? _Chunk(MdBreak(span(from, at + 1)))
            : _textChunk('\n', span(at, at + 1)),
      );

      at += 1;

      while (at < source.length && (source[at] == ' ' || source[at] == '\t')) {
        at += 1;
      }

      continue;
    }

    hold(character, at);
    at += 1;
  }

  flush();
  _processEmphasis(state, 0);

  final List<MdInline> nodes = _merge(chunks.map((_Chunk each) => each.node).toList());

  return options.gfm ? _merge(_linkify(nodes)) : nodes;
}
